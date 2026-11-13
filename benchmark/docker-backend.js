'use strict';

// Execution backend of the benchmark: one fresh Docker container per run.
// A backend exposes `run({ corpus, configuration, brief, route, timeLimitMs })` and returns
// what it observed: { output, wallMs, timedOut?, infraError?, suite? } (see classify.js).
// The hidden suite enters the container only after the agents have finished.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { ROUTES } = require('./corpus');
const { hashBlock } = require('../sai/tools/ready-to-propose.js');
const { measureClaude, measureOpencode } = require('./measure');

const IMAGE = 'sai-benchmark';
const SUITE_TIMEOUT_MS = 10 * 60 * 1000;
const SETUP_TIMEOUT_MS = 10 * 60 * 1000;
const COMMAND_TIMEOUT_MS = 2 * 60 * 1000;
const SUITE_RESULT_LINE = /^SUITE_RESULT\s+(\{.*\})\s*$/;
const TRANSFER_TOOL = '/opt/shared-ai/sai/tools/transfer.js';
const BLOCK_STAGING_FILE = '/tmp/benchmark-block.md';
// Where each harness keeps its data for the container's unprivileged user.
const HARNESS_DATA = Object.freeze({
  claude: { container: '/home/dev/.claude/projects', local: 'projects', measure: measureClaude },
  opencode: { container: '/home/dev/.local/share/opencode', local: 'opencode', measure: measureOpencode },
});

/** Run a process without a shell; collect its output; kill it at the time limit. */
function runProcess(command, args, { timeoutMs = COMMAND_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ code: null, stdout: '', stderr: error.message, timedOut: false, wallMs: Date.now() - started });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), timedOut, wallMs: Date.now() - started });
    });
  });
}

/** The command a run launches inside its container. */
function launchCommand({ harness, prompt }) {
  return harness === 'claude'
    ? ['claude', '-p', prompt, '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions']
    : ['opencode', 'run', '--format', 'json', prompt];
}

function launchPrompt({ route, brief, blockHash, blockPath }) {
  const command = ROUTES[route].command;
  return route === 'plan' ? `${command} ${brief.changeName}` : `${command} --block-file ${blockPath} --block-hash ${blockHash}`;
}

function parseSuiteResult(stdout) {
  for (const line of stdout.split(/\r?\n/).reverse()) {
    const match = SUITE_RESULT_LINE.exec(line.trim());
    if (!match) continue;
    try {
      const { passed, total } = JSON.parse(match[1]);
      if (Number.isInteger(passed) && Number.isInteger(total) && passed >= 0 && total >= passed) return { passed, total };
    } catch {
      // Falls through to the error below.
    }
    break;
  }
  return { error: 'the suite command printed no valid SUITE_RESULT line' };
}

class DockerBackend {
  constructor({ checkoutDir, dockerBinary = 'docker', environment = process.env, exec = runProcess }) {
    this.checkoutDir = path.resolve(checkoutDir);
    this.dockerBinary = dockerBinary;
    this.environment = environment;
    this.exec = exec;
  }

  docker(args, options) {
    return this.exec(this.dockerBinary, args, options);
  }

  /** Build the image once; a failure here stops the whole benchmark. */
  async prepare() {
    const result = await this.docker(['build', '-t', IMAGE, path.join(this.checkoutDir, 'benchmark')], { timeoutMs: SETUP_TIMEOUT_MS });
    if (result.code !== 0) throw new Error(`Building the benchmark image failed: ${result.stderr.trim() || result.stdout.trim()}`);
  }

  async step(name, args, options) {
    const result = await this.docker(args, options);
    if (result.code !== 0) throw new Error(`${name} failed: ${(result.stderr || result.stdout).trim()}`);
    return result;
  }

  async prepareContainer(name, { corpus, configuration, brief, route }, scratch) {
    const missing = configuration.env.filter((variable) => !this.environment[variable]);
    if (missing.length > 0) throw new Error(`credential environment variable ${missing.join(', ')} is not set`);

    const envArgs = configuration.env.flatMap((variable) => ['-e', variable]);
    await this.step('Starting the container', ['run', '-d', '--name', name, '-v', `${this.checkoutDir}:/opt/shared-ai:ro`, ...envArgs, IMAGE, 'sleep', 'infinity']);
    await this.step('Copying the base project', ['cp', `${path.join(corpus.dir, 'project')}${path.sep}.`, `${name}:/work`]);
    if (route === 'plan') {
      const planDir = `/work/openspec/changes/${brief.changeName}`;
      await this.step('Creating the plan folder', ['exec', name, 'mkdir', '-p', planDir]);
      await this.step('Copying the fixed plan', ['cp', `${path.join(brief.dir, 'plan')}${path.sep}.`, `${name}:${planDir}`]);
    }
    await this.step('Setting ownership', ['exec', '-u', 'root', name, 'chown', '-R', 'dev:dev', '/work']);

    const setupFile = path.join(scratch, 'setup.json');
    fs.writeFileSync(setupFile, JSON.stringify({ harness: configuration.harness, project: '/work', checkout: '/opt/shared-ai', models: configuration.models }));
    await this.step('Copying the setup', ['cp', setupFile, `${name}:/tmp/benchmark-setup.json`]);
    await this.step('Installing SAI', ['exec', name, 'node', '/opt/shared-ai/benchmark/container-setup.js', '/tmp/benchmark-setup.json'], { timeoutMs: SETUP_TIMEOUT_MS });
    const cli = await this.docker(['exec', name, 'sh', '-c', `command -v ${configuration.harness}`]);
    if (cli.code !== 0) throw new Error(`the ${configuration.harness} CLI is missing in the image`);
    return route === 'plan' ? {} : { blockPath: await this.storeBlock(name, configuration.harness, brief) };
  }

  /**
   * Put the brief block through the transport users run: the harness temporary root, a transfer
   * directory that `transfer.js open` returns, and `transfer.js put`. The agent is never launched
   * with a block placed any other way. Returns the path `put` printed.
   */
  async storeBlock(name, harness, brief) {
    const dev = (label, args) => this.step(label, ['exec', name, ...args]);
    let root = '/tmp/opencode';
    if (harness === 'claude') root = `/tmp/claude-${(await dev('Reading the container user id', ['id', '-u'])).stdout.trim()}`;
    await dev('Creating the harness temporary root', ['mkdir', '-p', '-m', '700', root]);
    const opened = JSON.parse((await dev('Opening the transfer directory', ['node', TRANSFER_TOOL, 'open', '--harness', harness])).stdout);
    await this.step('Copying the brief block', ['cp', path.join(brief.dir, 'block.md'), `${name}:${BLOCK_STAGING_FILE}`]);
    await this.step('Setting block ownership', ['exec', '-u', 'root', name, 'chown', 'dev:dev', BLOCK_STAGING_FILE]);
    const stored = JSON.parse((await dev('Storing the brief block', ['node', TRANSFER_TOOL, 'put', '--dir', opened.dir, '--path', 'block.md', '--input-file', BLOCK_STAGING_FILE])).stdout);
    return stored.path;
  }

  /**
   * Copy the harness data out of the container and read its usage. A failure leaves the usage
   * unmeasured with a fixed message, so no path of the host reaches the result.
   */
  async measureUsage(name, harness, scratch) {
    const { container, local, measure } = HARNESS_DATA[harness];
    const dataDir = path.join(scratch, 'harness-data');
    try {
      fs.mkdirSync(path.join(dataDir, local), { recursive: true });
      const copied = await this.docker(['cp', `${name}:${container}/.`, path.join(dataDir, local)]);
      if (copied.code !== 0) throw new Error('copy failed');
      return measure(dataDir);
    } catch {
      return { error: `the ${harness} data copied from the container could not be read` };
    }
  }

  async runSuite(name, brief) {
    await this.step('Copying the hidden suite', ['cp', `${path.join(brief.dir, 'acceptance')}${path.sep}.`, `${name}:/acceptance`]);
    await this.step('Setting suite ownership', ['exec', '-u', 'root', name, 'chown', '-R', 'dev:dev', '/acceptance']);
    const result = await this.docker(['exec', '-w', '/work', name, ...brief.suiteCommand], { timeoutMs: SUITE_TIMEOUT_MS });
    return result.timedOut ? { error: 'the suite command exceeded its time limit' } : parseSuiteResult(result.stdout);
  }

  async run(run) {
    const { configuration, brief, route, timeLimitMs } = run;
    const name = `sai-benchmark-${crypto.randomBytes(6).toString('hex')}`;
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-benchmark-'));
    try {
      let prepared;
      try {
        prepared = await this.prepareContainer(name, run, scratch);
      } catch (error) {
        return { infraError: error.message, wallMs: 0 };
      }
      const blockHash = hashBlock(fs.readFileSync(path.join(brief.dir, 'block.md'), 'utf8'));
      const command = launchCommand({ harness: configuration.harness, prompt: launchPrompt({ route, brief, blockHash, blockPath: prepared.blockPath }) });
      const agents = await this.docker(['exec', '-w', '/work', name, ...command], { timeoutMs: timeLimitMs });
      const usage = await this.measureUsage(name, configuration.harness, scratch);
      if (agents.timedOut) return { timedOut: true, output: agents.stdout, wallMs: agents.wallMs, usage };
      try {
        return { output: agents.stdout, exitCode: agents.code, wallMs: agents.wallMs, usage, suite: await this.runSuite(name, brief) };
      } catch (error) {
        return { infraError: error.message, wallMs: agents.wallMs, usage };
      }
    } finally {
      await this.docker(['rm', '-f', name]);
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  }
}

module.exports = { DockerBackend, IMAGE, launchCommand, launchPrompt, parseSuiteResult, runProcess };

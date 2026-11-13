'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { BenchmarkError, loadCorpus } = require('../benchmark/corpus');
const { classifyRun } = require('../benchmark/classify');
const { buildReports, writeReports } = require('../benchmark/report');
const { assertOutputOutside, planRuns, runBenchmark } = require('../benchmark/runner');
const { DockerBackend, launchCommand, launchPrompt, parseSuiteResult } = require('../benchmark/docker-backend');
const { main } = require('../bin/benchmark');
const { outputFor, SimulatedBackend } = require('./helpers/benchmark-simulated-backend');

const repoRoot = path.join(__dirname, '..');
const fixture = path.join(__dirname, 'fixtures', 'benchmark-corpus');
const workers = { claude: ['sai-3-red-worker', 'sai-3-green-worker'], opencode: ['sai-3-red-worker', 'sai-3-green-worker'] };
const provenance = { runnerCommit: 'abc123', saiCommit: 'abc123' };

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sai-benchmark-test-'));
}

function copyFixture() {
  const target = path.join(tempDir(), 'corpus');
  fs.cpSync(fixture, target, { recursive: true });
  return target;
}

function editConfig(corpusDir, edit) {
  const file = path.join(corpusDir, 'benchmark.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  edit(config);
  fs.writeFileSync(file, JSON.stringify(config));
}

const corpus = () => loadCorpus(fixture, { workers });

test('E7: the fixture corpus validates and defaults to its own rounds', () => {
  const loaded = corpus();
  assert.equal(loaded.id, 'fixture-corpus');
  assert.equal(loaded.rounds, 2);
  assert.equal(loaded.briefs[0].changeName, 'greeting');
  assert.deepEqual(loaded.briefs[0].suiteCommand.slice(0, 2), ['node', '-e']);
  assert.equal(loadCorpus(fixture, { workers, rounds: 10 }).rounds, 10);
});

test('E7: a corpus without a time limit, with a malformed price entry, or with a missing brief file reports every problem', () => {
  const dir = copyFixture();
  editConfig(dir, (config) => {
    delete config.timeLimitSeconds;
    config.prices.models.haiku = { inputPerMTok: 'free' };
    config.configurations[1].models['sai-9-unknown-worker'] = { model: 'vendor/small' };
    config.configurations[1].models['sai-3-red-worker'].effort = 'high';
  });
  fs.rmSync(path.join(dir, 'briefs', 'greeting', 'block.md'));
  assert.throws(() => loadCorpus(dir, { workers }), (error) => {
    assert.ok(error instanceof BenchmarkError);
    const text = error.message;
    assert.match(text, /timeLimitSeconds is mandatory/);
    assert.match(text, /prices: haiku needs inputPerMTok and outputPerMTok/);
    assert.match(text, /sai-9-unknown-worker is not a worker role of opencode/);
    assert.match(text, /setting effort does not exist on opencode/);
    assert.match(text, /brief greeting: block\.md is missing/);
    return true;
  });
});

test('E7: a configured model without a price is valid, since the price table is checked for shape only', () => {
  const dir = copyFixture();
  editConfig(dir, (config) => { delete config.prices.models.haiku; });
  assert.equal(loadCorpus(dir, { workers }).configurations.length, 2);
});

test('E7: an invalid corpus stops the benchmark before any backend is built', async () => {
  const dir = copyFixture();
  editConfig(dir, (config) => { config.timeLimitSeconds = 0; });
  let built = false;
  await assert.rejects(
    main(['run', dir, '--out', path.join(tempDir(), 'out')], { backendFor: () => { built = true; return new SimulatedBackend(); }, log: () => {} }),
    /timeLimitSeconds is mandatory/
  );
  assert.equal(built, false);
});

test('the validate command accepts the fixture with the real worker roles', async () => {
  const messages = [];
  await main(['validate', fixture], { log: (line) => messages.push(line) });
  assert.match(messages[0], /Corpus fixture-corpus is valid: 1 briefs, 2 configurations, 2 rounds/);
});

test('the output folder may not be inside the checkout or the corpus', () => {
  const corpusDir = copyFixture();
  const forbidden = [{ label: 'checkout', dir: repoRoot }, { label: 'corpus', dir: corpusDir }];
  assert.throws(() => assertOutputOutside(path.join(repoRoot, 'out'), forbidden), /inside the checkout/);
  assert.throws(() => assertOutputOutside(path.join(corpusDir, 'out'), forbidden), /inside the corpus/);
  assert.equal(assertOutputOutside(path.join(tempDir(), 'out'), forbidden).endsWith('out'), true);
});

const PLAN = { harness: 'claude', route: 'plan' };

test('E1: a run without its closing literal is escalated even when the hidden suite passes', () => {
  const raw = { output: outputFor('claude', 'Which option do you prefer, A or B?'), suite: { passed: 3, total: 3 } };
  const result = classifyRun(raw, PLAN);
  assert.equal(result.outcome, 'escalated');
  assert.deepEqual(result.suite, { passed: 3, total: 3 });
  assert.match(result.detail, /hidden suite 3\/3/);
});

test('E2: an opencode run with cancelled questions and its closing literal is judged by the suite', () => {
  const output = outputFor('opencode', 'Done.\nImplement done.', { cancelledQuestions: 2 });
  const accepted = classifyRun({ output, suite: { passed: 4, total: 4 } }, { harness: 'opencode', route: 'plan' });
  assert.equal(accepted.outcome, 'accepted');
  assert.equal(accepted.cancelledQuestions, 2);
  assert.equal(classifyRun({ output, suite: { passed: 3, total: 4 } }, { harness: 'opencode', route: 'plan' }).outcome, 'rejected');
});

test('E3: a run past its time limit is timeout and never reaches the suite', () => {
  const result = classifyRun({ timedOut: true, output: '', suite: { passed: 3, total: 3 } }, PLAN);
  assert.equal(result.outcome, 'timeout');
  assert.equal(result.suite, null);
});

test('E5: infrastructure causes classify as error', () => {
  const ok = outputFor('claude', 'Implement done.');
  assert.equal(classifyRun({ infraError: 'the container does not start' }, PLAN).outcome, 'error');
  assert.equal(classifyRun({ output: '', suite: { passed: 1, total: 1 } }, PLAN).outcome, 'error');
  assert.equal(classifyRun({ output: ok, suite: { error: 'no valid SUITE_RESULT line' } }, PLAN).outcome, 'error');
  assert.equal(classifyRun({ output: ok }, PLAN).outcome, 'error');
  const authFailure = JSON.stringify({ type: 'result', is_error: true, result: 'Invalid API key' });
  assert.match(classifyRun({ output: authFailure, suite: { passed: 1, total: 1 } }, PLAN).detail, /Invalid API key/);
  const opencodeError = JSON.stringify({ type: 'error', error: { name: 'ProviderAuthError', data: { message: 'bad key' } } });
  assert.match(classifyRun({ output: opencodeError, suite: { passed: 1, total: 1 } }, { harness: 'opencode', route: 'plan' }).detail, /bad key/);
});

test('E6: only a full pass is accepted, and the Direct Build route uses its own closing literal', () => {
  const accepted = classifyRun({ output: outputFor('claude', 'Implement done.'), suite: { passed: 2, total: 2 } }, PLAN);
  assert.equal(accepted.outcome, 'accepted');
  const partial = classifyRun({ output: outputFor('claude', 'Implement done.'), suite: { passed: 1, total: 2 } }, PLAN);
  assert.equal(partial.outcome, 'rejected');
  assert.equal(classifyRun({ output: outputFor('claude', 'Implement done.'), suite: { passed: 0, total: 0 } }, PLAN).outcome, 'rejected');
  const direct = { harness: 'claude', route: 'direct-build' };
  assert.equal(classifyRun({ output: outputFor('claude', 'Implement done.'), suite: { passed: 2, total: 2 } }, direct).outcome, 'escalated');
  assert.equal(classifyRun({ output: outputFor('claude', 'Direct build done.'), suite: { passed: 2, total: 2 } }, direct).outcome, 'accepted');
});

test('rounds pair every configuration on the same brief', () => {
  const runs = planRuns(corpus());
  assert.deepEqual(runs.map((run) => run.id), [
    'round-01-claude-plan-haiku', 'round-01-opencode-plan-small',
    'round-02-claude-plan-haiku', 'round-02-opencode-plan-small',
  ]);
  assert.equal(new Set(runs.filter((run) => run.round === 1).map((run) => run.brief.id)).size, 1);
});

test('E9 and E10: an interrupted benchmark keeps its runs and the report states what is missing and what produced it', async () => {
  const outDir = path.join(tempDir(), 'out');
  const backend = new SimulatedBackend((run) => {
    if (run.configuration.harness === 'opencode') {
      return { output: outputFor('opencode', 'Implement done.', { cancelledQuestions: 1 }), wallMs: 4000, suite: { passed: 2, total: 3 } };
    }
    return { output: outputFor('claude', 'Which option?'), wallMs: 2000, suite: { passed: 3, total: 3 } };
  });
  let saved = 0;
  await assert.rejects(runBenchmark({
    corpus: corpus(), outDir, backend, provenance,
    log: () => { saved += 1; if (saved === 2) throw new Error('interrupted'); },
  }), /interrupted/);
  assert.deepEqual(fs.readdirSync(path.join(outDir, 'runs')).sort(), ['round-01-claude-plan-haiku.json', 'round-01-opencode-plan-small.json']);

  const reports = buildReports(outDir, { regenerate: 'node bin/benchmark.js report --out out' });
  const claude = reports['report-claude-plan-haiku.md'];
  assert.match(claude, /Runs: 1 of 2 completed; 1 missing/);
  assert.match(claude, /Escalated: 1/);
  assert.match(claude, /Accepted: 0 of 1 judged runs/);
  for (const text of ['Runner commit: abc123', 'SAI installation commit: abc123', 'Corpus: fixture-corpus', 'Price table date: 2026-11-01', 'Rounds: 2', 'Time limit per run: 60 s', 'node bin/benchmark.js report --out out']) {
    assert.ok(claude.includes(text), `report states ${text}`);
  }
  const opencode = reports['report-opencode-plan-small.md'];
  assert.match(opencode, /Rejected: 1/);
  assert.match(opencode, /Runs with cancelled questions: 1/);
  assert.match(opencode, /\| round-01-opencode-plan-small \| 1 \| greeting \| rejected \| 2\/3 \| 4\.0 \| 1 \|/);
});

test('a rerun into the same output folder keeps saved runs and runs the rest', async () => {
  const outDir = path.join(tempDir(), 'out');
  const first = new SimulatedBackend();
  await runBenchmark({ corpus: corpus(), outDir, backend: first, provenance });
  const second = new SimulatedBackend();
  fs.rmSync(path.join(outDir, 'runs', 'round-02-opencode-plan-small.json'));
  await runBenchmark({ corpus: corpus(), outDir, backend: second, provenance });
  assert.equal(first.calls.length, 4);
  assert.equal(second.calls.length, 1);
});

test('E5: errors are reported apart and excluded from the accepted count and its total', async () => {
  const outDir = path.join(tempDir(), 'out');
  const backend = new SimulatedBackend((run) => {
    if (run.configuration.harness === 'opencode') throw new Error('the container does not start');
    return { output: outputFor('claude', 'Implement done.'), wallMs: 1000, suite: { passed: 1, total: 1 } };
  });
  await runBenchmark({ corpus: corpus(), outDir, backend, provenance });
  const names = writeReports(outDir, { regenerate: 'regen' });
  assert.deepEqual(names.sort(), ['report-claude-plan-haiku.md', 'report-opencode-plan-small.md']);
  const opencode = fs.readFileSync(path.join(outDir, 'report-opencode-plan-small.md'), 'utf8');
  assert.match(opencode, /Accepted: 0 of 0 judged runs/);
  assert.match(opencode, /## Infrastructure errors \(excluded\)\n\n2 runs\./);
  assert.match(opencode, /round-01-opencode-plan-small: the container does not start/);
  assert.match(fs.readFileSync(path.join(outDir, 'report-claude-plan-haiku.md'), 'utf8'), /Accepted: 2 of 2 judged runs/);
});

test('I3: the launch commands of both harnesses and both routes', () => {
  const brief = { changeName: 'greeting' };
  assert.deepEqual(launchCommand({ harness: 'claude', prompt: 'p' }), ['claude', '-p', 'p', '--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions']);
  assert.deepEqual(launchCommand({ harness: 'opencode', prompt: 'p' }), ['opencode', 'run', '--format', 'json', 'p']);
  assert.equal(launchPrompt({ route: 'plan', brief, blockHash: 'h' }), '/sai-3-implement greeting');
  assert.match(launchPrompt({ route: 'direct-build', brief, blockHash: 'h' }), /^\/sai-direct-build --block-file \S+ --block-hash h$/);
});

test('the suite result is the last valid SUITE_RESULT line', () => {
  assert.deepEqual(parseSuiteResult('noise\nSUITE_RESULT {"passed":1,"total":3}\n'), { passed: 1, total: 3 });
  assert.ok(parseSuiteResult('no result').error);
  assert.ok(parseSuiteResult('SUITE_RESULT {"passed":4,"total":3}').error);
});

function fakeDocker({ agentsTimeout = false, agentsOutput = '' } = {}) {
  const calls = [];
  const exec = async (command, args) => {
    calls.push(args);
    const joined = args.join(' ');
    if (args[0] === 'exec' && args.includes('claude') && args.includes('-p')) {
      return { code: 0, stdout: agentsOutput, stderr: '', timedOut: agentsTimeout, wallMs: 1500 };
    }
    if (args[0] === 'exec' && joined.includes('SUITE_RESULT')) {
      return { code: 0, stdout: 'SUITE_RESULT {"passed":1,"total":1}\n', stderr: '', timedOut: false, wallMs: 10 };
    }
    return { code: 0, stdout: '', stderr: '', timedOut: false, wallMs: 1 };
  };
  return { calls, exec };
}

test('E4: the hidden suite enters the container only after the agents end, and credentials never appear as values', async () => {
  const { calls, exec } = fakeDocker({ agentsOutput: outputFor('claude', 'Implement done.') });
  const backend = new DockerBackend({ checkoutDir: repoRoot, environment: { ANTHROPIC_API_KEY: 'secret-value' }, exec });
  const loaded = corpus();
  const raw = await backend.run({ corpus: loaded, configuration: loaded.configurations[0], brief: loaded.briefs[0], route: 'plan', timeLimitMs: 60000 });

  assert.deepEqual(raw.suite, { passed: 1, total: 1 });
  const flat = calls.map((args) => args.join(' '));
  const launch = flat.findIndex((line) => line.includes('claude -p'));
  const suiteCopy = flat.findIndex((line) => line.includes('acceptance'));
  assert.ok(launch >= 0 && suiteCopy > launch, 'the suite is copied after the launch');
  assert.ok(flat.slice(0, launch).every((line) => !line.includes('acceptance')), 'no suite file before the agents end');
  assert.ok(flat.every((line) => !line.includes('secret-value')));
  assert.ok(flat.some((line) => /run -d .* -e ANTHROPIC_API_KEY /.test(line)));
  assert.match(flat.at(-1), /^rm -f sai-benchmark-/);
});

test('E1: the direct-build block goes through the harness temporary root, transfer open, and transfer put as the unprivileged user', async () => {
  const transferDir = '/tmp/claude-1000/sai/sai-transfer-AbC123';
  const calls = [];
  const exec = async (command, args) => {
    calls.push(args);
    const joined = args.join(' ');
    let stdout = '';
    if (joined.endsWith('id -u')) stdout = '1000\n';
    if (joined.includes('transfer.js open')) stdout = JSON.stringify({ ok: true, command: 'open', dir: transferDir });
    if (joined.includes('transfer.js put')) stdout = JSON.stringify({ ok: true, command: 'put', path: `${transferDir}/block.md`, sha256: 'f'.repeat(64) });
    if (args[0] === 'exec' && args.includes('-p')) stdout = outputFor('claude', 'Direct build done.');
    if (joined.includes('SUITE_RESULT')) stdout = 'SUITE_RESULT {"passed":1,"total":1}\n';
    return { code: 0, stdout, stderr: '', timedOut: false, wallMs: 1 };
  };
  const backend = new DockerBackend({ checkoutDir: repoRoot, environment: { ANTHROPIC_API_KEY: 'x' }, exec });
  const loaded = corpus();
  const raw = await backend.run({ corpus: loaded, configuration: loaded.configurations[0], brief: loaded.briefs[0], route: 'direct-build', timeLimitMs: 1000 });
  assert.equal(raw.infraError, undefined);
  const flat = calls.map((args) => args.join(' '));
  const index = (needle) => flat.findIndex((line) => line.includes(needle));
  const installing = index('container-setup.js');
  const rootStep = index('mkdir -p -m 700 /tmp/claude-1000');
  const open = index('transfer.js open --harness claude');
  const put = index(`transfer.js put --dir ${transferDir} --path block.md --input-file`);
  assert.ok(installing >= 0 && rootStep > installing && open > rootStep && put > open, 'root, open, and put run in order after the install');
  assert.ok(flat.every((line) => !line.includes('benchmark-brief')), 'the old brief folder is gone');
  assert.ok(calls[open].every((arg) => arg !== '-u') && calls[put].every((arg) => arg !== '-u'), 'open and put run as the unprivileged user');
  const launch = flat.find((line) => line.includes('claude -p'));
  assert.match(launch, new RegExp(`-p /sai-direct-build --block-file ${transferDir}/block.md --block-hash [0-9a-f]{64} `));
});

test('E2: a failing transfer step is an infrastructure error and the agent never launches', async () => {
  const calls = [];
  const exec = async (command, args) => {
    calls.push(args);
    const joined = args.join(' ');
    const failing = joined.includes('transfer.js put');
    const stdout = joined.endsWith('id -u') ? '1000\n' : joined.includes('transfer.js open') ? '{"dir":"/tmp/claude-1000/sai/sai-transfer-x"}' : '';
    return { code: failing ? 1 : 0, stdout, stderr: failing ? 'put failed' : '', timedOut: false, wallMs: 1 };
  };
  const backend = new DockerBackend({ checkoutDir: repoRoot, environment: { ANTHROPIC_API_KEY: 'x' }, exec });
  const loaded = corpus();
  const raw = await backend.run({ corpus: loaded, configuration: loaded.configurations[0], brief: loaded.briefs[0], route: 'direct-build', timeLimitMs: 1000 });
  assert.match(raw.infraError, /Storing the brief block failed: put failed/);
  assert.ok(calls.every((args) => !args.includes('stream-json')), 'no launch');
});

test('E3: a timed-out launch skips the suite and still removes the container', async () => {
  const { calls, exec } = fakeDocker({ agentsTimeout: true });
  const backend = new DockerBackend({ checkoutDir: repoRoot, environment: { ANTHROPIC_API_KEY: 'x' }, exec });
  const loaded = corpus();
  const raw = await backend.run({ corpus: loaded, configuration: loaded.configurations[0], brief: loaded.briefs[0], route: 'plan', timeLimitMs: 1000 });
  assert.equal(raw.timedOut, true);
  assert.equal(raw.suite, undefined);
  assert.ok(calls.every((args) => !args.join(' ').includes('acceptance')));
  assert.equal(calls.at(-1)[0], 'rm');
});

test('E5: a missing credential is an infrastructure error before any container starts', async () => {
  const { calls, exec } = fakeDocker();
  const backend = new DockerBackend({ checkoutDir: repoRoot, environment: {}, exec });
  const loaded = corpus();
  const raw = await backend.run({ corpus: loaded, configuration: loaded.configurations[0], brief: loaded.briefs[0], route: 'plan', timeLimitMs: 1000 });
  assert.match(raw.infraError, /ANTHROPIC_API_KEY is not set/);
  assert.ok(calls.every((args) => args[0] === 'rm'));
});

test('I2: the container setup installs SAI, writes the models as agent tunables, and records a git baseline', () => {
  const root = tempDir();
  const project = path.join(root, 'project');
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, 'package.json'), '{}');
  const setupFile = path.join(root, 'setup.json');
  fs.writeFileSync(setupFile, JSON.stringify({
    harness: 'claude', project, checkout: repoRoot,
    models: { 'sai-3-red-worker': { model: 'sonnet', effort: 'low' } },
  }));
  execFileSync(process.execPath, [path.join(repoRoot, 'benchmark', 'container-setup.js'), setupFile], {
    env: { ...process.env, CLAUDE_CONFIG_DIR: path.join(root, 'claude-home') },
    stdio: 'pipe',
  });
  const agent = fs.readFileSync(path.join(project, '.claude', 'agents', 'sai-3-red-worker.md'), 'utf8');
  assert.match(agent, /^model: sonnet$/m);
  assert.match(agent, /^effort: low$/m);
  assert.ok(fs.existsSync(path.join(project, 'openspec', 'schemas', 'sai-workflow', 'schema.yaml')));
  assert.match(execFileSync('git', ['-C', project, 'log', '--format=%s'], { encoding: 'utf8' }), /benchmark baseline/);
});

#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const childProcess = require('child_process');
const crypto = require('crypto');
const { isDeepStrictEqual } = require('util');
const { loadInstallManifest, expandInstallManifest } = require('./install-manifest');
const { inspectManagedWorkerMigration, migrateManagedWorkerIdentity } = require('./managed-worker-migration');

let jsoncParser = null;
try {
  jsoncParser = require('jsonc-parser');
} catch {
  jsoncParser = null;
}

const OPENCODE_AGENT_KEYS = ['explore', 'executor', 'budget'];
const OPENCODE_PLACEHOLDER_MODEL = 'opencode-go/deepseek-v4-flash';
const CLAUDE_IMPLEMENTATION_WORKER_AGENT = 'sai-implementation-planning-worker.md';
const CLAUDE_IMPLEMENTATION_WORKER_OWNER = '.sai-implementation-planning-worker.owner.json';
const CLAUDE_DESIGN_WORKER_AGENT = 'sai-design-planning-worker.md';
const CLAUDE_DESIGN_WORKER_OWNER = '.sai-design-planning-worker.owner.json';
const LEGACY_CLAUDE_WORKERS = [
  { agent: 'sai-design-planning-worker.md', owner: '.sai-design-planning-worker.owner.json', replacement: 'sai-2-design-worker.md', replacementOwner: '.sai-2-design-worker.owner.json' },
  { agent: 'sai-implementation-planning-worker.md', owner: '.sai-implementation-planning-worker.owner.json', replacement: 'sai-3-implementation-worker.md', replacementOwner: '.sai-3-implementation-worker.owner.json' },
];

function migrateLegacyClaudeWorkers(targetPath = CLAUDE_BASE) {
  // Activated when Step 2 changes the canonical worker constants to numbered names.
  if (!CLAUDE_DESIGN_WORKER_AGENT.startsWith('sai-2-') || !CLAUDE_IMPLEMENTATION_WORKER_AGENT.startsWith('sai-3-')) return [];
  const migrated = [];
  for (const legacy of LEGACY_CLAUDE_WORKERS) {
    const agentsDir = path.join(targetPath, 'agents');
    const assessment = inspectManagedWorkerMigration({
      legacyPath: path.join(agentsDir, legacy.agent),
      legacyOwnerPath: path.join(agentsDir, legacy.owner),
      replacementPath: path.join(agentsDir, legacy.replacement),
      replacementOwnerPath: path.join(agentsDir, legacy.replacementOwner),
      replacementBytes: fs.readFileSync(path.join(REPOSITORY_ROOT, 'agents', 'claude', legacy.replacement)),
    });
    if (assessment.status === 'protected-collision') {
      throw new Error(`Incompatible Claude agent at ${path.join(agentsDir, legacy.replacement)}. Rename or remove the conflicting definition, then retry.`);
    }
    if (assessment.status !== 'not-found') migrated.push(migrateManagedWorkerIdentity({
      legacyPath: path.join(agentsDir, legacy.agent),
      legacyOwnerPath: path.join(agentsDir, legacy.owner),
      replacementPath: path.join(agentsDir, legacy.replacement),
      replacementOwnerPath: path.join(agentsDir, legacy.replacementOwner),
      replacementBytes: fs.readFileSync(path.join(REPOSITORY_ROOT, 'agents', 'claude', legacy.replacement)),
    }));
  }
  return migrated;
}
const OPENCODE_MANAGED_AGENTS = Object.freeze({
  'sai-implementation-coordinator': {
    mode: 'primary',
    model: 'opencode-go/glm-5.2',
    variant: 'high',
    permission: {
      task: {
        '*': 'deny',
        'sai-implementation-planning-worker': 'allow',
      },
      question: 'allow',
    },
  },
  'sai-implementation-planning-worker': {
    mode: 'subagent',
    model: 'opencode-go/kimi-k2.6',
    permission: {
      task: {
        '*': 'deny',
        budget: 'allow',
        explore: 'allow',
      },
    },
  },
  'sai-design-coordinator': {
    mode: 'primary',
    model: 'opencode-go/glm-5.2',
    variant: 'high',
    permission: {
      task: {
        '*': 'deny',
        'sai-design-planning-worker': 'allow',
        'sai-implementation-planning-worker': 'allow',
      },
      question: 'allow',
    },
  },
  'sai-design-planning-worker': {
    mode: 'subagent',
    model: 'opencode-go/glm-5.2',
    variant: 'high',
    permission: {
      task: { '*': 'deny', explore: 'allow' },
    },
  },
});

const REPOSITORY_ROOT = path.join(__dirname, '..');
const PACKAGE_VERSION = require(path.join(REPOSITORY_ROOT, 'package.json')).version;

function writeVersionMarker(baseDir) {
  ensureDir(baseDir);
  fs.writeFileSync(path.join(baseDir, '.version'), PACKAGE_VERSION);
}

const CLAUDE_BASE = path.join(os.homedir(), '.claude');
const OPENCODE_BASE = path.join(os.homedir(), '.config', 'opencode');

function getCopilotPromptsDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Code', 'User', 'prompts');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'prompts');
  } else {
    return path.join(os.homedir(), '.config', 'Code', 'User', 'prompts');
  }
}

function getCopilotSaiDir() {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Code', 'User', 'sai');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'sai');
  } else {
    return path.join(os.homedir(), '.config', 'Code', 'User', 'sai');
  }
}

const COPILOT_PROMPTS_BASE = getCopilotPromptsDir();
const COPILOT_SAI_BASE = getCopilotSaiDir();
const COPILOT_SKILLS_BASE = path.join(os.homedir(), '.copilot', 'skills');
const COPILOT_AGENTS_BASE = path.join(os.homedir(), '.copilot', 'agents');

const OPENCODE_INSTALL_CMD = 'npm i -g opencode-ai@latest';
const CODEGRAPH_CLI_INSTALL_CMD = 'npm i -g @colbymchenry/codegraph';
const CODEGRAPH_MCP_INSTALL_CMD = 'codegraph install';
const CODEGRAPH_WIRING_HINT = 'MCP wiring: run `codegraph install` if not already wired';
const OPENSPEC_INSTALL_CMD = 'npm i -g @fission-ai/openspec';

function probeOpencode() {
  const result = childProcess.spawnSync('opencode --version', { shell: true, stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function probeOpenspec() {
  const result = childProcess.spawnSync('openspec --version', { shell: true, stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function probeCodegraph() {
  const result = childProcess.spawnSync('codegraph --version', { shell: true, stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function runOpencodeInstall() {
  const result = childProcess.spawnSync('npm i -g opencode-ai@latest', { shell: true, stdio: 'inherit' });
  return !result.error && result.status === 0;
}

function runCodegraphInstall() {
  const cliResult = childProcess.spawnSync(CODEGRAPH_CLI_INSTALL_CMD, { shell: true, stdio: 'inherit' });
  if (cliResult.error || cliResult.status !== 0) {
    return false;
  }
  const mcpResult = childProcess.spawnSync(CODEGRAPH_MCP_INSTALL_CMD, { shell: true, stdio: 'inherit' });
  return !mcpResult.error && mcpResult.status === 0;
}

function runOpenspecInstall() {
  const result = childProcess.spawnSync(OPENSPEC_INSTALL_CMD, { shell: true, stdio: 'inherit' });
  return !result.error && result.status === 0;
}

async function promptYesNoReadline(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await new Promise(resolve => rl.question(question, resolve));
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

async function offerOpencodeInstall({
  probe = probeOpencode,
  runInstall = runOpencodeInstall,
  promptYesNo = promptYesNoReadline,
  isTTY = process.stdin.isTTY,
} = {}) {
  if (probe()) {
    return;
  }

  if (!isTTY) {
    console.log(OPENCODE_INSTALL_CMD);
    return;
  }

  const answer = await promptYesNo('Install opencode now? [y/n] ');
  if (answer) {
    const success = runInstall();
    if (!success) {
      console.log(OPENCODE_INSTALL_CMD);
    }
  } else {
    console.log(OPENCODE_INSTALL_CMD);
  }
}

async function offerCodegraphInstall({
  probe = probeCodegraph,
  runInstall = runCodegraphInstall,
  promptYesNo = promptYesNoReadline,
  isTTY = process.stdin.isTTY,
} = {}) {
  if (probe()) {
    console.log();
    console.log(CODEGRAPH_WIRING_HINT);
    return;
  }

  if (!isTTY) {
    console.log(CODEGRAPH_CLI_INSTALL_CMD);
    console.log(CODEGRAPH_MCP_INSTALL_CMD);
    return;
  }

  const answer = await promptYesNo('Install CodeGraph now? [y/n] ');
  if (answer) {
    const success = runInstall();
    if (!success) {
      console.log(CODEGRAPH_CLI_INSTALL_CMD);
      console.log(CODEGRAPH_MCP_INSTALL_CMD);
    }
  } else {
    console.log(CODEGRAPH_CLI_INSTALL_CMD);
    console.log(CODEGRAPH_MCP_INSTALL_CMD);
  }
}

// openspec is REQUIRED for the SAI workflow (unlike opencode/CodeGraph, which
// are optional). Returns true when openspec is present or was just installed,
// false when the caller must abort. Never calls process.exit itself so it stays
// unit-testable — the fatal exit lives in setup.js main().
async function offerOpenspecInstall({
  probe = probeOpenspec,
  runInstall = runOpenspecInstall,
  promptYesNo = promptYesNoReadline,
  isTTY = process.stdin.isTTY,
} = {}) {
  if (probe()) {
    return true;
  }

  console.log('openspec CLI not found — it is required for the SAI workflow.');

  if (!isTTY) {
    console.log(OPENSPEC_INSTALL_CMD);
    return false;
  }

  const answer = await promptYesNo('Install openspec now? [y/n] ');
  if (answer && runInstall()) {
    return true;
  }
  console.log(OPENSPEC_INSTALL_CMD);
  return false;
}

function promptChecklist(items, defaultSelected) {
  if (!process.stdin.isTTY) {
    console.error('Error: interactive mode requires a TTY. Run directly in a terminal.');
    process.exit(1);
  }

  return new Promise((resolve) => {
    const selected = items.map(item => defaultSelected.includes(item));
    let cursor = 0;
    let rendered = false;

    function render() {
      if (rendered) {
        process.stdout.write(`\x1B[${items.length}A`);
      }
      items.forEach((item, i) => {
        const check = selected[i] ? '[x]' : '[ ]';
        const arrow = i === cursor ? '>' : ' ';
        process.stdout.write(`${arrow} ${check} ${item}\n`);
      });
      rendered = true;
    }

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('keypress', onKey);
    }

    function onKey(str, key) {
      if (!key) return;
      if (key.sequence === '\x03' || str === 'q') {
        cleanup();
        process.exit(0);
      }
      if (key.name === 'up') {
        cursor = Math.max(0, cursor - 1);
        render();
      } else if (key.name === 'down') {
        cursor = Math.min(items.length - 1, cursor + 1);
        render();
      } else if (str === ' ') {
        selected[cursor] = !selected[cursor];
        render();
      } else if (key.name === 'return') {
        cleanup();
        resolve(items.filter((_, i) => selected[i]));
      }
    }

    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('keypress', onKey);

    render();
  });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copy(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function installClaudeManagedWorker(targetPath, agentName, ownerName) {
  const source = path.join(REPOSITORY_ROOT, 'agents', 'claude', agentName);
  const agentsDir = path.join(targetPath, 'agents');
  const destination = path.join(agentsDir, agentName);
  const ownerPath = path.join(agentsDir, ownerName);
  const sourceBytes = fs.readFileSync(source);
  const managedHash = sha256Buffer(sourceBytes);

  ensureDir(agentsDir);
  if (!fs.existsSync(destination)) {
    fs.writeFileSync(destination, sourceBytes);
    fs.writeFileSync(ownerPath, `${JSON.stringify({ managedHash }, null, 2)}\n`);
    return 'created';
  }

  const destinationHash = sha256Buffer(fs.readFileSync(destination));
  if (destinationHash !== managedHash) {
    throw new Error(`Incompatible Claude agent at ${destination}. Rename or remove the conflicting definition, then retry.`);
  }

  return fs.existsSync(ownerPath) ? 'reused-owned' : 'reused-user-owned';
}

function installClaudeImplementationWorker(targetPath) {
  return installClaudeManagedWorker(targetPath, CLAUDE_IMPLEMENTATION_WORKER_AGENT, CLAUDE_IMPLEMENTATION_WORKER_OWNER);
}

function destinationRoots(harness, roots) {
  if (harness === 'copilot') {
    return { commands: roots.prompts, sai: roots.sai, skills: roots.skills, agents: roots.agents, config: roots.sai };
  }
  return { commands: path.join(roots.base, 'commands'), sai: path.join(roots.base, 'sai'), skills: path.join(roots.base, 'skills'), agents: path.join(roots.base, 'agents'), config: roots.base };
}

function installProjection(projection, targetPath) {
  if (projection.strategy === 'merge-jsonc') {
    copyOpencodeConfig(targetPath);
    return;
  }
  if (projection.strategy === 'owned-copy') {
    const agentName = path.basename(projection.destinationPath);
    const ownerName = agentName === CLAUDE_IMPLEMENTATION_WORKER_AGENT ? CLAUDE_IMPLEMENTATION_WORKER_OWNER : CLAUDE_DESIGN_WORKER_OWNER;
    installClaudeManagedWorker(targetPath, agentName, ownerName);
    return;
  }
  copy(projection.sourcePath, projection.destinationPath);
}

function expandForInstall(harness, roots) {
  const manifest = loadInstallManifest(REPOSITORY_ROOT);
  return expandInstallManifest(manifest, {
    harness,
    repoRoot: REPOSITORY_ROOT,
    destinationRoot: destinationRoots(harness, roots),
  });
}

function listMdFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(dir, f));
}

function listMdFilesRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listMdFilesRecursive(entryPath));
      return;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  });

  return files;
}

function installClaude(destBase) {
  const targetPath = destBase || CLAUDE_BASE;
  for (const projection of expandForInstall('claude', { base: targetPath })) installProjection(projection, targetPath);

  writeVersionMarker(targetPath);
}

function installCopilot(promptsBase, skillsBase, agentsBase, saiBase) {
  const promptsPath = promptsBase || COPILOT_PROMPTS_BASE;
  const skillsPath = skillsBase || COPILOT_SKILLS_BASE;
  const agentsPath = agentsBase || COPILOT_AGENTS_BASE;
  const saiPath = saiBase || COPILOT_SAI_BASE;

  for (const projection of expandForInstall('copilot', { prompts: promptsPath, skills: skillsPath, agents: agentsPath, sai: saiPath })) installProjection(projection, saiPath);

  writeVersionMarker(saiPath);
}

function installOpencode(destBase) {
  const targetPath = destBase || OPENCODE_BASE;
  for (const projection of expandForInstall('opencode', { base: targetPath })) installProjection(projection, targetPath);

  writeVersionMarker(targetPath);
}

function printOpencodeConfigMessage(base) {
  console.log(`\nOpencode config already exists at ${base}. Verify that you have these settings properly configured:\n`);
  console.log('  "agent": {');
  console.log('    "explore": {');
  console.log('      "mode": "subagent",');
  console.log('      // Your trusted low-cost model below');
  console.log('      "model": "opencode-go/deepseek-v4-flash"');
  console.log('    },');
  console.log('    "executor": {');
  console.log('      "mode": "subagent",');
  console.log('      // Your trusted low-cost model below');
  console.log('      "model": "opencode-go/deepseek-v4-flash"');
  console.log('    },');
  console.log('    "budget": {');
  console.log('      "mode": "subagent",');
  console.log('      // Your trusted low-cost model below');
  console.log('      "model": "opencode-go/deepseek-v4-flash"');
  console.log('    }');
  console.log('  }');
  console.log('\nRequired namespaced implementation agents:');
  console.log(JSON.stringify(OPENCODE_MANAGED_AGENTS, null, 2));
  console.log('\nAdjust the model to your preferred low-cost provider.');
}

// Returns { text, added } on a successful (possibly no-op) merge, or null to
// signal the caller must fall back to printOpencodeConfigMessage.
function mergeOpencodeAgents(text) {
  if (!jsoncParser) {
    return null;
  }
  const { parse, modify, applyEdits } = jsoncParser;
  const errors = [];
  const root = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    return null;
  }
  if (root === null || typeof root !== 'object' || Array.isArray(root)) {
    return null;
  }
  if (Object.keys(root).length === 0) {
    return null;
  }
  const hasAgent = Object.prototype.hasOwnProperty.call(root, 'agent');
  if (hasAgent && (root.agent === null || typeof root.agent !== 'object' || Array.isArray(root.agent))) {
    return null;
  }
  const existing = hasAgent ? root.agent : {};
  const formattingOptions = { insertSpaces: true, tabSize: 2 };
  let out = text;
  const added = [];
  for (const [key, shape] of Object.entries(OPENCODE_MANAGED_AGENTS)) {
    if (Object.prototype.hasOwnProperty.call(existing, key) && !isDeepStrictEqual(existing[key], shape)) {
      throw new Error(`Incompatible opencode agent "${key}". Rename or remove the conflicting definition, then retry.`);
    }
  }

  const shapes = {
    explore: { mode: 'subagent', model: OPENCODE_PLACEHOLDER_MODEL },
    executor: { mode: 'subagent', model: OPENCODE_PLACEHOLDER_MODEL },
    budget: { mode: 'subagent', model: OPENCODE_PLACEHOLDER_MODEL },
    ...OPENCODE_MANAGED_AGENTS,
  };

  for (const [key, shape] of Object.entries(shapes)) {
    if (Object.prototype.hasOwnProperty.call(existing, key)) {
      continue;
    }
    const edits = modify(
      out,
      ['agent', key],
      shape,
      { formattingOptions }
    );
    out = applyEdits(out, edits);
    added.push(key);
  }
  return { text: out, added };
}

function copyOpencodeConfig(destBase) {
  const base = destBase || OPENCODE_BASE;
  const hasJson = fs.existsSync(path.join(base, 'opencode.json'));
  const hasJsonc = fs.existsSync(path.join(base, 'opencode.jsonc'));

  if (!hasJson && !hasJsonc) {
    copy(path.join(REPOSITORY_ROOT, 'configs', 'opencode.jsonc'), path.join(base, 'opencode.jsonc'));
    return;
  }

  // Precedence: opencode.json is merged over opencode.jsonc when both exist (ADR 0030).
  const target = path.join(base, hasJson ? 'opencode.json' : 'opencode.jsonc');
  const merged = mergeOpencodeAgents(fs.readFileSync(target, 'utf8'));

  if (!merged) {
    printOpencodeConfigMessage(base);
    return;
  }

  if (merged.added.length > 0) {
    fs.writeFileSync(target, merged.text);
    console.log(`Added opencode agent keys to ${target}: ${merged.added.join(', ')}. Adjust the placeholder model "${OPENCODE_PLACEHOLDER_MODEL}" to your preferred low-cost provider.`);
  }
}

function detectInstalledEditors() {
  const detected = [];
  if (fs.existsSync(CLAUDE_BASE)) detected.push('Claude Code');
  if (fs.existsSync(OPENCODE_BASE)) detected.push('Opencode');
  if (fs.existsSync(COPILOT_PROMPTS_BASE)) detected.push('GitHub Copilot');
  return detected;
}

async function main() {
  const preselected = detectInstalledEditors();
  const defaults = preselected.length > 0 ? preselected : ['Opencode'];
  const choices = await promptChecklist(
    ['Claude Code', 'Opencode', 'GitHub Copilot'],
    defaults
  );

  if (choices.length === 0) {
    console.log('Nothing selected. Exiting.');
    process.exit(0);
  }

  if (choices.includes('Claude Code')) {
    installClaude();
    console.log();
    console.log(`Claude commands installed to: ${path.join(CLAUDE_BASE, 'commands')}`);
    console.log(`Claude SAI commands/instructions installed to: ${path.join(CLAUDE_BASE, 'sai')}`);
    console.log(`Claude skills installed to: ${path.join(CLAUDE_BASE, 'skills')}`);
  }

  if (choices.includes('Opencode')) {
    console.log();
    await offerOpencodeInstall();
    installOpencode();
    copyOpencodeConfig();
    console.log(`Opencode commands installed to: ${path.join(OPENCODE_BASE, 'commands')}`);
    console.log(`Opencode SAI commands/instructions installed to: ${path.join(OPENCODE_BASE, 'sai')}`);
    console.log(`Opencode skills installed to: ${path.join(OPENCODE_BASE, 'skills')}`);
  }

  if (choices.includes('GitHub Copilot')) {
    installCopilot();
    console.log(`\nCopilot prompt files installed to: ${COPILOT_PROMPTS_BASE}`);
    console.log(`Copilot SAI commands/instructions installed to: ${COPILOT_SAI_BASE}`);
    console.log(`Copilot skills installed to: ${COPILOT_SKILLS_BASE}`);
    console.log(`Copilot agents installed to: ${COPILOT_AGENTS_BASE}`);
  }

  await offerCodegraphInstall();

  console.log(
    "\nReminder: run 'npx github:mmadariaga/shared-ai setup' in each project to configure the SAI workflow."
  );
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  PACKAGE_VERSION,
  ensureDir,
  copy,
  listMdFiles,
  listMdFilesRecursive,
  installClaude,
  installOpencode,
  installCopilot,
  copyOpencodeConfig,
  main,
  CLAUDE_BASE,
  OPENCODE_BASE,
  COPILOT_PROMPTS_BASE,
  COPILOT_SKILLS_BASE,
  COPILOT_AGENTS_BASE,
  COPILOT_SAI_BASE,
  OPENCODE_INSTALL_CMD,
  probeOpencode,
  runOpencodeInstall,
  promptYesNoReadline,
  offerOpencodeInstall,
  CODEGRAPH_CLI_INSTALL_CMD,
  CODEGRAPH_MCP_INSTALL_CMD,
  CODEGRAPH_WIRING_HINT,
  probeCodegraph,
  runCodegraphInstall,
  offerCodegraphInstall,
  OPENSPEC_INSTALL_CMD,
  probeOpenspec,
  runOpenspecInstall,
  offerOpenspecInstall,
  CLAUDE_IMPLEMENTATION_WORKER_AGENT,
  CLAUDE_IMPLEMENTATION_WORKER_OWNER,
  CLAUDE_DESIGN_WORKER_AGENT,
  CLAUDE_DESIGN_WORKER_OWNER,
  LEGACY_CLAUDE_WORKERS,
  migrateLegacyClaudeWorkers,
  inspectManagedWorkerMigration,
  migrateManagedWorkerIdentity,
  OPENCODE_MANAGED_AGENTS,
  sha256Buffer,
  installClaudeImplementationWorker,
  installClaudeManagedWorker,
};

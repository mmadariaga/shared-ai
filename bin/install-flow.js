#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const childProcess = require('child_process');
const crypto = require('crypto');
const { loadInstallManifest, expandInstallManifest, expandRetirementManifest } = require('./install-manifest');

let jsoncParser = null;
try {
  jsoncParser = require('jsonc-parser');
} catch {
  jsoncParser = null;
}

const CLAUDE_TUNABLE_KEYS = Object.freeze(['model', 'effort']);
const OPENCODE_TUNABLE_KEYS = Object.freeze(['model', 'variant']);

const TUNABLE_SCALAR = /^([A-Za-z0-9_-]+):\s*(.*)$/;

function splitFrontmatter(text) {
  const lines = text.split('\n');
  if (lines.length === 0 || lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;
  return { header: lines[0], frontmatter: lines.slice(1, end), rest: lines.slice(end) };
}

function extractTunableValues(text, tunableKeys) {
  const values = new Map();
  const split = splitFrontmatter(text);
  if (!split) return values;
  for (const line of split.frontmatter) {
    const match = TUNABLE_SCALAR.exec(line);
    if (match && tunableKeys.includes(match[1])) values.set(match[1], match[2]);
  }
  return values;
}

function spliceTunables(sourceText, destinationText, tunableKeys) {
  const split = splitFrontmatter(sourceText);
  if (!split) return sourceText;
  if (!splitFrontmatter(destinationText)) return sourceText;
  const fm = split.frontmatter;
  const destValues = extractTunableValues(destinationText, tunableKeys);
  const sourceKeys = extractTunableValues(sourceText, tunableKeys);

  const kept = [];
  let insertionIndex = fm.length;
  for (let i = 0; i < fm.length; i++) {
    const line = fm[i];
    const match = TUNABLE_SCALAR.exec(line);
    if (!match) {
      if (/^\s/.test(line) && insertionIndex === fm.length) insertionIndex = kept.length - 1;
      kept.push(line);
      continue;
    }
    if (tunableKeys.includes(match[1])) {
      if (destValues.has(match[1])) kept.push(`${match[1]}: ${destValues.get(match[1])}`);
      continue;
    }
    kept.push(line);
  }
  const appended = [];
  for (const key of tunableKeys) {
    if (!sourceKeys.has(key) && destValues.has(key)) appended.push(`${key}: ${destValues.get(key)}`);
  }
  if (insertionIndex === fm.length) insertionIndex = kept.length;
  return [split.header, ...kept.slice(0, insertionIndex), ...appended, ...kept.slice(insertionIndex), ...split.rest].join('\n');
}

function stripTunableLines(bytes, tunableKeys) {
  const text = bytes.toString('utf8');
  const split = splitFrontmatter(text);
  if (!split) return bytes;
  const kept = split.frontmatter.filter((line) => {
    const match = TUNABLE_SCALAR.exec(line);
    return !(match && tunableKeys.includes(match[1]));
  });
  return Buffer.from([split.header, ...kept, ...split.rest].join('\n'), 'utf8');
}

function deleteSidecarUnderShapeGuard(destinationPath) {
  const sidecarPath = path.join(path.dirname(destinationPath), `.${path.basename(destinationPath, '.md')}.owner.json`);
  if (!fs.existsSync(sidecarPath)) return false;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
  } catch {
    return false;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const keys = Object.keys(parsed);
  if (keys.length !== 1 || keys[0] !== 'managedHash') return false;
  if (typeof parsed.managedHash !== 'string' || !/^[0-9a-f]{64}$/.test(parsed.managedHash)) return false;
  fs.unlinkSync(sidecarPath);
  return true;
}

function tunableSeedInstaller(projection) {
  const sourceBytes = fs.readFileSync(projection.sourcePath);
  const destination = projection.destinationPath;
  const tunableKeys = projection.harness === 'claude' ? CLAUDE_TUNABLE_KEYS : OPENCODE_TUNABLE_KEYS;
  ensureDir(path.dirname(destination));
  let outcome;
  if (!fs.existsSync(destination)) {
    fs.writeFileSync(destination, sourceBytes);
    outcome = 'created';
  } else {
    const destinationBytes = fs.readFileSync(destination);
    const spliced = spliceTunables(sourceBytes.toString('utf8'), destinationBytes.toString('utf8'), tunableKeys);
    fs.writeFileSync(destination, spliced);
    const differs = !stripTunableLines(sourceBytes, tunableKeys).equals(stripTunableLines(destinationBytes, tunableKeys));
    outcome = differs ? 'overwritten' : 'reused';
    if (differs) {
      console.log(`Notice: managed agent body or non-tunable frontmatter differs from source; overwritten ${destination}`);
    }
  }
  deleteSidecarUnderShapeGuard(destination);
  return outcome;
}
const MANAGED_WORKERS = Object.freeze({
  'sai-3-implementation-worker': Object.freeze({
    claude: Object.freeze({
      agent: 'sai-3-implementation-worker.md',
    }),
  }),
  'sai-2-design-worker': Object.freeze({
    claude: Object.freeze({
      agent: 'sai-2-design-worker.md',
    }),
  }),
  'sai-5-review-worker': Object.freeze({
    claude: Object.freeze({
      agent: 'sai-5-review-worker.md',
    }),
  }),
  'sai-6-security-worker': Object.freeze({
    claude: Object.freeze({
      agent: 'sai-6-security-worker.md',
    }),
  }),
  'sai-7-performance-worker': Object.freeze({
    claude: Object.freeze({
      agent: 'sai-7-performance-worker.md',
    }),
  }),
  'sai-8-accessibility-worker': Object.freeze({
    claude: Object.freeze({
      agent: 'sai-8-accessibility-worker.md',
    }),
  }),
  'sai-1-spec-proposal-worker': Object.freeze({
    claude: Object.freeze({
      agent: 'sai-1-spec-proposal-worker.md',
    }),
  }),
});
const CLAUDE_IMPLEMENTATION_WORKER_AGENT = MANAGED_WORKERS['sai-3-implementation-worker'].claude.agent;
const CLAUDE_DESIGN_WORKER_AGENT = MANAGED_WORKERS['sai-2-design-worker'].claude.agent;
const CLAUDE_SPEC_WORKER_AGENT = MANAGED_WORKERS['sai-1-spec-proposal-worker'].claude.agent;
const CLAUDE_REVIEW_WORKER_AGENT = MANAGED_WORKERS['sai-5-review-worker'].claude.agent;
const REPOSITORY_ROOT = path.join(__dirname, '..');
const PACKAGE_VERSION = require(path.join(REPOSITORY_ROOT, 'package.json')).version;

const OPENCODE_BINDINGS_DIR = path.join(REPOSITORY_ROOT, 'sai', 'orchestration', 'workers', 'bindings', 'opencode');
const CLAUDE_BINDINGS_DIR = path.join(REPOSITORY_ROOT, 'sai', 'orchestration', 'workers', 'bindings', 'claude');

function expectedDispatchPrompt(workerName) {
  return `Worker contract: Fetch @sai/orchestration/workers/${workerName}.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>`;
}

function collectCallArguments(text, callName, bindingPath) {
  const matcher = new RegExp(`\\b${callName}\\s*\\(`, 'g');
  const calls = [];
  let match;
  while ((match = matcher.exec(text)) !== null) {
    const openIndex = matcher.lastIndex - 1;
    let depth = 1;
    let quote = null;
    let escaped = false;
    let closeIndex = -1;
    for (let index = openIndex + 1; index < text.length; index += 1) {
      const character = text[index];
      if (quote !== null) {
        if (escaped) {
          escaped = false;
        } else if (character === '\\') {
          escaped = true;
        } else if (character === quote) {
          quote = null;
        }
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
        if (depth === 0) {
          closeIndex = index;
          break;
        }
      }
    }
    if (closeIndex === -1 || quote !== null) {
      throw new Error(`Binding ${bindingPath} contains an unterminated ${callName} dispatch call.`);
    }
    calls.push(text.slice(openIndex + 1, closeIndex));
    matcher.lastIndex = closeIndex + 1;
  }
  return calls;
}

function quotedFieldValues(argumentsText, fieldName) {
  const matcher = new RegExp(`(?:^|,)\\s*${fieldName}\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, 'g');
  return [...argumentsText.matchAll(matcher)].map(match => match[1]);
}

function parseInitialDispatches(text, callName, bindingPath) {
  const dispatches = [];
  for (const argumentsText of collectCallArguments(text, callName, bindingPath)) {
    const names = quotedFieldValues(argumentsText, 'subagent_type');
    if (names.length === 0) continue;
    if (names.length !== 1) {
      throw new Error(`Binding ${bindingPath} must contain exactly one initial ${callName}(subagent_type: "...") declaration but found ${names.length}.`);
    }
    const prompts = quotedFieldValues(argumentsText, 'prompt');
    if (prompts.length !== 1 || prompts[0].includes('\n') || prompts[0].includes('\r')) {
      throw new Error(`Binding ${bindingPath} initial ${callName} for "${names[0]}" must contain exactly one double-quoted single-line prompt.`);
    }
    let prompt;
    try {
      prompt = JSON.parse(`"${prompts[0]}"`);
    } catch (error) {
      throw new Error(`Binding ${bindingPath} initial ${callName} for "${names[0]}" has an invalid escaped prompt: ${error.message}`);
    }
    dispatches.push({ name: names[0], prompt });
  }
  return dispatches;
}

function bindingPaths(bindingsDir) {
  return fs.readdirSync(bindingsDir)
    .filter(name => name.endsWith('.md'))
    .map(name => path.join(bindingsDir, name))
    .sort((left, right) => left.split(path.sep).join('/').localeCompare(right.split(path.sep).join('/')));
}

function validateClaudeWorkerBindings(bindingsDir = CLAUDE_BINDINGS_DIR) {
  const seenBy = new Map();
  for (const bindingPath of bindingPaths(bindingsDir)) {
    const text = fs.readFileSync(bindingPath, 'utf8');
    const dispatches = parseInitialDispatches(text, 'Agent', bindingPath);
    if (dispatches.length !== 1) {
      throw new Error(`Claude binding ${bindingPath} must contain exactly one initial Agent dispatch but found ${dispatches.length}.`);
    }
    const { name, prompt } = dispatches[0];
    if (!MANAGED_WORKERS[name]) {
      throw new Error(`Claude binding ${bindingPath} declares unknown worker "${name}".`);
    }
    if (seenBy.has(name)) {
      throw new Error(`Duplicate Claude worker "${name}" declared by ${seenBy.get(name)} and ${bindingPath}.`);
    }
    seenBy.set(name, bindingPath);
    if (prompt !== expectedDispatchPrompt(name)) {
      throw new Error(`Claude binding ${bindingPath} has the wrong initial prompt for "${name}"; expected the contract for ${name}.md.`);
    }
  }
  for (const name of Object.keys(MANAGED_WORKERS)) {
    if (!seenBy.has(name)) {
      throw new Error(`Claude worker "${name}" has no binding with a validated initial Agent dispatch.`);
    }
  }
}

function validateOpencodeWorkerBindings(bindingsDir = OPENCODE_BINDINGS_DIR) {
  const bindingFiles = bindingPaths(bindingsDir);
  if (bindingFiles.length === 0) {
    throw new Error(`Opencode bindings directory ${bindingsDir} contains no binding files; the worker roster cannot be derived.`);
  }
  const seenBy = new Map();
  for (const bindingPath of bindingFiles) {
    const text = fs.readFileSync(bindingPath, 'utf8');
    const dispatches = parseInitialDispatches(text, 'task', bindingPath);
    if (dispatches.length !== 1) {
      throw new Error(`Opencode binding ${bindingPath} must contain exactly one initial task dispatch but found ${dispatches.length}.`);
    }
    const { name, prompt } = dispatches[0];
    if (seenBy.has(name)) {
      throw new Error(`Duplicate opencode worker "${name}" declared by ${seenBy.get(name)} and ${bindingPath}.`);
    }
    seenBy.set(name, bindingPath);
    if (prompt !== expectedDispatchPrompt(name)) {
      throw new Error(`Opencode binding ${bindingPath} has the wrong initial prompt for "${name}"; expected the contract for ${name}.md.`);
    }
  }
  return [...seenBy.keys()];
}

function writeVersionMarker(baseDir) {
  ensureDir(baseDir);
  fs.writeFileSync(path.join(baseDir, '.version'), PACKAGE_VERSION);
}

const CLAUDE_BASE = path.join(os.homedir(), '.claude');
const OPENCODE_BASE = path.join(os.homedir(), '.config', 'opencode');

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

function destinationRoots(harness, roots) {
  return { commands: path.join(roots.base, 'commands'), sai: path.join(roots.base, 'sai'), skills: path.join(roots.base, 'skills'), agents: path.join(roots.base, 'agents'), config: roots.base };
}

function installProjection(projection, targetPath) {
  if (projection.strategy === 'merge-jsonc') {
    copyOpencodeConfig(targetPath);
    return;
  }
  if (projection.strategy === 'tunable-seed') {
    tunableSeedInstaller(projection);
    return;
  }
  if (projection.strategy === 'owned-copy') {
    throw new Error(`Projection ${projection.id} declares the retired owned-copy strategy; use tunable-seed`);
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

function cleanupRetiredProjections(harness, roots) {
  const manifest = loadInstallManifest(REPOSITORY_ROOT);
  const retirements = expandRetirementManifest(manifest, {
    harness,
    repoRoot: REPOSITORY_ROOT,
    destinationRoot: destinationRoots(harness, roots),
  });
  const results = [];
  for (const retirement of retirements) {
    if (!fs.existsSync(retirement.destinationPath)) {
      results.push({ ...retirement, action: 'not-found' });
      continue;
    }
    const currentHash = sha256Buffer(fs.readFileSync(retirement.destinationPath));
    if (!retirement.managedHashes.includes(currentHash)) {
      results.push({ ...retirement, action: 'preserved' });
      continue;
    }
    fs.unlinkSync(retirement.destinationPath);
    results.push({ ...retirement, action: 'deleted' });
  }
  return results;
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
  validateClaudeWorkerBindings();
  const targetPath = destBase || CLAUDE_BASE;
  cleanupRetiredProjections('claude', { base: targetPath });
  for (const projection of expandForInstall('claude', { base: targetPath })) installProjection(projection, targetPath);

  writeVersionMarker(targetPath);
}

function installOpencode(destBase) {
  validateOpencodeWorkerBindings();
  const targetPath = destBase || OPENCODE_BASE;
  cleanupRetiredProjections('opencode', { base: targetPath });
  for (const projection of expandForInstall('opencode', { base: targetPath })) installProjection(projection, targetPath);

  writeVersionMarker(targetPath);
}

function printOpencodeConfigMessage(base) {
  console.log(`\nOpencode config already exists at ${base}. Verify that you have these settings properly configured:\n`);
  console.log('  "permission": {');
  console.log('    "external_directory": {');
  console.log('      "~/.config/opencode/sai/**": "allow"');
  console.log('    }');
  console.log('  }');
  console.log('\nThis narrow external-directory authorization is the only setting the installer merges into an existing config. The generic agents (explore, executor, budget) are managed agent files under ~/.config/opencode/agents/ and need no config entry.');
}

const OPENCODE_SAI_PERMISSION_PATTERN = '~/.config/opencode/sai/**';
const PERMISSION_ACTIONS = new Set(['allow', 'ask', 'deny']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function createPermissionMatchContext(overrides = {}) {
  return {
    homeDirectory: overrides.homeDirectory || os.homedir(),
    caseSensitive: overrides.caseSensitive ?? process.platform !== 'win32',
    separators: overrides.separators || ['/', '\\'],
  };
}

function normalizePermissionPattern(value, context) {
  let expanded = value;
  if (expanded === '~') expanded = context.homeDirectory;
  else if (expanded.startsWith('~/') || expanded.startsWith('~\\')) {
    expanded = context.homeDirectory + expanded.slice(1);
  } else if (expanded === '$HOME') expanded = context.homeDirectory;
  else if (expanded.startsWith('$HOME/') || expanded.startsWith('$HOME\\')) {
    expanded = context.homeDirectory + expanded.slice(5);
  }

  for (const separator of context.separators) {
    if (separator !== '/') expanded = expanded.split(separator).join('/');
  }

  const prefix = expanded.startsWith('/') ? '/' : '';
  const segments = [];
  for (const segment of expanded.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..' && segments.length > 0 && segments.at(-1) !== '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  const normalized = prefix + segments.join('/');
  return context.caseSensitive ? normalized : normalized.toLowerCase();
}

function wildcardMatches(value, pattern) {
  const expression = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${expression}$`, 's').test(value);
}

function invalidPermissionResult(text, location, detail) {
  return {
    text,
    redundantKeys: [],
    messages: [
      `OpenCode SAI permission: no change for ${OPENCODE_SAI_PERMISSION_PATTERN}; ${location} has invalid ${detail}; expected allow, ask, deny, or a rule object.`,
    ],
  };
}

function classifySaiPermission(permission, context) {
  if (permission === undefined) return { action: 'append' };
  if (typeof permission === 'string') {
    if (!PERMISSION_ACTIONS.has(permission)) {
      return { invalid: ['permission', 'action'] };
    }
    return { action: 'preserve-scalar', value: permission, location: 'permission' };
  }
  if (Array.isArray(permission)) return { invalid: ['permission', 'array'] };
  if (!isPlainObject(permission)) return { invalid: ['permission', 'shape'] };

  const external = permission.external_directory;
  if (external === undefined) return { action: 'append' };
  if (typeof external === 'string') {
    if (!PERMISSION_ACTIONS.has(external)) {
      return { invalid: ['permission.external_directory', 'action'] };
    }
    return { action: 'preserve-scalar', value: external, location: 'permission.external_directory' };
  }
  if (!isPlainObject(external)) return { invalid: ['permission.external_directory', 'shape'] };

  const generated = normalizePermissionPattern(OPENCODE_SAI_PERMISSION_PATTERN, context);
  const probe = normalizePermissionPattern('~/.config/opencode/sai/__sai_probe__', context);
  let equivalent = false;
  let equivalentCandidate;
  let effective;
  for (const [candidate, action] of Object.entries(external)) {
    if (!PERMISSION_ACTIONS.has(action)) {
      return {
        invalid: [
          'permission.external_directory',
          'action',
        ],
      };
    }
    const normalized = normalizePermissionPattern(candidate, context);
    if (normalized === generated) {
      equivalent = true;
      equivalentCandidate = candidate;
    }
    if (wildcardMatches(probe, normalized)) effective = action;
  }

  if (effective === 'ask' || effective === 'deny') {
    return { action: 'restricted', value: effective, equivalentCandidate };
  }
  return { action: equivalent ? 'unchanged' : 'append' };
}

function mergeOpencodeAgents(text, permissionContext = createPermissionMatchContext()) {
  if (!jsoncParser) return null;
  const { parse, modify, applyEdits } = jsoncParser;
  const errors = [];
  const root = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0 || !isPlainObject(root)) return null;

  const permissionState = classifySaiPermission(root.permission, permissionContext);
  if (permissionState.invalid) {
    return invalidPermissionResult(text, permissionState.invalid[0], permissionState.invalid[1]);
  }

  const redundantKeys = isPlainObject(root.agent)
    ? ['explore', 'executor', 'budget'].filter(key => Object.prototype.hasOwnProperty.call(root.agent, key))
    : [];

  const formattingOptions = { insertSpaces: true, tabSize: 2 };
  let out = text;
  const messages = [];

  if (permissionState.action === 'append') {
    if (root.permission === undefined) {
      out = applyEdits(out, modify(out, ['permission'], {}, { formattingOptions }));
    }
    out = applyEdits(out, modify(
      out,
      ['permission', 'external_directory', OPENCODE_SAI_PERMISSION_PATTERN],
      'allow',
      { formattingOptions },
    ));
  } else if (permissionState.action === 'restricted') {
    if (permissionState.equivalentCandidate !== undefined) {
      out = applyEdits(out, modify(
        out,
        ['permission', 'external_directory', permissionState.equivalentCandidate],
        permissionState.value,
        { formattingOptions },
      ));
    }
    messages.push(
      `OpenCode SAI permission: preserved ${permissionState.value} for ${OPENCODE_SAI_PERMISSION_PATTERN}; explicit user restriction prevents automatic SAI access.`,
    );
  } else if (permissionState.action === 'preserve-scalar') {
    if (permissionState.value === 'allow') {
      messages.push(
        `OpenCode SAI permission: preserved allow at ${permissionState.location}; existing broad user permission allows ${OPENCODE_SAI_PERMISSION_PATTERN}.`,
      );
    } else {
      messages.push(
        `OpenCode SAI permission: preserved ${permissionState.value} for ${OPENCODE_SAI_PERMISSION_PATTERN}; explicit user restriction prevents automatic SAI access.`,
      );
    }
  }

  return { text: out, messages, redundantKeys };
}

function copyOpencodeConfig(destBase) {
  const base = destBase || OPENCODE_BASE;
  const hasJson = fs.existsSync(path.join(base, 'opencode.json'));
  const hasJsonc = fs.existsSync(path.join(base, 'opencode.jsonc'));

  if (!hasJson && !hasJsonc) {
    const target = path.join(base, 'opencode.jsonc');
    copy(path.join(REPOSITORY_ROOT, 'configs', 'opencode.jsonc'), target);
    const initial = fs.readFileSync(target, 'utf8');
    const merged = mergeOpencodeAgents(initial);
    if (merged && merged.text !== initial) fs.writeFileSync(target, merged.text);
    return;
  }

  // Precedence: opencode.json is merged over opencode.jsonc when both exist (ADR 0030).
  const target = path.join(base, hasJson ? 'opencode.json' : 'opencode.jsonc');
  const merged = mergeOpencodeAgents(fs.readFileSync(target, 'utf8'));

  if (!merged) {
    printOpencodeConfigMessage(base);
    return;
  }

  if (merged.text !== fs.readFileSync(target, 'utf8')) {
    fs.writeFileSync(target, merged.text);
  }
  if (merged.redundantKeys.length > 0) {
    console.log(`Migration notice: redundant opencode agent keys detected in ${target}: ${merged.redundantKeys.join(', ')}. The projected agent files under ~/.config/opencode/agents/ now take precedence — agent files take precedence for the keys they declare, including model — a tuned model in the config is no longer effective. Config-only keys the agent files do not declare (for example tools or options) still apply. To keep a tuned model, edit the model line in the matching agent file (~/.config/opencode/agents/{explore,executor,budget}.md), which the tunable-seed lifecycle preserves. Removing the now-redundant keys from the config is your decision; the installer never edits the config.`);
  }
  for (const message of merged.messages) console.log(message);
}

function detectInstalledEditors() {
  const detected = [];
  if (fs.existsSync(CLAUDE_BASE)) detected.push('Claude Code');
  if (fs.existsSync(OPENCODE_BASE)) detected.push('Opencode');
  return detected;
}

async function main() {
  const preselected = detectInstalledEditors();
  const defaults = preselected.length > 0 ? preselected : ['Opencode'];
  const choices = await promptChecklist(
    ['Claude Code', 'Opencode'],
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
  copyOpencodeConfig,
  main,
  CLAUDE_BASE,
  OPENCODE_BASE,
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
  MANAGED_WORKERS,
  CLAUDE_IMPLEMENTATION_WORKER_AGENT,
  CLAUDE_DESIGN_WORKER_AGENT,
  CLAUDE_SPEC_WORKER_AGENT,
  CLAUDE_REVIEW_WORKER_AGENT,
  cleanupRetiredProjections,
  installProjection,
  sha256Buffer,
  CLAUDE_TUNABLE_KEYS,
  OPENCODE_TUNABLE_KEYS,
  tunableSeedInstaller,
  deleteSidecarUnderShapeGuard,
  stripTunableLines,
  __test: {
    mergeOpencodeAgents,
    expectedDispatchPrompt,
    parseInitialDispatches,
    validateClaudeWorkerBindings,
    validateOpencodeWorkerBindings,
    createPermissionMatchContext,
    normalizePermissionPattern,
    wildcardMatches,
  },
};

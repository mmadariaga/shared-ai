#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const childProcess = require('child_process');
const crypto = require('crypto');
const { loadInstallManifest, expandInstallManifest, expandRetirementManifest, matrixRenderFor } = require('./install-manifest');

let jsoncParser = null;
try {
  jsoncParser = require('jsonc-parser');
} catch {
  jsoncParser = null;
}

const CLAUDE_TUNABLE_KEYS = Object.freeze(['model', 'effort']);
const OPENCODE_TUNABLE_KEYS = Object.freeze(['model', 'variant']);

const TUNABLE_SCALAR = /^([A-Za-z0-9_-]+):\s*(.*)$/;
const INVOCATION_ENVELOPE_FIELD = 'arguments_value';
const RETIRED_INVOCATION_ENVELOPE_FIELD = ['wrapper', 'echo', 'value'].join('_');

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
  // Opencode markdown uses a single-line `model: <id>#<variant>` with no
  // `variant:` line. Preserve the destination's combined model line and drop
  // any residual `variant:` lines so a reinstall migrates legacy files.
  if (tunableKeys.includes('variant')) {
    const destValues = extractTunableValues(destinationText, tunableKeys);
    const destModelRaw = destValues.get('model');
    const destVariantRaw = destValues.get('variant');
    let destCombined;
    if (destModelRaw !== undefined) {
      const trimmed = String(destModelRaw).trim();
      if (trimmed.includes('#')) destCombined = trimmed;
      else if (destVariantRaw !== undefined) destCombined = `${trimmed}#${String(destVariantRaw).trim()}`;
      else destCombined = trimmed;
    }
    const fm = split.frontmatter;
    const kept = [];
    let insertionIndex = fm.length;
    let seenModel = false;
    for (let i = 0; i < fm.length; i++) {
      const line = fm[i];
      const match = TUNABLE_SCALAR.exec(line);
      if (!match) {
        if (/^\s/.test(line) && insertionIndex === fm.length) insertionIndex = kept.length - 1;
        kept.push(line);
        continue;
      }
      if (match[1] === 'variant') continue;
      if (match[1] === 'model') {
        if (destCombined !== undefined) {
          if (!seenModel) {
            kept.push(`model: ${destCombined}`);
            seenModel = true;
          }
          continue;
        }
        kept.push(line);
        seenModel = true;
        continue;
      }
      kept.push(line);
    }
    if (destCombined !== undefined && !seenModel) {
      if (insertionIndex === fm.length) insertionIndex = kept.length;
      kept.splice(insertionIndex, 0, `model: ${destCombined}`);
      if (insertionIndex === fm.length) insertionIndex = kept.length;
      return [split.header, ...kept.slice(0, insertionIndex), ...kept.slice(insertionIndex), ...split.rest].join('\n');
    }
    if (insertionIndex === fm.length) insertionIndex = kept.length;
    return [split.header, ...kept.slice(0, insertionIndex), ...kept.slice(insertionIndex), ...split.rest].join('\n');
  }
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
  // Strips both `model:` (including the canonical single-line
  // `model: <id>#<variant>`) and legacy `variant:` lines so body-identity
  // comparison ignores tunables in either physical shape during migration.
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
  const sourceBytes = projection.sourceText !== undefined
    ? Buffer.from(projection.sourceText, 'utf8')
    : fs.readFileSync(projection.sourcePath);
  const destination = projection.destinationPath;
  ensureDir(path.dirname(destination));
  let outcome;
  if (!fs.existsSync(destination)) {
    fs.writeFileSync(destination, sourceBytes);
    outcome = 'created';
  } else {
    const destinationBytes = fs.readFileSync(destination);
    const differs = !sourceBytes.equals(destinationBytes);
    fs.writeFileSync(destination, sourceBytes);
    outcome = differs ? 'overwritten' : 'reused';
    if (differs) {
      console.log(`Notice: managed agent differs from source; overwritten ${destination}`);
    }
  }
  deleteSidecarUnderShapeGuard(destination);
  return outcome;
}
const REPOSITORY_ROOT = path.join(__dirname, '..');
const PACKAGE_VERSION = require(path.join(REPOSITORY_ROOT, 'package.json')).version;

const OPENCODE_BINDINGS_DIR = path.join(REPOSITORY_ROOT, 'sai', 'orchestration', 'workers', 'bindings', 'opencode');
const CLAUDE_BINDINGS_DIR = path.join(REPOSITORY_ROOT, 'sai', 'orchestration', 'workers', 'bindings', 'claude');

// The managed-worker census is no longer hand-maintained: it is derived from
// the validated Worker Matrix phase entries. The canonical key order below is
// preserved for compatibility with consumers that read MANAGED_WORKERS.
const MANAGED_WORKER_ORDER = Object.freeze([
  'sai-3-implementation-worker',
  'sai-2-design-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
  'sai-1-spec-proposal-worker',
  'sai-commit-worker',
  'sai-archive-worker',
  'sai-backfill-worker',
  'sai-merge-worker',
  'sai-4-red-worker',
  'sai-4-green-worker',
  'sai-direct-build-worker',
  'sai-review-fix-worker',
]);

function matrixRenderings(harness) {
  return matrixRenderFor(loadInstallManifest(REPOSITORY_ROOT), harness, REPOSITORY_ROOT);
}

function matrixBindings(harness) {
  return matrixRenderings(harness).filter(item => item.kind === 'binding');
}

function matrixWorkerRoster(harness) {
  const names = [];
  for (const binding of matrixBindings(harness)) {
    const name = binding.entry.workerName;
    if (!names.includes(name)) names.push(name);
  }
  return names;
}


const MANAGED_WORKERS = Object.freeze(Object.fromEntries(
  MANAGED_WORKER_ORDER.map(name => [name, Object.freeze({ claude: Object.freeze({ agent: `${name}.md` }) })])
));
const CLAUDE_IMPLEMENTATION_WORKER_AGENT = MANAGED_WORKERS['sai-3-implementation-worker'].claude.agent;
const CLAUDE_DESIGN_WORKER_AGENT = MANAGED_WORKERS['sai-2-design-worker'].claude.agent;
const CLAUDE_SPEC_WORKER_AGENT = MANAGED_WORKERS['sai-1-spec-proposal-worker'].claude.agent;
const CLAUDE_REVIEW_WORKER_AGENT = MANAGED_WORKERS['sai-5-review-worker'].claude.agent;

const MANAGED_WORKER_CONTRACTS = Object.freeze(Object.fromEntries(
  loadInstallManifest(REPOSITORY_ROOT)['worker-matrix'].entries.map(entry => [entry.workerName, entry.workerContract])
));

function expectedDispatchPrompt(workerName) {
  const contract = MANAGED_WORKER_CONTRACTS[workerName];
  return `Worker contract: Fetch @${contract} and follow it exactly.\n\nReturn event: ready now; await task disclosure in the same-worker continuation.\n\nReturn exactly:\n\`\`\`yaml\nevent: ready\nchanged_files: []\n\`\`\``;
}

function assertOneStringInvocationEnvelope(text, bindingPath) {
  if (text.includes(RETIRED_INVOCATION_ENVELOPE_FIELD)) {
    throw new Error(
      `Binding ${bindingPath} declares retired ${RETIRED_INVOCATION_ENVELOPE_FIELD}; `
      + `the InvocationEnvelope contains only ${INVOCATION_ENVELOPE_FIELD}`
    );
  }
}

function isGeneratedOpencodeBindingPath(candidatePath) {
  return path.basename(candidatePath).endsWith('-worker.md');
}

function assertBindingDirectoryUsesOneStringEnvelope(bindingsDir, { allowAbsentGenerated = false } = {}) {
  for (const name of fs.readdirSync(bindingsDir)) {
    if (!name.endsWith('.md')) continue;
    const bindingPath = path.join(bindingsDir, name);
    try {
      assertOneStringInvocationEnvelope(fs.readFileSync(bindingPath, 'utf8'), bindingPath);
    } catch (error) {
      if (allowAbsentGenerated && error.code === 'ENOENT' && isGeneratedOpencodeBindingPath(bindingPath)) continue;
      throw error;
    }
  }
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
  assertOneStringInvocationEnvelope(text, bindingPath);
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

function parseClaudeInitialDispatches(text, bindingPath) {
  assertOneStringInvocationEnvelope(text, bindingPath);
  const dispatches = [];
  for (const argumentsText of collectCallArguments(text, 'Agent', bindingPath)) {
    const names = quotedFieldValues(argumentsText, 'name');
    if (names.length === 0) continue;
    if (names.length !== 1) {
      throw new Error(`Binding ${bindingPath} must contain exactly one initial Agent(name: "...") declaration but found ${names.length}.`);
    }
    const prompts = quotedFieldValues(argumentsText, 'prompt');
    if (prompts.length !== 1 || prompts[0].includes('\n') || prompts[0].includes('\r')) {
      throw new Error(`Binding ${bindingPath} initial Agent for "${names[0]}" must contain exactly one double-quoted single-line prompt.`);
    }
    let prompt;
    try {
      prompt = JSON.parse(`"${prompts[0]}"`);
    } catch (error) {
      throw new Error(`Binding ${bindingPath} initial Agent for "${names[0]}" has an invalid escaped prompt: ${error.message}`);
    }
    dispatches.push({ name: names[0], prompt });
  }
  return dispatches;
}

function validateClaudeWorkerBindings() {
  assertBindingDirectoryUsesOneStringEnvelope(CLAUDE_BINDINGS_DIR);
  const roster = matrixWorkerRoster('claude');
  if (roster.length !== 15) {
    throw new Error('Claude worker roster cannot be derived from the validated Worker Matrix; expected the ordered fifteen-worker roster.');
  }
  const seenBy = new Map();
  for (const binding of matrixBindings('claude')) {
    const dispatches = parseClaudeInitialDispatches(binding.text, binding.destinationName);
    if (dispatches.length !== 1) {
      throw new Error(`Claude binding ${binding.destinationName} must contain exactly one initial Agent dispatch but found ${dispatches.length}.`);
    }
    const { name, prompt } = dispatches[0];
    if (!roster.includes(name)) {
      throw new Error(`Claude binding ${binding.destinationName} declares unknown worker "${name}".`);
    }
    if (seenBy.has(name)) {
      throw new Error(`Duplicate Claude worker "${name}" declared by ${seenBy.get(name)} and ${binding.destinationName}.`);
    }
    seenBy.set(name, binding.destinationName);
    if (prompt !== expectedDispatchPrompt(name)) {
      throw new Error(`Claude binding ${binding.destinationName} has the wrong initial prompt for "${name}"; expected the matrix prompt for ${binding.entry.phase}.`);
    }
  }
  for (const name of roster) {
    if (!seenBy.has(name)) {
      throw new Error(`Claude worker "${name}" has no binding with a validated initial Agent dispatch.`);
    }
  }
}

function validateOpencodeWorkerBindings(bindingsDir = OPENCODE_BINDINGS_DIR) {
  const canonicalBindings = matrixBindings('opencode');
  const validate = () => {
    assertBindingDirectoryUsesOneStringEnvelope(bindingsDir, { allowAbsentGenerated: true });
    const allFiles = fs.readdirSync(bindingsDir);
    if (allFiles.length === 0) {
      throw new Error(`Opencode bindings directory ${bindingsDir} contains no binding files; the worker roster cannot be derived.`);
    }
    const rosterByEntry = new Map(canonicalBindings.map(binding => [binding.entry.workerName, binding]));
    const canonicalBindingText = (binding) => {
      const bindingPath = path.join(bindingsDir, binding.destinationName);
      try {
        return fs.readFileSync(bindingPath, 'utf8');
      } catch (error) {
        // Matrix rendering has already validated this generated source. The
        // canonical opencode tree intentionally need not contain materialized
        // per-worker files, so an absent entry falls back to matrix text.
        if (error.code === 'ENOENT') return binding.text;
        throw error;
      }
    };
    const bindingFiles = allFiles
    .filter(name => name.endsWith('-worker.md'))
    .map(name => path.join(bindingsDir, name))
    .sort((left, right) => left.split(path.sep).join('/').localeCompare(right.split(path.sep).join('/')));
    if (bindingFiles.length > 0) {
    const seenBy = new Map();
    for (const bindingPath of bindingFiles) {
      const text = fs.readFileSync(bindingPath, 'utf8');
      const dispatches = parseInitialDispatches(text, 'task', bindingPath);
      if (dispatches.length !== 1) {
        throw new Error(`Opencode binding ${bindingPath} must contain exactly one initial task dispatch but found ${dispatches.length}.`);
      }
      const { name, prompt } = dispatches[0];
      const binding = rosterByEntry.get(name);
      if (!binding) {
        throw new Error(`Opencode binding ${bindingPath} declares unknown worker "${name}".`);
      }
      if (seenBy.has(name)) {
        throw new Error(`Duplicate opencode worker "${name}" declared by ${seenBy.get(name)} and ${bindingPath}.`);
      }
      seenBy.set(name, bindingPath);
      if (prompt !== expectedDispatchPrompt(name)) {
        throw new Error(`Opencode binding ${bindingPath} has the wrong initial prompt for "${name}"; expected the matrix prompt for ${binding.entry.phase}.`);
      }
    }
    for (const workerName of rosterByEntry.keys()) {
      if (!seenBy.has(workerName)) {
        throw new Error(`Opencode worker "${workerName}" has no binding with a validated initial task dispatch.`);
      }
    }
    if (seenBy.size !== 15) {
      throw new Error('Opencode worker roster must contain exactly the ordered fifteen-worker roster.');
    }
      return [...seenBy.keys()].sort((left, right) =>
        left.split(path.sep).join('/').localeCompare(right.split(path.sep).join('/')));
    }
    const seenBy = new Map();
    for (const binding of canonicalBindings) {
    const bindingPath = path.join(bindingsDir, binding.destinationName);
    const dispatches = parseInitialDispatches(canonicalBindingText(binding), 'task', bindingPath);
    if (dispatches.length !== 1) {
      throw new Error(`Opencode binding ${bindingPath} must contain exactly one initial task dispatch but found ${dispatches.length}.`);
    }
    const { name, prompt } = dispatches[0];
    const expected = rosterByEntry.get(name);
    if (!expected) {
      throw new Error(`Opencode binding ${bindingPath} declares unknown worker "${name}".`);
    }
    if (seenBy.has(name)) {
      throw new Error(`Duplicate opencode worker "${name}" declared by ${seenBy.get(name)} and ${bindingPath}.`);
    }
    seenBy.set(name, bindingPath);
    if (prompt !== expectedDispatchPrompt(name)) {
      throw new Error(`Opencode binding ${bindingPath} has the wrong initial prompt for "${name}"; expected the matrix prompt for ${binding.entry.phase}.`);
    }
    }
    return [...seenBy.keys()];
  };
  return validate();
}

function writeVersionMarker(baseDir) {
  ensureDir(baseDir);
  fs.writeFileSync(path.join(baseDir, '.version'), PACKAGE_VERSION);
}

const CLAUDE_BASE = path.join(os.homedir(), '.claude');
const OPENCODE_BASE = path.join(os.homedir(), '.config', 'opencode');
const OPENCODE_SAI_PERMISSION_PATTERN_FALLBACK = '~/.config/opencode/sai/**';

function parseOpencodeDebugPathsOutput(stdout) {
  if (typeof stdout !== 'string') return null;
  for (const rawLine of stdout.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    const match = /^config\s+(.+?)\s*$/.exec(line);
    if (match) {
      const value = match[1].trim();
      if (value !== '') return value;
    }
  }
  return null;
}

function resolveOpencodeBase({ spawnSync: spawnFn = childProcess.spawnSync, env: runEnv = process.env } = {}) {
  try {
    const result = spawnFn('opencode debug paths', { shell: true, encoding: 'utf8', env: runEnv });
    if (!result || result.error || result.status !== 0 || typeof result.stdout !== 'string') return OPENCODE_BASE;
    const parsed = parseOpencodeDebugPathsOutput(result.stdout);
    if (!parsed) return OPENCODE_BASE;
    return parsed;
  } catch {
    return OPENCODE_BASE;
  }
}

function toPosixOpencodePath(value) {
  return String(value).replace(/\\/g, '/');
}

function isDefaultOpencodeBase(candidate) {
  if (typeof candidate !== 'string' || candidate === '') return false;
  try {
    const normalize = (v) => {
      let n = path.normalize(v);
      if (n.length > 1 && n.endsWith(path.sep)) n = n.slice(0, -1);
      return process.platform === 'win32' ? n.toLowerCase() : n;
    };
    return normalize(candidate) === normalize(OPENCODE_BASE);
  } catch {
    return false;
  }
}

function opencodeSaiPermissionPatternFor(opencodeBase) {
  const base = opencodeBase || resolveOpencodeBase();
  if (isDefaultOpencodeBase(base)) return OPENCODE_SAI_PERMISSION_PATTERN_FALLBACK;
  const posix = toPosixOpencodePath(base).replace(/\/+$/, '');
  return `${posix}/sai/**`;
}

function opencodeSaiProbeFor(opencodeBase) {
  const pattern = opencodeSaiPermissionPatternFor(opencodeBase);
  if (pattern.endsWith('/**')) return `${pattern.slice(0, -2)}__sai_probe__`;
  return `${pattern}/__sai_probe__`;
}

function opencodeAgentsDisplayFor(opencodeBase) {
  const base = opencodeBase || resolveOpencodeBase();
  if (isDefaultOpencodeBase(base)) return '~/.config/opencode/agents/';
  const posix = toPosixOpencodePath(base).replace(/\/+$/, '');
  return `${posix}/agents/`;
}

function rewriteOpencodeConfigPrefixes(text, opencodeBase) {
  const base = opencodeBase || resolveOpencodeBase();
  if (isDefaultOpencodeBase(base)) return text;
  const posix = toPosixOpencodePath(base).replace(/\/+$/, '');
  return text.split('~/.config/opencode/').join(`${posix}/`);
}

const OPENCODE_INSTALL_CMD = 'npm i -g opencode-ai@latest';
const CODEGRAPH_CLI_INSTALL_CMD = 'npm i -g @colbymchenry/codegraph';
const CODEGRAPH_MCP_INSTALL_CMD = 'codegraph install -y -t claude,opencode';
const OPENSPEC_INSTALL_CMD = 'npm i -g @fission-ai/openspec';

function emitInstallerNotice(notices, line) {
  if (Array.isArray(notices)) notices.push(line);
  else console.log(line);
}

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
  notices,
} = {}) {
  if (probe()) {
    return;
  }

  if (!isTTY) {
    emitInstallerNotice(notices, OPENCODE_INSTALL_CMD);
    return;
  }

  const answer = await promptYesNo('Install opencode now? [y/n] ');
  if (answer) {
    const success = runInstall();
    if (!success) {
      emitInstallerNotice(notices, OPENCODE_INSTALL_CMD);
    }
  } else {
    emitInstallerNotice(notices, OPENCODE_INSTALL_CMD);
  }
}

async function offerCodegraphInstall({
  probe = probeCodegraph,
  runInstall = runCodegraphInstall,
  promptYesNo = promptYesNoReadline,
  isTTY = process.stdin.isTTY,
  notices,
} = {}) {
  if (probe()) {
    return;
  }

  if (!isTTY) {
    emitInstallerNotice(notices, CODEGRAPH_CLI_INSTALL_CMD);
    emitInstallerNotice(notices, CODEGRAPH_MCP_INSTALL_CMD);
    return;
  }

  const answer = await promptYesNo('Install CodeGraph now? [y/n] ');
  if (answer) {
    const success = runInstall();
    if (!success) {
      emitInstallerNotice(notices, CODEGRAPH_CLI_INSTALL_CMD);
      emitInstallerNotice(notices, CODEGRAPH_MCP_INSTALL_CMD);
    }
  } else {
    emitInstallerNotice(notices, CODEGRAPH_CLI_INSTALL_CMD);
    emitInstallerNotice(notices, CODEGRAPH_MCP_INSTALL_CMD);
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

// Sentinel resolved by promptSelect when the user steps back out of a screen.
// A distinct token from `null` (cancel) so callers can tell "go to the previous
// screen" apart from "abandon the flow".
const BACK = Symbol('BACK');
const INPUT_CLOSED = Symbol('INPUT_CLOSED');

// Blank separator rows divide the All-scope checklist into group tables.
// The value is blank so items and displayOptions stay index-aligned; the
// navigator owns the non-selectable behavior and the customizer owns grouping.
const CHECKLIST_SEPARATOR = '';
function isChecklistSeparator(value) {
  return value === CHECKLIST_SEPARATOR;
}

const ANSI_SEQUENCE = /\x1B\[[0-9;]*[A-Za-z]/g;
const DEFAULT_TERMINAL_WIDTH = 80;
const DEFAULT_SINGLE_SELECT_LEGEND = 'Up/Down move · Space/Enter confirm · ←/Esc back · q/Ctrl-C cancel';

function terminalWidth(output) {
  return typeof output.columns === 'number' && output.columns > 0
    ? output.columns
    : DEFAULT_TERMINAL_WIDTH;
}

// Physical rows one logical line occupies once the terminal wraps it. The
// frame is redrawn by moving the cursor up a row count, so a wrapped line that
// counted as 1 would drift the whole frame by one row per keypress.
function rowsFor(line, width) {
  const visible = line.replace(ANSI_SEQUENCE, '').length;
  return visible === 0 ? 1 : Math.ceil(visible / width);
}

// Consecutive navigator screens share one raw-input session. Tearing raw mode
// down and back up in the same tick leaves the Windows console in line mode:
// no keypress reaches the next screen until a line completes, which the user
// experiences as a swallowed Enter. Releasing on a setImmediate lets the next
// screen — which starts in the await continuation, a microtask earlier —
// cancel the release so stdin never leaves raw mode mid-flow.
let pendingRelease = null;
let pendingReleaseInput = null;

function runRelease(input) {
  input.setRawMode(false);
  input.pause();
}

function acquireRawInput(input) {
  if (pendingRelease !== null) {
    clearImmediate(pendingRelease);
    const previous = pendingReleaseInput;
    pendingRelease = null;
    pendingReleaseInput = null;
    if (previous !== input) runRelease(previous);
  }
  readline.emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
}

function releaseRawInput(input) {
  pendingReleaseInput = input;
  pendingRelease = setImmediate(() => {
    pendingRelease = null;
    pendingReleaseInput = null;
    runRelease(input);
  });
  if (typeof pendingRelease.unref === 'function') pendingRelease.unref();
}

// Line-input screens (readline.question) cannot share the navigator's
// deferred raw-mode session: the pending setImmediate would pause stdin while
// the question is waiting, emptying the event loop so Node exits right after
// printing the prompt. Flush the pending release synchronously and restore
// cooked mode before creating a readline interface.
function prepareLineInput(input = process.stdin) {
  if (pendingRelease !== null) {
    clearImmediate(pendingRelease);
    const previous = pendingReleaseInput;
    pendingRelease = null;
    pendingReleaseInput = null;
    if (previous && previous !== input) runRelease(previous);
  }
  try {
    if (input && input.isTTY && typeof input.setRawMode === 'function') input.setRawMode(false);
  } catch {
    // Cooked-mode restore is best effort; readline still owns its own errors.
  }
  try {
    if (input && typeof input.resume === 'function') input.resume();
  } catch {
    // Resume is best effort; readline resumes its input on creation.
  }
}

async function runNavigator({
  mode,
  question,
  options,
  defaultSelected,
  input = process.stdin,
  output = process.stdout,
  footer,
  preventEmptyConfirm = false,
  displayOptions,
  header,
}) {
  if (!input.isTTY) {
    return { status: 'non-interactive' };
  }

  return new Promise((resolve) => {
    const selected = options.map(option => !isChecklistSeparator(option) && defaultSelected.includes(option));
    let cursor = 0;
    while (cursor < options.length && isChecklistSeparator(options[cursor])) cursor += 1;
    if (cursor >= options.length && options.length > 0) cursor = 0;
    let previousRows = 0;
    let settled = false;

    function frameLines() {
      const lines = [];
      if (question) lines.push(question);
      // Header lines are decoration only: cursor and selection index into
      // `options`, so they never consume movement or toggles.
      if (header) lines.push(...(Array.isArray(header) ? header : [header]));
      options.forEach((option, i) => {
        if (isChecklistSeparator(option)) {
          lines.push('');
          return;
        }
        const label = Array.isArray(displayOptions) && displayOptions[i] !== undefined
          ? displayOptions[i]
          : option;
        const marker = mode === 'multi' ? (selected[i] ? '[x]' : '[ ]') : '  ';
        const arrow = i === cursor ? '>' : ' ';
        lines.push(`${arrow} ${marker} ${label}`);
      });
      if (footer) lines.push(footer);
      return lines;
    }

    function render() {
      const lines = frameLines();
      const width = terminalWidth(output);
      let frame = '';
      if (previousRows > 0) {
        // Up to the first row of the previous frame, then erase everything
        // below the cursor so shorter lines leave no tail behind.
        frame += `\x1B[${previousRows}A`;
      }
      frame += '\x1B[0J';
      frame += `${lines.join('\n')}\n`;
      output.write(frame);
      previousRows = lines.reduce((total, line) => total + rowsFor(line, width), 0);
    }

    function cleanup() {
      try {
        output.write('\x1B[?25h');
      } catch {
        // The output may have closed along with the input.
      }
      // Detaching the listener stays synchronous so a closed screen never
      // consumes a key meant for its successor; only the raw-mode teardown is
      // deferred.
      input.removeListener('keypress', onKey);
      input.removeListener('end', onInputClosed);
      input.removeListener('close', onInputClosed);
      input.removeListener('error', onInputClosed);
      releaseRawInput(input);
    }

    function finish(outcome) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outcome);
    }

    function onInputClosed() {
      finish({ status: 'input-closed' });
    }

    function onKey(str, key) {
      if (!key) return;
      if (key.sequence === '\x03' || str === 'q') {
        finish({ status: 'cancelled' });
        return;
      }
      if (key.name === 'left' || key.name === 'backspace' || key.name === 'escape') {
        finish({ status: 'back' });
        return;
      }
      if (key.name === 'up') {
        let prev = cursor - 1;
        while (prev >= 0 && isChecklistSeparator(options[prev])) prev -= 1;
        if (prev >= 0) cursor = prev;
        render();
      } else if (key.name === 'down') {
        let next = cursor + 1;
        while (next < options.length && isChecklistSeparator(options[next])) next += 1;
        if (next < options.length) cursor = next;
        render();
        } else if (str === ' ') {
          if (isChecklistSeparator(options[cursor])) return;
          if (mode === 'multi') {
            selected[cursor] = !selected[cursor];
          render();
        } else {
          finish({ status: 'confirmed', items: [options[cursor]] });
          }
        } else if (key.name === 'return') {
          if (isChecklistSeparator(options[cursor]) && mode === 'single') return;
          if (mode === 'multi' && preventEmptyConfirm && !selected.some((marked, i) => marked && !isChecklistSeparator(options[i]))) return;
          finish({
            status: 'confirmed',
            items: mode === 'multi' ? options.filter((_, i) => selected[i] && !isChecklistSeparator(options[i])) : [options[cursor]],
          });
        }
      }

    acquireRawInput(input);
    input.on('keypress', onKey);
    input.on('end', onInputClosed);
    input.on('close', onInputClosed);
    input.on('error', onInputClosed);

    output.write('\x1B[?25l');
    render();
  });
}

function promptChecklist(items, defaultSelected, input, footer, navigatorOptions) {
  return runNavigator({
    mode: 'multi', options: items, defaultSelected, input, footer,
    preventEmptyConfirm: navigatorOptions?.preventEmptyConfirm === true,
    displayOptions: navigatorOptions?.displayOptions,
    header: navigatorOptions?.header,
  });
}

async function promptSelect(question, options, input, footer = DEFAULT_SINGLE_SELECT_LEGEND, distinguishClosedInput = false) {
  const outcome = await runNavigator({
    mode: 'single', question, options, defaultSelected: [], input, footer,
  });
  if (outcome.status === 'back') return BACK;
  if (outcome.status === 'input-closed') return distinguishClosedInput ? INPUT_CLOSED : null;
  return outcome.status === 'confirmed' ? outcome.items[0] : null;
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
  return { commands: path.join(roots.base, 'commands'), sai: path.join(roots.base, 'sai'), skills: path.join(roots.base, 'skills'), agents: path.join(roots.base, 'agents'), config: roots.base, root: roots.base };
}

function installProjection(projection, targetPath, notices) {
  if (projection.strategy === 'merge-jsonc') {
    copyOpencodeConfig(targetPath, { notices });
    return;
  }
  if (projection.strategy === 'tunable-seed') {
    tunableSeedInstaller(projection);
    return;
  }
  if (projection.strategy === 'owned-copy') {
    throw new Error(`Projection ${projection.id} declares the retired owned-copy strategy; use tunable-seed`);
  }
  if (projection.strategy === 'copy-if-absent') {
    if (fs.existsSync(projection.destinationPath)) return;
    if (projection.sourceText !== undefined) {
      ensureDir(path.dirname(projection.destinationPath));
      fs.writeFileSync(projection.destinationPath, projection.sourceText);
      return;
    }
    copy(projection.sourcePath, projection.destinationPath);
    return;
  }
  if (projection.sourceText !== undefined) {
    ensureDir(path.dirname(projection.destinationPath));
    fs.writeFileSync(projection.destinationPath, projection.sourceText);
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

function assertProjectionInputsUseOneStringEnvelope(projections, harness) {
  for (const projection of projections) {
    assertOneStringInvocationEnvelope(JSON.stringify(projection), `${harness} projection ${projection.id}`);
    const sourceText = projection.sourceText !== undefined
      ? projection.sourceText
      : fs.readFileSync(projection.sourcePath, 'utf8');
    assertOneStringInvocationEnvelope(sourceText, `${harness} projection ${projection.id}`);
  }
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

function assertHarnessCommandsUseOneStringEnvelope(harness) {
  const commandsDir = path.join(REPOSITORY_ROOT, 'commands', harness);
  for (const commandPath of listMdFilesRecursive(commandsDir)) {
    assertOneStringInvocationEnvelope(fs.readFileSync(commandPath, 'utf8'), commandPath);
  }
}

function assertInstalledMarkdownSourcesUseOneStringEnvelope() {
  const sourceRoots = ['commands', 'sai', 'skills', 'agents'];
  for (const root of sourceRoots) {
    const sourceDir = path.join(REPOSITORY_ROOT, root);
    for (const sourcePath of listMdFilesRecursive(sourceDir)) {
      try {
        assertOneStringInvocationEnvelope(fs.readFileSync(sourcePath, 'utf8'), sourcePath);
      } catch (error) {
        // The worker matrix validates generated opencode binding text before
        // this census.  A source entry that vanished between directory walk
        // and read is therefore safe to skip; all other read and validation
        // errors remain fatal.
        if (error.code === 'ENOENT' && sourcePath.startsWith(OPENCODE_BINDINGS_DIR) && isGeneratedOpencodeBindingPath(sourcePath)) continue;
        throw error;
      }
    }
  }
}

function installClaude(destBase) {
  assertHarnessCommandsUseOneStringEnvelope('claude');
  validateClaudeWorkerBindings();
  assertInstalledMarkdownSourcesUseOneStringEnvelope();
  const targetPath = destBase || CLAUDE_BASE;
  cleanupRetiredProjections('claude', { base: targetPath });
  for (const projection of expandForInstall('claude', { base: targetPath })) installProjection(projection, targetPath);

  writeVersionMarker(targetPath);
}

function installOpencode(destBase, { spawnSync: spawnFn, env: runEnv, notices } = {}) {
  assertHarnessCommandsUseOneStringEnvelope('opencode');
  validateOpencodeWorkerBindings();
  assertInstalledMarkdownSourcesUseOneStringEnvelope();
  const resolveOptions = {};
  if (spawnFn !== undefined) resolveOptions.spawnSync = spawnFn;
  if (runEnv !== undefined) resolveOptions.env = runEnv;
  const targetPath = destBase || (Object.keys(resolveOptions).length > 0 ? resolveOpencodeBase(resolveOptions) : resolveOpencodeBase());
  const projections = expandForInstall('opencode', { base: targetPath });
  assertProjectionInputsUseOneStringEnvelope(projections, 'Opencode');
  cleanupRetiredProjections('opencode', { base: targetPath });
  for (const projection of projections) installProjection(projection, targetPath, notices);

  writeVersionMarker(targetPath);
}

function printOpencodeConfigMessage(base, opencodeBaseForPattern, notices) {
  const agentsDisplay = opencodeAgentsDisplayFor(opencodeBaseForPattern);
  const examplePath = path.join(REPOSITORY_ROOT, 'configs', 'opencode.jsonc');
  const lines = [
    `Opencode config already exists at ${base}. Ensure experimental.subagent_depth is set to 2:`,
    '  "experimental": {',
    '    "subagent_depth": 2',
    '  }',
    `See ${examplePath} for a reference example.`,
    `The installer only ensures experimental.subagent_depth = 2 in an existing config and leaves everything else untouched. The generic agents (explore, executor, budget) are managed agent files under ${agentsDisplay} and need no config entry.`,
  ];
  if (Array.isArray(notices)) {
    for (const line of lines) notices.push(line);
    return;
  }
  for (const line of lines) console.log(line);
}

const OPENCODE_SAI_PERMISSION_PATTERN = OPENCODE_SAI_PERMISSION_PATTERN_FALLBACK;
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

function invalidPermissionResult(text, location, detail, opencodeBaseForPattern) {
  const pattern = opencodeSaiPermissionPatternFor(opencodeBaseForPattern);
  return {
    text,
    redundantKeys: [],
    messages: [
      `OpenCode SAI permission: no change for ${pattern}; ${location} has invalid ${detail}; expected allow, ask, deny, or a rule object.`,
    ],
  };
}

function classifySaiPermission(permission, context, opencodeBaseForPattern) {
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

  const pattern = opencodeSaiPermissionPatternFor(opencodeBaseForPattern);
  const probePattern = opencodeSaiProbeFor(opencodeBaseForPattern);
  const generated = normalizePermissionPattern(pattern, context);
  const probe = normalizePermissionPattern(probePattern, context);
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

function mergeOpencodeAgents(text, permissionContext = createPermissionMatchContext(), opencodeBaseForPattern) {
  if (!jsoncParser) return null;
  const { parse, modify, applyEdits } = jsoncParser;
  const errors = [];
  const root = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0 || !isPlainObject(root)) return null;

  const redundantKeys = isPlainObject(root.agent)
    ? ['explore', 'executor', 'budget'].filter(key => Object.prototype.hasOwnProperty.call(root.agent, key))
    : [];

  const formattingOptions = { insertSpaces: true, tabSize: 2 };
  let out = text;
  const messages = [];

  // The only ensured write in an existing config is
  // experimental.subagent_depth = 2: create the block when missing and raise
  // it when below 2. Everything else — including permission.external_directory
  // with custom values and top-level subagent_depth — is left untouched.
  const needsExperimentalWrite = (() => {
    if (root.experimental === undefined) return true;
    if (!isPlainObject(root.experimental)) return true;
    if (!Object.hasOwn(root.experimental, 'subagent_depth')) return true;
    const value = root.experimental.subagent_depth;
    return !(typeof value === 'number' && Number.isFinite(value) && value >= 2);
  })();
  if (needsExperimentalWrite) {
    out = applyEdits(out, modify(out, ['experimental', 'subagent_depth'], 2, { formattingOptions }));
  }

  return { text: out, messages, redundantKeys };
}

function copyOpencodeConfig(destBase, { opencodeBaseForPattern, spawnSync: spawnFn, env: runEnv, notices } = {}) {
  const resolveOptions = {};
  if (spawnFn !== undefined) resolveOptions.spawnSync = spawnFn;
  if (runEnv !== undefined) resolveOptions.env = runEnv;
  const hasResolveOverride = Object.keys(resolveOptions).length > 0;
  const resolved = hasResolveOverride ? resolveOpencodeBase(resolveOptions) : resolveOpencodeBase();
  const base = destBase || resolved;
  const patternBase = opencodeBaseForPattern !== undefined ? opencodeBaseForPattern : resolved;
  const hasJson = fs.existsSync(path.join(base, 'opencode.json'));
  const hasJsonc = fs.existsSync(path.join(base, 'opencode.jsonc'));

  if (!hasJson && !hasJsonc) {
    const target = path.join(base, 'opencode.jsonc');
    copy(path.join(REPOSITORY_ROOT, 'configs', 'opencode.jsonc'), target);
    let initial = fs.readFileSync(target, 'utf8');
    const rewritten = rewriteOpencodeConfigPrefixes(initial, patternBase);
    if (rewritten !== initial) fs.writeFileSync(target, rewritten);
    initial = rewritten;
    const merged = mergeOpencodeAgents(initial, createPermissionMatchContext(), patternBase);
    if (merged && merged.text !== initial) fs.writeFileSync(target, merged.text);
    emitInstallerNotice(notices, `Created Opencode config at ${target} from configs/opencode.jsonc reference example.`);
    return;
  }

  // Precedence: opencode.json is merged over opencode.jsonc when both exist (ADR 0030).
  const target = path.join(base, hasJson ? 'opencode.json' : 'opencode.jsonc');
  const merged = mergeOpencodeAgents(fs.readFileSync(target, 'utf8'), createPermissionMatchContext(), patternBase);

  if (!merged) {
    printOpencodeConfigMessage(base, patternBase, notices);
    return;
  }

  if (merged.text !== fs.readFileSync(target, 'utf8')) {
    fs.writeFileSync(target, merged.text);
  }
  if (merged.redundantKeys.length > 0) {
    const agentsDisplay = opencodeAgentsDisplayFor(patternBase);
    emitInstallerNotice(notices, `Migration notice: redundant opencode agent keys detected in ${target}: ${merged.redundantKeys.join(', ')}. The projected agent files under ${agentsDisplay} now take precedence — agent files take precedence for the keys they declare, including model — a tuned model in the config is no longer effective. Config-only keys the agent files do not declare (for example tools or options) still apply. To keep a tuned model, edit the model line in the matching agent file (${agentsDisplay}{explore,executor,budget}.md), which the tunable-seed lifecycle preserves. Removing the now-redundant keys from the config is your decision; the installer never edits the config.`);
  }
  for (const message of merged.messages) emitInstallerNotice(notices, message);
}

function readJsoncConfigAt(filePath) {
  let parser = null;
  try {
    parser = require('jsonc-parser');
  } catch {
    parser = jsoncParser;
  }
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  try {
    if (parser) {
      const errors = [];
      const root = parser.parse(text, errors, { allowTrailingComma: true });
      if (errors.length > 0 || !isPlainObject(root)) return null;
      return root;
    }
    const parsed = JSON.parse(text);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isCodegraphMcpEnabledInConfig(root) {
  if (!isPlainObject(root) || !isPlainObject(root.mcp)) return false;
  const entry = root.mcp.codegraph;
  if (!isPlainObject(entry)) return false;
  return entry.enabled !== false;
}

function codegraphDbPathFor(projectRoot) {
  return path.join(projectRoot, '.codegraph', 'codegraph.db');
}

function isCodegraphMcpConfigured({ globalBase, projectRoot } = {}) {
  const candidates = [];
  if (typeof globalBase === 'string' && globalBase !== '') {
    candidates.push(path.join(globalBase, 'opencode.json'));
    candidates.push(path.join(globalBase, 'opencode.jsonc'));
  }
  if (typeof projectRoot === 'string' && projectRoot !== '') {
    candidates.push(path.join(projectRoot, 'opencode.json'));
    candidates.push(path.join(projectRoot, 'opencode.jsonc'));
    candidates.push(path.join(projectRoot, '.opencode', 'opencode.json'));
    candidates.push(path.join(projectRoot, '.opencode', 'opencode.jsonc'));
  }
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const root = readJsoncConfigAt(candidate);
    if (root && isCodegraphMcpEnabledInConfig(root)) return true;
  }
  return false;
}

// Three-layer CodeGraph state for the install output: binary → MCP → db.
// Recommend-only: the installer never runs a CodeGraph command automatically.
// Each absence recommends its own command; a stale index does not warn.
function emitCodegraphStateNotices({
  projectRoot = process.cwd(),
  opencodeBase,
  notices,
  probe = probeCodegraph,
  mcpConfigured,
  dbExists,
} = {}) {
  if (!probe()) {
    emitInstallerNotice(notices, `CodeGraph CLI not found — install it with ${CODEGRAPH_CLI_INSTALL_CMD} (system-level installation).`);
    return;
  }
  const resolvedBase = opencodeBase !== undefined ? opencodeBase : resolveOpencodeBase();
  const mcpOk = typeof mcpConfigured === 'boolean'
    ? mcpConfigured
    : isCodegraphMcpConfigured({ globalBase: resolvedBase, projectRoot });
  if (!mcpOk) {
    emitInstallerNotice(notices, `CodeGraph MCP not configured — run \`${CODEGRAPH_MCP_INSTALL_CMD}\`.`);
  }
  const dbPath = codegraphDbPathFor(projectRoot);
  const indexOk = typeof dbExists === 'boolean' ? dbExists : fs.existsSync(dbPath);
  if (!indexOk) {
    emitInstallerNotice(notices, `CodeGraph index not found at ${dbPath} — run \`codegraph init\` in ${projectRoot}.`);
  }
}

function detectInstalledEditors(overrides = {}) {
  const claudeBase = overrides.claudeBase || CLAUDE_BASE;
  let opencodeBase;
  if (overrides.opencodeBase !== undefined && overrides.opencodeBase !== null) {
    opencodeBase = overrides.opencodeBase;
  } else {
    const resolveOptions = {};
    if (overrides.spawnSync !== undefined) resolveOptions.spawnSync = overrides.spawnSync;
    if (overrides.env !== undefined) resolveOptions.env = overrides.env;
    opencodeBase = Object.keys(resolveOptions).length > 0 ? resolveOpencodeBase(resolveOptions) : resolveOpencodeBase();
  }
  const detected = [];
  if (fs.existsSync(claudeBase)) detected.push('Claude Code');
  if (fs.existsSync(opencodeBase)) detected.push('Opencode');
  return detected;
}

async function main() {
  const resolvedOpencodeBase = resolveOpencodeBase();
  const preselected = detectInstalledEditors({ opencodeBase: resolvedOpencodeBase });
  const defaults = preselected.length > 0 ? preselected : ['Opencode'];
  let outcome;
  do {
    // This is the first screen of the installer, so stepping back has nowhere
    // to go: redraw it rather than abandoning the run.
    outcome = await promptChecklist(['Claude Code', 'Opencode'], defaults);
  } while (outcome.status === 'back');

  if (outcome.status === 'non-interactive') {
    console.error('Error: interactive mode requires a TTY. Run directly in a terminal.');
    process.exit(1);
  }
  if (outcome.status === 'cancelled') {
    process.exit(0);
  }

  const choices = outcome.items;

  if (choices.length === 0) {
    console.log('Nothing selected. Exiting.');
    process.exit(0);
  }

  const notices = [];

  if (choices.includes('Claude Code')) {
    installClaude();
    console.log(`Claude commands installed to: ${path.join(CLAUDE_BASE, 'commands')}`);
    console.log(`Claude SAI commands/instructions installed to: ${path.join(CLAUDE_BASE, 'sai')}`);
    console.log(`Claude skills installed to: ${path.join(CLAUDE_BASE, 'skills')}`);
  }

  if (choices.includes('Opencode')) {
    if (choices.includes('Claude Code')) console.log();
    await offerOpencodeInstall({ notices });
    installOpencode(resolvedOpencodeBase, { notices });
    console.log(`Opencode commands installed to: ${path.join(resolvedOpencodeBase, 'commands')}`);
    console.log(`Opencode SAI commands/instructions installed to: ${path.join(resolvedOpencodeBase, 'sai')}`);
    console.log(`Opencode skills installed to: ${path.join(resolvedOpencodeBase, 'skills')}`);
  }

  await offerCodegraphInstall({ notices });
  emitCodegraphStateNotices({ projectRoot: process.cwd(), opencodeBase: resolvedOpencodeBase, notices });

  const seenNotices = new Set();
  const uniqueNotices = [];
  for (const line of notices) {
    if (seenNotices.has(line)) continue;
    seenNotices.add(line);
    uniqueNotices.push(line);
  }
  if (uniqueNotices.length > 0) {
    console.log();
    for (const line of uniqueNotices) console.log(line);
  }

  console.log();
  console.log(
    "Reminder: run 'npx github:mmadariaga/shared-ai setup' in each project to configure the SAI workflow."
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
  promptChecklist,
  promptSelect,
  runNavigator,
  prepareLineInput,
  BACK,
  INPUT_CLOSED,
  CHECKLIST_SEPARATOR,
  isChecklistSeparator,
  CLAUDE_BASE,
  OPENCODE_BASE,
  OPENCODE_SAI_PERMISSION_PATTERN,
  OPENCODE_SAI_PERMISSION_PATTERN_FALLBACK,
  resolveOpencodeBase,
  parseOpencodeDebugPathsOutput,
  opencodeSaiPermissionPatternFor,
  opencodeSaiProbeFor,
  opencodeAgentsDisplayFor,
  rewriteOpencodeConfigPrefixes,
  isDefaultOpencodeBase,
  toPosixOpencodePath,
  printOpencodeConfigMessage,
  detectInstalledEditors,
  readJsoncConfigAt,
  isCodegraphMcpEnabledInConfig,
  codegraphDbPathFor,
  isCodegraphMcpConfigured,
  emitCodegraphStateNotices,
  OPENCODE_INSTALL_CMD,
  probeOpencode,
  runOpencodeInstall,
  promptYesNoReadline,
  offerOpencodeInstall,
  CODEGRAPH_CLI_INSTALL_CMD,
  CODEGRAPH_MCP_INSTALL_CMD,
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
  matrixBindings,
  matrixWorkerRoster,
  __test: {
    mergeOpencodeAgents,
    classifySaiPermission,
    invalidPermissionResult,
    expectedDispatchPrompt,
    parseInitialDispatches,
    parseClaudeInitialDispatches,
    validateClaudeWorkerBindings,
    validateOpencodeWorkerBindings,
    createPermissionMatchContext,
    normalizePermissionPattern,
    wildcardMatches,
    resolveOpencodeBase,
    parseOpencodeDebugPathsOutput,
    opencodeSaiPermissionPatternFor,
    opencodeSaiProbeFor,
  },
};

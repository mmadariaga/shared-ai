'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const childProcess = require('child_process');
const crypto = require('crypto');

const {
  installOpencode,
  installClaude,
  installProjection,
  copyOpencodeConfig,
  OPENCODE_INSTALL_CMD,
  __test: { validateOpencodeWorkerBindings },
  probeOpencode,
  runOpencodeInstall,
  promptYesNoReadline,
  offerOpencodeInstall,
} = require('../bin/install-flow.js');
const jsonc = require('jsonc-parser');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const AGENT_PLACEHOLDER = { mode: 'subagent', model: 'opencode-go/deepseek-v4-flash' };
const AGENT_KEYS = ['explore', 'executor', 'budget'];
const CURRENT_CENSUS = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
];
const SAI_EXTERNAL_DIRECTORY = '~/.config/opencode/sai/**';
const OPENCODE_COMMANDS_EXTERNAL_DIRECTORY = '~/.config/opencode/commands/**';
const OPENCODE_SKILLS_EXTERNAL_DIRECTORY = '~/.config/opencode/skills/**';
const CENSUS_SCRATCH_DIR = path.join(__dirname, '..', '.tmp', 'collapse-sai-worker-matrix', 'derive-opencode-agent-census-from-bindings');
test.afterEach(() => {
  fs.rmSync(CENSUS_SCRATCH_DIR, { recursive: true, force: true });
});
test.after(() => {
  assert.equal(
    fs.existsSync(CENSUS_SCRATCH_DIR),
    false,
    'census fixture scratch directory must be absent after the focused census tests',
  );
});

test('STEP1_RETIRE_INLINE: opencode installer has no Copilot path constants or entrypoint', () => {
  const flow = require('../bin/install-flow.js');
  assert.equal(typeof flow.installOpencode, 'function');
  assert.equal(typeof flow.installClaude, 'function');
  assert.deepEqual(Object.keys(flow).filter(name => /copilot/i.test(name)), []);
});
const STEP_2_SCRATCH_DIR = path.join(__dirname, '..', '.tmp', 'collapse-sai-worker-matrix', 'deterministic-worker-contract-delivery');
const WORKER_CONTRACT_BY_NAME = {
  'sai-1-spec-proposal-worker': 'spec-worker.md',
  'sai-2-design-worker': 'design-worker.md',
  'sai-3-implementation-worker': 'implementation-worker.md',
  'sai-5-review-worker': 'review-worker.md',
  'sai-6-security-worker': 'security-worker.md',
  'sai-7-performance-worker': 'performance-worker.md',
  'sai-8-accessibility-worker': 'accessibility-worker.md',
};

function expectedWorkerPrompt(workerName) {
  return `Worker contract: Fetch @sai/orchestration/workers/${workerName}.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>`;
}

function extractDispatchCalls(source, keyword) {
  return [...source.matchAll(new RegExp(`\\b${keyword}\\s*\\(([\\s\\S]*?)\\)`, 'g'))]
    .map(match => match[1]);
}

function decodePrompt(call) {
  const match = call.match(/\bprompt\s*[:=]\s*"((?:\\.|[^"\\])*)"/);
  assert.ok(match, 'initial dispatch should contain a quoted prompt argument');
  return JSON.parse(`"${match[1]}"`);
}

test('Step 3 roster validation is isolated to opencode consumers and fails before destination mutation', () => {
  const destination = path.join(CENSUS_SCRATCH_DIR, 'lazy-failure-destination');
  const script = `
    'use strict';
    const fs = require('fs');
    const path = require('path');
    const bindingsDir = path.join(process.cwd(), 'sai', 'orchestration', 'workers', 'bindings', 'opencode');
    const originalReaddirSync = fs.readdirSync;
    fs.readdirSync = (target, ...args) => typeof target === 'string' && path.resolve(target) === path.resolve(bindingsDir)
      ? []
      : originalReaddirSync(target, ...args);
    let flow = null;
    let requireError = null;
    try { flow = require(${JSON.stringify(path.join(__dirname, '..', 'bin', 'install-flow.js'))}); }
    catch (error) { requireError = error.message; }
    const destination = ${JSON.stringify(destination)};
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(destination, { recursive: true });
    const silence = console.log;
    console.log = () => {};
    let claudeError = null;
     let opencodeError = null;
    try {
      if (!flow) throw new Error('installer module failed to load');
      try { flow.installClaude(${JSON.stringify(path.join(CENSUS_SCRATCH_DIR, 'lazy-failure-claude'))}); } catch (error) { claudeError = error.message; }
      try { flow.installOpencode(destination); } catch (error) { opencodeError = error.message; }
    } finally {
      console.log = silence;
    }
    process.stdout.write(JSON.stringify({ requireError, claudeError, opencodeError, entries: fs.readdirSync(destination) }));
  `;
  const result = childProcess.spawnSync(process.execPath, ['-e', script], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || 'lazy census boundary probe should run');
  const observation = JSON.parse(result.stdout);
  assert.equal(observation.requireError, null, 'requiring the shared installer should not derive malformed bindings');
  assert.equal(observation.claudeError, null, 'Claude operations should remain loadable when Opencode bindings are malformed');
  assert.match(observation.opencodeError || '', /binding|dispatch|roster|default|census|worker|registration/i,
    'Opencode installation should fail with an actionable binding/roster diagnostic');
  assert.deepEqual(observation.entries, [], 'Opencode installation should fail before destination mutation');
});

test('Step 2 initial Opencode task dispatches deliver the matching contract and preserve continuations', () => {
  fs.mkdirSync(STEP_2_SCRATCH_DIR, { recursive: true });
  const scratchDir = fs.mkdtempSync(path.join(STEP_2_SCRATCH_DIR, 'opencode-dispatch-'));
  try {
    const installDir = path.join(scratchDir, 'opencode');
    fs.mkdirSync(installDir, { recursive: true });
    installOpencode(installDir);
    for (const workerName of CURRENT_CENSUS) {
      const bindingName = WORKER_CONTRACT_BY_NAME[workerName];
      const bindingPath = path.join(installDir, 'sai', 'orchestration', 'workers', 'bindings', bindingName);
      const calls = extractDispatchCalls(fs.readFileSync(bindingPath, 'utf8'), 'task');
      const initial = calls.filter(call => !/\btask_id\s*[:=]/.test(call));
      const continuations = calls.filter(call => /\btask_id\s*[:=]/.test(call));

      assert.equal(initial.length, 1, `${workerName} should have one initial task dispatch`);
      assert.equal(decodePrompt(initial[0]), expectedWorkerPrompt(workerName),
        `specs/worker-dispatch-prompt-template/spec.md: ${workerName} should receive its matching worker contract`);
      assert.match(decodePrompt(initial[0]), /InvocationEnvelope:\n<original InvocationEnvelope>$/,
        `${workerName} should preserve the opaque InvocationEnvelope slot`);
      assert.ok(continuations.length > 0, `${workerName} should retain a continuation task dispatch`);
       for (const continuation of continuations) {
         assert.match(continuation, /\bprompt\s*[:=]\s*"<selected value>"/,
           `${workerName} continuation dispatch should retain its existing prompt shape`);
       }
    }
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
});

test('installOpencode copies commands/opencode/*.md to dest/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  const cmdDir = path.join(tmpDir, 'commands');
  assert.ok(fs.existsSync(cmdDir), 'commands/ dir should exist');
  const files = fs.readdirSync(cmdDir);
  assert.ok(files.includes('sai-1-spec.md'), 'sai-1-spec.md should be in commands/');
  const design = fs.readFileSync(path.join(cmdDir, 'sai-2-design.md'), 'utf8');
   assert.match(design, /^model: opencode-go\/deepseek-v4-flash$/m);
   assert.match(design, /^variant: max$/m);
   assert.match(design, /^subtask: false$/m);
   assert.doesNotMatch(design, /^agent:/m);
  assert.ok(design.includes('**Change-name argument and and optional flags:** $ARGUMENTS'));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode projects grouped SAI command assets and excludes former coordinator sources', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  for (const file of [path.join('design', 'coordinator.md'), path.join('design', 'invocation.md'), path.join('implement', 'coordinator.md'), path.join('implement', 'invocation.md')]) {
    assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'commands', file)), `${file} should be projected`);
  }
  for (const file of ['sai-2-design.md', 'sai-3-implement.md']) {
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'commands', file)), false, `${file} should not be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode copies all standalone policies to dest/sai/policies/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  for (const file of ['artifact-feedback-gate.md', 'change-picker.md', 'commit-rules.md', 'prereqs.md', 'status-picker.md']) {
    assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'policies', file)), `${file} should be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode projects the canonical ADR template and removes former compatibility destinations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'instructions', '_templates', 'adr-index.md')));
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', '_templates', 'adr-index.md')), false);
  for (const file of ['sai-2-design-core.md', 'sai-3-implementation-core.md', 'implement-invocation.md']) {
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', file)), false, `${file} should not be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode does not project the Copilot inline orchestration adapter', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'inline-invocation.md')), false);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode copies all Opencode-specific skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  installOpencode(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'token-efficient-languages', 'SKILL.md')), 'skills/token-efficient-languages/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md')), 'skills/budget-explorer/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-executor', 'SKILL.md')), 'skills/budget-executor/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-subagent', 'SKILL.md')), 'skills/budget-subagent/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget', 'SKILL.md')), 'skills/budget/SKILL.md must be present for Opencode');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'fetch', 'SKILL.md')), 'skills/fetch/SKILL.md');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Step 3 fresh opencode install omits all routed worker proxy skills and projects their bindings', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-no-proxies-'));
  try {
    installOpencode(tmpDir);
    for (const worker of CURRENT_CENSUS) {
      assert.equal(fs.existsSync(path.join(tmpDir, 'skills', worker, 'SKILL.md')), false,
        `${worker} proxy skill should not be installed`);
      assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', `${worker
        .replace('sai-1-spec-proposal-worker', 'spec-worker')
        .replace('sai-2-design-worker', 'design-worker')
        .replace('sai-3-implementation-worker', 'implementation-worker')
        .replace('sai-5-review-worker', 'review-worker')
        .replace('sai-6-security-worker', 'security-worker')
        .replace('sai-7-performance-worker', 'performance-worker')
        .replace('sai-8-accessibility-worker', 'accessibility-worker')}.md`)));
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installOpencode projects the routed spec coordinator and neutral binding', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-spec-'));
  try {
    installOpencode(tmpDir);
    for (const file of [
       path.join('sai', 'commands', 'spec', 'coordinator.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'spec-worker.md'),
    ]) assert.ok(fs.existsSync(path.join(tmpDir, file)), `${file} should be projected`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installOpencode projects every routed binding into neutral destinations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-neutral-bindings-'));
  const workers = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];
  const bindingWorker = Object.fromEntries(Object.entries(WORKER_CONTRACT_BY_NAME).map(([workerName, bindingName]) => [
    bindingName.replace('-worker.md', ''),
    workerName,
  ]));
  try {
    installOpencode(tmpDir);
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', 'opencode')), false);
    for (const worker of workers) {
      const destination = path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', `${worker}-worker.md`);
      assert.equal(fs.existsSync(destination), true, `${worker} binding should use a neutral destination`);
      const text = fs.readFileSync(destination, 'utf8');
      const workerName = bindingWorker[worker];
      assert.equal(
        (text.match(new RegExp(`Fetch @sai/orchestration/workers/${workerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.md and follow it exactly\\.`, 'g')) || []).length,
        1,
        `${worker} binding should carry exactly one canonical worker Fetch`
      );
      assert.match(text, /task\s*\(/, `${worker} binding should preserve the task dispatch primitive`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Step 2 copyOpencodeConfig copies the agent-free canonical config when none exists', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  try {
    copyOpencodeConfig(tmpDir);
    const configPath = path.join(tmpDir, 'opencode.jsonc');
    assert.ok(fs.existsSync(configPath), 'opencode.jsonc should be copied when none exists');
    const config = jsonc.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(Object.hasOwn(config, 'agent'), false,
      'specs/npx-installer/spec.md: the copied config must contain no agent key');
    assert.equal(config.permission?.external_directory?.[SAI_EXTERNAL_DIRECTORY], 'allow',
      'specs/managed-worker-registry/spec.md: the copied config should retain the narrow external-directory rule');
    assert.equal(config.permission?.external_directory?.[OPENCODE_COMMANDS_EXTERNAL_DIRECTORY], 'allow',
      'specs/opencode-permission-template/spec.md: the copied config should allow the commands/ fetch-namespace entry');
    assert.equal(config.permission?.external_directory?.[OPENCODE_SKILLS_EXTERNAL_DIRECTORY], 'allow',
      'specs/opencode-permission-template/spec.md: the copied config should allow the skills/ fetch-namespace entry');
    for (const worker of CURRENT_CENSUS) {
      assert.equal(Object.hasOwn(config.agent || {}, worker), false,
        `specs/managed-worker-registry/spec.md: agent.${worker} must not appear in the copied config`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('copyOpencodeConfig merges permission in place into an existing opencode.jsonc', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), '{}');
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8'));
  assert.equal(parsed.permission?.external_directory?.[SAI_EXTERNAL_DIRECTORY], 'allow',
    'the SAI allow rule should be merged in place');
  assert.equal(Object.hasOwn(parsed, 'agent'), false, 'no agent block should be added');
  assert.ok(!messages.join('\n').includes('Opencode config already exists'),
    'no fallback guidance should be printed for a parseable config');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig merges permission in place into an existing opencode.json', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), '{}');
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.equal(parsed.permission?.external_directory?.[SAI_EXTERNAL_DIRECTORY], 'allow',
    'the SAI allow rule should be merged in place');
  assert.equal(Object.hasOwn(parsed, 'agent'), false, 'no agent block should be added');
  assert.equal(fs.existsSync(path.join(tmpDir, 'opencode.jsonc')), false,
    'should not create the non-target opencode.jsonc');
  assert.ok(!messages.join('\n').includes('Opencode config already exists'),
    'no fallback guidance should be printed for a parseable config');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Step 3 installer guidance no longer names managed workers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-guidance-'));
  const messages = [];
  const originalLog = console.log;
  try {
    fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), '{}');
    console.log = message => messages.push(String(message));
    copyOpencodeConfig(tmpDir);
  } finally {
    console.log = originalLog;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  const guidance = messages.join('\n');
  assert.doesNotMatch(guidance, /required namespaced implementation agents/i,
    'specs/managed-worker-registry/spec.md: guidance must not print a required-namespaced-implementation-agents block');
  for (const worker of CURRENT_CENSUS) {
    assert.doesNotMatch(guidance, new RegExp(`"${worker}"\\s*:`),
      `specs/managed-worker-registry/spec.md: guidance should not name ${worker}`);
  }
});

test('installOpencode overwrites existing vendor command files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const cmdFile = path.join(tmpDir, 'commands', 'sai-1-spec.md');
  fs.mkdirSync(path.dirname(cmdFile), { recursive: true });
  fs.writeFileSync(cmdFile, 'old sentinel content');
  installOpencode(tmpDir);
  const expected = fs.readFileSync(path.join(__dirname, '..', 'commands', 'opencode', 'sai-1-spec.md'), 'utf8');
  assert.equal(fs.readFileSync(cmdFile, 'utf8'), expected, 'existing vendor command should be overwritten with repo version');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installOpencode overwrites stale command wrappers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const skillFile = path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'old content');
  installOpencode(tmpDir);
  assert.notEqual(fs.readFileSync(skillFile, 'utf8'), 'old content', 'existing stale file should be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Step 2: opencode config permission-merge, migration-notice, and fallback tests ---

test('copyOpencodeConfig merges permission into opencode.json without adding agent keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.equal(Object.hasOwn(parsed, 'agent'), false,
    'specs/opencode-config-install/spec.md: no agent block may be inserted');
  for (const key of AGENT_KEYS) {
    assert.equal(Object.hasOwn(parsed.agent || {}, key), false,
      `specs/opencode-config-install/spec.md: agent.${key} must not be added`);
  }
  assert.equal(parsed.permission?.external_directory?.[SAI_EXTERNAL_DIRECTORY], 'allow',
    'the SAI allow rule should be merged into the existing file');
  assert.equal(parsed.theme, 'dark', 'unrelated keys should survive');
  assert.ok(!fs.existsSync(path.join(tmpDir, 'opencode.jsonc')), 'should not create opencode.jsonc');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig merges permission into opencode.jsonc without adding agent keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), JSON.stringify({ theme: 'dark' }));
  copyOpencodeConfig(tmpDir);
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8'));
  assert.equal(Object.hasOwn(parsed, 'agent'), false,
    'specs/opencode-config-install/spec.md: no agent block may be inserted into opencode.jsonc');
  for (const key of AGENT_KEYS) {
    assert.equal(Object.hasOwn(parsed.agent || {}, key), false,
      `specs/opencode-config-install/spec.md: agent.${key} must not be added`);
  }
  assert.equal(parsed.permission?.external_directory?.[SAI_EXTERNAL_DIRECTORY], 'allow',
    'the SAI allow rule should be merged in place');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig merges only opencode.json when both files exist', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  const jsoncContent = JSON.stringify({ theme: 'light' });
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), jsoncContent);
  const beforeJsoncBytes = Buffer.from(jsoncContent, 'utf8');
  copyOpencodeConfig(tmpDir);
  const jsonParsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.equal(Object.hasOwn(jsonParsed, 'agent'), false,
    'specs/opencode-config-install/spec.md: no agent block may be added to opencode.json');
  assert.equal(jsonParsed.permission?.external_directory?.[SAI_EXTERNAL_DIRECTORY], 'allow',
    'the SAI allow rule should be merged into opencode.json');
  const afterJsoncBytes = fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'));
  assert.deepEqual(afterJsoncBytes, beforeJsoncBytes, 'opencode.jsonc should remain byte-for-byte untouched');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig preserves comments, trailing commas, and unrelated keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const fixture = '{\n  // preserve this comment\n  "theme": "dark",\n  "subagent_depth": 2,\n}\n';
  fs.writeFileSync(path.join(tmpDir, 'opencode.jsonc'), fixture);
  copyOpencodeConfig(tmpDir);
  const raw = fs.readFileSync(path.join(tmpDir, 'opencode.jsonc'), 'utf8');
  assert.ok(raw.includes('// preserve this comment'), 'comment text should survive');
  assert.ok(raw.includes('"theme"'), 'theme key should survive');
  const parsed = jsonc.parse(raw);
  assert.equal(parsed.theme, 'dark', 'theme value should be unchanged');
  assert.deepEqual(Object.keys(parsed).sort(), ['permission', 'subagent_depth', 'theme'].sort(),
    'only permission, theme, and subagent_depth should be top-level keys');
  assert.equal(Object.hasOwn(parsed, 'agent'), false, 'no agent block should be added');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig preserves a user-defined agent section without adding keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: { custom: { mode: 'subagent', model: 'my-model' } } };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  copyOpencodeConfig(tmpDir);
  const raw = fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8');
  const parsed = jsonc.parse(raw);
  assert.deepEqual(parsed.agent, config.agent, 'agent.custom should survive untouched');
  assert.ok(raw.replace(/\s+/g, '').includes(JSON.stringify(config.agent)),
    'the agent subtree should remain byte-identical');
  for (const key of AGENT_KEYS) {
    assert.equal(Object.hasOwn(parsed.agent, key), false,
      `specs/opencode-config-install/spec.md: agent.${key} must not be added alongside a user-defined agent section`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig preserves a tuned agent.explore.model without adding sibling keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { agent: { explore: { mode: 'subagent', model: 'my-custom-model' } } };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  copyOpencodeConfig(tmpDir);
  const raw = fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8');
  const parsed = jsonc.parse(raw);
  assert.deepEqual(parsed.agent, config.agent, 'the tuned explore entry should survive untouched');
  assert.ok(raw.replace(/\s+/g, '').includes(JSON.stringify(config.agent)),
    'the tuned agent subtree should remain byte-identical');
  assert.equal(Object.hasOwn(parsed.agent, 'executor'), false,
    'specs/opencode-config-install/spec.md: agent.executor must not be added');
  assert.equal(Object.hasOwn(parsed.agent, 'budget'), false,
    'specs/opencode-config-install/spec.md: agent.budget must not be added');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig is idempotent when fully configured with helper agents and permission', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { permission: { external_directory: { [SAI_EXTERNAL_DIRECTORY]: 'allow' } }, agent: {} };
  for (const key of AGENT_KEYS) config.agent[key] = { ...AGENT_PLACEHOLDER };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  const beforeBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  copyOpencodeConfig(tmpDir);
  const afterBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  assert.deepEqual(afterBytes, beforeBytes, 'file should be unchanged when fully configured');
  copyOpencodeConfig(tmpDir);
  const secondRunBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  assert.deepEqual(secondRunBytes, afterBytes, 'second run should produce identical bytes');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig prints a migration notice naming every redundant agent key and never the retired add-notice', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const config = { permission: { external_directory: { [SAI_EXTERNAL_DIRECTORY]: 'allow' } }, agent: {} };
  for (const key of AGENT_KEYS) config.agent[key] = { ...AGENT_PLACEHOLDER };
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify(config, null, 2));
  const beforeBytes = fs.readFileSync(path.join(tmpDir, 'opencode.json'));
  function run() {
    const messages = [];
    const origLog = console.log;
    console.log = (m) => messages.push(String(m));
    try { copyOpencodeConfig(tmpDir); } finally { console.log = origLog; }
    return messages.join('\n');
  }
  const first = run();
  const second = run();
  for (const key of AGENT_KEYS) {
    assert.ok(first.includes(key), `specs/opencode-agent-migration-notice/spec.md: the notice should name ${key}`);
  }
  assert.match(first, /agent files? take precedence[\s\S]{0,200}\bmodel\b/i,
    'specs/opencode-agent-migration-notice/spec.md: the notice should state the agent files take precedence for declared keys incl. model');
  assert.match(first, /config-only[\s\S]{0,120}(?:tools|options)/i,
    'specs/opencode-agent-migration-notice/spec.md: the notice should say config-only keys (tools/options) still apply');
  assert.match(first, /tunable-seed/i,
    'specs/opencode-agent-migration-notice/spec.md: the notice should name the tunable-seed tuning surface');
  assert.match(first, /remov\w*[\s\S]{0,120}decision/i,
    'specs/opencode-agent-migration-notice/spec.md: the notice should leave removal to the user');
  assert.doesNotMatch(first, /Added opencode agent keys/,
    'specs/install-command-overwrite/spec.md: the retired add-notice must never be printed');
  assert.match(second, /agent files? take precedence/i,
    'specs/opencode-agent-migration-notice/spec.md: the notice should print on every detecting run');
  assert.deepEqual(fs.readFileSync(path.join(tmpDir, 'opencode.json')), beforeBytes,
    'the file should be left byte-for-byte unchanged');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig prints no migration notice when the config carries no agent keys', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  const parsed = jsonc.parse(fs.readFileSync(path.join(tmpDir, 'opencode.json'), 'utf8'));
  assert.equal(Object.hasOwn(parsed, 'agent'), false,
    'specs/opencode-agent-migration-notice/spec.md: no agent block should be added');
  assert.equal(parsed.permission?.external_directory?.[SAI_EXTERNAL_DIRECTORY], 'allow',
    'the permission merge should still proceed');
  const joined = messages.join('\n');
  assert.doesNotMatch(joined, /Added opencode agent keys/,
    'the retired add-notice must never be printed');
  assert.doesNotMatch(joined, /agent files? take precedence|redundant/i,
    'no migration notice should be printed when no agent keys are redundant');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig falls back gracefully for unparseable JSONC', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const configPath = path.join(tmpDir, 'opencode.jsonc');
  const badContent = '{{{{ not valid jsonc }}}}';
  fs.writeFileSync(configPath, badContent);
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.equal(fs.readFileSync(configPath, 'utf8'), badContent, 'unparseable file should remain unchanged');
  const joined = messages.join('\n');
  assert.ok(joined.includes('Opencode config already exists'), 'should print intro line for fallback');
  assert.ok(joined.includes('. Verify that you have these settings properly configured:'),
    'specs/opencode-config-message/spec.md: intro line should match the pinned wording');
  assert.ok(joined.includes(SAI_EXTERNAL_DIRECTORY), 'fallback should name the SAI permission rule');
  assert.ok(!joined.includes('"agent"'), 'fallback must not print an "agent" block');
  assert.ok(!joined.includes('"model"'), 'fallback must not print a model field');
  assert.ok(!joined.includes('trusted low-cost model'), 'fallback must not mention a trusted low-cost model');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig falls back gracefully for non-object root', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  const configPath = path.join(tmpDir, 'opencode.json');
  const arrayContent = JSON.stringify(['item1', 'item2']);
  fs.writeFileSync(configPath, arrayContent);
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.equal(fs.readFileSync(configPath, 'utf8'), arrayContent, 'array-root config should remain unchanged');
  const joined = messages.join('\n');
  assert.ok(joined.includes('Opencode config already exists'), 'should print fallback for non-object root');
  assert.ok(joined.includes('. Verify that you have these settings properly configured:'),
    'specs/opencode-config-message/spec.md: intro line should match the pinned wording');
  assert.ok(joined.includes(SAI_EXTERNAL_DIRECTORY), 'fallback should name the SAI permission rule');
  assert.ok(!joined.includes('"agent"'), 'fallback must not print an "agent" block');
  assert.ok(!joined.includes('"model"'), 'fallback must not print a model field');
  assert.ok(!joined.includes('trusted low-cost model'), 'fallback must not mention a trusted low-cost model');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('copyOpencodeConfig suppresses verification message after successful merge', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-'));
  fs.writeFileSync(path.join(tmpDir, 'opencode.json'), JSON.stringify({ theme: 'dark' }));
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  copyOpencodeConfig(tmpDir);
  console.log = origLog;
  assert.ok(!messages.some(m => m.includes('Verify that you have these settings')), 'should not print verification message after merge');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// --- Step 1: Opencode install offer tests ---

test('offerOpencodeInstall (binary present) does nothing', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  let promptYesNoCalled = false;
  await offerOpencodeInstall({
    probe: () => true,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: true,
  });
  console.log = origLog;
  assert.equal(runInstallCalled, false, 'runInstall should not be called when binary is present');
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called when binary is present');
  assert.equal(messages.length, 0, 'nothing should be printed when binary is present');
});

test('offerOpencodeInstall (absent + TTY + yes) runs install', async () => {
  let runInstallCalled = 0;
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled++; return true; },
    promptYesNo: async () => true,
    isTTY: true,
  });
  assert.equal(runInstallCalled, 1, 'runInstall should be called exactly once when user says yes');
});

test('offerOpencodeInstall (absent + TTY + no) prints command', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let runInstallCalled = false;
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => false,
    isTTY: true,
  });
  console.log = origLog;
  assert.equal(runInstallCalled, false, 'runInstall should not be called when user declines');
  assert.ok(messages.some(m => m.includes(OPENCODE_INSTALL_CMD)), 'output should include install command');
});

test('offerOpencodeInstall (absent + no TTY) prints without prompting', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  let promptYesNoCalled = false;
  let runInstallCalled = false;
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => { runInstallCalled = true; return true; },
    promptYesNo: async () => { promptYesNoCalled = true; return true; },
    isTTY: false,
  });
  console.log = origLog;
  assert.equal(promptYesNoCalled, false, 'promptYesNo should not be called in non-TTY mode');
  assert.equal(runInstallCalled, false, 'runInstall should not be called in non-TTY mode');
  assert.ok(messages.some(m => m.includes(OPENCODE_INSTALL_CMD)), 'output should include install command');
});

test('offerOpencodeInstall (install failure) does not throw', async () => {
  const messages = [];
  const origLog = console.log;
  console.log = (m) => messages.push(String(m));
  await offerOpencodeInstall({
    probe: () => false,
    runInstall: () => false,
    promptYesNo: async () => true,
    isTTY: true,
  });
  console.log = origLog;
  assert.ok(messages.some(m => m.includes(OPENCODE_INSTALL_CMD)), 'output should include manual install command');
});

test('probeOpencode uses spawnSync exit-code semantics', () => {
  const origSpawnSync = childProcess.spawnSync;
  const spawnSyncCalls = [];
  childProcess.spawnSync = (...args) => {
    spawnSyncCalls.push(args);
    const callIndex = spawnSyncCalls.length - 1;
    if (callIndex === 0) return { error: new Error('not found'), status: null, stdout: '', stderr: '' };
    if (callIndex === 1) return { error: null, status: 1, stdout: '', stderr: '' };
    if (callIndex === 2) return { error: null, status: 0, stdout: 'opencode x.y.z\n', stderr: '' };
    return { error: null, status: 0, stdout: '', stderr: '' };
  };
  try {
    assert.equal(probeOpencode(), false, 'error should return false');
    assert.equal(probeOpencode(), false, 'non-zero status should return false');
    assert.equal(probeOpencode(), true, 'zero status should return true');
    assert.ok(spawnSyncCalls.length >= 3, 'spawnSync should be called at least 3 times');
    for (const call of spawnSyncCalls) {
      assert.equal(typeof call[0], 'string', 'should use string command');
      assert.equal(call[0], 'opencode --version', 'should use exact command string');
      assert.equal(call[1]?.shell, true, 'should use shell: true');
    }
  } finally {
    childProcess.spawnSync = origSpawnSync;
  }
});

test('copyOpencodeConfig proceeds past non-plain-object agent maps and merges permission in place', () => {
  const cases = [
    ['opencode.json', JSON.stringify({ agent: ['not', 'an', 'object'] }), ['not', 'an', 'object']],
    ['opencode.jsonc', '{ "agent": 42 }\n', 42],
  ];
  for (const [name, content, expectedAgent] of cases) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-malformed-'));
    const messages = [];
    const originalLog = console.log;
    try {
      fs.writeFileSync(path.join(tmpDir, name), content);
      console.log = message => messages.push(String(message));
      copyOpencodeConfig(tmpDir);
      const config = jsonc.parse(fs.readFileSync(path.join(tmpDir, name), 'utf8'));
      assert.deepEqual(config.agent, expectedAgent,
        `${name}: the non-plain-object agent subtree must survive untouched`);
      assert.equal(config.permission?.external_directory?.[SAI_EXTERNAL_DIRECTORY], 'allow',
        `${name}: the permission merge should proceed despite the non-plain-object agent`);
      assert.equal(messages.some(message => /manual|already exists|verify/i.test(message)), false,
        `${name}: no fallback message should be printed when the merge proceeds`);
    } finally {
      console.log = originalLog;
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

// --- Step 1: external-directory permission merge tests ---

function permissionStepTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sai-permission-step-1-'));
}

function writePermissionConfig(dir, name, value) {
  const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  fs.writeFileSync(path.join(dir, name), content);
  return content;
}

function readPermissionConfig(dir, name) {
  return jsonc.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
}

function capturePermissionOutput(fn) {
  const messages = [];
  const originalLog = console.log;
  console.log = message => messages.push(String(message));
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return messages;
}

test('Step 1 fresh install grants narrow SAI external-directory access and ships no agent block', () => {
  const dir = permissionStepTempDir();
  try {
    installOpencode(dir);
    const name = fs.existsSync(path.join(dir, 'opencode.json')) ? 'opencode.json' : 'opencode.jsonc';
    const config = readPermissionConfig(dir, name);
    assert.equal(config.permission.external_directory[SAI_EXTERNAL_DIRECTORY], 'allow');
    assert.ok(config.permission.read, 'SAI read permissions should remain present');
    assert.equal(Object.hasOwn(config, 'agent'), false,
      'specs/opencode-generic-agent-files/spec.md: the installed config must carry no agent block');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Step 1 JSON-only and JSONC-only object permissions append exactly one narrow rule', () => {
  for (const name of ['opencode.json', 'opencode.jsonc']) {
    const dir = permissionStepTempDir();
    try {
      writePermissionConfig(dir, name, { permission: { read: { [SAI_EXTERNAL_DIRECTORY]: 'allow' }, external_directory: { '*.md': 'ask' } } });
      copyOpencodeConfig(dir);
      const config = readPermissionConfig(dir, name);
      assert.equal(config.permission.external_directory[SAI_EXTERNAL_DIRECTORY], 'allow');
      assert.equal(Object.keys(config.permission.external_directory).length, 2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 changes only opencode.json when both config files exist', () => {
  const dir = permissionStepTempDir();
  const jsoncContent = '// untouched\n{ "permission": { "external_directory": { "*.md": "ask" } } }\n';
  try {
    writePermissionConfig(dir, 'opencode.json', { permission: { external_directory: { '*.md': 'ask' } } });
    writePermissionConfig(dir, 'opencode.jsonc', jsoncContent);
    copyOpencodeConfig(dir);
    assert.equal(fs.readFileSync(path.join(dir, 'opencode.jsonc'), 'utf8'), jsoncContent);
    assert.equal(readPermissionConfig(dir, 'opencode.json').permission.external_directory[SAI_EXTERNAL_DIRECTORY], 'allow');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Step 1 preserves comments, unrelated values, agents, plugins, MCP entries, and rule order', () => {
  const dir = permissionStepTempDir();
  const fixture = `// keep this comment\n${JSON.stringify({
    permission: { external_directory: { first: 'ask', second: 'deny' } },
    agent: { custom: { model: 'user-model' } },
    plugin: ['user-plugin'],
    mcp: { local: { command: 'user-command' } },
  }, null, 2)}\n`;
  try {
    writePermissionConfig(dir, 'opencode.jsonc', fixture);
    copyOpencodeConfig(dir);
    const raw = fs.readFileSync(path.join(dir, 'opencode.jsonc'), 'utf8');
    const config = jsonc.parse(raw);
    assert.match(raw, /keep this comment/);
    assert.deepEqual(config.agent.custom, { model: 'user-model' });
    assert.deepEqual(config.plugin, ['user-plugin']);
    assert.deepEqual(config.mcp.local, { command: 'user-command' });
    assert.deepEqual(Object.keys(config.permission.external_directory), ['first', 'second', SAI_EXTERNAL_DIRECTORY]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Step 1 treats wildcard as broad, and normalized equivalent SAI spellings as existing', () => {
  const absolute = path.join(os.homedir(), '.config', 'opencode', 'sai', '**');
  const variants = [
    '*',
    absolute,
    absolute.replaceAll(path.sep, path.sep === '/' ? '\\' : '/'),
    '~/.config/opencode/./sai/**',
  ];
  for (const existing of variants) {
    const dir = permissionStepTempDir();
    try {
      writePermissionConfig(dir, 'opencode.json', { permission: { external_directory: { [existing]: 'allow' } } });
      copyOpencodeConfig(dir);
      const rules = readPermissionConfig(dir, 'opencode.json').permission.external_directory;
      if (existing === '*') assert.equal(Object.keys(rules).length, 2);
      else assert.equal(Object.keys(rules).length, 1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 respects effective rule order for broad deny and narrow allow or deny', () => {
  const cases = [
    { rules: { '*': 'deny', [SAI_EXTERNAL_DIRECTORY]: 'allow' }, expected: 'allow' },
    { rules: { [SAI_EXTERNAL_DIRECTORY]: 'allow', '*': 'deny' }, expected: 'deny' },
  ];
  for (const { rules, expected } of cases) {
    const dir = permissionStepTempDir();
    try {
      writePermissionConfig(dir, 'opencode.json', { permission: { external_directory: rules } });
      copyOpencodeConfig(dir);
      const config = readPermissionConfig(dir, 'opencode.json');
      assert.equal(config.permission.external_directory[SAI_EXTERNAL_DIRECTORY], expected);
      assert.equal(Object.keys(config.permission.external_directory).length, 2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 preserves valid scalar permissions and reports broad access or restriction', () => {
  for (const [location, action] of [['permission', 'allow'], ['permission', 'ask'], ['permission.external_directory', 'deny'], ['permission.external_directory', 'allow']]) {
    const dir = permissionStepTempDir();
    try {
      const permission = location === 'permission' ? action : { external_directory: action };
      writePermissionConfig(dir, 'opencode.json', { permission });
      const messages = capturePermissionOutput(() => copyOpencodeConfig(dir));
      const config = readPermissionConfig(dir, 'opencode.json');
      if (location === 'permission') assert.equal(config.permission, action);
      else assert.equal(config.permission.external_directory, action);
      if (action === 'allow') assert.ok(messages.some(message => message === `OpenCode SAI permission: preserved allow at ${location}; existing broad user permission allows ${SAI_EXTERNAL_DIRECTORY}.`));
      else assert.ok(messages.some(message => message === `OpenCode SAI permission: preserved ${action} for ${SAI_EXTERNAL_DIRECTORY}; explicit user restriction prevents automatic SAI access.`));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 rejects invalid permission inputs without partial writes', () => {
  const cases = [
    ['permission', ['array'], 'array'],
    ['permission', 'maybe', 'action'],
    ['permission.external_directory', ['array'], 'shape'],
    ['permission.external_directory', { [SAI_EXTERNAL_DIRECTORY]: 'maybe' }, 'action'],
  ];
  for (const [location, value, diagnostic] of cases) {
    const dir = permissionStepTempDir();
    try {
      const config = location === 'permission' ? { permission: value } : { permission: { external_directory: value } };
      writePermissionConfig(dir, 'opencode.json', config);
      const messages = capturePermissionOutput(() => copyOpencodeConfig(dir));
      const after = readPermissionConfig(dir, 'opencode.json');
      assert.deepEqual(after.permission, config.permission);
      assert.ok(messages.some(message => message === `OpenCode SAI permission: no change for ${SAI_EXTERNAL_DIRECTORY}; ${location} has invalid ${diagnostic}; expected allow, ask, deny, or a rule object.`));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('Step 1 leaves effective configuration and bytes unchanged on a second installation', () => {
  const dir = permissionStepTempDir();
  try {
    writePermissionConfig(dir, 'opencode.json', { permission: { external_directory: { '*.md': 'ask' } } });
    copyOpencodeConfig(dir);
    const firstBytes = fs.readFileSync(path.join(dir, 'opencode.json'));
    const firstConfig = readPermissionConfig(dir, 'opencode.json');
    copyOpencodeConfig(dir);
    assert.deepEqual(readPermissionConfig(dir, 'opencode.json'), firstConfig);
    assert.deepEqual(fs.readFileSync(path.join(dir, 'opencode.json')), firstBytes);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Step 1 does not treat permission.read as external-directory access', () => {
  const dir = permissionStepTempDir();
  try {
    writePermissionConfig(dir, 'opencode.json', { permission: { read: { [SAI_EXTERNAL_DIRECTORY]: 'allow' } } });
    copyOpencodeConfig(dir);
    const config = readPermissionConfig(dir, 'opencode.json');
    assert.equal(config.permission.external_directory[SAI_EXTERNAL_DIRECTORY], 'allow');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// --- Step 2: external-directory trust-boundary documentation contracts ---

const OPENCODE_INSTALL_GUIDE = fs.readFileSync(path.join(__dirname, '..', 'INSTALL.opencode.md'), 'utf8');

test('Step 2 installation guide documents the narrow merge boundary and JSON precedence', () => {
  assert.match(OPENCODE_INSTALL_GUIDE, /merge(?:s|d)? rather than overwrit(?:e|ing) user settings/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /preserv(?:e|es|ing) user comments/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /~\/\.config\/opencode\/sai\/\*\*/);
  assert.match(OPENCODE_INSTALL_GUIDE, /opencode\.json.*(?:merge target|takes precedence|preferred).*opencode\.jsonc/is);
  assert.doesNotMatch(OPENCODE_INSTALL_GUIDE, /"agent"\s*:\s*\{/,
    'the installation guide must not show an agent block');
  assert.match(OPENCODE_INSTALL_GUIDE, /~\/\.config\/opencode\/agents\/(?:explore|executor|budget)\.md/,
    'specs/opencode-generic-agent-files/spec.md: the guide should document the generic agent files under the agents directory');
});

test('Step 2 installation guide documents the post-install smoke procedure and diagnostics', () => {
  assert.match(OPENCODE_INSTALL_GUIDE, /restart|reload/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /(?:invoke|run|execute) (?:one )?SAI command/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /no prompt/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /preserv(?:e|es|ed|ing).*\bask\b.*\bdeny\b/is);
  assert.match(OPENCODE_INSTALL_GUIDE, /stdout diagnostic/i);
});

test('Step 2 design guidance distinguishes external-directory authorization from read authorization', () => {
  assert.match(OPENCODE_INSTALL_GUIDE, /external[- ]directory authorization/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /read authorization/i);
  assert.match(OPENCODE_INSTALL_GUIDE, /(?:do not|not).*broad external[- ]directory access/i);
});

test('Step 2 installation guide contains the canonical narrow restriction template and effective outcomes', () => {
  assert.match(OPENCODE_INSTALL_GUIDE, /"external_directory"\s*:\s*\{[\s\S]*"~\/\.config\/opencode\/sai\/\*\*"\s*:\s*"allow"[\s\S]*\}/);
  assert.match(OPENCODE_INSTALL_GUIDE, /effective.*allow.*without a prompt/is);
  assert.match(OPENCODE_INSTALL_GUIDE, /\bask\b.*matching install notice.*runtime prompt/is);
  assert.match(OPENCODE_INSTALL_GUIDE, /\bdeny\b.*matching install notice.*runtime (?:prompt|block)/is);
});

// --- Step 1: owned-copy installer path harness-neutrality ---

const STEP_1_SCRATCH_DIR = path.join(__dirname, '..', '.tmp', 'collapse-sai-worker-matrix', 'opencode-markdown-worker-agents');
test.after(() => {
  fs.rmSync(STEP_1_SCRATCH_DIR, { recursive: true, force: true });
});

function syntheticOpencodeAgentBytes(workerName) {
  return [
    '---',
    'mode: subagent',
    'model: opencode-go/deepseek-v4-flash',
    'permission:',
    '  task:',
    "    '*': deny",
    '    explore: allow',
    '---',
    `# Synthetic opencode source agent: ${workerName}`,
    '',
    `SYNTHETIC-OPENCODE-SOURCE-BYTES-${workerName}`,
    '',
  ].join('\n');
}

function tunableSeedProjection(targetPath, agentName) {
  return {
    strategy: 'tunable-seed',
    harness: 'opencode',
    sourcePath: path.join(targetPath, 'sources', agentName),
    destinationPath: path.join(targetPath, 'agents', agentName),
  };
}

test('Step 1 tunable-seed projection seeds the declared opencode source bytes', () => {
  fs.mkdirSync(STEP_1_SCRATCH_DIR, { recursive: true });
  const targetPath = fs.mkdtempSync(path.join(STEP_1_SCRATCH_DIR, 'opencode-seed-bytes-'));
  const agentName = 'sai-5-review-worker.md';
  const projection = tunableSeedProjection(targetPath, agentName);
  const opencodeBytes = syntheticOpencodeAgentBytes('sai-5-review-worker');
  try {
    fs.mkdirSync(path.dirname(projection.sourcePath), { recursive: true });
    fs.mkdirSync(path.dirname(projection.destinationPath), { recursive: true });
    fs.writeFileSync(projection.sourcePath, opencodeBytes);
    installProjection(projection, targetPath);
    assert.deepEqual(
      fs.readFileSync(projection.destinationPath, 'utf8'),
      opencodeBytes,
      'specs/managed-worker-registry/spec.md: the tunable-seed install must write the declared opencode source bytes, not the Claude counterpart',
    );
    assert.equal(
      fs.existsSync(path.join(path.dirname(projection.destinationPath),
        `.${path.basename(projection.destinationPath, '.md')}.owner.json`)),
      false,
      'specs/managed-worker-registry/spec.md: a tunable-seed install must not create an owner sidecar',
    );
  } finally {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
});

test('Step 1 Claude agent rows remain byte-preserving without ownership sidecars', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-seed-bytes-'));
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  try {
    installClaude(tmpDir);
    const destinationRoot = {
      commands: path.join(tmpDir, 'commands'),
      sai: path.join(tmpDir, 'sai'),
      skills: path.join(tmpDir, 'skills'),
      agents: path.join(tmpDir, 'agents'),
      config: tmpDir,
      root: tmpDir,
    };
    const active = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot });
    for (const workerName of CURRENT_CENSUS) {
      const agentPath = path.join(tmpDir, 'agents', `${workerName}.md`);
      assert.ok(fs.existsSync(agentPath), `${workerName} should install a managed Claude agent`);
      const text = fs.readFileSync(agentPath, 'utf8').replaceAll('\r\n', '\n');
      assert.equal((text.match(/^---\r?\n/gm) || []).length, 2,
        `specs/managed-worker-registry/spec.md: ${workerName} should contain exactly one frontmatter block`);
      assert.equal(
        (text.match(/^Fetch @sai\/orchestration\/workers\/[^\s`]+\.md and follow it exactly\.$/gm) || []).length,
        1,
        `specs/managed-worker-registry/spec.md: ${workerName} should carry exactly one canonical worker Fetch`);
      const projection = active.find(candidate => candidate.destinationPath === agentPath);
      assert.ok(projection, `${workerName} should be an active Claude projection`);
      const source = path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
      assert.equal(/^agents\/claude\/sai-\d-.*-worker\.md$/.test(source), false,
        `specs/managed-worker-registry/spec.md: ${workerName} must not source from a retired per-harness agent tree: ${source}`);
      assert.equal(fs.existsSync(path.join(tmpDir, 'agents', `.${workerName}.owner.json`)), false,
        `specs/managed-worker-registry/spec.md: ${workerName} must not gain an owner sidecar`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

// --- Step 3: binding-derived roster replaces the retired registration surface ---

test('Step 3 binding roster validation yields exactly the seven managed workers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-roster-'));
  try {
    installOpencode(tmpDir);
    const bindingsDir = path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings');
    const roster = validateOpencodeWorkerBindings(bindingsDir);
    const names = (Array.isArray(roster) ? roster : Object.keys(roster || {}))
      .map(entry => (typeof entry === 'string' ? entry : entry && entry.name))
      .sort();
    assert.deepEqual(names, [...CURRENT_CENSUS].sort(),
      'specs/opencode-agent-census/spec.md: the binding roster must contain exactly the seven managed workers with no extra or missing worker');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Step 3 binding files declare exactly the seven initial worker dispatches', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-bindings-scan-'));
  try {
    installOpencode(tmpDir);
    const bindingsDir = path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings');
    const declared = [];
    for (const file of fs.readdirSync(bindingsDir)) {
      const source = fs.readFileSync(path.join(bindingsDir, file), 'utf8');
      for (const call of extractDispatchCalls(source, 'task')) {
        if (/\btask_id\s*[:=]/.test(call)) continue;
        const match = call.match(/\bsubagent_type\s*[:=]\s*"([^"]+)"/);
        assert.ok(match, `${file} should carry a quoted subagent_type in its initial dispatch`);
        declared.push(match[1]);
      }
    }
    assert.deepEqual(declared.sort(), [...CURRENT_CENSUS].sort(),
      'specs/opencode-agent-census/spec.md: initial binding dispatches must define exactly the managed roster');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Step 3 roster validation admits dispatch-less render bindings alongside worker bindings', () => {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-render-binding-'));
  try {
    const installDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-render-install-'));
    try {
      installOpencode(installDir);
      fs.copyFileSync(
        path.join(installDir, 'sai', 'orchestration', 'workers', 'bindings', 'design-worker.md'),
        path.join(fixtureDir, 'design-worker.md')
      );
    } finally {
      fs.rmSync(installDir, { recursive: true, force: true });
    }
    fs.writeFileSync(
      path.join(fixtureDir, 'idea-list-render.md'),
      '# Opencode Idea-List Render Binding\n\nThis harness has a native task panel. It declares no worker dispatch.\n',
      'utf8'
    );
    let roster = null;
    let validationError = null;
    try {
      roster = validateOpencodeWorkerBindings(fixtureDir);
    } catch (error) {
      validationError = error.message;
    }
    assert.equal(validationError, null,
      `a dispatch-less render binding must not fail roster validation: ${validationError}`);
    const names = (Array.isArray(roster) ? roster : Object.keys(roster || {})).sort();
    assert.deepEqual(names, ['sai-2-design-worker'],
      'the roster should contain exactly the validated worker and ignore the render binding');
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('Step 3 retired registration surface is no longer exported from the installer', () => {
  const flow = require('../bin/install-flow.js');
  assert.equal(flow.OPENCODE_MANAGED_AGENTS, undefined,
    'specs/managed-worker-registry/spec.md: OPENCODE_MANAGED_AGENTS must be retired');
  assert.equal(flow.OPENCODE_REGISTRATION_DEFAULTS, undefined,
    'specs/managed-worker-registry/spec.md: OPENCODE_REGISTRATION_DEFAULTS must be retired');
  assert.equal(typeof flow.getOpencodeManagedAgents, 'undefined',
    'specs/managed-worker-registry/spec.md: getOpencodeManagedAgents must be retired');
  assert.equal(typeof flow.__test.deriveOpencodeAgentCensus, 'undefined',
    'specs/opencode-agent-census/spec.md: the registration-default half of the census must be retired');
});

test('Step 2 canonical opencode config sample defines no agent', () => {
  const sample = jsonc.parse(fs.readFileSync(path.join(__dirname, '..', 'configs', 'opencode.jsonc'), 'utf8'));
  assert.ok(Object.hasOwn(sample, '$schema'),
    'specs/opencode-config-install/spec.md: the sample should retain $schema');
  assert.ok(Object.hasOwn(sample, 'subagent_depth'),
    'specs/managed-worker-registry/spec.md: the sample should retain subagent_depth');
  assert.ok(sample.permission, 'specs/managed-worker-registry/spec.md: the sample should retain permission');
  assert.equal(Object.hasOwn(sample, 'agent'), false,
    'specs/managed-worker-registry/spec.md: the canonical opencode configuration sample defines no agent');
  assert.deepEqual(Object.keys(sample).sort(), ['$schema', 'permission', 'subagent_depth'].sort(),
    'specs/opencode-config-install/spec.md: top-level keys should be exactly $schema, subagent_depth, permission');
  assert.equal(sample.permission.external_directory[SAI_EXTERNAL_DIRECTORY], 'allow',
    'specs/managed-worker-registry/spec.md: the sample should ship the narrow external-directory rule');
  assert.equal(sample.permission.external_directory[OPENCODE_COMMANDS_EXTERNAL_DIRECTORY], 'allow',
    'specs/opencode-permission-template/spec.md: the sample should allow the commands/ fetch-namespace entry');
  assert.equal(sample.permission.external_directory[OPENCODE_SKILLS_EXTERNAL_DIRECTORY], 'allow',
    'specs/opencode-permission-template/spec.md: the sample should allow the skills/ fetch-namespace entry');
});

test('Step 3 shipped template external_directory uses forward slashes and only fetch-namespace entries', () => {
  const sample = jsonc.parse(fs.readFileSync(path.join(__dirname, '..', 'configs', 'opencode.jsonc'), 'utf8'));
  for (const pattern of Object.keys(sample.permission.external_directory)) {
    assert.doesNotMatch(pattern, /\\/,
      `specs/opencode-permission-template/spec.md: external_directory pattern ${pattern} must not contain a backslash separator`);
    assert.ok(
      [SAI_EXTERNAL_DIRECTORY, OPENCODE_COMMANDS_EXTERNAL_DIRECTORY, OPENCODE_SKILLS_EXTERNAL_DIRECTORY].includes(pattern),
      `specs/opencode-permission-template/spec.md: pattern ${pattern} must be one of the three fetch-namespace entries (the skill-tool mapping adds no entry)`
    );
  }
});

test('Step 2 fresh install ships a config with no agent keys and keeps the narrow permission rule', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-worker-free-'));
  try {
    installOpencode(tmpDir);
    const configName = fs.existsSync(path.join(tmpDir, 'opencode.json')) ? 'opencode.json' : 'opencode.jsonc';
    const config = jsonc.parse(fs.readFileSync(path.join(tmpDir, configName), 'utf8'));
    assert.equal(Object.hasOwn(config, 'agent'), false,
      'specs/opencode-generic-agent-files/spec.md: the shipped config must carry no agent block');
    for (const key of AGENT_KEYS) {
      assert.equal(Object.hasOwn(config.agent || {}, key), false,
        `specs/opencode-generic-agent-files/spec.md: agent.${key} must not be merged into the fresh install`);
    }
    assert.equal(config.permission?.external_directory?.[SAI_EXTERNAL_DIRECTORY], 'allow',
      'specs/managed-worker-registry/spec.md: the narrow external-directory rule should be merged as before');
    for (const worker of CURRENT_CENSUS) {
      assert.equal(Object.hasOwn(config.agent || {}, worker), false,
        `specs/managed-worker-registry/spec.md: agent.${worker} must not be injected by the installer`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Step 2 fresh install seeds the generic opencode agent files from their sources', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-generic-agents-'));
  try {
    installOpencode(tmpDir);
    for (const name of AGENT_KEYS) {
      const agentPath = path.join(tmpDir, 'agents', `${name}.md`);
      const repoAgentPath = path.join(__dirname, '..', 'agents', 'opencode', `${name}.md`);
      assert.ok(fs.existsSync(repoAgentPath),
        `specs/opencode-generic-agent-files/spec.md: ${name} should have an opencode source agent`);
      assert.ok(fs.existsSync(agentPath),
        `specs/opencode-generic-agent-files/spec.md: ${name}.md should be projected into the agents directory`);
      assert.deepEqual(fs.readFileSync(agentPath), fs.readFileSync(repoAgentPath),
        `specs/opencode-generic-agent-files/spec.md: ${name} should be byte-identical to its opencode source`);
      assert.equal(fs.existsSync(path.join(tmpDir, 'agents', `.${name}.owner.json`)), false,
        `specs/opencode-generic-agent-files/spec.md: ${name} must not gain an ownership sidecar`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Step 2 retired agent-key merge exports are no longer available from the installer', () => {
  const flow = require('../bin/install-flow.js');
  assert.equal(flow.OPENCODE_AGENT_KEYS, undefined,
    'specs/opencode-config-install/spec.md: OPENCODE_AGENT_KEYS must be retired');
  assert.equal(flow.OPENCODE_PLACEHOLDER_MODEL, undefined,
    'specs/opencode-config-install/spec.md: OPENCODE_PLACEHOLDER_MODEL must be retired');
});

test('Step 3 install seeds the seven managed opencode worker agent files with their canonical contracts', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-agents-projected-'));
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  try {
    installOpencode(tmpDir);
    const destinationRoot = {
      commands: path.join(tmpDir, 'commands'),
      sai: path.join(tmpDir, 'sai'),
      skills: path.join(tmpDir, 'skills'),
      agents: path.join(tmpDir, 'agents'),
      config: tmpDir,
      root: tmpDir,
    };
    const active = expandInstallManifest(manifest, { harness: 'opencode', repoRoot, destinationRoot });
    for (const worker of CURRENT_CENSUS) {
      const agentPath = path.join(tmpDir, 'agents', `${worker}.md`);
      assert.ok(fs.existsSync(agentPath),
        `specs/managed-worker-registry/spec.md: ${worker}.md should be projected into the agents directory`);
      const text = fs.readFileSync(agentPath, 'utf8').replaceAll('\r\n', '\n');
      assert.equal((text.match(/^---\r?\n/gm) || []).length, 2,
        `specs/managed-worker-registry/spec.md: ${worker} should contain exactly one frontmatter block`);
      assert.equal(
        (text.match(/^Fetch @sai\/orchestration\/workers\/[^\s`]+\.md and follow it exactly\.$/gm) || []).length,
        1,
        `specs/managed-worker-registry/spec.md: ${worker} should carry exactly one canonical worker Fetch`);
      assert.ok(text.includes(`Fetch @sai/orchestration/workers/${worker}.md and follow it exactly.`),
        `specs/managed-worker-registry/spec.md: ${worker} should target its own worker contract`);
      const projection = active.find(candidate => candidate.destinationPath === agentPath);
      assert.ok(projection, `specs/managed-worker-registry/spec.md: ${worker} should be an active opencode projection`);
      const source = path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
      assert.equal(/^agents\/opencode\/sai-\d-.*-worker\.md$/.test(source), false,
        `specs/managed-worker-registry/spec.md: ${worker} must not source from a retired per-harness agent tree: ${source}`);
      assert.equal(fs.existsSync(path.join(tmpDir, 'agents', `.${worker}.owner.json`)), false,
        `specs/managed-worker-registry/spec.md: ${worker} must not gain an ownership sidecar`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('opencode installer consumes exactly the seven matrix worker bindings and agents', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-opencode-matrix-inventory-'));
  try {
    const destinationRoot = {
      commands: path.join(tmpDir, 'commands'),
      sai: path.join(tmpDir, 'sai'),
      skills: path.join(tmpDir, 'skills'),
      agents: path.join(tmpDir, 'agents'),
      config: tmpDir,
      root: tmpDir,
    };
    const active = expandInstallManifest(manifest, { harness: 'opencode', repoRoot, destinationRoot });
    const phases = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];
    const bindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/') &&
        phases.includes(path.basename(projection.destinationPath, '-worker.md')))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(bindingNames.length, 7, 'opencode should project exactly seven worker bindings');
    assert.equal(bindingNames.includes('idea-list-render.md'), false,
      'opencode must not project an idea-list-render matrix binding');
    const allBindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/'))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(allBindingNames.includes('idea-list-render.md'), true,
      'opencode should keep the regular idea-list-render binding beside the matrix bindings');
    const agentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents) &&
        CURRENT_CENSUS.includes(path.basename(projection.destinationPath, '.md')))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    assert.equal(agentNames.length, 7, 'opencode should project exactly seven managed agents');
    assert.equal(agentNames.some(name => ['budget', 'executor', 'explore'].includes(name)), false,
      'opencode must not project support agents as matrix worker inventory');
    const allAgentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    assert.equal(['budget', 'executor', 'explore'].every(name => allAgentNames.includes(name)), true,
      'opencode should keep its three support agents beside the matrix agents');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Step 3 budget skills resolve models from the projected agent files and keep their trigger summaries', () => {
  const skills = [
    {
      name: 'budget-explorer',
      file: 'explore.md',
      keyword: 'explore',
      triggers: [
        'use explorer',
        'use cheap subagent',
        'delegate research',
        'run cheap subagent',
        'spawn explore subagent',
        'cheap research agent',
        'use explore agent',
        'delegate lookup',
      ],
    },
    {
      name: 'budget-executor',
      file: 'executor.md',
      keyword: 'executor',
      triggers: [
        'use executor',
        'spawn executor',
        'run command subagent',
        'delegate execution',
        'execute in subagent',
        'run cheap executor',
      ],
    },
    {
      name: 'budget-subagent',
      file: 'budget.md',
      keyword: 'budget',
      triggers: [],
    },
  ];
  for (const { name, file, keyword, triggers } of skills) {
    const skill = fs.readFileSync(path.join(__dirname, '..', 'skills', 'opencode', name, 'SKILL.md'), 'utf8');
    const descriptionMatch = skill.match(/^description:\s*(.+)$/m);
    assert.ok(descriptionMatch, `${name} should declare a description`);
    let description = descriptionMatch[1].trim();
    if (/^[|>]/.test(description)) {
      const rest = skill.slice(descriptionMatch.index + descriptionMatch[0].length);
      const nextField = rest.match(/^[a-zA-Z][a-zA-Z-]*:\s/m);
      description = (nextField ? rest.slice(0, nextField.index) : rest).trim();
    }
    assert.ok(description.length > 0, `${name} should declare a non-empty description`);
    const triggerIndex = description.indexOf('TRIGGER when:');
    assert.ok(triggerIndex > 0,
      `specs/opencode-budget-explorer-triggers/spec.md: ${name} should keep the one-sentence summary before TRIGGER when`);
    for (const trigger of triggers) {
      assert.ok(description.includes(trigger),
        `specs/opencode-budget-explorer-triggers/spec.md: ${name} should trigger on ${trigger}`);
    }
    assert.doesNotMatch(skill, new RegExp(`agent\\.${keyword}\\.model`),
      `specs/opencode-budget-explorer-triggers/spec.md: ${name} must not mention agent.${keyword}.model`);
    assert.match(skill, new RegExp(`~/\\.config/opencode/agents/${file.replace('.', '\\.')}`),
      `specs/opencode-budget-explorer-triggers/spec.md: ${name} should name its own agent file as the model-resolution source`);
    if (name !== 'budget-subagent') {
      const modelResolutionIndex = skill.indexOf('## Model resolution');
      const costModelIndex = skill.indexOf('## Cost model');
      assert.ok(modelResolutionIndex !== -1 && costModelIndex !== -1 && modelResolutionIndex < costModelIndex,
        `specs/opencode-budget-explorer-triggers/spec.md: ${name} should state agent-file frontmatter resolution in a ## Cost model section after ## Model resolution`);
    }
    if (name === 'budget-subagent') {
      assert.match(skill, /\bbudget\b[\s\S]{0,60}\bkeyword\b/i,
        'specs/opencode-budget-explorer-triggers/spec.md: budget-subagent should bind to the budget keyword');
      assert.doesNotMatch(skill, /\bmodel\s*:\s*["']?opencode-go\/[A-Za-z0-9._-]+/,
        'specs/opencode-budget-explorer-triggers/spec.md: budget-subagent must not hardcode a model id');
    }
  }
});

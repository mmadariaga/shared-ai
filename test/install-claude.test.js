'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');

const {
  installClaude,
  MANAGED_WORKERS,
  CLAUDE_SPEC_WORKER_AGENT,
  CLAUDE_DESIGN_WORKER_AGENT,
  CLAUDE_IMPLEMENTATION_WORKER_AGENT,
  CLAUDE_REVIEW_WORKER_AGENT,
} = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const STEP_2_SCRATCH_DIR = path.join(__dirname, '..', '.tmp', 'collapse-sai-worker-matrix', 'deterministic-worker-contract-delivery');
const WORKER_BINDINGS = [
  ['spec', 'sai-1-spec-proposal-worker', 'spec-worker.md'],
  ['design', 'sai-2-design-worker', 'design-worker.md'],
  ['implement', 'sai-3-implementation-worker', 'implementation-worker.md'],
  ['review', 'sai-5-review-worker', 'review-worker.md'],
  ['security', 'sai-6-security-worker', 'security-worker.md'],
  ['performance', 'sai-7-performance-worker', 'performance-worker.md'],
  ['accessibility', 'sai-8-accessibility-worker', 'accessibility-worker.md'],
];

function stripTunableLines(text) {
  return text.split('\n').filter(line => !/^(model|effort|variant):/.test(line)).join('\n');
}

function expectedWorkerPrompt(phase) {
  return `Worker contract: Fetch @sai/commands/${phase}/worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>`;
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

function captureNotices(fn) {
  const notices = [];
  const originalLog = console.log;
  console.log = message => notices.push(String(message));
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return notices;
}

test('managed worker registry defines every Claude compatibility export', () => {
  assert.ok(MANAGED_WORKERS, 'MANAGED_WORKERS should be exported');

  const expectedNames = [
    'sai-3-implementation-worker',
    'sai-2-design-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-7-performance-worker',
    'sai-8-accessibility-worker',
    'sai-1-spec-proposal-worker',
  ];
  assert.deepEqual(Object.keys(MANAGED_WORKERS), expectedNames,
    'registry keys should contain each managed worker exactly once');

  const expectedClaude = {
    'sai-1-spec-proposal-worker': {
      agent: 'sai-1-spec-proposal-worker.md',
    },
    'sai-2-design-worker': {
      agent: 'sai-2-design-worker.md',
    },
    'sai-3-implementation-worker': {
      agent: 'sai-3-implementation-worker.md',
    },
    'sai-5-review-worker': {
      agent: 'sai-5-review-worker.md',
    },
    'sai-6-security-worker': {
      agent: 'sai-6-security-worker.md',
    },
    'sai-7-performance-worker': {
      agent: 'sai-7-performance-worker.md',
    },
    'sai-8-accessibility-worker': {
      agent: 'sai-8-accessibility-worker.md',
    },
  };

  for (const [name, claude] of Object.entries(expectedClaude)) {
    assert.deepEqual(MANAGED_WORKERS[name].claude, claude, `${name} Claude metadata should remain stable`);
    assert.equal(Object.hasOwn(MANAGED_WORKERS[name], 'opencode'), false,
      `${name} should not carry opencode-only settings in the Claude registry`);
    for (const field of ['model', 'mode', 'variant', 'permission']) {
      assert.equal(Object.hasOwn(MANAGED_WORKERS[name], field), false,
        `${name} should not expose opencode-only ${field} settings`);
    }
  }
  assert.equal(Object.hasOwn(MANAGED_WORKERS['sai-1-spec-proposal-worker'], 'opencode'), false,
    'the spec worker should remain Claude-only');

  assert.equal(CLAUDE_SPEC_WORKER_AGENT, 'sai-1-spec-proposal-worker.md');
  assert.equal(CLAUDE_DESIGN_WORKER_AGENT, 'sai-2-design-worker.md');
  assert.equal(CLAUDE_IMPLEMENTATION_WORKER_AGENT, 'sai-3-implementation-worker.md');
  assert.equal(CLAUDE_REVIEW_WORKER_AGENT, 'sai-5-review-worker.md');
});

test('STEP1_RETIRE_INLINE: installer exports retain only Claude and opencode entrypoints', () => {
  const flow = require('../bin/install-flow.js');
  assert.equal(typeof flow.installClaude, 'function');
  assert.equal(typeof flow.installOpencode, 'function');
  assert.deepEqual(Object.keys(flow).filter(name => /copilot/i.test(name)), []);
});

test('installClaude copies commands/claude/*.md to dest/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  const cmdDir = path.join(tmpDir, 'commands');
  assert.ok(fs.existsSync(cmdDir), 'commands/ dir should exist');
  const files = fs.readdirSync(cmdDir);
  assert.ok(files.includes('sai-1-spec.md'), 'sai-1-spec.md should be in commands/');
  assert.ok(files.includes('budget.md'), 'budget.md should be in commands/');
  const design = fs.readFileSync(path.join(cmdDir, 'sai-2-design.md'), 'utf8');
  assert.match(design, /^model: claude-opus-4-8$/m);
  assert.match(design, /^effort: low$/m);
   assert.match(design, /^allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, Bash\(date:\*\)$/m);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies sai/commands/*.md to dest/sai/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  const saiCmdDir = path.join(tmpDir, 'sai', 'commands');
  assert.ok(fs.existsSync(saiCmdDir), 'sai/commands/ dir should exist');
  const files = fs.readdirSync(saiCmdDir);
  assert.ok(files.includes('sai-4-apply.md'), 'sai-4-apply.md should be in sai/commands/');
  for (const file of [path.join('design', 'coordinator.md'), path.join('design', 'invocation.md'), path.join('implement', 'coordinator.md'), path.join('implement', 'invocation.md')]) {
    assert.ok(fs.existsSync(path.join(saiCmdDir, file)), `${file} should be projected`);
  }
  for (const file of ['sai-1-spec.md', 'sai-5-review.md', 'sai-6-security.md', 'sai-7-performance.md', 'sai-8-accessibility.md', 'sai-2-design.md', 'sai-3-implement.md']) {
    assert.equal(fs.existsSync(path.join(saiCmdDir, file)), false, `${file} should not be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies all standalone policies to dest/sai/policies/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  for (const file of ['artifact-feedback-gate.md', 'change-picker.md', 'commit-rules.md', 'prereqs.md', 'status-picker.md']) {
    assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'policies', file)), `${file} should be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude projects the canonical ADR template and removes former compatibility destinations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'instructions', '_templates', 'adr-index.md')));
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', '_templates', 'adr-index.md')), false);
  for (const file of ['sai-2-design-core.md', 'sai-3-implementation-core.md', 'implement-invocation.md']) {
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', file)), false, `${file} should not be projected`);
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude does not project the Copilot inline orchestration adapter', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'inline-invocation.md')), false);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies all Claude-specific skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'token-efficient-languages', 'SKILL.md')), 'skills/token-efficient-languages/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md')), 'skills/budget-explorer/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-executor', 'SKILL.md')), 'skills/budget-executor/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget-subagent', 'SKILL.md')), 'skills/budget-subagent/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'fetch', 'SKILL.md')), 'skills/fetch/SKILL.md');
  assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'budget', 'SKILL.md')), 'skills/budget/SKILL.md must be present for Claude');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Step 3 fresh Claude install omits all routed worker proxy skills', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-no-proxies-'));
  const workers = [
    'sai-1-spec-proposal-worker',
    'sai-2-design-worker',
    'sai-3-implementation-worker',
    'sai-5-review-worker',
    'sai-6-security-worker',
    'sai-7-performance-worker',
    'sai-8-accessibility-worker',
  ];
  try {
    installClaude(tmpDir);
    for (const worker of workers) {
      assert.equal(fs.existsSync(path.join(tmpDir, 'skills', worker, 'SKILL.md')), false,
        `${worker} proxy skill should not be installed`);
    }
    for (const worker of workers) {
      assert.ok(fs.existsSync(path.join(tmpDir, 'agents', `${worker}.md`)), `${worker} managed agent should remain installed`);
      assert.equal(fs.existsSync(path.join(tmpDir, 'agents', `.${worker}.owner.json`)), false,
        `${worker} must not gain an owner sidecar on a fresh install`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installClaude projects the routed spec coordinator, neutral worker binding, worker card, and agent', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-spec-'));
  try {
    installClaude(tmpDir);
    for (const file of [
       path.join('sai', 'commands', 'spec', 'coordinator.md'),
       path.join('sai', 'commands', 'spec', 'worker.md'),
       path.join('sai', 'command-runner.md'),
       path.join('sai', 'worker-core.md'),
       path.join('sai', 'orchestration', 'workers', 'bindings', 'spec-worker.md'),
      path.join('agents', 'sai-1-spec-proposal-worker.md'),
    ]) assert.ok(fs.existsSync(path.join(tmpDir, file)), `${file} should be projected`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installClaude projects every routed binding into neutral destinations', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-neutral-bindings-'));
  try {
    installClaude(tmpDir);
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', 'claude')), false);
    for (const [phase, workerName, bindingName] of WORKER_BINDINGS) {
      const destination = path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', bindingName);
      assert.equal(fs.existsSync(destination), true, `${workerName} (${phase}) binding should use a neutral destination`);
      const text = fs.readFileSync(destination, 'utf8');
      assert.equal(
        (text.match(new RegExp(`Fetch @sai/commands/${phase}/worker\\.md and follow it exactly\\.`, 'g')) || []).length,
        1,
        `${workerName} (${phase}) binding should carry exactly one canonical worker Fetch`
      );
      assert.match(text, /Agent\s*\(/, `${workerName} (${phase}) binding should preserve the Agent dispatch primitive`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Step 2 initial Claude Agent dispatches deliver matching contracts and preserve continuations', () => {
  fs.mkdirSync(STEP_2_SCRATCH_DIR, { recursive: true });
  const scratchDir = fs.mkdtempSync(path.join(STEP_2_SCRATCH_DIR, 'claude-dispatch-'));
  try {
    const installDir = path.join(scratchDir, 'claude');
    fs.mkdirSync(installDir, { recursive: true });
    installClaude(installDir);
    for (const [phase, workerName, bindingName] of WORKER_BINDINGS) {
      const bindingPath = path.join(installDir, 'sai', 'orchestration', 'workers', 'bindings', bindingName);
      const calls = extractDispatchCalls(fs.readFileSync(bindingPath, 'utf8'), 'Agent');
      const initial = calls.filter(call => !/\btask_id\s*[:=]/.test(call));
      const continuations = calls.filter(call => /\btask_id\s*[:=]/.test(call));

      assert.equal(initial.length, 1, `${workerName} should have one initial Agent dispatch`);
       assert.equal(decodePrompt(initial[0]), expectedWorkerPrompt(phase),
        `specs/worker-dispatch-prompt-template/spec.md: ${workerName} should receive its matching worker contract`);
      assert.match(decodePrompt(initial[0]), /InvocationEnvelope:\n<original InvocationEnvelope>$/,
        `${workerName} should preserve the opaque InvocationEnvelope slot`);
       for (const continuation of continuations) {
         assert.doesNotMatch(continuation, /\bprompt\s*[:=]/,
          `${workerName} continuation dispatch should remain unchanged`);
      }
    }
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
});

test('Claude managed agents install with one frontmatter block and one canonical worker Fetch', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-seed-'));
  const repoRoot = path.join(__dirname, '..');
  try {
    const manifest = loadInstallManifest(repoRoot);
    const destinationRoot = {
      commands: path.join(tmpDir, 'commands'),
      sai: path.join(tmpDir, 'sai'),
      skills: path.join(tmpDir, 'skills'),
      agents: path.join(tmpDir, 'agents'),
      config: tmpDir,
      root: tmpDir,
    };
    const tunable = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot })
      .filter(projection => projection.strategy === 'tunable-seed');
    assert.equal(tunable.length, 7, 'the manifest should declare 7 tunable-seed Claude agent projections');
    assert.ok(tunable.every(projection => projection.ownership === 'managed'),
      'every tunable-seed Claude agent projection should be managed');

    installClaude(tmpDir);
    for (const projection of tunable) {
      assert.ok(fs.existsSync(projection.destinationPath),
        `managed agent should be installed: ${projection.destinationPath}`);
      const text = fs.readFileSync(projection.destinationPath, 'utf8').replaceAll('\r\n', '\n');
      assert.equal((text.match(/^---\r?\n/gm) || []).length, 2,
        `managed agent should contain exactly one frontmatter block: ${projection.destinationPath}`);
      assert.equal(
        (text.match(/^Fetch @sai\/commands\/[^\s`]+\.md and follow it exactly\.$/gm) || []).length,
        1,
        `managed agent should carry exactly one canonical worker Fetch: ${projection.destinationPath}`);
      const source = path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
      assert.equal(/^agents\/claude\/sai-\d-.*-worker\.md$/.test(source), false,
        `managed agent must not source from a retired per-harness agent tree: ${source}`);
      const ownerPath = path.join(
        path.dirname(projection.destinationPath),
        `.${path.basename(projection.destinationPath, '.md')}.owner.json`
      );
      assert.equal(fs.existsSync(ownerPath), false,
        `fresh installs must not create owner sidecars: ${projection.destinationPath}`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installClaude preserves tuned tunables and overwrites divergent bodies with notice', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-tuned-'));
  const agentPath = path.join(tmpDir, 'agents', 'sai-5-review-worker.md');
  const sidecarPath = path.join(tmpDir, 'agents', '.sai-5-review-worker.owner.json');
  try {
    installClaude(tmpDir);
    const sourceBytes = fs.readFileSync(agentPath);
    const tuned = fs.readFileSync(agentPath, 'utf8')
      .replace(/^model:.*$/m, 'model: tuned-review-model')
      .replace(/^effort:.*$/m, 'effort: high');
    assert.match(tuned, /^model: tuned-review-model$/m);
    fs.writeFileSync(agentPath, tuned);

    let reinstallError = null;
    try {
      installClaude(tmpDir);
    } catch (error) {
      reinstallError = error;
    }
    assert.equal(reinstallError, null,
      'installClaude should not throw on a tuned agent destination');
    const after = fs.readFileSync(agentPath, 'utf8');
    assert.ok(after.includes('model: tuned-review-model'),
      'the tuned model value should survive a re-install');
    assert.ok(after.includes('effort: high'),
      'the tuned effort value should survive a re-install');
    assert.equal(stripTunableLines(after), stripTunableLines(sourceBytes.toString('utf8')),
      'body and non-tunable frontmatter should match the source');
    assert.equal(fs.existsSync(sidecarPath), false,
      'no owner sidecar should exist after a tuned re-install');

    fs.writeFileSync(agentPath, 'user divergent body\n');
    const notices = captureNotices(() => {
      assert.doesNotThrow(() => installClaude(tmpDir),
        'installClaude should not throw on a divergent agent destination');
    });
    assert.deepEqual(fs.readFileSync(agentPath), sourceBytes,
      'a divergent body should be overwritten with the managed source bytes');
    assert.ok(notices.some(message => message.includes(agentPath)),
      'the overwrite should be announced with a stdout notice naming the file');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installClaude overwrites existing vendor command files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const cmdFile = path.join(tmpDir, 'commands', 'sai-1-spec.md');
  fs.mkdirSync(path.dirname(cmdFile), { recursive: true });
  fs.writeFileSync(cmdFile, 'old sentinel content');
  installClaude(tmpDir);
  const expected = fs.readFileSync(path.join(__dirname, '..', 'commands', 'claude', 'sai-1-spec.md'), 'utf8');
  assert.equal(fs.readFileSync(cmdFile, 'utf8'), expected, 'existing vendor command should be overwritten with repo version');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude overwrites stale command wrappers', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  const skillFile = path.join(tmpDir, 'skills', 'budget-explorer', 'SKILL.md');
  fs.mkdirSync(path.dirname(skillFile), { recursive: true });
  fs.writeFileSync(skillFile, 'old content');
  installClaude(tmpDir);
  assert.notEqual(fs.readFileSync(skillFile, 'utf8'), 'old content', 'existing stale file should be overwritten');
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude re-install preserves tuned values and never recreates ownership', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  try {
    installClaude(tmpDir);
    const agentPath = path.join(tmpDir, 'agents', 'sai-3-implementation-worker.md');
    const sidecarPath = path.join(tmpDir, 'agents', '.sai-3-implementation-worker.owner.json');
    const sourceBytes = fs.readFileSync(agentPath);
    fs.writeFileSync(agentPath, fs.readFileSync(agentPath, 'utf8')
      .replace(/^model:.*$/m, 'model: tuned-model')
      .replace(/^effort:.*$/m, 'effort: tuned-effort'));

    const notices = [];
    const originalLog = console.log;
    let reinstallError = null;
    console.log = message => notices.push(String(message));
    try {
      try {
        installClaude(tmpDir);
      } catch (error) {
        reinstallError = error;
      }
    } finally {
      console.log = originalLog;
    }
    assert.equal(reinstallError, null,
      'installClaude should not throw on a tuned agent destination');
    const after = fs.readFileSync(agentPath, 'utf8');
    assert.ok(after.includes('model: tuned-model') && after.includes('effort: tuned-effort'),
      'tuned values should survive a re-install');
    assert.equal(stripTunableLines(after), stripTunableLines(sourceBytes.toString('utf8')),
      'body and non-tunable frontmatter should match the source after a re-install');
    assert.ok(!notices.some(message => message.includes(agentPath)),
      'a tunable-only difference should not print an overwrite notice');
    assert.equal(fs.existsSync(sidecarPath), false,
      'a re-install must not create an owner sidecar');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('restore-coordinator-instruction-loading Step 3: isolated Claude installation resolves routed coordinator and neutral binding references', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-coordinator-loading-'));
  const wrappers = [
    ['commands/sai-2-design.md', 'design', 'design-worker.md'],
    ['commands/sai-3-implement.md', 'implement', 'implementation-worker.md'],
    ['commands/sai-5-review.md', 'review', 'review-worker.md'],
    ['commands/sai-6-security.md', 'security', 'security-worker.md'],
    ['commands/sai-7-performance.md', 'performance', 'performance-worker.md'],
    ['commands/sai-8-accessibility.md', 'accessibility', 'accessibility-worker.md'],
  ];

  function globInstalledFiles(relativeDir = '') {
    const absoluteDir = path.join(tmpDir, relativeDir);
    return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap(entry => {
      const relativePath = path.join(relativeDir, entry.name);
      return entry.isDirectory() ? globInstalledFiles(relativePath) : [relativePath];
    });
  }

  function readInstalled(relativePath) {
    return fs.readFileSync(path.join(tmpDir, relativePath), 'utf8');
  }

  function resolveFetches(relativePath, available, visited = new Set()) {
    if (visited.has(relativePath)) return;
    visited.add(relativePath);
    const source = readInstalled(relativePath);
    for (const match of source.matchAll(/Fetch @((?:sai|skills)\/[^\s`]+)/g)) {
      const target = path.normalize(match[1]);
      if (match[1].startsWith('skills/')) continue;
      assert.equal(available.has(target), true,
        `${relativePath} should resolve ${match[1]} beneath the isolated installation root`);
      resolveFetches(target, available, visited);
    }
  }

  try {
    installClaude(tmpDir);
    const available = new Set(globInstalledFiles().map(file => path.normalize(file)));
    const loaded = new Set();

     for (const [wrapperPath, coordinator, binding] of wrappers) {
       const wrapper = readInstalled(wrapperPath);
       assert.match(wrapper, new RegExp(`Fetch @sai/commands/${coordinator}/coordinator\\.md`));
       assert.match(wrapper, new RegExp(`Fetch @sai/orchestration/workers/bindings/${binding.replace('.', '\\.')}`));
       resolveFetches(wrapperPath, available, loaded);
       resolveFetches(path.join('sai', 'orchestration', 'workers', 'bindings', binding), available, loaded);
    }

    const loadedText = [...loaded].map(readInstalled).join('\n');
    assert.match(loadedText, /bindings\/[a-z-]+-worker\.md/);
    assert.doesNotMatch(loadedText, /bindings\/claude\//);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Claude installer consumes exactly the seven matrix worker bindings and agents', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-matrix-inventory-'));
  try {
    const destinationRoot = {
      commands: path.join(tmpDir, 'commands'),
      sai: path.join(tmpDir, 'sai'),
      skills: path.join(tmpDir, 'skills'),
      agents: path.join(tmpDir, 'agents'),
      config: tmpDir,
      root: tmpDir,
    };
    const active = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot });
    const phases = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility'];
    const bindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/') &&
        phases.includes(path.basename(projection.destinationPath, '-worker.md')))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(bindingNames.length, 7, 'Claude should project exactly seven worker bindings');
    assert.equal(bindingNames.includes('idea-list-render.md'), false,
      'Claude must not project an idea-list-render matrix binding');
    const allBindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/'))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(allBindingNames.includes('idea-list-render.md'), true,
      'Claude should keep the regular idea-list-render binding beside the matrix bindings');
    const agentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    assert.equal(agentNames.length, 7, 'Claude should project exactly seven managed agents');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installClaude active projection carries the neutral root protocols, routed cards, and no flat worker sources', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-layout-'));
  try {
    const destinationRoot = {
      commands: path.join(tmpDir, 'commands'),
      sai: path.join(tmpDir, 'sai'),
      skills: path.join(tmpDir, 'skills'),
      agents: path.join(tmpDir, 'agents'),
      config: tmpDir,
      root: tmpDir,
    };
    const active = expandInstallManifest(manifest, { harness: 'claude', repoRoot, destinationRoot });
    const sources = active.map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'));
    const sourceSet = new Set(sources);

    for (const protocol of ['sai/command-runner.md', 'sai/worker-core.md']) {
      assert.ok(sourceSet.has(protocol), `Claude should project the neutral root protocol ${protocol}`);
    }
    for (const [phase] of WORKER_BINDINGS) {
      assert.ok(sourceSet.has(`sai/commands/${phase}/coordinator.md`),
        `every routed card should carry a coordinator: sai/commands/${phase}/coordinator.md`);
      assert.ok(sourceSet.has(`sai/commands/${phase}/worker.md`),
        `every routed card should carry a worker: sai/commands/${phase}/worker.md`);
    }
    assert.equal(sources.some(source => /^sai\/orchestration\/workers\/sai-\d-.*-worker\.md$/.test(source)), false,
      'no flat sai/orchestration/workers/sai-*-worker.md source should remain active');
    for (const retired of [
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
    ]) {
      assert.equal(sourceSet.has(retired), false, `${retired} should be absent from the active source layout`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

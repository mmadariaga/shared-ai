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
  ['commit', 'sai-commit-worker', 'commit-worker.md'],
  ['archive', 'sai-archive-worker', 'archive-worker.md'],
  ['backfill', 'sai-backfill-worker', 'backfill-worker.md'],
  ['merge', 'sai-merge-worker', 'merge-worker.md'],
];

const WORKER_NAMES = [
  'sai-1-spec-proposal-worker',
  'sai-2-design-worker',
  'sai-3-implementation-worker',
  'sai-5-review-worker',
  'sai-6-security-worker',
  'sai-7-performance-worker',
  'sai-8-accessibility-worker',
  'sai-commit-worker',
  'sai-archive-worker',
  'sai-backfill-worker',
  'sai-merge-worker',
];

const CLAUDE_GENERIC_AGENTS = {
  'budget-explorer': 'explore',
  'budget-executor': 'executor',
  'budget-subagent': 'budget',
};

const UTILITY_COMMANDS = {
  'sai-4-apply': 'apply',
  'sai-archive': 'archive',
  'sai-explore': 'explore',
  'sai-pr': 'pr',
  'sai-status': 'status',
  'sai-worktree': 'worktree',
};

const UTILITY_CARD_CONTENTS = {
  apply: ['command-bootstrap.md', 'coordinator.md', 'green-worker.md', 'invocation.md', 'red-worker.md', 'runner.md'],
  archive: ['archive-commit-gate.instructions.md', 'command-bootstrap.md', 'coordinator.md', 'instructions.md', 'worker.md'],
  backfill: ['command-bootstrap.md', 'coordinator.md', 'instructions.md', 'worker.md'],
  commit: ['command-bootstrap.md', 'coordinator.md', 'instructions.md', 'worker.md'],
  explore: ['autofast-hands-worker.md', 'autofast-implement-worker.md', 'body.md', 'command-bootstrap.md', 'instructions.md'],
  pr: ['body.md', 'command-bootstrap.md', 'instructions.md', 'pr-body.template.md'],
  status: ['body.md', 'command-bootstrap.md'],
  worktree: ['body.md', 'command-bootstrap.md', 'instructions.md'],
};

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

function assertInstalledSelectorContract(source) {
  const textQuestion = source.indexOf('After the unchanged existing maturity text question has been emitted');
  const maturitySelector = source.indexOf('a supported capability may present one maturity selector', textQuestion);
  const edgeCaseQuestion = source.indexOf('established edge-case text question');
  const implementationQuestion = source.indexOf('implementation-detail text question');
  const laterSelector = source.indexOf('one later selector', implementationQuestion);

  assert.ok(textQuestion >= 0, 'the installed contract must retain the maturity text question');
  assert.ok(maturitySelector > textQuestion, 'the installed maturity selector must follow the text question');
  assert.match(source, /NativeStageSelectorCapability\s*=\s*\{ available: boolean, supportsFreeText: boolean, present\(selector, orderedOptions\) -> SelectorResponse \}/);
  assert.match(source, /SelectorResponse\s*=\s*\{ selector: maturity\|later, kind: option\|free-text, value: review-edge-cases\|keep-iterating\|next-step\|discuss-ideas-feedback\|null, text: string\|null \}/);
  assert.match(source, /missing capability response, `available: false`, or `supportsFreeText: false`[\s\S]{0,180}text-only fallback[\s\S]{0,120}cannot advance/i);
  assert.match(source, /Revisar edge cases[\s\S]{0,180}Seguir iterando/);
  assert.match(source, /Selecting `review-edge-cases` enters the existing edge-case writing prompt/);
  assert.match(source, /records `ask_mode: false` for that interaction/);
  assert.match(source, /Selecting `keep-iterating` or submitting maturity-selector free text keeps `ask_mode: true`/);
  assert.match(source, /does not agree the proposed list, run implementation details, crystallize, or advance beyond that prompt/);
  assert.ok(edgeCaseQuestion >= 0, 'the installed contract must retain the edge-case text question');
  assert.ok(implementationQuestion > edgeCaseQuestion, 'implementation details must follow edge cases');
  assert.ok(laterSelector > implementationQuestion, 'the later selector must follow both list questions');
  assert.match(source, /Ir al siguiente step/);
  assert.match(source, /Discutir ideas \/ dar feedback/);
  assert.match(source, /The discussion value and later-selector free text remain in ask mode and do not advance, agree a list, or crystallize/);
  assert.match(source, /The later response value `next-step` follows the existing literal `next-step` intent-recognition path exactly/);
  assert.match(source, /non-empty and empty edge-case branches/);
  assert.match(source, /non-empty and empty implementation-detail branches/);
  assert.match(source, /entry into `Crystallize`/);
  assert.match(source, /Material-change detection runs before selector-response classification/);
  assert.match(source, /reset wins: clear the pending maturity or later selector response, staged progression, pending crystallization request, and both agreed lists/);
  assert.match(source, /return the new active-uncrystallized lifecycle to `Explore change`/);
  assert.match(source, /literal `\*\*Overview language\*\*: None`/);
  assert.match(source, /dispatches no overview generation/);
  assert.match(source, /Contract tests may observe the harness-neutral trace vocabulary[\s\S]{0,320}crystallization-requested/);
  for (const event of ['text-question-emitted', 'selector-presented', 'selector-option-received', 'selector-free-text-received', 'edge-case-writing-prompt-emitted', 'explicit-advancement-received', 'stage-advanced', 'material-reset', 'crystallization-requested']) {
    assert.match(source, new RegExp(`\\b${event}\\b`));
  }
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
    'sai-commit-worker',
    'sai-archive-worker',
    'sai-backfill-worker',
    'sai-merge-worker',
    'sai-4-red-worker',
    'sai-4-green-worker',
    'sai-autofast-implement-worker',
    'sai-autofast-hands-worker',
  ];
  assert.deepEqual(Object.keys(MANAGED_WORKERS), expectedNames,
    'registry keys should contain each managed worker exactly once');

  const expectedClaude = {
    'sai-1-spec-proposal-worker': {
      agent: 'sai-1-spec-proposal-worker.md',
    },
    'sai-commit-worker': {
      agent: 'sai-commit-worker.md',
    },
    'sai-archive-worker': {
      agent: 'sai-archive-worker.md',
    },
    'sai-backfill-worker': {
      agent: 'sai-backfill-worker.md',
    },
    'sai-merge-worker': {
      agent: 'sai-merge-worker.md',
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
    'sai-4-red-worker': {
      agent: 'sai-4-red-worker.md',
    },
    'sai-4-green-worker': {
      agent: 'sai-4-green-worker.md',
    },
    'sai-autofast-implement-worker': {
      agent: 'sai-autofast-implement-worker.md',
    },
    'sai-autofast-hands-worker': {
      agent: 'sai-autofast-hands-worker.md',
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
  assert.ok(files.includes('sai-build.md'), 'sai-build.md should be in commands/');
  assert.ok(files.includes('budget.md'), 'budget.md should be in commands/');
  const design = fs.readFileSync(path.join(cmdDir, 'sai-2-design.md'), 'utf8');
  assert.match(design, /^model: opus$/m);
  assert.match(design, /^effort: medium$/m);
   assert.match(design, /^allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList$/m);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('installClaude copies sai/commands/*.md to dest/sai/commands/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-'));
  installClaude(tmpDir);
  const saiCmdDir = path.join(tmpDir, 'sai', 'commands');
  assert.ok(fs.existsSync(saiCmdDir), 'sai/commands/ dir should exist');
  const files = fs.readdirSync(saiCmdDir);
  assert.ok(fs.existsSync(path.join(saiCmdDir, 'apply', 'coordinator.md')), 'apply/coordinator.md should be in sai/commands/');
  assert.ok(fs.existsSync(path.join(saiCmdDir, 'apply', 'red-worker.md')), 'apply/red-worker.md should be in sai/commands/');
  assert.ok(fs.existsSync(path.join(saiCmdDir, 'apply', 'green-worker.md')), 'apply/green-worker.md should be in sai/commands/');
  assert.ok(fs.existsSync(path.join(saiCmdDir, 'apply', 'runner.md')), 'apply/runner.md should be in sai/commands/');
  assert.ok(fs.existsSync(path.join(saiCmdDir, 'apply', 'invocation.md')), 'apply/invocation.md should be in sai/commands/');
  assert.ok(fs.existsSync(path.join(saiCmdDir, 'meta-build', 'coordinator.md')), 'meta-build/coordinator.md should be in sai/commands/');
  assert.ok(fs.existsSync(path.join(saiCmdDir, 'meta-build', 'command-bootstrap.md')), 'meta-build/command-bootstrap.md should be in sai/commands/');
  assert.equal(fs.existsSync(path.join(saiCmdDir, 'apply', 'body.md')), false, 'apply/body.md should be retired from sai/commands/');
  assert.equal(fs.existsSync(path.join(saiCmdDir, 'apply', 'instructions.md')), false, 'apply/instructions.md should be retired from sai/commands/');
  assert.equal(files.includes('sai-4-apply.md'), false, 'sai-4-apply.md should not be projected as a flat command');
  for (const file of [path.join('design', 'coordinator.md'), path.join('implement', 'coordinator.md'), path.join('implement', 'invocation.md')]) {
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
  assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'commands', 'implement', 'adr-index.template.md')));
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'adr-index.template.md')), false);
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', '_templates', 'adr-index.md')), false);
  assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'instructions')), false);
  for (const file of ['sai-2-design-core.md', 'sai-3-implementation-core.md', 'implement-invocation.md']) {
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'compat', file)), false, `${file} should not be projected`);
  }
  for (const file of ['invocation.md', 'instructions.md']) {
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'commands', 'design', file)), false,
      `design/${file} should not be projected`);
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
       path.join('sai', 'orchestration', 'command-runner.md'),
       path.join('sai', 'orchestration', 'worker-core.md'),
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

test('installClaude projects the adapter idea-list render glue and resolves it from sai-explore', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-idea-list-adapter-'));
  const repoRoot = path.join(__dirname, '..');
  try {
    installClaude(tmpDir);
    const installed = path.join(tmpDir, 'sai', 'adapters', 'claude', 'idea-list-render.md');
    const installedPanel = path.join(tmpDir, 'sai', 'adapters', 'claude', 'panel-render.md');
    const oldDestination = path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings', 'idea-list-render.md');
    const source = path.join(repoRoot, 'sai', 'adapters', 'claude', 'idea-list-render.md');
    const panelSource = path.join(repoRoot, 'sai', 'adapters', 'claude', 'panel-render.md');
    assert.equal(fs.existsSync(installed), true, 'the Claude idea-list adapter should be installed');
    assert.equal(fs.existsSync(installedPanel), true, 'the Claude panel adapter should be installed');
    assert.equal(fs.existsSync(oldDestination), false, 'the old neutral idea-list destination should be absent');
    assert.deepEqual(fs.readFileSync(installed), fs.readFileSync(source),
      'the installed Claude idea-list adapter should preserve source bytes');
    assert.deepEqual(fs.readFileSync(installedPanel), fs.readFileSync(panelSource),
      'the installed Claude panel adapter should preserve source bytes');
    const wrapper = fs.readFileSync(path.join(tmpDir, 'commands', 'sai-explore.md'), 'utf8');
    assert.match(wrapper, /Fetch @sai\/adapters\/claude\/idea-list-render\.md/,
      'sai-explore should resolve the Claude idea-list adapter');
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
       const prompt = decodePrompt(initial[0]);
       assert.equal(prompt, expectedWorkerPrompt(phase),
         `specs/worker-dispatch-prompt-template/spec.md: ${workerName} should receive its matching worker contract`);
       assert.doesNotMatch(prompt, /\bwrapper_echo_value\s*:/,
         `${workerName} manifest-rendered worker prompt must not construct the wrapper echo field`);
       assert.match(prompt, /InvocationEnvelope:\n<original InvocationEnvelope>$/,
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
      .filter(projection => projection.strategy === 'tunable-seed' &&
        WORKER_NAMES.includes(path.basename(projection.destinationPath, '.md')));
    assert.equal(tunable.length, 11, 'the manifest should declare 11 tunable-seed Claude worker agent projections');
    assert.ok(tunable.every(projection => projection.ownership === 'managed'),
      'every tunable-seed Claude worker projection should be managed');

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

test('Claude installer projects the three budget-agent destinations with role-matched policy fetches', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-budget-roles-'));
  try {
    installClaude(tmpDir);
    for (const [agent, role] of Object.entries(CLAUDE_GENERIC_AGENTS)) {
      const agentPath = path.join(tmpDir, 'agents', `${agent}.md`);
      assert.equal(fs.existsSync(agentPath), true,
        `the ${agent} managed agent should be installed`);
      const text = fs.readFileSync(agentPath, 'utf8').replaceAll('\r\n', '\n');
      const frontmatterEnd = text.indexOf('\n---\n');
      assert.notEqual(frontmatterEnd, -1, `${agent} should contain a frontmatter terminator`);
      assert.equal(
        text.slice(frontmatterEnd + '\n---\n'.length).trim().split('\n')[0],
        'Fetch @skills/fetch/SKILL.md',
        `${agent} should bootstrap Claude fetch resolution before its policy Fetch`
      );
      assert.equal(
        (text.match(new RegExp(`Fetch @sai/policies/${role}-agent\\.md`, 'g')) || []).length, 1,
        `${agent} should carry exactly one role-matched policy Fetch for ${role}`
      );
      assert.equal((text.match(/Fetch @sai\/commands\//g) || []).length, 0,
        `${agent} must not carry a routed worker Fetch`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('installClaude replaces a foreign Claude budget-agent destination while preserving its tunables and emitting a notice', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-budget-foreign-'));
  const agentPath = path.join(tmpDir, 'agents', 'budget-explorer.md');
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, '---\ndescription: foreign budget agent\neffort: foreign-effort\nmodel: foreign-model\n---\n\nforeign body\n');
    const notices = captureNotices(() => {
      assert.doesNotThrow(() => installClaude(tmpDir),
        'installClaude should not throw on a foreign budget-agent destination');
    });
    const after = fs.readFileSync(agentPath, 'utf8');
    assert.ok(after.includes('model: foreign-model'),
      'the foreign destination model should be preserved across the managed install');
    assert.ok(after.includes('effort: foreign-effort'),
      'the foreign destination effort should be preserved across the managed install');
    assert.ok(!after.includes('foreign body'),
      'the foreign body should be replaced by the managed source content');
    assert.ok(notices.some(message => message.includes(agentPath)),
      'the managed replacement should be announced with a stdout notice naming the file');
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

test('restore-coordinator-instruction-loading Step 3: isolated Claude installation resolves routed launcher and neutral binding references', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-coordinator-loading-'));
  const wrappers = [
    ['commands/sai-2-design.md', 'design', 'design-worker.md'],
    ['commands/sai-3-implement.md', 'implement', 'implementation-worker.md'],
    ['commands/sai-commit.md', 'commit', 'commit-worker.md'],
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

     for (const [wrapperPath, folder, binding] of wrappers) {
       const wrapper = readInstalled(wrapperPath);
        assert.match(wrapper, new RegExp(`Fetch @sai/commands/${folder}/command-bootstrap\\.md`));
        const launcherPath = path.join('sai', 'commands', folder, 'command-bootstrap.md');
       const launcher = readInstalled(launcherPath);
       assert.match(launcher, new RegExp(`Fetch @sai/orchestration/workers/bindings/${binding.replace('.', '\\.')}`));
       resolveFetches(wrapperPath, available, loaded);
       resolveFetches(launcherPath, available, loaded);
       resolveFetches(path.join('sai', 'orchestration', 'workers', 'bindings', binding), available, loaded);
    }

    const loadedText = [...loaded].map(readInstalled).join('\n');
    assert.match(loadedText, /bindings\/[a-z-]+-worker\.md/);
    assert.doesNotMatch(loadedText, /bindings\/claude\//);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Claude installer consumes exactly the fifteen matrix worker bindings and agents', () => {
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
    const phases = ['spec', 'design', 'implementation', 'review', 'security', 'performance', 'accessibility', 'commit', 'archive', 'backfill'];
    const bindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/') &&
        phases.includes(path.basename(projection.destinationPath, '-worker.md')))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(bindingNames.length, 10, 'Claude should project exactly ten phase worker bindings');
    assert.equal(bindingNames.includes('idea-list-render.md'), false,
      'Claude must not project an idea-list-render matrix binding');
    const allBindingNames = active
      .filter(projection => path.relative(destinationRoot.sai, projection.destinationPath)
        .split(path.sep).join('/').startsWith('orchestration/workers/bindings/'))
      .map(projection => path.basename(projection.destinationPath));
    assert.equal(allBindingNames.length, 15,
      'Claude should keep only the fifteen routed worker bindings in the matrix destination');
    const ideaList = active.find(projection =>
      path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/') ===
      'sai/adapters/claude/idea-list-render.md');
    assert.ok(ideaList, 'Claude should project the adapter idea-list render source');
    assert.equal(
      path.relative(destinationRoot.sai, ideaList.destinationPath).split(path.sep).join('/'),
      'adapters/claude/idea-list-render.md'
    );
    const agentNames = active
      .filter(projection => projection.destinationPath.startsWith(destinationRoot.agents))
      .map(projection => path.basename(projection.destinationPath, '.md'));
    assert.equal(agentNames.length, 18, 'Claude should project exactly eighteen managed agents');
    for (const name of Object.keys(CLAUDE_GENERIC_AGENTS)) {
      assert.ok(agentNames.includes(name), `Claude should project the ${name} managed agent`);
    }
    assert.ok(WORKER_NAMES.every(name => agentNames.includes(name)),
      'Claude should still project every routed worker agent');
    assert.ok(['sai-4-red-worker', 'sai-4-green-worker'].every(name => agentNames.includes(name)),
      'Claude should project the RED and GREEN apply worker agents');
    assert.ok(['sai-autofast-implement-worker', 'sai-autofast-hands-worker'].every(name => agentNames.includes(name)),
      'Claude should project the auto-fast implement and hands worker agents');
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

    for (const protocol of ['sai/orchestration/command-runner.md', 'sai/orchestration/worker-core.md']) {
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
    assert.ok(sourceSet.has('sai/adapters/claude/boot.md'),
      'Claude should project its own boot adapter');
    assert.equal(sourceSet.has('sai/adapters/opencode/boot.md'), false,
      'Claude must not project the opencode boot adapter');
    for (const utility of Object.values(UTILITY_COMMANDS)) {
      if (utility === 'apply' || utility === 'archive' || utility === 'backfill') continue;
      assert.ok(sourceSet.has(`sai/commands/${utility}/body.md`),
        `Claude should project the utility card sai/commands/${utility}/body.md`);
    }
    for (const card of ['command-bootstrap.md', 'coordinator.md', 'worker.md', 'instructions.md']) {
      assert.ok(sourceSet.has(`sai/commands/archive/${card}`),
        `Claude should project the routed archive card sai/commands/archive/${card}`);
    }
    assert.ok(sourceSet.has('sai/commands/archive/archive-commit-gate.instructions.md'),
      'Claude should project the archive commit-gate instruction');
    assert.equal(sourceSet.has('sai/commands/archive/body.md'), false,
      'Claude must not project the retired archive body card');
    for (const card of ['command-bootstrap.md', 'coordinator.md', 'worker.md', 'instructions.md']) {
      assert.ok(sourceSet.has(`sai/commands/backfill/${card}`),
        `Claude should project the routed backfill card sai/commands/backfill/${card}`);
    }
    assert.equal(sourceSet.has('sai/commands/backfill/body.md'), false,
      'Claude must not project the retired backfill body card');
    for (const card of ['coordinator.md', 'red-worker.md', 'green-worker.md', 'runner.md', 'invocation.md']) {
      assert.ok(sourceSet.has(`sai/commands/apply/${card}`),
        `Claude should project the routed apply card sai/commands/apply/${card}`);
    }
    assert.equal(sourceSet.has('sai/commands/apply/body.md'), false,
      'Claude must not project the retired apply body card');
    assert.equal(sourceSet.has('sai/commands/apply/instructions.md'), false,
      'Claude must not project the retired monolithic apply instruction');
    for (const flat of Object.keys(UTILITY_COMMANDS).map(name => `sai/commands/${name}.md`)) {
      assert.equal(sourceSet.has(flat), false, `${flat} must be absent from the active source layout`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Claude wrappers route through the Claude boot adapter and never the opencode adapter', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-boot-routing-'));
  const wrappers = [
    ...Object.keys(UTILITY_COMMANDS),
    'sai-build',
    'sai-1-spec',
    'sai-2-design',
    'sai-3-implement',
    'sai-commit',
    'sai-5-review',
    'sai-6-security',
    'sai-7-performance',
    'sai-8-accessibility',
  ];
  try {
    installClaude(tmpDir);
    for (const name of wrappers) {
      const wrapperPath = path.join(tmpDir, 'commands', `${name}.md`);
      assert.ok(fs.existsSync(wrapperPath), `${name}.md should be installed`);
      const wrapper = fs.readFileSync(wrapperPath, 'utf8');
      assert.match(wrapper, /Fetch @sai\/adapters\/claude\/boot\.md/,
        `${name} should route through the Claude boot adapter`);
      assert.doesNotMatch(wrapper, /Fetch @sai\/adapters\/opencode\/boot\.md/,
        `${name} must never route through the opencode boot adapter`);
    }
    assert.ok(fs.existsSync(path.join(tmpDir, 'sai', 'adapters', 'claude', 'boot.md')),
      'the Claude boot adapter should be installed');
    assert.equal(fs.existsSync(path.join(tmpDir, 'sai', 'adapters', 'opencode', 'boot.md')), false,
      'the opencode boot adapter must not be installed in the Claude harness');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Claude boot adapter loads command-runner first, selects utility bodies, keeps Claude dispatch, and forwards the envelope byte-for-byte', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-boot-'));
  try {
    installClaude(tmpDir);
    const bootPath = path.join(tmpDir, 'sai', 'adapters', 'claude', 'boot.md');
    assert.ok(fs.existsSync(bootPath), 'the Claude boot adapter should be installed');
    const boot = fs.readFileSync(bootPath, 'utf8');

    const runner = boot.indexOf('Fetch @sai/orchestration/command-runner.md');
    assert.ok(runner !== -1, 'the Claude boot should load @sai/orchestration/command-runner.md');
    const cardIndexes = ['coordinator\\.md', 'body\\.md'].map(pattern => {
      const index = boot.search(new RegExp(pattern));
      return index === -1 ? Infinity : index;
    });
    assert.ok(runner < Math.min(...cardIndexes),
      'the Claude boot should load @sai/orchestration/command-runner.md before any card selection');

    assert.match(boot, /command_name/, 'the Claude boot should route on command_name');
    assert.match(boot, /arguments_value/, 'the Claude boot should carry arguments_value');
     assert.doesNotMatch(boot, /\bwrapper_echo_value\s*:/,
       'the Claude boot must not construct or forward the wrapper echo field');
    assert.match(boot, /byte-for-byte|verbatim|unchanged|without modification/i,
      'the Claude boot should forward envelope values byte-for-byte');

    assert.match(boot, /Fetch @sai\/commands\/(?:\{name\}|[a-z-]+)\/coordinator\.md/,
      'routed selection should target the matching coordinator card');
    assert.match(boot, /Fetch @sai\/commands\/(?:\{name\}|[a-z-]+)\/body\.md/,
      'utility selection should target the matching body card');
    for (const name of Object.values(UTILITY_COMMANDS)) {
      if (name === 'apply' || name === 'archive' || name === 'backfill') continue;
      assert.doesNotMatch(boot, new RegExp(`@sai/commands/${name}/coordinator\\.md`),
        `the Claude boot must not select a coordinator card for the ${name} utility`);
    }
    assert.match(boot, /@sai\/commands\/apply\/coordinator\.md/,
      'the Claude boot must select the routed coordinator card for apply');
    assert.doesNotMatch(boot, /@sai\/commands\/apply\/body\.md/,
      'the Claude boot must no longer select the apply utility body card');
    assert.match(boot, /Routed names \([^)]*`archive`/,
      'the Claude boot must classify archive as a routed name');
    assert.doesNotMatch(boot, /Utility names \([^)]*`archive`/,
      'the Claude boot must not classify archive as a utility name');
    assert.match(boot, /Routed names \([^)]*`backfill`/,
      'the Claude boot must classify backfill as a routed name');
    assert.doesNotMatch(boot, /Utility names \([^)]*`backfill`/,
      'the Claude boot must not classify backfill as a utility name');

    assert.doesNotMatch(boot, /\btask\s*\(/,
      'the Claude boot adapter must not mention the opencode task dispatch primitive');
    for (const name of Object.values(UTILITY_COMMANDS)) {
      const cardDir = path.join(tmpDir, 'sai', 'commands', name);
      assert.ok(fs.existsSync(cardDir), `the ${name} utility card directory should exist`);
      assert.deepEqual(fs.readdirSync(cardDir), UTILITY_CARD_CONTENTS[name],
        `the ${name} utility card directory should contain exactly its folded card inventory`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Step 3 the Claude neutral inventory is equivalent to opencode and differs only at the boot adapter seam', () => {
  const repoRoot = path.join(__dirname, '..');
  const manifest = loadInstallManifest(repoRoot);
  const bases = {};
  for (const harness of ['claude', 'opencode']) {
    bases[harness] = fs.mkdtempSync(path.join(os.tmpdir(), `sai-step3-claude-neutral-${harness}-`));
  }
  const destinationRootFor = base => ({
    commands: path.join(base, 'commands'),
    sai: path.join(base, 'sai'),
    skills: path.join(base, 'skills'),
    agents: path.join(base, 'agents'),
    config: base,
    root: base,
  });
  const neutralSource = source =>
    source === 'sai/orchestration/command-runner.md' ||
    source === 'sai/orchestration/worker-core.md' ||
    source.startsWith('sai/commands/') ||
    source.startsWith('sai/policies/');
  try {
    const projections = {};
    for (const harness of ['claude', 'opencode']) {
      projections[harness] = expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: destinationRootFor(bases[harness]),
      });
    }
    const neutralInventory = harness => {
      const map = {};
      for (const projection of projections[harness]) {
        const source = path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/');
        if (!neutralSource(source)) continue;
        const destination = path.relative(destinationRootFor(bases[harness]).sai, projection.destinationPath)
          .split(path.sep).join('/');
        map[source] = destination;
      }
      return map;
    };
    const claude = neutralInventory('claude');
    const opencode = neutralInventory('opencode');
    assert.ok(Object.keys(claude).length > 0, 'the Claude neutral inventory should be non-empty');
    assert.deepEqual(claude, opencode,
      'the Claude neutral inventory should equal the opencode neutral inventory');
    for (const source of Object.keys(claude)) {
      const bytes = fs.readFileSync(path.join(repoRoot, ...source.split('/')));
      assert.deepEqual(fs.readFileSync(path.join(repoRoot, ...source.split('/'))), bytes,
        `${source} should be shared neutral content for both harnesses`);
    }

    const saiSources = harness => new Set(projections[harness]
      .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'))
      .filter(source => source.startsWith('sai/')));
    const claudeOnly = [...saiSources('claude')].filter(source => !saiSources('opencode').has(source)).sort();
    const opencodeOnly = [...saiSources('opencode')].filter(source => !saiSources('claude').has(source)).sort();
     assert.deepEqual(claudeOnly, [
       'sai/adapters/claude/boot.md',
       'sai/adapters/claude/idea-list-render.md',
       'sai/adapters/claude/panel-render.md',
     ], 'Claude-specific SAI sources should be its boot adapter plus its panel and idea-list runtime glue');
     assert.deepEqual(opencodeOnly, [
       'sai/adapters/opencode/boot.md',
       'sai/adapters/opencode/idea-list-render.md',
       'sai/adapters/opencode/panel-render.md',
     ], 'opencode-specific SAI sources should be its boot adapter plus its panel and idea-list runtime glue');
  } finally {
    for (const harness of ['claude', 'opencode']) {
      fs.rmSync(bases[harness], { recursive: true, force: true });
    }
  }
});

test('Step 2 Claude installation preserves the shared selector contract without harness-specific selector semantics', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-claude-selector-contract-'));
  try {
    installClaude(tmpDir);
    const installed = fs.readFileSync(path.join(tmpDir, 'sai', 'commands', 'explore', 'instructions.md'), 'utf8');
    assertInstalledSelectorContract(installed);

    const panel = fs.readFileSync(path.join(tmpDir, 'sai', 'adapters', 'claude', 'panel-render.md'), 'utf8');
    const ideaList = fs.readFileSync(path.join(tmpDir, 'sai', 'adapters', 'claude', 'idea-list-render.md'), 'utf8');
    const bindingsDir = path.join(tmpDir, 'sai', 'orchestration', 'workers', 'bindings');
    assert.doesNotMatch(panel, /NativeStageSelectorCapability|keep-iterating|discuss-ideas-feedback|selector-presented|selector-option-received|selector-free-text-received/);
    assert.doesNotMatch(ideaList, /NativeStageSelectorCapability|keep-iterating|discuss-ideas-feedback|selector-presented|selector-option-received|selector-free-text-received/);
    for (const binding of fs.readdirSync(bindingsDir)) {
      assert.doesNotMatch(fs.readFileSync(path.join(bindingsDir, binding), 'utf8'), /NativeStageSelectorCapability|keep-iterating|discuss-ideas-feedback|selector-presented|selector-option-received|selector-free-text-received/);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

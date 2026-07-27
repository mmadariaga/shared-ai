'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jsonc = require('jsonc-parser');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeTempDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function capture(fn) {
  const messages = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => messages.push(args.join(' '));
  console.error = (...args) => messages.push(args.join(' '));
  try {
    return { value: fn(), error: null, output: messages.join('\n') };
  } catch (error) {
    return { value: undefined, error, output: messages.join('\n') };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test('implementation invocation core and inline caller own distinct completion contracts', () => {
  const core = artifact('sai/instructions/implement-invocation-core.md');
  assert.match(core, /^## Load instructions \(in order\)/m);
  assert.match(core, /^## Run\s*$/m);
  assert.doesNotMatch(core, /^## Completion\b/m);
  assert.doesNotMatch(core, /MANDATORY STOP/);

  const invocation = artifact('sai/instructions/implement-invocation.md');
  assert.match(invocation, /Fetch @sai\/instructions\/implement-invocation-core\.md/);
  assert.match(invocation, /MANDATORY STOP/);
});

test('implementation worker declares the lifecycle and input/output contract', () => {
  const worker = artifact('sai/instructions/implement-worker.md');

  assert.match(worker, /InvocationEnvelope/);
  assert.match(worker, /wrapper_echo_value/);
  assert.match(worker, /arguments_value/);
  assert.match(worker, /exactly two/i);

  for (const status of ['completed', 'needs_input', 'failed', 'cancelled']) {
    assert.match(worker, new RegExp(`\\b${status}\\b`));
  }
  for (const field of ['question', 'options', 'blocking_summary', 'changed_files', 'summary']) {
    assert.match(worker, new RegExp(`\\b${field}\\b`));
  }

  assert.match(worker, /openspec CLI not found\. Install it first: https:\/\/github\.com\/Fission-AI\/OpenSpec/);
  assert.match(worker, /OpenSpec not initialized in this project\. Run: openspec init/);
  assert.match(worker, /openspec\/config\.yaml does not declare `schema: sai-workflow`\. The sai commands require this schema\. Add `schema: sai-workflow` to the top of openspec\/config\.yaml\./);

  assert.match(worker, /wrapper[- ]echo/i);
  assert.match(worker, /precedence/i);
  assert.match(worker, /Use change '\{name\}'\?/);
  assert.match(worker, /Which change\?/);
  assert.match(worker, /0\/1\/N|zero,? one,? or multiple/i);

  assert.match(worker, /implementation\.md/);
  assert.match(worker, /durable|written|exists/i);
  assert.match(worker, /payload[\s\S]*(?:shall not|must not|never)[\s\S]*implementation\.md/i);
  assert.match(worker, /metadata|continuation_reference/i);
});

test('Claude worker agent is pinned to the required model, effort, and tools', () => {
  const agent = artifact('agents/claude/sai-implementation-planning-worker.md');
  assert.match(agent, /^name:\s*sai-implementation-planning-worker\s*$/m);
  assert.match(agent, /^model:\s*claude-opus-4-8\s*$/m);
  assert.match(agent, /^effort:\s*high\s*$/m);
  assert.match(
    agent,
    /^tools:\s*Read,\s*Glob,\s*Grep,\s*Bash,\s*Edit,\s*Write,\s*Agent,\s*Skill,\s*SendMessage\s*$/m
  );
});

test('Claude and opencode worker bindings own dispatch and continuation mechanics', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = artifact(`skills/${harness}/sai-implementation-planning-worker/SKILL.md`);
    assert.match(binding, /dispatch/i);
    assert.match(binding, /binding[- ]owned|coordinator[- ]owned/i);
    assert.match(binding, /continuation_reference|continuation metadata/i);
    assert.match(binding, /budget/);
    assert.match(binding, /explore/);
    assert.match(binding, /nested helper|helper branches?/i);
    assert.match(binding, /continuation/i);
    assert.match(binding, /fresh worker/i);
    assert.match(binding, /reconstruct/i);
  }
});

test('opencode config defines exact namespaced coordinator and worker shapes', () => {
  const config = jsonc.parse(artifact('configs/opencode.jsonc'));
  const coordinator = config.agent['sai-implementation-coordinator'];
  const worker = config.agent['sai-implementation-planning-worker'];

  assert.ok(coordinator, 'namespaced coordinator should be present');
  assert.ok(worker, 'namespaced worker should be present');

  assert.equal(coordinator.mode, 'primary');
  assert.equal(coordinator.model, 'opencode-go/glm-5.2');
  assert.equal(coordinator.variant, 'high');
  assert.equal(coordinator.permission.task['*'], 'deny');
  assert.equal(coordinator.permission.task['sai-implementation-planning-worker'], 'allow');
  assert.equal(coordinator.permission.question, 'allow');

  assert.equal(worker.mode, 'subagent');
  assert.equal(worker.model, 'opencode-go/kimi-k2.6');
  assert.equal(worker.variant, undefined);
  assert.equal(worker.permission.task['*'], 'deny');
  assert.equal(worker.permission.task.budget, 'allow');
  assert.equal(worker.permission.task.explore, 'allow');
});

test('install surfaces expose managed Claude assets and opencode shapes', () => {
  const { installClaude, installOpencode } = require('../bin/install-flow.js');
  const claudeBase = tempDir('sai-implement-claude-');
  const opencodeBase = tempDir('sai-implement-opencode-');
  try {
    installClaude(claudeBase);
    assert.ok(fs.existsSync(path.join(claudeBase, 'agents', 'sai-implementation-planning-worker.md')));
    assert.ok(fs.existsSync(path.join(claudeBase, 'agents', '.sai-implementation-planning-worker.owner.json')));

    installOpencode(opencodeBase);
    const config = fs.readFileSync(path.join(opencodeBase, 'opencode.jsonc'), 'utf8');
    assert.match(config, /sai-implementation-coordinator/);
    assert.match(config, /sai-implementation-planning-worker/);
  } finally {
    removeTempDir(claudeBase);
    removeTempDir(opencodeBase);
  }
});

test('installer collisions preserve unfamiliar content and provide remediation guidance', () => {
  const { installClaude, installOpencode } = require('../bin/install-flow.js');
  const claudeBase = tempDir('sai-implement-claude-collision-');
  const opencodeBase = tempDir('sai-implement-opencode-collision-');
  const agentPath = path.join(claudeBase, 'agents', 'sai-implementation-planning-worker.md');
  const configPath = path.join(opencodeBase, 'opencode.jsonc');
  const claudeSentinel = 'user-owned incompatible Claude agent\n';
  const opencodeSentinel = '{\n  "agent": {\n    "sai-implementation-coordinator": { "mode": "primary", "model": "user-model" }\n  }\n}\n';
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, claudeSentinel);
    const claudeResult = capture(() => installClaude(claudeBase));
    assert.ok(claudeResult.error || claudeResult.value === false, 'Claude collision should block activation');
    assert.equal(fs.readFileSync(agentPath, 'utf8'), claudeSentinel);
    assert.match(`${claudeResult.output}\n${claudeResult.error?.message || ''}`, /rename|remove|collision/i);

    fs.writeFileSync(configPath, opencodeSentinel);
    const opencodeResult = capture(() => installOpencode(opencodeBase));
    assert.equal(fs.readFileSync(configPath, 'utf8'), opencodeSentinel);
    assert.match(`${opencodeResult.output}\n${opencodeResult.error?.message || ''}`, /rename|remove|collision/i);
  } finally {
    removeTempDir(claudeBase);
    removeTempDir(opencodeBase);
  }
});

test('uninstall and doctor expose ownership guards and collision status', async () => {
  const { installClaude } = require('../bin/install-flow.js');
  const { enumerateClaude, runDeletion } = require('../bin/uninstall-flow.js');
  const { main } = require('../bin/doctor.js');
  const claudeBase = tempDir('sai-implement-claude-guard-');
  const projectRoot = tempDir('sai-implement-doctor-');
  const opencodeBase = path.join(projectRoot, 'missing-opencode');
  const copilot = {
    promptsBase: path.join(projectRoot, 'missing-copilot-prompts'),
    skillsBase: path.join(projectRoot, 'missing-copilot-skills'),
    agentsBase: path.join(projectRoot, 'missing-copilot-agents'),
    saiBase: path.join(projectRoot, 'missing-copilot-sai'),
  };
  try {
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');

    installClaude(claudeBase);
    const agentPath = path.join(claudeBase, 'agents', 'sai-implementation-planning-worker.md');
    const sidecarPath = path.join(claudeBase, 'agents', '.sai-implementation-planning-worker.owner.json');
    assert.ok(fs.existsSync(agentPath), 'managed Claude agent should be enumerable');
    assert.ok(fs.existsSync(sidecarPath), 'managed Claude ownership sidecar should be enumerable');

    const unchangedEntries = enumerateClaude(claudeBase);
    assert.ok(unchangedEntries.some(entry => entry.dest === agentPath), 'uninstall should include the managed agent');
    runDeletion(unchangedEntries);
    assert.equal(fs.existsSync(agentPath), false, 'unchanged owned agent should be deleted');
    assert.equal(fs.existsSync(sidecarPath), false, 'ownership sidecar should be deleted with its agent');

    installClaude(claudeBase);
    fs.appendFileSync(agentPath, '\nuser modification\n');
    runDeletion(enumerateClaude(claudeBase));
    assert.equal(fs.existsSync(agentPath), true, 'modified owned agent should be preserved');

    const output = [];
    const code = await main({
      argv: ['--json'],
      projectRoot,
      claudeBase,
      opencodeBase,
      copilot,
      execOpenspec: () => ({ status: 0, stdout: '1.0.0\n', stderr: '', error: null }),
      out: { write(chunk) { output.push(String(chunk)); } },
    });
    const report = output.join('');
    assert.ok(code === 0 || code === 1, 'doctor should return a normal status code');
    assert.match(report, /sai-implementation-planning-worker/);
    assert.match(report, /ownership|collision|rename|remove|modified/i);
  } finally {
    removeTempDir(claudeBase);
    removeTempDir(projectRoot);
  }
});

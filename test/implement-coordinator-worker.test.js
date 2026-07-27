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

test('Step 2 routes Claude and opencode through the coordinator but preserves Copilot inline dispatch', () => {
  const claude = artifact('commands/claude/sai-3-implement.md');
  const opencode = artifact('commands/opencode/sai-3-implement.md');
  const copilot = artifact('commands/copilot/sai-3-implement.prompt.md');

  assert.match(claude, /^model:\s*claude-opus-4-8\s*$/m);
  assert.match(claude, /^effort:\s*low\s*$/m);
  assert.match(claude, /Fetch @skills\/sai-implementation-planning-worker\/SKILL\.md/);
  assert.match(claude, /Fetch @sai\/commands\/sai-3-implement\.md/);
  assert.match(opencode, /sai-implementation-coordinator/);
  assert.match(opencode, /Fetch @skills\/sai-implementation-planning-worker\/SKILL\.md/);
  assert.match(opencode, /Fetch @sai\/commands\/sai-3-implement\.md/);
  assert.match(copilot, /sai-3-implement-inline\.md/);
  assert.doesNotMatch(copilot, /sai-implementation-coordinator/);
  assert.match(opencode, /^agent:\s*sai-implementation-coordinator\s*$/m);
  assert.match(opencode, /^subtask:\s*false\s*$/m);
  assert.doesNotMatch(opencode, /^model:/m);
  assert.match(opencode, /\*\*Change-name argument:\*\* \$ARGUMENTS/);
});

test('shared implement coordinator has a two-field envelope and no artifact or resolution access', () => {
  const coordinator = artifact('sai/commands/sai-3-implement.md');

  assert.match(
    coordinator,
    /Do not run prerequisites, query OpenSpec, resolve a change, read git, code, change artifacts, audit artifacts, or `implementation\.md`, and do not write any planning file\./
  );
  assert.match(coordinator, /wrapper_echo_value/);
  assert.match(coordinator, /arguments_value/);
  assert.match(coordinator, /exactly these two/i);
  assert.match(coordinator, /dispatch/);
  assert.match(coordinator, /continuation/);
  assert.match(coordinator, /question/);
  assert.match(coordinator, /summary/);
  assert.match(coordinator, /stop/);
  assert.match(coordinator, /sai-implementation-planning-worker/);
  assert.match(coordinator, /one worker|exactly one worker/i);

  assert.doesNotMatch(coordinator, /openspec CLI not found|OpenSpec not initialized|schema:\s*sai-workflow/i);
  assert.doesNotMatch(coordinator, /Use change '\{name\}'\?|Which change\?|0\/1\/N|zero,? one,? or multiple/i);
  assert.doesNotMatch(coordinator, /change-picker|change resolution instructions|change-selection instructions|select a change/i);
});

test('coordinator owns status transitions, changed-file union, and exact terminal behavior', () => {
  const coordinator = artifact('sai/commands/sai-3-implement.md');

  for (const status of ['completed', 'needs_input', 'failed', 'cancelled']) {
    assert.match(coordinator, new RegExp(`\\b${status}\\b`));
  }
  assert.match(coordinator, /changed_files/);
  assert.match(coordinator, /union|accumulat|InvocationChangedFiles/i);
  assert.match(coordinator, /completed[\s\S]*concise summary[\s\S]*accumulated changed-file list/i);
  assert.match(coordinator, /failed[\s\S]*blocking summary[\s\S]*accumulated changed-file list[\s\S]*stop without the completion message/i);
  assert.match(coordinator, /cancelled[\s\S]*clean-stop summary[\s\S]*accumulated changed-file list[\s\S]*stop without claiming completion/i);
  assert.match(coordinator, /cancelled[\s\S]*without claiming completion/i);
  assert.match(coordinator, /payload status must be exactly one of/i);
  assert.ok(
    coordinator.includes(
      'then print exactly: `Implementation plan done in openspec/changes/{name}/. Review and run \\`/sai-4-apply {name}\\` (--fast-track) **in a new chat** when ready.` Stop immediately.'
    )
  );
});

test('needs_input continuation stays on the same worker and uses each harness binding', () => {
  const coordinator = artifact('sai/commands/sai-3-implement.md');
  const claudeBinding = artifact('skills/claude/sai-implementation-planning-worker/SKILL.md');
  const opencodeBinding = artifact('skills/opencode/sai-implementation-planning-worker/SKILL.md');

  assert.match(coordinator, /continuation_reference/);
  assert.match(coordinator, /binding-owned `continuation_reference`/);
  assert.match(coordinator, /## Result loop/);
  assert.match(coordinator, /needs_input[\s\S]*native option picker/i);
  assert.match(coordinator, /selected (?:option )?value[\s\S]*(?:same worker|continuation)/i);
  assert.match(coordinator, /await the same worker's next payload/i);
  assert.match(coordinator, /re-present|re-presenting|present.*again/i);
  assert.match(coordinator, /without dispatching a second worker|no second worker|one worker/i);
  assert.match(coordinator, /continuation failure[\s\S]*fresh worker/i);
  assert.match(coordinator, /original envelope[\s\S]*reconstruction instruction/i);
  assert.match(coordinator, /fresh worker[\s\S]*(?:durable|artifact)/i);

  assert.match(claudeBinding, /SendMessage/);
  assert.match(claudeBinding, /Do not use an Agent `resume` parameter/);
  assert.match(claudeBinding, /fresh worker[\s\S]*reconstruct/i);
  assert.match(opencodeBinding, /task_id/);
  assert.match(opencodeBinding, /fresh worker|reconstruct/i);
});

test('worker and inline invocation own prerequisites and picker while coordinator does not', () => {
  const coordinator = artifact('sai/commands/sai-3-implement.md');
  const worker = artifact('sai/instructions/implement-worker.md');
  const inline = artifact('commands/copilot/sai-3-implement.prompt.md');

  assert.match(worker, /openspec CLI not found|OpenSpec not initialized|schema:\s*sai-workflow/i);
  assert.match(worker, /Use change '\{name\}'\?|Which change\?|0\/1\/N|zero,? one,? or multiple/i);
  assert.match(inline, /sai-3-implement-inline\.md/);
  assert.doesNotMatch(coordinator, /openspec CLI not found|OpenSpec not initialized|schema:\s*sai-workflow/i);
  assert.doesNotMatch(coordinator, /Use change '\{name\}'\?|Which change\?|0\/1\/N|zero,? one,? or multiple/i);
});

test('Step 2 coordinator makes no live-proof or smoke-success claims', () => {
  const coordinator = artifact('sai/commands/sai-3-implement.md');

  assert.doesNotMatch(coordinator, /\b(?:live|runtime)\s+(?:probe|proof)\b/i);
  assert.doesNotMatch(coordinator, /\bsmoke[- ]?(?:check|test)\b/i);
});

test('completed routed output uses the coordinator contract while inline invocation preserves its stop', () => {
  const coordinator = artifact('sai/commands/sai-3-implement.md');
  const inline = artifact('commands/copilot/sai-3-implement.prompt.md');
  const invocation = artifact('sai/instructions/implement-invocation.md');

  assert.match(coordinator, /completed[\s\S]*concise summary[\s\S]*accumulated changed-file list/i);
  assert.ok(
    coordinator.includes(
      'Implementation plan done in openspec/changes/{name}/. Review and run \\`/sai-4-apply {name}\\` (--fast-track) **in a new chat** when ready.'
    )
  );
  assert.match(coordinator, /Stop immediately/);
  assert.match(inline, /sai-3-implement-inline\.md/);
  assert.match(invocation, /core/);
  assert.match(invocation, /MANDATORY STOP/);
});

test('design continue-now bypasses the coordinator through invocation core', () => {
  const design = artifact('sai/commands/sai-2-design.md');
  const invocation = artifact('sai/instructions/implement-invocation.md');

  assert.match(design, /After Continue/);
  assert.match(design, /Continue now/);
  assert.match(design, /implementation-worker binding/);
  assert.match(design, /wrapper_echo_value:\s*""/);
  assert.match(design, /arguments_value:\s*resolved_change_name/);
  assert.doesNotMatch(design, /sai-implementation-coordinator/);
  assert.match(invocation, /implement-invocation-core\.md/);
});

test('Step 3 README documents routed roles, inline Copilot boundary, model independence, and artifact stability', () => {
  const readme = artifact('README.md');

  assert.match(readme, /Claude Code[\s\S]{0,240}(?:coordinator|rout)/i);
  assert.match(readme, /opencode[\s\S]{0,240}(?:coordinator|rout)/i);
  assert.match(readme, /Copilot[\s\S]{0,180}inline/i);
  assert.match(readme, /independent[\s\S]{0,100}model/i);
  assert.match(readme, /openspec\/changes\/\{change-name\}\/implementation\.md/);

  const documentation = [
    'README.md',
    'AGENTS.md',
    'INSTALL.claude.md',
    'INSTALL.opencode.md',
  ].map(artifact).join('\n');
  assert.doesNotMatch(
    documentation,
    /Copilot\b[\s\S]{0,140}\b(?:does not|doesn't|lacks|has no|without)\b[\s\S]{0,60}\b(?:subagents?|sub-agent support)\b/i
  );
  assert.doesNotMatch(
    documentation,
    /(?:subagents?|sub-agent support)\b[\s\S]{0,100}\b(?:is not|isn't|is unavailable|unsupported|not available)\b[\s\S]{0,60}\bCopilot\b/i
  );
});

test('Step 3 AGENTS documents every coordinator, inline, worker, agent, binding, and harness boundary', () => {
  const agents = artifact('AGENTS.md');

  for (const entry of [
    'sai/commands/sai-3-implement.md',
    'sai/commands/sai-3-implement-inline.md',
    'sai/instructions/implement-worker.md',
    'agents/claude/sai-implementation-planning-worker.md',
    'skills/claude/sai-implementation-planning-worker/SKILL.md',
    'skills/opencode/sai-implementation-planning-worker/SKILL.md',
  ]) {
    assert.match(agents, new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(agents, /Copilot[\s\S]{0,220}(?:adapter[ -]carve-out|carve-out[\s\S]{0,100}adapter)/i);
  assert.match(agents, /harness universality/i);
});

test('Step 3 Claude installer documentation covers ownership, compatibility, collisions, uninstall guards, and manual copy', () => {
  const claude = artifact('INSTALL.claude.md');

  assert.match(claude, /agents\/claude\/sai-implementation-planning-worker\.md/);
  assert.match(claude, /(?:~\/\.claude|%USERPROFILE%[\\/]\.claude)[\\/]agents[\\/]sai-implementation-planning-worker\.md/);
  assert.match(claude, /\.sai-implementation-planning-worker\.owner\.json/);
  assert.match(claude, /compatible[\s\S]{0,140}(?:not adopt|non-adopt|not used|unchanged)/i);
  assert.match(claude, /collision[\s\S]{0,140}(?:rename|remove|remediat|manual)/i);
  assert.match(claude, /uninstall[\s\S]{0,180}(?:ownership|guard|modified|preserv)/i);
  assert.match(claude, /(?:cp|Copy-Item)[\s\S]{0,220}sai-implementation-planning-worker/i);
});

test('Step 3 opencode installer documentation covers managed entries, routing shapes, collisions, preservation, and restart', () => {
  const opencode = artifact('INSTALL.opencode.md');

  assert.match(opencode, /sai-implementation-coordinator/);
  assert.match(opencode, /sai-implementation-planning-worker/);
  assert.match(opencode, /sai-implementation-coordinator[\s\S]{0,280}primary[\s\S]{0,280}opencode-go\/glm-5\.2[\s\S]{0,280}high/i);
  assert.match(opencode, /sai-implementation-planning-worker[\s\S]{0,280}subagent[\s\S]{0,280}opencode-go\/kimi-k2\.6/i);
  assert.match(opencode, /variant/i);
  assert.match(opencode, /collision[\s\S]{0,160}(?:preserv|rename|remove|manual)/i);
  assert.match(opencode, /uninstall[\s\S]{0,220}(?:preserv|retain|unchanged)[\s\S]{0,100}(?:config|opencode\.jsonc)/i);
  assert.match(opencode, /restart(?:ing)?[\s\S]{0,120}(?:required|must|need|after|reload)/i);
});

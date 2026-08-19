'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jsonc = require('jsonc-parser');

const repoRoot = path.join(__dirname, '..');
const { loadInstallManifest, expandInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const matrixManifest = loadInstallManifest(path.join(__dirname, '..'));
function matrixBinding(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'binding' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix binding should exist`);
  return item.text;
}

function matrixAgent(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'agent' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix agent should exist`);
  return item.text;
}

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

// ─── Step 1: reshape and pin the implementation progress plan ───────────────

const IMPLEMENT_PLAN_STEPS = [
  ['prereqs-resolution', 'Check prerequisites'],
  ['collapse-implemented-steps', 'Collapse implemented steps'],
  ['artifact-analysis', 'Analyze artifacts and validate decisions'],
  ['documentation-review', 'Review required documentation'],
  ['plan-generation', 'Write implementation.md'],
  ['validation', 'Validate implementation.md and the audit append'],
];

function implementationPlanList(source) {
  const pairs = [];
  const re = /^\s*- `([a-z-]+)`\s*—\s*"([^"]+)"\s*$/gm;
  let match;
  while ((match = re.exec(source)) !== null) pairs.push([match[1], match[2]]);
  return pairs;
}

test('Step 1 implementation card uses neutral root protocols and retires flat canonical sources', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const worker = artifact('sai/commands/implement/worker.md');
  assert.match(coordinator, /@sai\/orchestration\/command-runner\.md/);
  assert.match(coordinator, /@sai\/orchestration\/worker-core\.md/);
  assert.match(worker, /@sai\/orchestration\/worker-core\.md/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-3-implementation-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

test('implementation invocation core owns the routed completion boundary', () => {
   const core = artifact('sai/commands/implement/invocation.md');
  assert.match(core, /^## Load instructions \(in order\)/m);
  assert.match(core, /^## Run\s*$/m);
  assert.doesNotMatch(core, /^## Completion\b/m);
  assert.doesNotMatch(core, /MANDATORY STOP/);

});

test('implementation worker declares the lifecycle and input/output contract', () => {
  const worker = artifact('sai/commands/implement/worker.md');

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
  const agent = matrixAgent('claude', 'implementation');
  assert.match(agent, /^name:\s*sai-3-implementation-worker\s*$/m);
   assert.match(agent, /^model:\s*opus\s*$/m);
   assert.match(agent, /^effort:\s*medium\s*$/m);
  assert.match(
    agent,
    /^tools:\s*Read,\s*Glob,\s*Grep,\s*Bash,\s*Edit,\s*Write,\s*Agent,\s*Skill,\s*SendMessage\s*$/m
  );
});

test('Claude and opencode worker bindings own dispatch and continuation mechanics', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = matrixBinding(harness, 'implementation');
    assert.match(binding, /dispatch/i, `${harness} binding should define the dispatch action`);
    assert.match(binding, /continuation/i, `${harness} binding should define the continuation action`);
    assert.match(binding, /reconstruction fields|originating binding context/i,
      `${harness} binding should carry the reconstruction fields`);
    assert.match(binding, /replacement/i, `${harness} binding should define the replacement path`);
  }
});

test('opencode config sample defines no agent and ships the SAI permission rule', () => {
  const config = jsonc.parse(artifact('configs/opencode.jsonc'));

  assert.equal(config.subagent_depth, 2);
  assert.ok(Object.hasOwn(config, '$schema'), 'sample config should retain $schema');
  assert.ok(config.permission, 'sample config should retain permission');
  assert.equal(Object.hasOwn(config, 'agent'), false,
    'specs/managed-worker-registry/spec.md: the canonical opencode configuration sample defines no agent');
  assert.equal(config.agent, undefined, 'no coordinator profile is shipped');
  assert.equal(config.permission.external_directory['~/.config/opencode/sai/**'], 'allow',
    'specs/managed-worker-registry/spec.md: the sample should ship the narrow external-directory rule');
});

test('install surfaces expose managed Claude assets and opencode shapes', () => {
const { installClaude, installOpencode } = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
  const claudeBase = tempDir('sai-implement-claude-');
  const opencodeBase = tempDir('sai-implement-opencode-');
  try {
    installClaude(claudeBase);
    assert.ok(fs.existsSync(path.join(claudeBase, 'agents', 'sai-3-implementation-worker.md')));
    assert.equal(fs.existsSync(path.join(claudeBase, 'agents', '.sai-3-implementation-worker.owner.json')), false,
      'fresh installs must not create owner sidecars');

    installOpencode(opencodeBase);
    assert.ok(fs.existsSync(path.join(opencodeBase, 'agents', 'sai-3-implementation-worker.md')),
      'the projected opencode worker agent file should exist under agents/');
    const config = fs.readFileSync(path.join(opencodeBase, 'opencode.jsonc'), 'utf8');
    assert.doesNotMatch(config, /sai-coordinator/);
    assert.doesNotMatch(config, /sai-3-implementation-worker/,
      'the installed opencode configuration should carry no namespaced worker keys');
  } finally {
    removeTempDir(claudeBase);
    removeTempDir(opencodeBase);
  }
});

test('installer collisions overwrite unfamiliar Claude content with notice and preserve customized opencode workers', () => {
  const { installClaude, installOpencode } = require('../bin/install-flow.js');
  const claudeBase = tempDir('sai-implement-claude-collision-');
  const opencodeBase = tempDir('sai-implement-opencode-collision-');
  const agentPath = path.join(claudeBase, 'agents', 'sai-3-implementation-worker.md');
  const configPath = path.join(opencodeBase, 'opencode.jsonc');
  const claudeSentinel = 'user-owned incompatible Claude agent\n';
   const opencodeSentinel = '{\n  "agent": {\n    "sai-3-implementation-worker": { "mode": "subagent", "model": "user-model" }\n  }\n}\n';
  try {
    fs.mkdirSync(path.dirname(agentPath), { recursive: true });
    fs.writeFileSync(agentPath, claudeSentinel);
    const claudeResult = capture(() => installClaude(claudeBase));
    assert.equal(claudeResult.error, null, 'Claude install should not throw on a divergent agent');
    assert.deepEqual(
      fs.readFileSync(agentPath),
      Buffer.from(matrixAgent('claude', 'implementation')),
      'the divergent Claude agent should be overwritten with the managed source bytes');
    assert.match(`${claudeResult.output}\n${claudeResult.error?.message || ''}`, /notice|overwrit/i,
      'the overwrite should be announced in stdout');

    fs.writeFileSync(configPath, opencodeSentinel);
    const opencodeResult = capture(() => installOpencode(opencodeBase));
    const opencodeConfig = jsonc.parse(fs.readFileSync(configPath, 'utf8'));
    assert.deepEqual(opencodeConfig.agent['sai-3-implementation-worker'], {
      mode: 'subagent',
      model: 'user-model',
    }, 'customized worker entry must be preserved without prompt injection');
    assert.equal(opencodeConfig.agent['sai-2-design-worker'], undefined,
      'no absent numbered worker key should be added');
    const opencodeOutput = `${opencodeResult.output}\n${opencodeResult.error?.message || ''}`;
    assert.doesNotMatch(opencodeOutput, /Added opencode agent keys/,
      'specs/install-command-overwrite/spec.md: the retired agent-key merge notice is never printed');
    assert.doesNotMatch(opencodeOutput, /sai-\d+-.*-worker/,
      'the config feedback should name no agent keys');
  } finally {
    removeTempDir(claudeBase);
    removeTempDir(opencodeBase);
  }
});

test('uninstall and doctor expose ownership guards and collision status', async () => {
  const { installClaude, installOpencode } = require('../bin/install-flow.js');
  const { enumerateClaude, enumerateOpencode, buildDeletionSet, runDeletion } = require('../bin/uninstall-flow.js');
  const { main } = require('../bin/doctor.js');
  const claudeBase = tempDir('sai-implement-claude-guard-');
  const projectRoot = tempDir('sai-implement-doctor-');
  const opencodeBase = path.join(projectRoot, 'opencode');
  try {
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'openspec', 'config.yaml'), 'schema: sai-workflow\n');

    installClaude(claudeBase);
    installOpencode(opencodeBase);
    const implementationSources = new Set([
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/commands/implement/worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/claude/implementation-worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/claude/sai-3-implementation-worker.md',
      '.tmp/collapse-sai-worker-matrix/matrix-sources/opencode/implementation-worker.md',
    ]);
    const manifest = loadInstallManifest(repoRoot);
    function expectedSources(harness) {
      return expandInstallManifest(manifest, {
        harness,
        repoRoot,
        destinationRoot: {
          commands: projectRoot,
          sai: projectRoot,
          skills: projectRoot,
          agents: projectRoot,
          config: projectRoot,
          root: projectRoot,
        },
      })
        .filter(projection => implementationSources.has(path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/')))
        .map(projection => path.relative(repoRoot, projection.sourcePath).split(path.sep).join('/'))
        .sort();
    }
    function enumeratedSources(entries) {
      return entries
        .map(entry => path.relative(repoRoot, entry.src).split(path.sep).join('/'))
        .filter(source => implementationSources.has(source))
        .sort();
    }

    const agentPath = path.join(claudeBase, 'agents', 'sai-3-implementation-worker.md');
    assert.ok(fs.existsSync(agentPath), 'managed Claude agent should be enumerable');

    const unchangedEntries = enumerateClaude(claudeBase);
    assert.deepEqual(enumeratedSources(unchangedEntries), expectedSources('claude'),
      'Claude uninstall should enumerate the installer implementation projection set');
    assert.deepEqual(enumeratedSources(enumerateOpencode(opencodeBase)), expectedSources('opencode'),
      'opencode uninstall should enumerate the installer implementation projection set');
    assert.ok(unchangedEntries.some(entry => entry.dest === agentPath), 'uninstall should include the managed agent');
    runDeletion(unchangedEntries);
    assert.equal(fs.existsSync(agentPath), false, 'unchanged managed agent should be deleted');

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
      execOpenspec: () => ({ status: 0, stdout: '1.0.0\n', stderr: '', error: null }),
      out: { write(chunk) { output.push(String(chunk)); } },
    });
    const report = output.join('');
    assert.ok(code === 0 || code === 1, 'doctor should return a normal status code');
    assert.match(report, /sai-3-implementation-worker/);
    assert.match(report, /modified|incompatible/i);
    const doctorReport = JSON.parse(report);
    const claudeDoctorSection = JSON.stringify(doctorReport['[Claude Code]']);
    assert.match(claudeDoctorSection, /sai-3-implementation-worker/,
      'doctor should enumerate the managed implementation worker');
    assert.match(claudeDoctorSection, /modified|incompatible/i,
      'doctor should report the divergent managed worker');

    const opencodeEntries = buildDeletionSet({
      claudeBase: path.join(projectRoot, 'missing-claude'),
      opencodeBase,
    }).filter(entry => entry.dest.startsWith(opencodeBase));
    assert.equal(opencodeEntries.some(entry => /opencode\.jsonc?$/.test(entry.dest)), false,
      'opencode configuration should be excluded from uninstall enumeration');
    runDeletion(opencodeEntries);
    assert.equal(fs.existsSync(path.join(opencodeBase, 'opencode.jsonc')), true,
      'uninstall should preserve opencode configuration');
  } finally {
    removeTempDir(claudeBase);
    removeTempDir(projectRoot);
  }
});

test('Step 2 routes Claude and opencode through the coordinator', () => {
  const claude = artifact('commands/claude/sai-3-implement.md');
  const opencode = artifact('commands/opencode/sai-3-implement.md');
  const launcher = artifact('sai/commands/implement/launcher.md');

  assert.match(claude, /^model:\s*opus\s*$/m);
   assert.match(claude, /^effort:\s*low\s*$/m);
    assert.match(claude, /Fetch @sai\/commands\/implement\/launcher\.md/);
   assert.doesNotMatch(claude, /Fetch @skills\/sai-3-implementation-worker\/SKILL\.md/);
     assert.match(opencode, /^model: opencode-go\/deepseek-v4-flash$/m);
     assert.match(opencode, /Fetch @sai\/commands\/implement\/launcher\.md/);
    assert.doesNotMatch(opencode, /Fetch @skills\/sai-3-implementation-worker\/SKILL\.md/);
    assert.match(opencode, /^variant: max$/m);
   assert.match(opencode, /^subtask:\s*false\s*$/m);
   assert.doesNotMatch(opencode, /^agent:/m);
  assert.match(opencode, /\*\*Change-name argument:\*\* \$ARGUMENTS/);

  assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/implementation-worker\.md/, 'launcher should load the implementation binding');
  assert.match(launcher, /Fetch @sai\/commands\/implement\/coordinator\.md/, 'launcher should load the implement coordinator');
});

test('Step 1 implementation contracts use the routed entrypoints', () => {
  const claude = artifact('commands/claude/sai-3-implement.md');
  const opencode = artifact('commands/opencode/sai-3-implement.md');
  const launcher = artifact('sai/commands/implement/launcher.md');
  assert.match(claude, /Fetch @sai\/commands\/implement\/launcher\.md/);
  assert.match(opencode, /Fetch @sai\/commands\/implement\/launcher\.md/);
  assert.match(launcher, /Fetch @sai\/commands\/implement\/coordinator\.md/);
});

test('routed harness bindings and inline parity', () => {
  const workerName = 'sai-3-implementation-worker';
  const worker = artifact('sai/commands/implement/worker.md');
  const claudeBinding = matrixBinding('claude', 'implementation');
  const opencodeBinding = matrixBinding('opencode', 'implementation');
  const claudeAgent = matrixAgent('claude', 'implementation');
  const claudeWrapper = artifact('commands/claude/sai-3-implement.md');
  const opencodeWrapper = artifact('commands/opencode/sai-3-implement.md');

  assert.match(
    claudeBinding,
    new RegExp(`Agent\\([\\s\\S]{0,120}name: "${workerName}",\\s*run_in_background: true,`),
    'the Claude binding should dispatch via Agent with the worker name and background flag'
  );
  assert.match(claudeBinding, /SendMessage/,
    'the Claude binding should continue the captured agent via SendMessage');
  assert.doesNotMatch(claudeBinding, /Agent[\s\S]{0,120}resume/,
    'the Claude binding should not use an Agent resume parameter');
  assert.match(claudeBinding, /worker/i);
  assert.doesNotMatch(claudeBinding, /opencode[\\/\\]implementation-worker\.md/,
    'the Claude binding should not reference the opencode harness binding');
  assert.match(claudeWrapper, /^model:\s*opus\s*$/m);
  assert.match(claudeWrapper, /^effort:\s*low\s*$/m);

  assert.match(opencodeBinding, new RegExp(`task\\(subagent_type: "${workerName}"`),
    'the opencode binding should dispatch via task with the worker subagent_type');
  assert.match(opencodeBinding, /task\(task_id: "<captured task ID>"/,
    'the opencode binding should continue the captured task via task_id');
  assert.match(opencodeBinding, /worker/i);
  assert.doesNotMatch(opencodeBinding, /claude[\\/\\]implementation-worker\.md/,
    'the opencode binding should not reference the Claude harness binding');
  assert.match(opencodeWrapper, /^model: opencode-go\/deepseek-v4-flash$/m);
  assert.match(opencodeWrapper, /^variant: max$/m);
  assert.match(opencodeWrapper, /^subtask:\s*false\s*$/m);
  assert.doesNotMatch(opencodeWrapper, /^agent:/m);

  assert.match(claudeAgent, /^model:\s*opus\s*$/m);
  assert.match(claudeAgent, /^effort:\s*medium\s*$/m);
  assert.match(
    claudeAgent,
    /^tools:\s*Read,\s*Glob,\s*Grep,\s*Bash,\s*Edit,\s*Write,\s*Agent,\s*Skill,\s*SendMessage\s*$/m
  );
  assert.doesNotMatch(worker, /\b(?:task_id|run_in_background|SendMessage)\b/);
});

test('shared implement coordinator has a two-field envelope and no artifact or resolution access', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');

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
  assert.match(coordinator, /sai-3-implementation-worker/);
  assert.match(coordinator, /one worker|exactly one worker/i);

  assert.doesNotMatch(coordinator, /openspec CLI not found|OpenSpec not initialized|schema:\s*sai-workflow/i);
  assert.doesNotMatch(coordinator, /Use change '\{name\}'\?|Which change\?|0\/1\/N|zero,? one,? or multiple/i);
  assert.doesNotMatch(coordinator, /change-picker|change resolution instructions|change-selection instructions|select a change/i);
});

test('implementation adapter pins resolved-name and reconstruction transport', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');
  const worker = artifact('sai/commands/implement/worker.md');
   const core = artifact('sai/commands/implement/invocation.md');

  for (const field of [
    'original_envelope',
    'dispatch_operation',
    'continuation_operation',
    'allowed_nonterminal_extensions',
    'extension_handlers',
    'replacement_reconstruction_fields',
    'terminal_navigation',
  ]) {
    assert.match(coordinator, new RegExp('`' + field + '`'));
  }

  assert.match(
    coordinator,
    /progress event[\s\S]{0,160}(?:sole|only)[\s\S]{0,120}nonterminal extension/i,
    'the implementation adapter should admit progress events as the sole allowed nonterminal extension'
  );
  assert.match(coordinator, /extension_handlers`:\s*empty/);
  assert.match(
    coordinator,
    /replacement_reconstruction_fields`:[\s\S]*resolved_change_name[\s\S]*opaque_input_history[\s\S]*fixed durable-artifact reconstruction instruction/
  );
  assert.match(coordinator, /Every post-resolution payload supplies `resolved_change_name`/);
  assert.match(coordinator, /worker-returned value as invocation-scoped state/);
  assert.match(coordinator, /never derive it by reparsing either envelope field/);
  assert.match(coordinator, /entries contain only the exact worker-authored `question`, ordered\s+`options`, and selected\s+`answer_value`/);
  assert.match(coordinator, /replacement must rerun[\s\S]*independently reread current change artifacts[\s\S]*audit[\s\S]*`implementation\.md`/);
  assert.match(coordinator, /Do not include artifact contents[\s\S]*binding identifiers/);
  assert.match(worker, /openspec CLI not found\. Install it first: https:\/\/github\.com\/Fission-AI\/OpenSpec/);
  assert.doesNotMatch(worker, /OpenSpec\)/);
  assert.doesNotMatch(core, /^## Completion\b/m);
  assert.doesNotMatch(core, /MANDATORY STOP/);
});

test('coordinator owns status transitions, changed-file union, and exact terminal behavior', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');

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
   const coordinator = artifact('sai/commands/implement/coordinator.md');
  const claudeBinding = matrixBinding('claude', 'implementation');
  const opencodeBinding = matrixBinding('opencode', 'implementation');

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
  assert.doesNotMatch(claudeBinding, /Agent[\s\S]{0,120}resume/);
  assert.match(claudeBinding, /reconstruction fields|originating binding context/i);
  assert.match(opencodeBinding, /task_id/);
  assert.match(opencodeBinding, /reconstruction fields|originating binding context/i);
});

test('worker owns prerequisites and picker while coordinator does not', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');
  const worker = artifact('sai/commands/implement/worker.md');

  assert.match(worker, /openspec CLI not found|OpenSpec not initialized|schema:\s*sai-workflow/i);
  assert.match(worker, /Use change '\{name\}'\?|Which change\?|0\/1\/N|zero,? one,? or multiple/i);
  assert.doesNotMatch(coordinator, /openspec CLI not found|OpenSpec not initialized|schema:\s*sai-workflow/i);
  assert.doesNotMatch(coordinator, /Use change '\{name\}'\?|Which change\?|0\/1\/N|zero,? one,? or multiple/i);
});

test('Step 2 coordinator makes no live-proof or smoke-success claims', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');

  assert.doesNotMatch(coordinator, /\b(?:live|runtime)\s+(?:probe|proof)\b/i);
  assert.doesNotMatch(coordinator, /\bsmoke[- ]?(?:check|test)\b/i);
});

test('completed routed output uses the coordinator contract', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');

  assert.match(coordinator, /completed[\s\S]*concise summary[\s\S]*accumulated changed-file list/i);
  assert.ok(
    coordinator.includes(
      'Implementation plan done in openspec/changes/{name}/. Review and run \\`/sai-4-apply {name}\\` (--fast-track) **in a new chat** when ready.'
    )
  );
  assert.match(coordinator, /Stop immediately/);
});

test('design navigation stops after completion with no continuation', () => {
   const design = artifact('sai/commands/design/coordinator.md');

  assert.doesNotMatch(design, /After Continue/);
  assert.doesNotMatch(design, /Continue now/);
  assert.doesNotMatch(design, /implementation-worker binding/);
  assert.doesNotMatch(design, /wrapper_echo_value:\s*""/);
  assert.doesNotMatch(design, /arguments_value:\s*resolved_change_name/);
  assert.match(design, /Design done in openspec\/changes\/\{name\}\//);
});

test('Step 3 README documents routed roles, model independence, and artifact stability', () => {
  const readme = artifact('README.md');

  assert.match(readme, /Claude Code[\s\S]{0,240}(?:coordinator|rout)/i);
  assert.match(readme, /opencode[\s\S]{0,240}(?:coordinator|rout)/i);
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

test('Step 3 documentation requires the two-harness routed roster and upgrade notice', () => {
  const documentation = [
    'README.md',
    'AGENTS.md',
    'INSTALL.claude.md',
    'INSTALL.opencode.md',
  ].map(artifact).join('\n');

  assert.match(documentation, /Claude Code/);
  assert.match(documentation, /opencode/);
  assert.match(documentation, /routed/);
  assert.match(documentation, /existing GitHub Copilot users must run the current uninstall command before upgrading/i);
  assert.match(documentation, /orphaned Copilot files/i);
  assert.doesNotMatch(documentation, /Inline Coordinator Adapter|inline-invocation\.md/i);
  assert.doesNotMatch(documentation, /commands\/copilot|skills\/copilot|agents\/copilot|INSTALL\.copilot/i);
});

test('Step 3 AGENTS documents every coordinator, worker, agent, and binding boundary', () => {
  const agents = artifact('AGENTS.md');

  for (const entry of [
    'agents/claude/sai-3-implementation-worker.md',
  ]) {
    assert.match(agents, new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(agents, /sai\/orchestration\/workers\/bindings\//);
  assert.match(agents, /harness universality/i);
});

test('Step 3 Claude installer documentation covers ownership, compatibility, collisions, uninstall guards, and manual copy', () => {
  const claude = artifact('INSTALL.claude.md');

  assert.match(claude, /agents\/claude\/sai-3-implementation-worker\.md/);
  assert.match(claude, /(?:~\/\.claude|%USERPROFILE%[\\/]\.claude)[\\/]agents[\\/]sai-3-implementation-worker\.md/);
  assert.match(claude, /No ownership sidecar is written or read/i);
  assert.match(claude, /exact-compatible existing agent is reused/i);
  assert.match(claude, /collision[\s\S]{0,140}(?:rename|remove|remediat|manual)/i);
  assert.match(claude, /uninstall[\s\S]{0,180}(?:ownership|guard|modified|preserv)/i);
  assert.match(claude, /(?:cp|Copy-Item)[\s\S]{0,220}sai-3-implementation-worker/i);
});

test('Step 3 opencode installer documentation covers managed entries, routing shapes, collisions, preservation, and restart', () => {
  const opencode = artifact('INSTALL.opencode.md');

  assert.match(opencode, /sai-3-implementation-worker/);
  assert.match(opencode, /opencode-go\/glm-5\.2[\s\S]{0,200}variant[\s\S]{0,40}high/i);
  assert.match(opencode, /sai-3-implementation-worker[\s\S]{0,280}subagent[\s\S]{0,280}opencode-go\/kimi-k2\.6/i);
  assert.match(opencode, /variant/i);
  assert.match(opencode, /collision[\s\S]{0,160}(?:preserv|rename|remove|manual)/i);
  assert.match(opencode, /uninstall[\s\S]{0,220}(?:preserv|retain|unchanged)[\s\S]{0,100}(?:config|opencode\.jsonc)/i);
  assert.match(opencode, /restart(?:ing)?[\s\S]{0,120}(?:required|must|need|after|reload)/i);
});

test('Step 5 installer documentation matches the deterministic manifest', () => {
  const manifest = artifact('sai/install-manifest.json');
  const agents = artifact('AGENTS.md');
  const claude = artifact('INSTALL.claude.md');
  const opencode = artifact('INSTALL.opencode.md');

  assert.match(manifest, /"id": "claude-orchestration"/);
  assert.match(manifest, /"id": "opencode-orchestration"/);
  assert.match(agents, /manifest-driven installer|deterministic.*manifest/i);
  assert.match(claude, /sai\/orchestration\/workers/);
  assert.match(opencode, /sai\/orchestration\/workers/);
});

// ─── Step 1: preservation-first legacy identity migration ───────────────────

test('implementation install overwrites divergent numbered destination content with notice and uninstall deletes body-matching agents', () => {
  const { installClaude } = require('../bin/install-flow.js');
  const { enumerateClaude, runDeletion } = require('../bin/uninstall-flow.js');
  const base = tempDir('sai-implementation-numbered-collision-');
  const target = path.join(base, 'agents', 'sai-3-implementation-worker.md');
  const sentinel = 'user-owned numbered implementation worker\n';
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, sentinel);
    const result = capture(() => installClaude(base));
    assert.equal(result.error, null, 'installClaude should not throw on a divergent agent destination');
    assert.deepEqual(
      fs.readFileSync(target),
      Buffer.from(matrixAgent('claude', 'implementation')),
      'the divergent destination content should be overwritten with the managed source bytes');
    assert.match(`${result.output}\n${result.error?.message || ''}`, /notice|overwrit/i,
      'the overwrite should be announced in stdout');
    runDeletion(enumerateClaude(base));
    assert.equal(fs.existsSync(target), false,
      'the body-matching agent should be deleted by uninstall');
  } finally {
    removeTempDir(base);
  }
});

// ─── Step 6: progress-plan-spec-and-implement (implementation coordinator/worker) ──

test('Step 6: coordinator and worker declare the same canonical six-step implementation plan', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const worker = artifact('sai/commands/implement/worker.md');

  assert.deepEqual(
    implementationPlanList(coordinator),
    IMPLEMENT_PLAN_STEPS,
    'the coordinator should declare exactly the six ordered ids and imperative labels'
  );
  assert.deepEqual(
    implementationPlanList(worker),
    IMPLEMENT_PLAN_STEPS,
    'the worker should enumerate exactly the six ordered ids and imperative labels'
  );
  assert.deepEqual(
    implementationPlanList(worker),
    implementationPlanList(coordinator),
    'the normalized coordinator and worker declaration entries should be byte-identical'
  );
});

test('Step 6: the retired simplification id is rejected and first-run folding uses the collapse id', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const worker = artifact('sai/commands/implement/worker.md');

  assert.doesNotMatch(coordinator, /`plan-simplification`/);
  assert.doesNotMatch(worker, /`plan-simplification`/);
  assert.match(
    worker,
    /skipped `collapse-implemented-steps` id\s+folds into the next completed batch in plan order with no separate `skipped`\s+field/i,
    'the first-run skip should fold the renamed id into the artifact-analysis batch'
  );
});

test('Step 6: writing and validation report separately and validation failure blocks completion', () => {
  const worker = artifact('sai/commands/implement/worker.md');

  assert.match(
    worker,
    /completed Step 5 write reports `plan-generation`[\s\S]{0,300}durable-artifact verification reports `validation`/i,
    'the write and durable verification should report under separate progress ids'
  );
  assert.match(
    worker,
    /failed verification[\s\S]{0,240}(?:does not|must not|shall not) emit `validation`[\s\S]{0,240}return `failed`/i,
    'failed validation should emit no validation progress and should close failed'
  );
});

test('Step 6: implementation completion reconciles every unmarked step without a review carve-out', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const declaredIds = implementationPlanList(coordinator).map(([id]) => id);

  assert.equal(declaredIds.includes('review'), false,
    'the implementation plan should declare no literal review step');
  assert.match(
    coordinator,
    /no `review` step and no[\s\S]{0,80}evidence-marked designation, so no reconciliation carve-out applies/i,
    'the coordinator should state the affirmative no-carve-out contract'
  );
  assert.match(
    coordinator,
    /`completed` renders every unmarked step `completed`, `validation` included/i,
    'run-closing completion should reconcile every unmarked step, including validation'
  );
  assert.doesNotMatch(coordinator, /evidence-marked `review` step/i);
});

test('Step 6: continue_after_progress is protocol-only and the plan survives reconstruction without a reconstruction field', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');

  assert.match(coordinator, /continue_after_progress/,
    'the coordinator should define continue_after_progress');
  assert.match(coordinator, /protocol[- ]?only/i,
    'the acknowledgement should be protocol-only');
  assert.match(coordinator, /(?:excluded|never|not recorded)[\s\S]{0,320}(?:opaque|user[- ]answer|pending feedback)|(?:opaque|user[- ]answer|pending feedback)[\s\S]{0,320}(?:excluded|never|not recorded)/i,
    'the acknowledgement should be excluded from opaque input history, user-answer handling, and pending feedback');
  assert.match(coordinator, /survives[\s\S]{0,240}(?:continuation|reconstruction)|(?:continuation|reconstruction)[\s\S]{0,240}survives/i,
    'the plan should survive same-worker continuation and replacement-worker reconstruction');
  assert.match(coordinator, /(?:never|not)[\s\S]{0,160}(?:carried|carries?)[\s\S]{0,120}reconstruction|reconstruction[\s\S]{0,160}(?:never|not)[\s\S]{0,120}(?:carried|carries?)/i,
    'the plan should never be carried in a reconstruction field');
});

test('Step 6: the implementation coordinator and policy drive the harness task list on progress events with the threshold rule', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');

  assert.match(coordinator, /progress event/i,
    'the coordinator should act on each progress event');
  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral todo-structure policy');
  assert.match(policy, /completed[\s\S]{0,300}in_progress|in_progress[\s\S]{0,300}completed/i,
    'reported ids should render completed and the leading unmarked step in_progress');
  assert.match(policy, /first step in plan order[\s\S]{0,160}not in the marked set renders `in_progress`/i,
    'the in_progress mark should apply to the leading unmarked step');
  assert.match(policy, /(?:remaining|rest|others?)[\s\S]{0,160}pending|pending[\s\S]{0,160}(?:remaining|rest|others?)/i,
    'the remaining steps should render pending');

  assert.match(policy, /todowrite/i,
    'the opencode harness renders the list via the todowrite tool');
  assert.match(policy, /pending[\s\S]{0,240}in_progress[\s\S]{0,240}completed/i,
    'the array should map completed, in_progress, and pending states');
  assert.match(policy, /(?:below|fewer than|less than)[\s\S]{0,120}three|three[\s\S]{0,120}(?:below|fewer than|less than)/i,
    'the policy should state the three-declared-step threshold');
  assert.match(policy, /(?:no|without|never)[\s\S]{0,160}(?:task list|todowrite)/i,
    'no task list / todowrite call should be emitted below the threshold');
  assert.match(policy, /coordinator session/i,
    'the policy should record the coordinator-only emission ownership');
  assert.match(policy, /subagent[\s\S]{0,160}disabl|disabl[\s\S]{0,160}subagent/i,
    'the policy should tie the disabled-by-default tool to the subagent context');
});

// ─── Step 2: todo-list-step-timestamps (implementation coordinator) ─────────

test('Step 2: the implementation coordinator renders task-list stamps coordinator-only via the todo-structure policy, with no shell grant on the wrapper (stamp-emission-coordinator-only)', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');
  const claudeWrapper = artifact('commands/claude/sai-3-implement.md');

  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral stamping policy');
  assert.match(policy, /stamp/i,
    'the policy should govern milestone stamp annotations');
  assert.match(policy, /coordinator session/i,
    'the policy should state stamp attachment is coordinator-only');
  assert.match(policy, /never from a worker subagent/i,
    'the policy should state attachment never originates from the worker subagent');
  assert.doesNotMatch(claudeWrapper, /Bash\(/,
    'the wrapper should carry no shell grant now that stamps come from emitted_on');
  assert.doesNotMatch(coordinator, /date \+%H:%M|Get-Date/,
    'per-harness wall-clock commands no longer live in the coordinator body');
});

test('composition delta does not alter one-adapter implement path and forbids successor inference from worker text', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /single phase adapter[\s\S]{0,200}(?:unchanged|one-phase)|one-adapter[\s\S]{0,200}(?:unchanged|identical)/i,
    'one-adapter path must stay observationally unchanged');
  assert.match(runner, /(?:shall not|must not|never)[\s\S]{0,120}infer[\s\S]{0,120}(?:next phase|successor)[\s\S]{0,200}(?:summary|artifact|changed_files)/i,
    'successor must never be inferred from worker summary, artifacts, or changed_files text');
  assert.match(runner, /wrapper_echo_value[\s\S]{0,120}empty string|empty string[\s\S]{0,120}wrapper_echo_value/i,
    'chained apply envelope must use empty wrapper_echo_value');
  assert.match(runner, /arguments_value[\s\S]{0,160}(?:resolved change name|already-resolved)/i,
    'chained apply envelope must carry the resolved change name in arguments_value');
  assert.match(runner, /(?:does not|shall not|must not)[\s\S]{0,120}(?:harness boot|boot adapter)|without[\s\S]{0,80}(?:harness boot|boot adapter)/i,
    'composition must construct the envelope without a harness boot adapter');
  assert.match(runner, /(?:not|never)[\s\S]{0,120}(?:card[- ]selection|routing)[\s\S]{0,120}command_name|command_name[\s\S]{0,160}(?:not|never)[\s\S]{0,120}(?:card[- ]selection|routing)/i,
    'command_name on the chained path is shape compatibility only, not card selection');
});

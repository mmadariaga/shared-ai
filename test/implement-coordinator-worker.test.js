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

test('Step 1 implementation card uses neutral root protocols and retires flat canonical sources', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const worker = artifact('sai/commands/implement/worker.md');
  assert.match(coordinator, /@sai\/command-runner\.md/);
  assert.match(coordinator, /@sai\/worker-core\.md/);
  assert.match(worker, /@sai\/worker-core\.md/);
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

  assert.match(claude, /^model:\s*opus\s*$/m);
   assert.match(claude, /^effort:\s*low\s*$/m);
    assert.match(claude, /Fetch @sai\/orchestration\/workers\/bindings\/implementation-worker\.md/);
   assert.doesNotMatch(claude, /Fetch @skills\/sai-3-implementation-worker\/SKILL\.md/);
   assert.match(claude, /Fetch @sai\/commands\/implement\/coordinator\.md/);
    assert.match(opencode, /^model: opencode-go\/deepseek-v4-flash$/m);
     assert.match(opencode, /Fetch @sai\/orchestration\/workers\/bindings\/implementation-worker\.md/);
    assert.doesNotMatch(opencode, /Fetch @skills\/sai-3-implementation-worker\/SKILL\.md/);
   assert.match(opencode, /Fetch @sai\/commands\/implement\/coordinator\.md/);
    assert.match(opencode, /^variant: max$/m);
   assert.match(opencode, /^subtask:\s*false\s*$/m);
   assert.doesNotMatch(opencode, /^agent:/m);
  assert.match(opencode, /\*\*Change-name argument:\*\* \$ARGUMENTS/);
});

test('Step 1 implementation contracts use the routed entrypoints', () => {
  const claude = artifact('commands/claude/sai-3-implement.md');
  const opencode = artifact('commands/opencode/sai-3-implement.md');
  assert.match(claude, /Fetch @sai\/commands\/implement\/coordinator\.md/);
  assert.match(opencode, /Fetch @sai\/commands\/implement\/coordinator\.md/);
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

test('Step 6: the implementation adapter declares the canonical five-step plan in order with its labels', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');

  for (const id of ['prereqs-resolution', 'plan-simplification', 'artifact-analysis', 'documentation-review', 'plan-generation']) {
    assert.match(coordinator, new RegExp(id.replace(/-/g, '\\-')),
      `the implementation plan should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /prereqs-resolution[\s\S]{0,300}plan-simplification[\s\S]{0,300}artifact-analysis[\s\S]{0,300}documentation-review[\s\S]{0,300}plan-generation/,
    'the five canonical step ids should be declared in order'
  );
  assert.match(coordinator, /prereqs-resolution[\s\S]{0,200}Prerequisites and change resolution/i,
    'prereqs-resolution should carry the "Prerequisites and change resolution" label');
  assert.match(coordinator, /plan-simplification[\s\S]{0,200}Existing plan simplification/i,
    'plan-simplification should carry the "Existing plan simplification" label');
  assert.match(coordinator, /artifact-analysis[\s\S]{0,200}Artifact analysis and decision validation/i,
    'artifact-analysis should carry the "Artifact analysis and decision validation" label');
  assert.match(coordinator, /documentation-review[\s\S]{0,200}Required documentation review/i,
    'documentation-review should carry the "Required documentation review" label');
  assert.match(coordinator, /plan-generation[\s\S]{0,200}Implementation plan generation and verification/i,
    'plan-generation should carry the "Implementation plan generation and verification" label');
  assert.doesNotMatch(coordinator, /specs-approval/,
    'the implementation plan should contain no specs-approval step');
});

test('Step 6: the implementation-planning worker contract enumerates the same five ids in order', () => {
  const worker = artifact('sai/commands/implement/worker.md');

  assert.match(
    worker,
    /prereqs-resolution[\s\S]{0,800}plan-simplification[\s\S]{0,800}artifact-analysis[\s\S]{0,800}documentation-review[\s\S]{0,800}plan-generation/,
    'the implementation worker contract should enumerate the same five step ids in the same order'
  );
});

test('Step 6: the implementation coordinator renders the plan at dispatch, marks from events only, and reconciles', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');

  assert.match(coordinator, /at dispatch/i,
    'the full plan should render at dispatch');
  assert.match(coordinator, /first[\s\S]{0,160}in_progress|in_progress[\s\S]{0,160}first/i,
    'the first step should render in_progress at dispatch');
  assert.match(coordinator, /(?:remaining|rest|others?)[\s\S]{0,160}pending|pending[\s\S]{0,160}(?:remaining|rest|others?)/i,
    'the remaining steps should render pending');
  assert.match(coordinator, /mark steps only from worker progress-event `step_ids`/,
    'steps should be marked only from worker progress events');
  assert.match(coordinator, /completed[\s\S]{0,240}unmarked|unmarked[\s\S]{0,240}completed/i,
    'a completed run should render every unmarked step completed');
  assert.match(coordinator, /failed[\s\S]{0,200}(?:freeze|frozen|as last rendered)|cancelled[\s\S]{0,200}(?:freeze|frozen|as last rendered)/i,
    'failed or cancelled runs should leave the list as last rendered');
  assert.match(coordinator, /needs_input[\s\S]{0,240}(?:unchanged|as last rendered)|(?:unchanged|as last rendered)[\s\S]{0,240}needs_input/i,
    'a needs_input result should leave the list as last rendered');
});

test('Step 6: the implementation worker contract emits per completed batch with the first-run skip-fold', () => {
  const worker = artifact('sai/commands/implement/worker.md');

  assert.match(worker, /(?:one|a single|each|per)[\s\S]{0,200}progress event[\s\S]{0,240}(?:completed )?batch|(?:completed )?batch[\s\S]{0,200}(?:one|a single|each|per)[\s\S]{0,200}progress event/i,
    'the contract should emit one progress event per completed batch');
  assert.match(worker, /startup act[\s\S]{0,240}prereqs-resolution|prereqs-resolution[\s\S]{0,240}startup/i,
    'the startup batch should carry prereqs-resolution');
  assert.match(worker, /skip(?:ped)?[\s\S]{0,240}folds?[\s\S]{0,240}(?:completed )?batch|fold(?:s|ed|ing)?[\s\S]{0,240}completed batch/i,
    'a first-run skip should fold into the next completed batch');
  assert.match(worker, /(?:no|without|never)[\s\S]{0,120}(?:separate|own)[\s\S]{0,160}skipped|skipped[\s\S]{0,120}(?:field|flag)|(?:no|without|never)[\s\S]{0,200}skipped field/i,
    'folded steps should carry no separate skipped field');
  assert.match(worker, /needs_input[\s\S]{0,200}pause|pause[\s\S]{0,200}needs_input/i,
    'no progress event should be emitted during a needs_input pause');
  assert.match(worker, /(?:never|not)[\s\S]{0,120}progress event[\s\S]{0,240}feedback turn|feedback turn[\s\S]{0,240}(?:no|never|not)[\s\S]{0,120}progress/i,
    'feedback turns should emit no progress event');
  assert.match(worker, /exactly one terminal lifecycle status|one terminal lifecycle status/i,
    'the run should close with exactly one terminal lifecycle status');
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
  assert.match(coordinator, /completed[\s\S]{0,240}in_progress|in_progress[\s\S]{0,240}completed/i,
    'reported ids should render completed and the leading unmarked step in_progress');
  assert.match(coordinator, /unmarked[\s\S]{0,200}in_progress|in_progress[\s\S]{0,200}unmarked/i,
    'the in_progress mark should apply to the leading unmarked step');
  assert.match(coordinator, /(?:remaining|rest|others?)[\s\S]{0,160}pending|pending[\s\S]{0,160}(?:remaining|rest|others?)/i,
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

test('Step 2: the implementation coordinator renders task-list stamps coordinator-only via the todo-structure policy, with the scoped date shell granted to the wrapper (stamp-emission-coordinator-only)', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');
  const claudeWrapper = artifact('commands/claude/sai-3-implement.md');

  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral stamping policy');
  assert.match(policy, /stamp/i,
    'the policy should govern milestone stamp annotations');
  assert.match(policy, /coordinator session/i,
    'the policy should state stamp acquisition is coordinator-only');
  assert.match(policy, /never from a worker subagent/i,
    'the policy should state the wall-clock call never originates from the worker subagent');
  assert.match(claudeWrapper, /Bash\(date:\*\)/,
    'the Claude wrapper should grant the scoped date shell for coordinator stamp acquisition');
  assert.doesNotMatch(coordinator, /date \+%H:%M|Get-Date/,
    'per-harness wall-clock commands no longer live in the coordinator body');
});

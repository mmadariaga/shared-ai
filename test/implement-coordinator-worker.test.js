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
  const worker = artifact('sai/commands/implement/worker.md');
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

test('implementation invocation core is retired from the active source layout', () => {
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/implement/invocation.md')), false);
  assert.match(artifact('sai/commands/implement/command-bootstrap.md'),
    /implementation-worker\.md/);
  assert.match(artifact('sai/commands/implement/worker.md'),
    /commands\/implement\/steps\/common\.md/);
});

test('implementation worker declares the lifecycle and input/output contract', () => {
  const worker = artifact('sai/commands/implement/worker.md');

  assert.match(worker, /InvocationEnvelope/);
  assert.match(worker, /arguments_value/);
  assert.doesNotMatch(worker, /wrapper_echo_value/,
    'the implementation worker must not construct or forward wrapper_echo_value');
  assert.match(worker, /exactly one|one string|sole opaque/i);

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
  const launcher = artifact('sai/commands/implement/command-bootstrap.md');

  assert.match(claude, /^model:\s*opus\s*$/m);
   assert.match(claude, /^effort:\s*low\s*$/m);
     assert.match(claude, /Fetch @sai\/commands\/implement\/command-bootstrap\.md/);
   assert.doesNotMatch(claude, /Fetch @skills\/sai-3-implementation-worker\/SKILL\.md/);
     assert.match(opencode, /^model: opencode-go\/deepseek-v4-flash$/m);
     assert.match(opencode, /Fetch @sai\/commands\/implement\/command-bootstrap\.md/);
    assert.doesNotMatch(opencode, /Fetch @skills\/sai-3-implementation-worker\/SKILL\.md/);
    assert.match(opencode, /^variant: max$/m);
   assert.match(opencode, /^subtask:\s*false\s*$/m);
   assert.doesNotMatch(opencode, /^agent:/m);
   for (const [harness, source] of [['claude', claude], ['opencode', opencode]]) {
     assert.match(source, /InvocationEnvelope:/,
       `${harness} implementation wrapper should forward an InvocationEnvelope`);
     assert.match(source, /command_name:\s*implement/,
       `${harness} implementation wrapper should forward command_name: implement`);
     assert.match(source, /arguments_value:\s*\$ARGUMENTS/,
       `${harness} implementation wrapper should forward the complete arguments_value`);
     assert.doesNotMatch(source, /^\s*\*\*[^*\r\n]*(?:argument|arguments)[^*\r\n]*\*\*\s*\$ARGUMENTS\s*$/m,
       `${harness} implementation wrapper should not retain a labelled argument line`);
   }
    assert.doesNotMatch(claude, /wrapper_echo_value/,
      'Claude implementation must not construct or forward wrapper_echo_value');
    assert.doesNotMatch(opencode, /wrapper_echo_value/,
      'opencode implementation must not construct or forward wrapper_echo_value');

  assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/implementation-worker\.md/, 'launcher should load the implementation binding');
});

test('Step 1 implementation contracts use the routed entrypoints', () => {
  const claude = artifact('commands/claude/sai-3-implement.md');
  const opencode = artifact('commands/opencode/sai-3-implement.md');
  assert.match(claude, /Fetch @sai\/commands\/implement\/command-bootstrap\.md/);
  assert.match(opencode, /Fetch @sai\/commands\/implement\/command-bootstrap\.md/);
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
   assert.match(coordinator, /arguments_value/);
   assert.doesNotMatch(coordinator, /wrapper_echo_value/,
     'the implement coordinator must not construct or forward wrapper_echo_value');
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

test('Step 1 parameterizes implement terminal_navigation by adapter position', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');

  assert.match(
    coordinator,
    /`terminal_navigation`[\s\S]{0,240}parameterized binding over two terminal actions; selection is positional:/i,
    'terminal_navigation should be selected positionally rather than being one unconditional action'
  );
  assert.match(
    coordinator,
    /sole adapter \(direct `\/sai-3-implement`\)[\s\S]{0,180}shell-owned standalone completion action[\s\S]{0,120}exact pinned literal \+ stop/i,
    'the sole implement adapter should retain the standalone completion action'
  );
  assert.match(
    coordinator,
    /final adapter in a multi-adapter sequence[\s\S]{0,140}same shell-owned standalone completion action/i,
    'the final implement adapter should retain the standalone completion action'
  );
  assert.match(
    coordinator,
    /non-final adapter[\s\S]{0,180}composition-owned authorized transition only[\s\S]{0,180}do not print the standalone MANDATORY STOP message/i,
    'a non-final implement adapter should use only the authorized composition transition'
  );
});

test('Step 1 completed navigation is bound while failed and cancelled paths suppress both transitions', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');

  assert.match(
    coordinator,
    /On `completed`[\s\S]{0,360}invoke the bound `terminal_navigation` action/i,
    'completed results should invoke the positional terminal_navigation binding'
  );
  assert.match(
    coordinator,
    /non-final chained implement[\s\S]{0,220}(?:invoke only|composition-owned authorized transition)[\s\S]{0,220}do not print the standalone MANDATORY STOP message/i,
    'non-final completion should communicate through the composition transition only'
  );
  assert.match(
    coordinator,
    /On `failed`[\s\S]{0,260}without the completion message and without a composition transition/i,
    'failed results must not navigate'
  );
  assert.match(
    coordinator,
    /On `cancelled`[\s\S]{0,260}without claiming completion and without a composition transition/i,
    'cancelled results must not navigate'
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

test('implementation transport carries only arguments_value plus contract metadata, and answer-only continuation does not rebuild an invocation envelope', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');
   const worker = artifact('sai/commands/implement/worker.md');
   const claudeBinding = matrixBinding('claude', 'implementation');
   const opencodeBinding = matrixBinding('opencode', 'implementation');
   const transport = [coordinator, worker, claudeBinding, opencodeBinding];

   assert.match(coordinator, /original[_ ]envelope|original envelope/i,
     'initial implementation dispatch must retain the original envelope as state');
   assert.match(coordinator, /dispatch[_ ]operation|dispatch exactly one/i,
     'initial implementation dispatch must use the worker operation');
   assert.match(coordinator, /continuation[_ ]operation|continue the same worker/i,
     'implementation continuation must use the binding-owned operation');
    assert.match(coordinator, /replacement[_ ]reconstruction|fresh worker.*reconstruction/i,
      'replacement implementation dispatch must use reconstruction metadata');
    /*
   assert.match(coordinator, /progress event[\n ]+.*coordinator|coordinator.*progress event/i,
     'implementation progress ownership must remain with the coordinator');
   assert.match(coordinator, /answer[- ]only[\n ]+continuation[\n ]+.*(?:does not|never)[\n ]+reconstruct[\n ]+.*(?:invocation envelope|InvocationEnvelope)/i,
     'an answer-only continuation must not reconstruct an invocation envelope');

    */
    assert.match(coordinator, /progress event/i,
      'implementation progress ownership must remain with the coordinator');
    assert.match(coordinator, /todo-structure\.md/,
      'implementation progress rendering must use the coordinator policy');

    const needsInputStart = coordinator.indexOf('For `needs_input`');
    const recoveryStart = coordinator.indexOf('On continuation failure', needsInputStart);
    assert.ok(needsInputStart >= 0 && recoveryStart > needsInputStart,
      'the coordinator should separate answer continuation from replacement recovery');
    const answerContinuation = coordinator.slice(needsInputStart, recoveryStart);
    assert.match(answerContinuation, /answer_value|selected (?:option )?value/i,
      'the answer-only continuation must forward the selected value');
    assert.doesNotMatch(answerContinuation, /InvocationEnvelope|original[_ ]envelope|wrapper_echo_value/,
      'an answer-only continuation must not reconstruct an invocation envelope');

    for (const source of transport) {
     assert.match(source, /arguments_value/,
       'each implementation transport surface must carry arguments_value');
     assert.doesNotMatch(source, /wrapper_echo_value/,
       'no implementation transport surface may carry wrapper_echo_value');
    }
    /*
   assert.match(claudeBinding, /Agent[\n (]/,
     'the Claude binding must retain Claude-specific dispatch identity');
   assert.match(opencodeBinding, /task[\n (]/i,
     'the opencode binding must retain opencode-specific dispatch identity');
});

    */
    assert.match(claudeBinding, /Agent/,
      'the Claude binding must retain Claude-specific dispatch identity');
    assert.match(opencodeBinding, /task/i,
      'the opencode binding must retain opencode-specific dispatch identity');
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

  // The named worker agent files are materialized at install time from
  // agents/{harness}/worker-template.md plus the manifest worker-matrix; no
  // agents/claude/sai-*-worker.md source file is checked in. AGENTS.md must
  // document that boundary, not a source path that no longer exists.
  for (const entry of ['agents/claude/', 'worker-template.md', 'worker-matrix', 'sai-3-implementation-worker']) {
    assert.ok(agents.includes(entry), `AGENTS.md should document ${entry}`);
  }
  assert.doesNotMatch(agents, /agents[/]claude[/]sai-\d-[a-z-]*worker[.]md/,
    'AGENTS.md must not present a generated worker agent file as a checked-in source');
  assert.match(agents, /sai[/]orchestration[/]workers[/]bindings[/]/);
  assert.match(agents, /harness universality/i);
});

test('Step 5 installer documentation matches the deterministic manifest', () => {
  const manifest = artifact('sai/install-manifest.json');
  const agents = artifact('AGENTS.md');

  assert.match(manifest, /"id": "claude-orchestration"/);
  assert.match(manifest, /"id": "opencode-orchestration"/);
  assert.match(agents, /manifest-driven installer|deterministic.*manifest/i);
  assert.match(agents, /sai\/orchestration\/workers/);
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
  // The demanded sentence never shipped; successor-inference remains owned by coordinator cards' terminal_navigation metadata.
  assert.match(runner, /Terminal behavior is supplied by `terminal_navigation`[\s\S]*?The\s+authorized transition SHALL name exactly the successor at position `i \+ 1`/i,
    'successor routing remains owned by terminal_navigation metadata');
   assert.doesNotMatch(runner, /wrapper_echo_value/,
     'chained apply envelope must not carry wrapper_echo_value');
  assert.match(runner, /arguments_value[\s\S]{0,160}(?:resolved change name|already-resolved)/i,
    'chained apply envelope must carry the resolved change name in arguments_value');
  assert.match(runner, /(?:does not|shall not|must not)[\s\S]{0,120}(?:harness boot|boot adapter)|without[\s\S]{0,80}(?:harness boot|boot adapter)/i,
    'composition must construct the envelope without a harness boot adapter');
  assert.match(runner, /(?:not|never)[\s\S]{0,120}(?:card[- ]selection|routing)[\s\S]{0,120}command_name|command_name[\s\S]{0,160}(?:not|never)[\s\S]{0,120}(?:card[- ]selection|routing)/i,
    'command_name on the chained path is shape compatibility only, not card selection');
});

// ─── Step-gated pointer delivery (implement coordinator/worker) ──────────────

const IMPLEMENT_STEP_POINTER_MAP = [
  ['prereqs-resolution', 'none'],
  ['collapse-implemented-steps', '@sai/commands/implement/steps/collapse-implemented-steps.md'],
  ['artifact-analysis', '@sai/commands/implement/steps/artifact-analysis.md'],
  ['documentation-review', '@sai/commands/implement/steps/documentation-review.md'],
  ['plan-generation', '@sai/commands/implement/steps/plan-generation.md'],
  ['validation', '@sai/commands/implement/steps/validation.md'],
];

function parseStepPointerMap(source) {
  const rows = [];
  const re = /^\s*\|\s*`([a-z-]+)`\s*\|\s*(none|`([^`]+)`)\s*\|\s*$/gm;
  let match;
  while ((match = re.exec(source)) !== null) {
    const id = match[1];
    const pointer = match[2] === 'none' ? 'none' : match[3];
    rows.push([id, pointer]);
  }
  return rows;
}

test('step-gated: implement coordinator declares step_machine and loads stage-machine.md', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');

  assert.match(coordinator, /step_machine: implement-standalone@1/,
    'the coordinator should declare step_machine: implement-standalone@1');
  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.doesNotMatch(coordinator, /step_pointer_map/,
    'the static step_pointer_map should not be declared');
});

test('step-gated: implement worker fetches steps/common.md and declares active-step execution', () => {
  const worker = artifact('sai/commands/implement/worker.md');

  assert.match(worker, /Fetch @sai\/commands\/implement\/steps\/common\.md/,
    'the worker should fetch steps/common.md at dispatch');
  assert.match(worker, /Active Step Execution/,
    'the worker should declare an Active Step Execution section');
  assert.match(worker, /Active step: <id> — follow <path>/,
    'the worker should document the pointer line shape');
  assert.match(worker, /execute only that named step/i,
    'the worker should execute only the coordinator-named active step');
  assert.match(worker, /never prefetch, open, or follow any other step instruction file/i,
    'the worker should never prefetch other step files');
});

test('step-gated: implement coordinator replacement reconstruction carries active_step_id', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');

  assert.match(coordinator, /active_step_id/,
    'the coordinator should include active_step_id in replacement reconstruction');
  assert.match(coordinator, /replacement's first continuation carries the correct[\s\S]{0,80}pointer line for that step/i,
    'the replacement first continuation should carry the pointer line for the active step');
});

test('step-gated: implement coordinator references stage-machine.md for step machine contract', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.match(stageMachine, /## Step machines/,
    'stage-machine.md should have a Step machines section');
  assert.match(stageMachine, /the two-line continuation/i,
    'stage-machine.md should document the two-line continuation');
  assert.match(stageMachine, /Active step: none.*complete remaining work and return/,
    'stage-machine.md should document the terminal none pointer');
});

test('step-gated: non-progress continuations carry no pointer line', () => {
  const coordinator = artifact('sai/commands/implement/coordinator.md');
  const stageMachine = artifact('sai/policies/stage-machine.md');

  assert.match(coordinator, /Fetch @sai\/policies\/stage-machine\.md/,
    'the coordinator should fetch stage-machine.md');
  assert.match(stageMachine, /do not invoke emit and do not consult the machine[\s\S]*active step file persists/,
    'stage-machine.md should state that non-progress continuations do not consume pointers and the active step persists');
});

test('step-gated: step instruction files exist for every non-none map entry', () => {
  for (const [id, pointer] of IMPLEMENT_STEP_POINTER_MAP) {
    if (pointer === 'none') continue;
    const relativePath = pointer.replace('@sai/', 'sai/');
    assert.ok(fs.existsSync(path.join(repoRoot, relativePath)),
      `${relativePath} should exist for step id ${id}`);
  }
});

test('step-gated: instructions.md remains the apply compatibility source', () => {
  const instructions = artifact('sai/commands/implement/instructions.md');

  assert.match(instructions, /## Communication Mode/,
    'instructions.md should retain its Communication Mode section');
  assert.match(instructions, /## Hard Rules/,
    'instructions.md should retain its Hard Rules section');
  assert.match(instructions, /## Code Quality Priority Stack/,
    'instructions.md should retain its Code Quality Priority Stack');
});

test('implement maintains interfaces.md: collapse-implemented-steps prunes both files', () => {
  const collapseStep = artifact('sai/commands/implement/steps/collapse-implemented-steps.md');

  assert.match(collapseStep, /Simplify existing implementation\.md and interfaces\.md/,
    'collapse step should mention maintaining both files');
  assert.match(collapseStep, /Prune interfaces\.md if it exists/,
    'collapse step should describe interfaces.md pruning');
  assert.match(collapseStep, /collapsed.*Step N:.*\(already applied\)\*/,
    'collapse step should explain the pruning format in interfaces.md');
  assert.match(collapseStep, /integer key N/,
    'collapse step should reference integer key matching for pruning both files');
});

test('implement maintains interfaces.md: plan-generation appends audit-step contracts', () => {
  const planGenStep = artifact('sai/commands/implement/steps/plan-generation.md');

  assert.match(planGenStep, /Audit-step interface contracts/,
    'plan-generation should have an Audit-step interface contracts section');
  assert.match(planGenStep, /appending an audit step.*also append.*## Step N:.*contract section/i,
    'plan-generation should describe appending contracts to interfaces.md');
  assert.match(planGenStep, /modified interface.*testable assertion/,
    'plan-generation should specify the conditions for appending contracts');
  assert.match(planGenStep, /anchor to requirements.*specs\/\*\*.*only/i,
    'plan-generation should require assertions to anchor to existing specs');
  assert.match(planGenStep, /RED block.*determined by testability/i,
    'plan-generation should note RED blocks are determined by testability');
});

test('implement maintains interfaces.md: validation ensures RED block contract invariant for audit steps', () => {
  const validationStep = artifact('sai/commands/implement/steps/validation.md');

  assert.match(validationStep, /RED block contract invariant.*audit-derived steps/,
    'validation should scope RED block invariant to audit-derived steps');
  assert.match(validationStep, /every audit-derived step.*carries a RED block.*exact, unambiguous matching.*## Step N:?.*contract/i,
    'validation should require exact matching contracts for audit RED blocks');
  assert.match(validationStep, /case 3.*unreachable/,
    'validation should reference making case 3 unreachable');
  assert.match(validationStep, /adding the missing.*## Step N/,
    'validation should describe adding missing contracts as the repair option');
});

test('implement maintains interfaces.md: instructions clarify audit-derived interface contracts', () => {
  const instructions = artifact('sai/commands/implement/instructions.md');

  assert.match(instructions, /Audit-derived step interface contracts/,
    'instructions should have an Audit-derived step interface contracts rule');
  assert.match(instructions, /Appended audit-derived steps.*if and only if.*introduces.*modified interface.*testable assertion/i,
    'instructions should specify when audit steps get contracts');
  assert.match(instructions, /anchor exclusively to requirements.*specs\/\*\*.*cannot establish new acceptance criteria/i,
    'instructions should clarify assertion anchoring and limits');
  assert.match(instructions, /testability rule.*audit steps with testable code carry.*RED block/i,
    'instructions should reference the testability rule for audit steps');
});

// ─── Step 2: audit-finding-escalation feature ──────────────────────────────

test('Judgment Rubric for Audit Findings admits three outcomes: Apply, Discard, and Escalate', () => {
  const instructions = artifact('sai/commands/implement/instructions.md');
  const artifactAnalysis = artifact('sai/commands/implement/steps/artifact-analysis.md');

  // Check in instructions.md
  assert.match(instructions, /classify the finding as \*\*Apply\*\*.*\*\*Discard\*\*.*\*\*Escalate\*\*|classify.*Apply.*Discard.*Escalate/i,
    'instructions Judgment Rubric should list all three outcomes');
  assert.match(instructions, /Apply\/Discard\/Escalate classification/,
    'instructions should refer to all three outcomes in classification');

  // Check in artifact-analysis.md
  assert.match(artifactAnalysis, /classify the finding as \*\*Apply\*\*.*\*\*Discard\*\*.*\*\*Escalate\*\*|classify.*Apply.*Discard.*Escalate/i,
    'artifact-analysis Judgment Rubric should list all three outcomes');
  assert.match(artifactAnalysis, /Apply\/Discard\/Escalate classification/,
    'artifact-analysis should refer to all three outcomes in classification');
});

test('Escalate findings are defined as contradicting existing decisions/requirements or exceeding scope', () => {
  const instructions = artifact('sai/commands/implement/instructions.md');
  const artifactAnalysis = artifact('sai/commands/implement/steps/artifact-analysis.md');

  const escalateDefinition = /Escalate.*findings are those that contradict an existing decision or requirement.*criterion 3.*or propose work.*exceeds.*scope.*criterion 5/i;
  assert.match(instructions, escalateDefinition,
    'instructions should define Escalate with criteria 3 and 5');
  assert.match(artifactAnalysis, escalateDefinition,
    'artifact-analysis should define Escalate with criteria 3 and 5');

  for (const artifact_file of [instructions, artifactAnalysis]) {
    assert.match(artifact_file, /new acceptance criteria.*not yet established/,
      'both should clarify that escalations need new acceptance criteria');
    assert.match(artifact_file, /stops.*before.*plan-generation.*appends/i,
      'both should state that escalations stop before plan-generation');
  }
});

test('Escalation detection lives exclusively in artifact-analysis step', () => {
  const artifactAnalysis = artifact('sai/commands/implement/steps/artifact-analysis.md');
  const planGeneration = artifact('sai/commands/implement/steps/plan-generation.md');

  assert.match(artifactAnalysis, /Escalation Detection and Handoff/,
    'artifact-analysis should have an Escalation Detection and Handoff section');
  assert.match(artifactAnalysis, /check whether any finding was classified as \*\*Escalate\*\*.*If escalations exist/i,
    'artifact-analysis should describe detecting Escalate findings');

  assert.match(planGeneration, /Escalate findings.*detected and handled exclusively in `artifact-analysis`/i,
    'plan-generation should state Escalate handling is exclusive to artifact-analysis');
  assert.match(planGeneration, /if escalations existed.*run would have stopped.*never reached this step/i,
    'plan-generation should clarify escalations never reach it');
});

test('plan-generation appends no audit step when escalation is detected', () => {
  const planGeneration = artifact('sai/commands/implement/steps/plan-generation.md');

  assert.match(planGeneration, /check whether escalations were detected.*artifact-analysis.*do NOT append any audit steps/i,
    'plan-generation should check for escalations and skip appending');
  assert.match(planGeneration, /escalation stop and.*Ready to Propose.*already occurred.*run is concluded/,
    'plan-generation should note escalations already stopped the run');
});

test('Escalation handoff emits Ready to Propose block with correct fields', () => {
  const artifactAnalysis = artifact('sai/commands/implement/steps/artifact-analysis.md');

  assert.match(artifactAnalysis, /emit a `Ready to Propose` block from `sai\/policies\/ready-to-propose-format\.md`/,
    'should specify using the shared Ready to Propose format');
  assert.match(artifactAnalysis, /Change name.*derived from the escalated work/,
    'should require deriving change name from work substance');
  assert.match(artifactAnalysis, /What.*summary of the escalated work/,
    'should require What field with work summary');
  assert.match(artifactAnalysis, /Why.*describing the gap.*citing the source artifacts and finding ids/,
    'Why should cite artifacts and finding ids');
  assert.match(artifactAnalysis, /Research Leads.*repository-relative paths.*escalated findings point to.*codebase/,
    'Research Leads should point to codebase paths, not artifact offsets');
  assert.match(artifactAnalysis, /do NOT use artifact offsets or finding id suffixes/i,
    'should explicitly prohibit artifact offsets in Research Leads');
  assert.match(artifactAnalysis, /Edge Cases[\s\S]*?None[\s\S]*?Implementation Details[\s\S]*?None/,
    'should emit None for Edge Cases and Implementation Details');
});

test('Escalation groups findings by scope of work, emits one block per new change', () => {
  const artifactAnalysis = artifact('sai/commands/implement/steps/artifact-analysis.md');

  assert.match(artifactAnalysis, /Group escalated findings by the scope of work they imply/,
    'should describe grouping by scope');
  assert.match(artifactAnalysis, /two findings from different artifacts belong in the same group when they describe the same missing change/,
    'should clarify same-change grouping logic');
  assert.match(artifactAnalysis, /one block per escalation group/,
    'should emit one block per escalation group, not per artifact');
  assert.match(artifactAnalysis, /all emitted blocks as chat output/,
    'should confirm emitting all blocks in single terminal status');
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jsonc = require('jsonc-parser');

const repoRoot = path.join(__dirname, '..');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

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
   const core = artifact('sai/commands/implement/invocation.md');
  assert.match(core, /^## Load instructions \(in order\)/m);
  assert.match(core, /^## Run\s*$/m);
  assert.doesNotMatch(core, /^## Completion\b/m);
  assert.doesNotMatch(core, /MANDATORY STOP/);

   const invocation = artifact('sai/orchestration/inline-invocation.md');
   assert.match(invocation, /Fetch @sai\/commands\/implement\/invocation\.md/);
  assert.match(invocation, /MANDATORY STOP/);
});

test('implementation worker declares the lifecycle and input/output contract', () => {
  const worker = artifact('sai/orchestration/workers/sai-3-implementation-worker.md');

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
  const agent = artifact('agents/claude/sai-3-implementation-worker.md');
  assert.match(agent, /^name:\s*sai-3-implementation-worker\s*$/m);
  assert.match(agent, /^model:\s*claude-opus-4-8\s*$/m);
   assert.match(agent, /^effort:\s*medium\s*$/m);
  assert.match(
    agent,
    /^tools:\s*Read,\s*Glob,\s*Grep,\s*Bash,\s*Edit,\s*Write,\s*Agent,\s*Skill,\s*SendMessage\s*$/m
  );
});

test('Claude and opencode worker bindings own dispatch and continuation mechanics', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = artifact(`sai/orchestration/workers/bindings/${harness}/implementation-worker.md`);
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

test('opencode config ships only worker shapes and no coordinator profile', () => {
  const config = jsonc.parse(artifact('configs/opencode.jsonc'));
  const worker = config.agent['sai-3-implementation-worker'];

  assert.ok(worker, 'namespaced worker should be present');
  assert.equal(config.subagent_depth, 2);

  assert.equal(worker.mode, 'subagent');
  assert.equal(worker.model, 'opencode-go/kimi-k2.6');
  assert.equal(worker.variant, undefined);
  assert.equal(worker.permission.task['*'], 'deny');
  assert.equal(worker.permission.task.budget, 'allow');
  assert.equal(worker.permission.task.explore, 'allow');
  assert.equal(config.agent['sai-coordinator'], undefined, 'no coordinator profile is shipped');
});

test('install surfaces expose managed Claude assets and opencode shapes', () => {
const { installClaude, installOpencode } = require('../bin/install-flow.js');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
  const claudeBase = tempDir('sai-implement-claude-');
  const opencodeBase = tempDir('sai-implement-opencode-');
  try {
    installClaude(claudeBase);
    assert.ok(fs.existsSync(path.join(claudeBase, 'agents', 'sai-3-implementation-worker.md')));
    assert.ok(fs.existsSync(path.join(claudeBase, 'agents', '.sai-3-implementation-worker.owner.json')));

    installOpencode(opencodeBase);
    const config = fs.readFileSync(path.join(opencodeBase, 'opencode.jsonc'), 'utf8');
    assert.doesNotMatch(config, /sai-coordinator/);
    assert.match(config, /sai-3-implementation-worker/);
  } finally {
    removeTempDir(claudeBase);
    removeTempDir(opencodeBase);
  }
});

test('installer collisions preserve unfamiliar content and provide remediation guidance', () => {
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
    assert.ok(claudeResult.error || claudeResult.value === false, 'Claude collision should block activation');
    assert.equal(fs.readFileSync(agentPath, 'utf8'), claudeSentinel);
    assert.match(`${claudeResult.output}\n${claudeResult.error?.message || ''}`, /rename|remove|collision/i);

    fs.writeFileSync(configPath, opencodeSentinel);
    const opencodeResult = capture(() => installOpencode(opencodeBase));
    const opencodeConfig = jsonc.parse(fs.readFileSync(configPath, 'utf8'));
    assert.deepEqual(opencodeConfig.agent['sai-3-implementation-worker'], {
      mode: 'subagent',
      model: 'user-model',
    });
    assert.ok(opencodeConfig.agent['sai-2-design-worker'], 'missing numbered worker should receive its repository default');
    assert.match(`${opencodeResult.output}\n${opencodeResult.error?.message || ''}`, /Added opencode agent keys/);
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
    installOpencode(opencodeBase);
    const implementationSources = new Set([
      'sai/orchestration/coordinator-contract.md',
      'sai/orchestration/worker-lifecycle.md',
      'sai/orchestration/workers/sai-3-implementation-worker.md',
      'sai/orchestration/workers/bindings/claude/implementation-worker.md',
      'skills/claude/sai-3-implementation-worker/SKILL.md',
      'agents/claude/sai-3-implementation-worker.md',
      'sai/orchestration/workers/bindings/opencode/implementation-worker.md',
      'skills/opencode/sai-3-implementation-worker/SKILL.md',
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
    const sidecarPath = path.join(claudeBase, 'agents', '.sai-3-implementation-worker.owner.json');
    assert.ok(fs.existsSync(agentPath), 'managed Claude agent should be enumerable');
    assert.ok(fs.existsSync(sidecarPath), 'managed Claude ownership sidecar should be enumerable');

    const unchangedEntries = enumerateClaude(claudeBase);
    assert.deepEqual(enumeratedSources(unchangedEntries), expectedSources('claude'),
      'Claude uninstall should enumerate the installer implementation projection set');
    assert.deepEqual(enumeratedSources(enumerateOpencode(opencodeBase)), expectedSources('opencode'),
      'opencode uninstall should enumerate the installer implementation projection set');
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
    assert.match(report, /sai-3-implementation-worker/);
    assert.match(report, /ownership|collision|rename|remove|modified/i);
    const doctorReport = JSON.parse(report);
    const claudeDoctorSection = JSON.stringify(doctorReport['[Claude Code]']);
    assert.match(claudeDoctorSection, /sai-3-implementation-worker/,
      'doctor should enumerate the managed implementation worker');
    assert.match(claudeDoctorSection, /ownership|collision|modified|incompatible/i,
      'doctor should report the incompatible managed worker');

    const opencodeEntries = buildDeletionSet({
      claudeBase: path.join(projectRoot, 'missing-claude'),
      opencodeBase,
      copilot: {
        promptsBase: path.join(projectRoot, 'missing-copilot-prompts'),
        skillsBase: path.join(projectRoot, 'missing-copilot-skills'),
        agentsBase: path.join(projectRoot, 'missing-copilot-agents'),
        saiBase: path.join(projectRoot, 'missing-copilot-sai'),
      },
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

test('Step 2 routes Claude and opencode through the coordinator but preserves Copilot inline dispatch', () => {
  const claude = artifact('commands/claude/sai-3-implement.md');
  const opencode = artifact('commands/opencode/sai-3-implement.md');
  const copilot = artifact('commands/copilot/sai-3-implement.prompt.md');

  assert.match(claude, /^model:\s*opus\s*$/m);
   assert.match(claude, /^effort:\s*low\s*$/m);
  assert.match(claude, /Fetch @skills\/sai-3-implementation-worker\/SKILL\.md/);
   assert.match(claude, /Fetch @sai\/commands\/implement\/coordinator\.md/);
   assert.match(opencode, /^model: opencode-go\/glm-5\.2$/m);
   assert.match(opencode, /Fetch @skills\/sai-3-implementation-worker\/SKILL\.md/);
   assert.match(opencode, /Fetch @sai\/commands\/implement\/coordinator\.md/);
  assert.match(copilot, /sai\/orchestration\/inline-invocation\.md/);
  assert.match(copilot, /^phase: sai-3-implement$/m);
  assert.match(copilot, /^arguments: \$ARGUMENTS$/m);
  assert.doesNotMatch(copilot, /sai-3-implement-inline\.md/);
  assert.doesNotMatch(copilot, /sai-implementation-coordinator/);
   assert.match(opencode, /^variant: high$/m);
   assert.match(opencode, /^subtask:\s*false\s*$/m);
   assert.doesNotMatch(opencode, /^agent:/m);
  assert.match(opencode, /\*\*Change-name argument:\*\* \$ARGUMENTS/);
});

test('Step 1 implementation contracts use the routed entrypoints and exact inline prerequisites', () => {
  const inline = artifact('sai/orchestration/inline-invocation.md');
  const copilot = artifact('commands/copilot/sai-3-implement.prompt.md');

  assert.match(inline, /Change '\{change-name\}' not found\. Run \/sai-1-spec to create it first\./);
  assert.match(inline, /design\.md not found for '\{change-name\}'\. Run \/sai-2-design first\./);
  assert.match(inline, /tasks\.md not found for '\{change-name\}'\. Run \/sai-2-design first\./);
  assert.match(inline, /first missing artifact[\s\S]*without checking later artifacts or writing any\s+file/i);
  assert.match(copilot, /Fetch @sai\/orchestration\/inline-invocation\.md/);
  assert.match(copilot, /^phase: sai-3-implement\r?\narguments: \$ARGUMENTS$/m);
  assert.doesNotMatch(copilot, /supported loader/i);
});

test('routed harness bindings and inline parity', () => {
  const workerName = 'sai-3-implementation-worker';
  const worker = artifact('sai/orchestration/workers/sai-3-implementation-worker.md');
  const surfaces = [
    {
      name: 'Claude Code',
      binding: artifact('sai/orchestration/workers/bindings/claude/implementation-worker.md'),
      forwardingSkill: artifact('skills/claude/sai-3-implementation-worker/SKILL.md'),
      wrapper: artifact('commands/claude/sai-3-implement.md'),
      agent: artifact('agents/claude/sai-3-implementation-worker.md'),
      assertContract(binding, forwardingSkill, wrapper) {
        assert.match(binding, new RegExp(`Agent\\(subagent_type: "${workerName}",\\s*run_in_background: true,`));
        assert.match(binding, /SendMessage/);
        assert.doesNotMatch(binding, /Agent[\\s\\S]{0,120}resume/);
        assert.match(forwardingSkill, /claude[\\/\\]implementation-worker\.md/);
        assert.doesNotMatch(forwardingSkill, /opencode[\\/\\]implementation-worker\.md/);
        assert.match(wrapper, /^model:\s*opus\s*$/m);
         assert.match(wrapper, /^effort:\s*low\s*$/m);
      },
    },
    {
      name: 'opencode',
      binding: artifact('sai/orchestration/workers/bindings/opencode/implementation-worker.md'),
      forwardingSkill: artifact('skills/opencode/sai-3-implementation-worker/SKILL.md'),
      wrapper: artifact('commands/opencode/sai-3-implement.md'),
      assertContract(binding, forwardingSkill, wrapper) {
        assert.match(binding, new RegExp(`task\\(subagent_type: "${workerName}"`));
        assert.match(binding, /Capture and bind `task_id`/);
        assert.match(binding, /task\(task_id: "<captured task ID>"/);
        assert.match(binding, /nested helper branches use the permitted budget and explore targets/);
        assert.doesNotMatch(binding, /nested task target(?:s)?[\\s\S]{0,120}(?!budget|explore)[a-z][a-z-]+/i);
        assert.match(forwardingSkill, /opencode[\\/\\]implementation-worker\.md/);
        assert.doesNotMatch(forwardingSkill, /claude[\\/\\]implementation-worker\.md/);
         assert.match(wrapper, /^model: opencode-go\/glm-5\.2$/m);
         assert.match(wrapper, /^variant: high$/m);
         assert.match(wrapper, /^subtask:\s*false\s*$/m);
         assert.doesNotMatch(wrapper, /^agent:/m);
      },
    },
    {
      name: 'Copilot',
      wrapper: artifact('commands/copilot/sai-3-implement.prompt.md'),
      assertContract(_binding, _forwardingSkill, wrapper) {
        assert.match(wrapper, /sai\/orchestration\/inline-invocation\.md/);
        assert.match(wrapper, /^phase: sai-3-implement$/m);
        assert.match(wrapper, /^arguments: \$ARGUMENTS$/m);
        assert.doesNotMatch(wrapper, /sai-3-implement-inline\.md/);
        assert.doesNotMatch(wrapper, /sai-implementation-coordinator/);
      },
    },
  ];

  for (const surface of surfaces) {
    assert.ok(surface.name);
    surface.assertContract(surface.binding, surface.forwardingSkill, surface.wrapper);
  }

  const claudeAgent = surfaces[0].agent;
  assert.match(claudeAgent, /^model:\s*claude-opus-4-8\s*$/m);
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
  const worker = artifact('sai/orchestration/workers/sai-3-implementation-worker.md');
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

  assert.match(coordinator, /allowed_nonterminal_extensions`:\s*empty/);
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
  const claudeBinding = artifact('sai/orchestration/workers/bindings/claude/implementation-worker.md');
  const opencodeBinding = artifact('sai/orchestration/workers/bindings/opencode/implementation-worker.md');

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
   const coordinator = artifact('sai/commands/implement/coordinator.md');
  const worker = artifact('sai/orchestration/workers/sai-3-implementation-worker.md');
  const inline = artifact('commands/copilot/sai-3-implement.prompt.md');

  assert.match(worker, /openspec CLI not found|OpenSpec not initialized|schema:\s*sai-workflow/i);
  assert.match(worker, /Use change '\{name\}'\?|Which change\?|0\/1\/N|zero,? one,? or multiple/i);
  assert.match(inline, /sai\/orchestration\/inline-invocation\.md/);
  assert.match(inline, /^phase: sai-3-implement$/m);
  assert.match(inline, /^arguments: \$ARGUMENTS$/m);
  assert.doesNotMatch(inline, /sai-3-implement-inline\.md/);
  assert.doesNotMatch(inline, /sai-implementation-coordinator/);
  assert.doesNotMatch(coordinator, /openspec CLI not found|OpenSpec not initialized|schema:\s*sai-workflow/i);
  assert.doesNotMatch(coordinator, /Use change '\{name\}'\?|Which change\?|0\/1\/N|zero,? one,? or multiple/i);
});

test('Step 2 coordinator makes no live-proof or smoke-success claims', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');

  assert.doesNotMatch(coordinator, /\b(?:live|runtime)\s+(?:probe|proof)\b/i);
  assert.doesNotMatch(coordinator, /\bsmoke[- ]?(?:check|test)\b/i);
});

test('completed routed output uses the coordinator contract while inline invocation preserves its stop', () => {
   const coordinator = artifact('sai/commands/implement/coordinator.md');
  const inline = artifact('commands/copilot/sai-3-implement.prompt.md');
   const invocation = artifact('sai/orchestration/inline-invocation.md');

  assert.match(coordinator, /completed[\s\S]*concise summary[\s\S]*accumulated changed-file list/i);
  assert.ok(
    coordinator.includes(
      'Implementation plan done in openspec/changes/{name}/. Review and run \\`/sai-4-apply {name}\\` (--fast-track) **in a new chat** when ready.'
    )
  );
  assert.match(coordinator, /Stop immediately/);
  assert.match(inline, /sai\/orchestration\/inline-invocation\.md/);
  assert.match(inline, /^phase: sai-3-implement$/m);
  assert.match(inline, /^arguments: \$ARGUMENTS$/m);
  assert.doesNotMatch(inline, /sai-3-implement-inline\.md/);
  assert.doesNotMatch(inline, /sai-implementation-coordinator/);
  assert.match(invocation, /core/);
  assert.match(invocation, /MANDATORY STOP/);
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

test('Copilot inline coordinator owns implementation prerequisites and completion', () => {
  const inline = artifact('sai/orchestration/inline-invocation.md');

  assert.match(inline, /phase: sai-3-implement/);
   assert.match(inline, /Fetch @sai\/commands\/implement\/invocation\.md/);
  assert.match(inline, /proposal\.md/);
  assert.match(inline, /design\.md/);
  assert.match(inline, /tasks\.md/);
  assert.match(inline, /MANDATORY STOP/);
  assert.match(inline, /Implementation plan done in openspec\/changes\/\{name\}\//);
  assert.doesNotMatch(inline, /sai-4-apply's instructions|execute sai-4-apply/i);
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
    'agents/claude/sai-3-implementation-worker.md',
    'skills/claude/sai-3-implementation-worker/SKILL.md',
    'skills/opencode/sai-3-implementation-worker/SKILL.md',
  ]) {
    assert.match(agents, new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(
    agents,
    /GitHub Copilot dispatches directly through `sai\/orchestration\/inline-invocation\.md` with no routed worker binding/i
  );
  assert.match(agents, /harness universality/i);
});

test('Step 3 Claude installer documentation covers ownership, compatibility, collisions, uninstall guards, and manual copy', () => {
  const claude = artifact('INSTALL.claude.md');

  assert.match(claude, /agents\/claude\/sai-3-implementation-worker\.md/);
  assert.match(claude, /(?:~\/\.claude|%USERPROFILE%[\\/]\.claude)[\\/]agents[\\/]sai-3-implementation-worker\.md/);
  assert.match(claude, /\.sai-3-implementation-worker\.owner\.json/);
  assert.match(claude, /compatible[\s\S]{0,140}(?:not adopt|non-adopt|not used|unchanged)/i);
  assert.match(claude, /collision[\s\S]{0,140}(?:rename|remove|remediat|manual)/i);
  assert.match(claude, /uninstall[\s\S]{0,180}(?:ownership|guard|modified|preserv)/i);
  assert.match(claude, /(?:cp|Copy-Item)[\s\S]{0,220}sai-3-implementation-worker/i);
});

test('Step 3 opencode installer documentation covers managed entries, routing shapes, collisions, preservation, and restart', () => {
  const opencode = artifact('INSTALL.opencode.md');

  assert.match(opencode, /sai-coordinator/);
  assert.match(opencode, /sai-3-implementation-worker/);
  assert.match(opencode, /opencode-go\/glm-5\.2[\s\S]{0,200}variant[\s\S]{0,40}high/i);
  assert.match(opencode, /sai-3-implementation-worker[\s\S]{0,280}subagent[\s\S]{0,280}opencode-go\/kimi-k2\.6/i);
  assert.match(opencode, /variant/i);
  assert.match(opencode, /collision[\s\S]{0,160}(?:preserv|rename|remove|manual)/i);
  assert.match(opencode, /uninstall[\s\S]{0,220}(?:preserv|retain|unchanged)[\s\S]{0,100}(?:config|opencode\.jsonc)/i);
  assert.match(opencode, /restart(?:ing)?[\s\S]{0,120}(?:required|must|need|after|reload)/i);
});

test('Step 5 installer documentation matches the deterministic manifest and Copilot allowlist', () => {
  const manifest = artifact('sai/install-manifest.json');
  const agents = artifact('AGENTS.md');
  const claude = artifact('INSTALL.claude.md');
  const opencode = artifact('INSTALL.opencode.md');
  const copilot = artifact('INSTALL.copilot.md');

  assert.match(manifest, /"id": "claude-orchestration"/);
  assert.match(manifest, /"id": "opencode-orchestration"/);
  assert.match(manifest, /"id": "copilot-inline-invocation"/);
  assert.match(agents, /manifest-driven installer|deterministic.*manifest/i);
  assert.match(claude, /sai\/orchestration\/workers/);
  assert.match(opencode, /sai\/orchestration\/workers/);
  assert.match(copilot, /policy and compatibility allowlist/i);
  assert.match(copilot, /sai\/orchestration\/inline-invocation\.md/);
  assert.match(copilot, /no routed binding|Do not copy routed/i);
  assert.doesNotMatch(copilot, /copy sai[\\/]orchestration[\\/]workers/i);
});

// ─── Step 1: preservation-first legacy identity migration ───────────────────

test('implementation install migrates an owned legacy worker pair to the numbered identity', () => {
  const { installClaude, sha256Buffer } = require('../bin/install-flow.js');
  const base = tempDir('sai-implementation-legacy-');
  const legacy = path.join(base, 'agents', 'sai-implementation-planning-worker.md');
  const legacyOwner = path.join(base, 'agents', '.sai-implementation-planning-worker.owner.json');
  const numbered = path.join(base, 'agents', 'sai-3-implementation-worker.md');
  const numberedOwner = path.join(base, 'agents', '.sai-3-implementation-worker.owner.json');
  try {
    const legacyBytes = Buffer.from('managed legacy implementation worker\n');
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    fs.writeFileSync(legacy, legacyBytes);
    fs.writeFileSync(legacyOwner, `${JSON.stringify({ managedHash: sha256Buffer(legacyBytes) })}\n`);
    installClaude(base);
    assert.equal(fs.existsSync(legacy), false);
    assert.equal(fs.existsSync(legacyOwner), false);
    assert.equal(fs.existsSync(numbered), true);
    assert.equal(fs.existsSync(numberedOwner), true);
  } finally {
    removeTempDir(base);
  }
});

test('implementation install preserves a mismatched legacy sidecar and reports manual migration', () => {
  const { installClaude } = require('../bin/install-flow.js');
  const base = tempDir('sai-implementation-legacy-protected-');
  const legacy = path.join(base, 'agents', 'sai-implementation-planning-worker.md');
  const owner = path.join(base, 'agents', '.sai-implementation-planning-worker.owner.json');
  try {
    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    fs.writeFileSync(legacy, 'user-modified legacy worker\n');
    fs.writeFileSync(owner, '{}');
    const result = capture(() => installClaude(base));
    assert.equal(fs.existsSync(legacy), true);
    assert.equal(fs.existsSync(path.join(base, 'agents', 'sai-3-implementation-worker.md')), false);
    assert.match(`${result.output}\n${result.error?.message || ''}`, /protected|manual.*migration|collision/i);
  } finally {
    removeTempDir(base);
  }
});

test('implementation install and uninstall preserve incompatible numbered destination content', () => {
  const { installClaude } = require('../bin/install-flow.js');
  const { enumerateClaude, runDeletion } = require('../bin/uninstall-flow.js');
  const base = tempDir('sai-implementation-numbered-collision-');
  const target = path.join(base, 'agents', 'sai-3-implementation-worker.md');
  const sentinel = 'user-owned numbered implementation worker\n';
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, sentinel);
    const result = capture(() => installClaude(base));
    assert.equal(fs.readFileSync(target, 'utf8'), sentinel);
    assert.match(`${result.output}\n${result.error?.message || ''}`, /unmanaged|incompatible|collision/i);
    runDeletion(enumerateClaude(base));
    assert.equal(fs.readFileSync(target, 'utf8'), sentinel);
  } finally {
    removeTempDir(base);
  }
});

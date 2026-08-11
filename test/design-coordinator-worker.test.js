'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { auditActiveReferences } = require('../bin/orchestration-source-audit.js');

const repoRoot = path.join(__dirname, '..');
const FEEDBACK_QUESTION = 'Share your feedback on {artifacts} below. You can also type feedback directly in the free-text box.';
const FEEDBACK_DESCRIPTION = 'Feedback on {artifacts}; you can also type feedback directly in the free-text box.';

function countLiteral(source, value) {
  return source.split(value).length - 1;
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

function writeFixture(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
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

test('Step 2 uses one canonical coordinator, lifecycle, worker, and binding layout', () => {
  const coordinator = artifact('sai/orchestration/coordinator-contract.md');
  const lifecycle = artifact('sai/orchestration/worker-lifecycle.md');
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');
  assert.match(coordinator, /completed|needs_input|failed|cancelled/);
  assert.match(coordinator, /changed_files.*union|union.*changed_files/i);
  assert.match(lifecycle, /resolved_change_name/);
  assert.match(lifecycle, /binding-owned/);
  assert.match(worker, /Fetch @sai\/orchestration\/worker-lifecycle\.md/);
  for (const harness of ['claude', 'opencode']) {
    assert.match(artifact(`sai/orchestration/workers/bindings/${harness}/design-worker.md`), /worker/i);
  }
});

// ─── specs/deduplicate-sai-2-design/spec.md ────────────────────────────────

test('design wrappers activate routed Claude/opencode entry and preserve phase boundary', () => {
  const claude = artifact('commands/claude/sai-2-design.md');
  const opencode = artifact('commands/opencode/sai-2-design.md');

   assert.match(claude, /^model: claude-opus-4-8$/m);
  assert.match(claude, /^effort: low$/m);
   assert.match(claude, /^allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, Bash\(date:\*\)$/m);
   assert.doesNotMatch(claude, /sai-2-design-worker/);
  assert.doesNotMatch(claude, /sai-3-implementation-worker/);
    assert.match(claude, /sai\/commands\/design\/coordinator\.md/);
    assert.match(claude, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/);
   assert.doesNotMatch(claude, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);

    assert.match(opencode, /^model: opencode-go\/deepseek-v4-flash$/m);
   assert.match(opencode, /^variant: max$/m);
   assert.match(opencode, /^subtask: false$/m);
   assert.doesNotMatch(opencode, /^agent:/m);
   assert.doesNotMatch(opencode, /sai-2-design-worker/);
  assert.doesNotMatch(opencode, /sai-3-implementation-worker/);
    assert.match(opencode, /sai\/commands\/design\/coordinator\.md/);
    assert.match(opencode, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/);
   assert.doesNotMatch(opencode, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);
  assert.ok(opencode.includes('**Change-name argument and and optional flags:** $ARGUMENTS'));

  for (const relativePath of [
    'sai/commands/design/coordinator.md',
    'sai/commands/implement/coordinator.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), true, `${relativePath} should be available`);
  }

  const spec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.match(spec, /Claude Code and opencode SHALL invoke the routed design coordinator/i);
  assert.match(spec, /no supported entrypoint SHALL require a legacy loader/i);
  assert.doesNotMatch(artifact('sai/instructions/design.md'), /sai\/orchestration\/inline-invocation\.md/);
});

test('shared feedback gate defines routed design ownership without changing canonical gate rules', () => {
  const gate = artifact('sai/policies/artifact-feedback-gate.md');
  assert.match(gate, /Routed design ownership adapter/);
  assert.match(gate, /coordinator owns picker presentation.*iteration counter.*pending raw feedback/i);
  assert.match(gate, /worker owns per-item judgment.*design-artifact edits.*verification.*discard reasons.*summary/i);
  assert.match(gate, /single-sourced in their existing sections/i);
  assert.doesNotMatch(gate, /sai\/orchestration\/inline-invocation\.md|Copilot|inline consumer/i);
});

test('sai-2 feedback routes one coordinator prompt to the same worker and preserves terminal proceed', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  const feedbackFetch = coordinator.indexOf('Fetch @sai/policies/artifact-feedback-gate.md');
  const completionGate = coordinator.search(/completion gate/i);
  assert.ok(feedbackFetch !== -1, 'coordinator should fetch the canonical feedback gate');
  assert.ok(completionGate !== -1, 'coordinator should apply the completion gate');
  assert.ok(feedbackFetch < completionGate, 'feedback gate policy must be loaded before the completion gate');

  assert.match(coordinator, /feedback selection/i);
  assert.match(coordinator, /one prompt|single prompt|exactly one prompt/i);
  assert.match(coordinator, /design\.md[\s\S]{0,120}tasks\.md[\s\S]{0,120}interfaces\.md/i);
  assert.match(coordinator, /await.*text|wait.*text|raw feedback/i);
  assert.match(coordinator, /forward.*feedback|feedback.*same worker|same worker.*feedback/i);
  assert.match(worker, /MUST NOT emit, re-present, or duplicate the feedback-text prompt/);
  assert.match(worker, /forwarded feedback|apply.*feedback|feedback.*apply/i);

  assert.match(coordinator, /Continue/i);
  assert.match(coordinator, /Design done in openspec\/changes\/\{name\}\/\. Run \\?`\/sai-3-implement \{name\}\\?` \*\*in a new chat\*\* when ready\./i);
  assert.doesNotMatch(coordinator, /Continue[\s\S]{0,240}dispatch.*implementation worker/i);
  assert.doesNotMatch(coordinator, /sai\/orchestration\/inline-invocation\.md/);
});

test('shared feedback gate delegates picker mapping without a single-harness example', () => {
  const gate = artifact('sai/policies/artifact-feedback-gate.md');
  const remember = artifact('sai/policies/remember.md');
  const presentation = gate.slice(
    gate.indexOf('## Present the gate'),
    gate.indexOf('## On selecting the feedback option'),
  );

  assert.match(presentation, /native option-picker per the "Closed-choice prompts" rule in `sai\/policies\/remember\.md/);
  assert.doesNotMatch(presentation, /AskUserQuestion|Claude Code|opencode|GitHub Copilot/);
  assert.ok(presentation.indexOf('Give feedback (Recommended)') < presentation.indexOf('2. **`proceed-label`**'));
  assert.match(gate, /Apply feedback \*\*selectively per item\*\*/);
  assert.match(gate, /Stop the loop and perform `next-action` exactly once/);
  assert.match(remember, /Claude Code.*AskUserQuestion[\s\S]*opencode.*question/i);
  assert.doesNotMatch(remember, /Copilot|vscode\/askQuestions/);
});

test('standalone policies have one canonical home and active fetches use it', () => {
  const policies = [
    'artifact-feedback-gate.md',
    'change-picker.md',
    'commit-rules.md',
    'prereqs.md',
    'status-picker.md',
  ];
  for (const file of policies) {
    assert.ok(fs.existsSync(path.join(repoRoot, 'sai', 'policies', file)));
    assert.equal(fs.existsSync(path.join(repoRoot, 'sai', 'instructions', file)), false);
  }

  const activeSources = [
    ...fs.readdirSync(path.join(repoRoot, 'sai', 'commands'), { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => artifact(`sai/commands/${entry.name}`)),
    artifact('sai/instructions/apply.md'),
    artifact('sai/instructions/commit.md'),
    artifact('sai/commands/spec/coordinator.md'),
    artifact('sai/commands/design/coordinator.md'),
    artifact('sai/orchestration/workers/sai-2-design-worker.md'),
  ].join('\n');
  assert.doesNotMatch(activeSources, /@sai\/instructions\/(?:artifact-feedback-gate|change-picker|commit-rules|prereqs|status-picker)\.md/);
  for (const file of policies) {
    assert.match(activeSources, new RegExp(`@sai/policies/${file.replace('.', '\\.')}`));
  }
});

test('routed design coordinator has no technical I/O and owns only lifecycle routing', () => {
   const coordinator = artifact('sai/commands/design/coordinator.md');
  assert.match(coordinator, /Do not run prerequisites, parse arguments.*read git, code, configuration, documentation, change artifacts, or design artifacts/i);
  assert.match(coordinator, /do not write any file.*technical design decisions/i);
  assert.match(coordinator, /continue_after_notice/);
});

// ─── specs/design-planning-worker/spec.md ──────────────────────────────────

test('design planning worker spec covers fast-track, prerequisites, and change resolution', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /prerequisite/i);
  assert.match(spec, /fast-track/i);
  assert.match(spec, /change[- ]resolution/i);
});

test('prerequisites run before fast-track parsing in the design worker spec', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  const prereqSection = spec.indexOf('prerequisite');
  const fastTrackSection = spec.indexOf('fast-track');
  assert.ok(prereqSection !== -1, 'prerequisite section should exist');
  assert.ok(fastTrackSection !== -1, 'fast-track section should exist');
  assert.ok(
    prereqSection < fastTrackSection,
    'prerequisites should appear before fast-track in the spec'
  );
});

test('fast-track preflight returns exactly one FAST-TRACK MODE ACTIVE notice', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /> FAST-TRACK MODE ACTIVE/);
});

test('reconstructed worker with fast_track_banner_emitted true does not repeat the banner', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /fast_track_banner_emitted/);
  assert.match(spec, /fast_track_banner_emitted[\s\S]{0,200}NOT.*(?:again|repeat|re-?emit)/i,
    'spec should say reconstructed worker does NOT repeat the banner');
});

test('missing CLI, openspec, and schema prerequisites return pinned failure texts and emit no notice', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /openspec CLI|openspec --version/i);
  assert.match(spec, /openspec\/.*not initialized|openspec init/i);
  assert.match(spec, /schema.*sai-workflow/i);

  assert.doesNotMatch(spec,
    /(?:missing openspec|wrong schema)[\s\S]{0,200}> FAST-TRACK/is,
    'prerequisite failures should not emit a fast-track notice');
});

test('provided name bypasses openspec list --json in the spec', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /bypass/i);
  assert.match(spec, /openspec list.*json/i);
});

test('zero changes returns pinned failure in the spec', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /zero|no active changes/i);
  assert.match(spec, /No active changes found/);
});

test('one change requests yes/no then continues or cancels cleanly', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /Use change/i);
  assert.match(spec, /yes.*no|no.*yes/i);
  assert.match(spec, /continues?|resolves/i);
  assert.match(spec, /cancel/i);
});

test('multiple changes preserve CLI order and re-request options without retry cap', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /Which change\?/);
  assert.match(spec, /preserv.*order|CLI order/i);
  assert.match(spec, /retry cap|no.*cap|without resett/i);
  assert.match(spec, /invalid answer|invalid input/i);
});

test('every payload after change resolution has resolved_change_name; pre-resolution payloads omit it', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /resolved_change_name/);
  assert.match(spec, /pre-resolution.*omit|absent.*pre|not.*contain.*resolved/i);
  assert.match(spec, /present.*post-resolution|resolved_change_name.*present/i);
});

test('completion follows disk verification of design.md tasks.md and interfaces.md', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /design\.md/);
  assert.match(spec, /tasks\.md/);
  assert.match(spec, /interfaces\.md/);
  assert.match(spec, /verif/);
  assert.match(spec, /complet/);
});

test('design planning worker spec defines the DesignWorkerPayload interface', () => {
  const spec = artifact('openspec/specs/design-planning-worker/spec.md');

  assert.match(spec, /DesignWorkerPayload/);
  for (const status of ['completed', 'needs_input', 'failed', 'cancelled']) {
    assert.match(spec, new RegExp(`\\b${status}\\b`));
  }
  assert.match(spec, /resolved_change_name/);
  assert.match(spec, /changed_files/);
  assert.match(spec, /summary/);
});

// ─── specs/worker-lifecycle-protocol/spec.md ───────────────────────────────

test('implementation workers retain exactly four terminal statuses and never receive design notice', () => {
  const spec = artifact('openspec/specs/worker-lifecycle-protocol/spec.md');

  for (const status of ['completed', 'needs_input', 'failed', 'cancelled']) {
    assert.match(spec, new RegExp(`\\b${status}\\b`));
  }
  assert.match(spec, /implementation[\s\S]{0,100}(?:SHALL NOT|MUST NOT).*(?:notice|reconstruct)/i,
    'the spec should say implementation workers do NOT receive design notices or reconstruction extensions');
});

test('binding metadata captures agent/task IDs separately from worker payloads', () => {
  const spec = artifact('openspec/specs/worker-lifecycle-protocol/spec.md');

  assert.match(spec, /agent.*ID|task.*ID|binding.*metadata/i);
  assert.match(spec, /separat/i);
  assert.doesNotMatch(
    spec,
    /(?:DesignWorkerPayload|worker-authored\s+payload)[\s\S]{0,240}\b(?:agent(?:[_ -]?id)?|task(?:[_ -]?id)?|continuation[_ -]?reference)\b\s*[:=,]/i
  );
});

test('continuation attempted first before dispatching replacement worker', () => {
  const spec = artifact('openspec/specs/worker-lifecycle-protocol/spec.md');

  assert.match(spec, /continuation.*first|attempt.*continuation|before.*replac/i);
  assert.match(spec, /fresh worker|replacement|fallback/i);
});

test('changed files remain an ordered union across continuation and replacement-worker results', () => {
  const spec = artifact('openspec/specs/worker-lifecycle-protocol/spec.md');

  assert.match(spec, /ordered.*union|union.*ordered/i);
  assert.match(spec, /continuation/i);
  assert.match(spec, /replacement|fresh worker/i);
});

test('incomplete opaque reconstruction metadata returns restart failure, not a replacement worker', () => {
  const spec = artifact('openspec/specs/worker-lifecycle-protocol/spec.md');

  assert.match(spec, /incomplete|missing.*field/i);
  assert.match(spec, /restart.*fail|return.*fail/i);
  assert.match(spec, /incomplete[\s\S]{0,200}(?:SHALL NOT dispatch|NOT.*dispatch)/i);
});

test('design worker spec does NOT add noticed status — implementation workers never see design extensions', () => {
  const spec = artifact('openspec/specs/worker-lifecycle-protocol/spec.md');

  assert.doesNotMatch(spec, /noticed\b/,
    'implementation workers protocol should not define a noticed status');
});

// ─── specs/design-harness-bindings/spec.md ─────────────────────────────────

test('Claude and opencode acknowledge notices through continuation reference with continue_after_notice', () => {
  const spec = artifact('openspec/specs/design-harness-bindings/spec.md');

  assert.match(spec, /continue_after_notice/);
  assert.match(spec, /Claude/);
  assert.match(spec, /opencode/);
  assert.match(spec, /SendMessage.*continue_after_notice|task.*continue_after_notice/i);
});

test('notice acknowledgement absent from opaque history, pending feedback, and user-answer handling', () => {
  const spec = artifact('openspec/specs/design-harness-bindings/spec.md');

  assert.match(spec, /opaque.*histor|pending.*feedback|user-answer/i);
  assert.match(spec, /absent|excluded|not.*stor|not.*record/i);
});

test('Claude installation reuses compatible agents, blocks incompatible collisions, preserves edited managed', () => {
  const spec = artifact('openspec/specs/design-harness-bindings/spec.md');

  assert.match(spec, /compatible.*agent|reuse.*without.*ownership/i);
  assert.match(spec, /incompatible.*blocked?|collision/i);
  assert.match(spec, /edit.*managed.*preserv|preserv.*edit/i);
});

test('opencode config restricts coordinator to questions and the two named planning workers', () => {
  const spec = artifact('openspec/specs/design-harness-bindings/spec.md');

  assert.match(spec, /question.*allow|allow.*question/i);
  assert.match(spec, /implementation.*worker/i);
  assert.match(spec, /design.*worker/i);
   assert.match(spec, /permission\.task.*denying all targets/i);
});

test('design worker denies all task targets before allowing only explore', () => {
  const spec = artifact('openspec/specs/design-harness-bindings/spec.md');

  assert.match(spec, /explore.*allow|allow.*explore/i);
   assert.match(spec, /permission\.task.*denying all targets/i);
});

// ─── specs/design-subagent-delegation/spec.md ──────────────────────────────

test('coordinator has no file, search, shell, git, web, or OpenSpec access', () => {
  const spec = artifact('openspec/specs/design-subagent-delegation/spec.md');

  assert.match(spec, /coordinator.*no.*access|SHALL NOT.*file|SHALL NOT.*search|SHALL NOT.*shell/i);
  assert.match(spec, /SHALL NOT.*OpenSpec|no.*OpenSpec/i);
});

test('worker delegates source discovery only to budget-explorer or explore binding', () => {
  const spec = artifact('openspec/specs/design-subagent-delegation/spec.md');

  assert.match(spec, /delegat.*explore|explore.*delegat/i);
  assert.match(spec, /SHALL NOT.*delegat.*(?:shell|git|direct)/i,
    'worker should NOT delegate to shell, git, or direct file reads');
});

// ─── specs/design-coordinator/spec.md ──────────────────────────────────────

test('design coordinator spec defines DesignInvocationEnvelope', () => {
  const spec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.match(spec, /DesignInvocationEnvelope/);
  assert.match(spec, /wrapper_echo_value/);
  assert.match(spec, /arguments_value/);
});

test('Continue now clears design lifecycle state and dispatches implementation binding', () => {
  const spec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.match(spec, /Continue[- ]?[Nn]ow|continue-now|continue now/);
  assert.match(spec, /clear.*state|lifecycle.*state|state.*clear/i);
  assert.match(spec, /implementation.*binding|dispatch.*implementation/i);
});

test('Continue now envelope carries empty wrapper_echo_value and resolved arguments_value', () => {
  const spec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.match(spec, /ContinueNowEnvelope/);
  assert.match(spec, /wrapper_echo_value.*""|wrapper_echo_value.*empty/i);
  assert.match(spec, /arguments_value.*resolved/i);
});

// ─── DesignWorkerPayload and Notice interfaces exist as stubs ──────────────

test('the three design coordinator-worker interfaces are defined in the specs', () => {
  const planning = artifact('openspec/specs/design-planning-worker/spec.md');
  const coordinator = artifact('openspec/specs/design-coordinator/spec.md');
  const bindings = artifact('openspec/specs/design-harness-bindings/spec.md');

  assert.match(planning, /DesignWorkerPayload/);
  assert.match(planning, /DesignNotice/);
  assert.match(planning, /DesignReconstructionMetadata/);
  assert.match(planning, /OpaqueInputEntry/);
  assert.match(coordinator, /DesignInvocationEnvelope/);
  assert.match(coordinator, /ContinueNowEnvelope/);
  assert.match(bindings, /NoticeAcknowledgement/);
});

test('NoticeAcknowledgement is defined as exactly continue_after_notice', () => {
  const spec = artifact('openspec/specs/design-harness-bindings/spec.md');

  const ackMatch = spec.match(/NoticeAcknowledgement\s*=\s*"([^"]+)"/);
  assert.ok(ackMatch, 'NoticeAcknowledgement should be assigned a string literal');
  assert.equal(ackMatch[1], 'continue_after_notice',
    'NoticeAcknowledgement should equal continue_after_notice');
});

test('design coordinator spec defines no file/search/shell/git/web/OpenSpec access for coordinator', () => {
  const coordinatorSpec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.match(coordinatorSpec, /SHALL NOT.*file|SHALL NOT.*search|SHALL NOT.*shell/i);
});

test('design coordinator spec says worker delegates only to explore', () => {
  const subagentSpec = artifact('openspec/specs/design-subagent-delegation/spec.md');

  assert.match(subagentSpec, /explore|budget-explorer/i);
  assert.doesNotMatch(subagentSpec, /any available binding/i,
    'coordinator spec should not say worker delegates to any binding');
});

test('documentation records the active design compatibility boundary and managed paths', () => {
  const readme = artifact('README.md');
  const agents = artifact('AGENTS.md');
  const claude = artifact('INSTALL.claude.md');
  const opencode = artifact('INSTALL.opencode.md');

  for (const text of [readme, agents, claude, opencode]) {
    assert.match(text, /sai-2-design/);
    assert.match(text, /openspec\/changes\/\{change-name\}\/design\.md|design\.md/);
    assert.match(text, /tasks\.md/);
    assert.match(text, /interfaces\.md/);
  }

  assert.match(readme, /sai-2-design-worker/);
  assert.match(agents, /sai-2-design-worker/);

  assert.match(readme, /Claude Code.*low-effort.*coordinator.*high-effort.*design worker/i);
  assert.match(readme, /opencode.*GLM 5\.2.*variant: high/i);
  assert.match(readme, /continue_after_notice/);
  assert.match(readme, /new chat[\s\S]{0,80}\/sai-3-implement|\/sai-3-implement[\s\S]{0,80}new chat/i);
  assert.match(readme, /Proposal Complexity.*descriptive/i);
  assert.match(readme, /wrapper[\s\S]{0,60}(?:model|variant)|command[\s\S]{0,60}(?:model|variant)/i);

  assert.match(agents, /sai\/commands\/design\/invocation\.md/);
  assert.match(agents, /sai-2-design-worker\.md/);
  assert.match(agents, /agents\/claude\/sai-2-design-worker\.md/);
   assert.match(agents, /sai\/orchestration\/workers\/bindings\//);
  assert.match(agents, /ends? at design completion|separate[\s\S]{0,40}\/sai-3-implement/i);

  assert.doesNotMatch(claude, /\.sai-2-design-worker\.owner\.json/,
    'INSTALL.claude.md must not reference an owner sidecar');
  assert.match(claude, /low[- ]effort/);
  assert.match(claude, /high[- ]effort/);
  assert.match(claude, /tunable-seed/i);
  assert.match(claude, /preserv(?:e|ing)[\s\S]{0,80}(?:model|effort)/i,
    'INSTALL.claude.md should describe preserving tuned model/effort values');
  assert.match(claude, /restart.*re-?install|re-?install.*restart/i);

    assert.match(opencode, /sai-2-design-worker/);
    assert.match(opencode, /sai-3-implementation-worker/);
   assert.match(opencode, /existing.*agent.*(?:preserv|user-owned)|preserv.*existing.*agent/i);
   assert.match(opencode, /absent.*(?:default|entry)|default.*absent/i);
   assert.match(opencode, /configured.*(?:model|variant|mode|permissions).*runtime|runtime.*(?:model|variant|mode|permissions)/i);
   assert.match(opencode, /no separate coordinator profile|do not reintroduce.*coordinator/i);
   assert.match(opencode, /Claude worker files.*collision protection|collision protection.*Claude/i);
    assert.match(opencode, /sai-2-design-worker/);
  assert.match(opencode, /variant.*high/);
  assert.match(opencode, /permission/);
   assert.doesNotMatch(opencode, /agent: sai-coordinator/);
  assert.match(opencode, /subtask: false/);
  assert.match(opencode, /variant: high/);
   assert.match(opencode, /configuration exclusion|excludes?.*opencode\.json|opencode\.json.*excludes?/i);
  assert.match(opencode, /restart opencode/i);
  assert.doesNotMatch(opencode, /"agent"\s*:\s*\{/,
    'INSTALL.opencode.md bash and PowerShell blocks must not show an agent block snippet');
  assert.match(opencode, /~\/\.config\/opencode\/agents\/(?:explore|executor|budget)\.md/,
    'INSTALL.opencode.md should document the generic agent files as the model-resolution sources');
  assert.doesNotMatch(agents, /model resolved via opencode\.jsonc|resolved via agent\.\w+\.model/i,
    'AGENTS.md model-resolution statements should name the agent files, not opencode.jsonc');

});

test('Step 5 documentation records manifest projections and routed-source boundaries', () => {
  const readme = artifact('README.md');
  const agents = artifact('AGENTS.md');
  const claude = artifact('INSTALL.claude.md');
  const opencode = artifact('INSTALL.opencode.md');

  for (const text of [readme, agents, claude, opencode]) {
    assert.match(text, /sai\/install-manifest\.json/);
    assert.match(text, /doctor/);
    assert.match(text, /uninstall/);
    assert.match(text, /sai\/policies/);
    assert.match(text, /sai\/compat/);
  }
  assert.match(agents, /sai\/orchestration\//);
  assert.match(readme, /shared Orchestration Core/i);
  assert.match(claude, /Claude routed worker bindings/i);
  assert.match(opencode, /opencode routed worker bindings/i);
});

test('Step 3 documentation names only routed Claude Code and opencode support', () => {
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

// ─── Step 1: preservation-first legacy identity migration ───────────────────

test('design install overwrites divergent numbered destination content with notice and uninstall deletes body-matching agents', () => {
  const { installClaude } = require('../bin/install-flow.js');
  const { enumerateClaude, runDeletion } = require('../bin/uninstall-flow.js');
  const base = tempDir('sai-design-numbered-collision-');
  const target = path.join(base, 'agents', 'sai-2-design-worker.md');
  const sentinel = 'user-owned numbered worker\n';
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, sentinel);
    const result = capture(() => installClaude(base));
    assert.equal(result.error, null, 'installClaude should not throw on a divergent agent destination');
    assert.deepEqual(
      fs.readFileSync(target),
      fs.readFileSync(path.join(__dirname, '..', 'agents', 'claude', 'sai-2-design-worker.md')),
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

test('Target State contract lives in the design instruction, schema, and design template', () => {
  const instruction = artifact('sai/instructions/design.md');
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const designTemplate = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const interfacesTemplate = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  for (const contract of [instruction, schema, designTemplate]) {
    assert.match(contract, /### Architecture Snapshot/);
    assert.match(contract, /### File Manifest/);
  }

  for (const text of [instruction, designTemplate]) {
    const targetStateIndex = text.indexOf('## Target State');
    const contextIndex = text.indexOf('## Context');
    assert.ok(targetStateIndex !== -1, 'design surface should contain ## Target State');
    assert.ok(contextIndex !== -1, 'design surface should contain ## Context');
    assert.ok(targetStateIndex < contextIndex,
      '## Target State should be placed before other top-level design sections');
  }

  assert.doesNotMatch(interfacesTemplate, /## Target State/);
  assert.doesNotMatch(interfacesTemplate, /### Architecture Snapshot/);
  assert.doesNotMatch(interfacesTemplate, /### File Manifest/);
});

test('architecture snapshot display compares the extracted Target State block and defines the no-step-contracts sentinel', () => {
  const instruction = artifact('sai/instructions/design.md');

  assert.match(instruction, /extract(?:ed|s)?[\s\S]{0,200}`## Target State`|`## Target State`[\s\S]{0,200}extract(?:ed|s)?/i,
    'the instruction should reference the extracted ## Target State block comparison');
  assert.match(instruction, /normalize[\s\S]{0,180}(?:line endings|CRLF)[\s\S]{0,180}trailing whitespace/i,
    'the comparison should normalize line endings and trailing whitespace');
  assert.match(instruction, /(?:only when|only if)[\s\S]{0,160}differ|differ[\s\S]{0,160}(?:present|display)|present(?:ed)?[\s\S]{0,120}only[\s\S]{0,120}differ/i,
    'the block comparison should be presented only when the blocks differ');
  assert.match(instruction, /None — no step contracts/,
    'the instruction should define the exact None — no step contracts sentinel');
});

test('restore-coordinator-instruction-loading Step 1: routed Claude wrappers expose the exact read-only tool scope (planning grants the scoped date shell)', () => {
  const planningWrappers = [
    'commands/claude/sai-2-design.md',
    'commands/claude/sai-3-implement.md',
  ];
  const planningTools = ['Read', 'Glob', 'Skill', 'Agent', 'SendMessage', 'AskUserQuestion', 'Bash(date:*)'];

  const auditWrappers = [
    'commands/claude/sai-5-review.md',
    'commands/claude/sai-6-security.md',
    'commands/claude/sai-7-performance.md',
    'commands/claude/sai-8-accessibility.md',
  ];
  const auditTools = ['Read', 'Glob', 'Skill', 'Agent', 'SendMessage', 'AskUserQuestion'];

  for (const relativePath of planningWrappers) {
    const source = artifact(relativePath);
    const match = source.match(/^allowed-tools:\s*(.+)$/m);
    assert.ok(match, `${relativePath} should declare allowed-tools`);
    const toolNames = match[1].split(',').map(tool => tool.trim());
    assert.deepEqual(toolNames, planningTools,
      `${relativePath} should use the exact read-only routed scope with the scoped date shell grant`);
    for (const forbidden of ['Edit', 'Write', 'Grep']) {
      assert.equal(match[1].includes(forbidden), false,
        `${relativePath} must not expose ${forbidden}`);
    }
    assert.equal(toolNames.includes('Bash'), false,
      `${relativePath} must not expose a bare Bash entry`);
  }

  for (const relativePath of auditWrappers) {
    const source = artifact(relativePath);
    const match = source.match(/^allowed-tools:\s*(.+)$/m);
    assert.ok(match, `${relativePath} should declare allowed-tools`);
    const toolNames = match[1].split(',').map(tool => tool.trim());
    assert.deepEqual(toolNames, auditTools,
      `${relativePath} should keep the exact read-only routed scope without any shell`);
    for (const forbidden of ['Edit', 'Write', 'Grep', 'Bash']) {
      assert.equal(match[1].includes(forbidden), false,
        `${relativePath} must not expose ${forbidden}`);
    }
  }
});

test('restore-coordinator-instruction-loading Step 1: explore and status preserve their current adapter behavior', () => {
  const explore = artifact('commands/claude/sai-explore.md');
  const exploreTools = explore.match(/^allowed-tools:\s*(.+)$/m);
  assert.ok(exploreTools, 'sai-explore should declare allowed-tools');
  const exploreToolNames = exploreTools[1].split(',').map(tool => tool.trim());
  for (const required of ['Read', 'Glob', 'Skill', 'Agent', 'SendMessage', 'AskUserQuestion', 'Bash(openspec:*)', 'Bash(git:*)']) {
    assert.ok(exploreToolNames.includes(required),
      `sai-explore should retain ${required}`);
  }
  assert.doesNotMatch(exploreTools[1], /(?:^|,\s*)Bash(?:,|$)/);
  assert.doesNotMatch(exploreTools[1], /(?:^|,\s*)(?:Edit|Write)(?:,|$)/);

  const status = artifact('commands/claude/sai-status.md');
  assert.match(status, /^allowed-tools: Read, Glob, Grep, Bash\(openspec:\*\), AskUserQuestion, Skill$/m);
  assert.match(status, /Fetch @sai\/commands\/sai-status\.md/);
  assert.doesNotMatch(status, /allowed-tools:[^\n]*(?:Edit|Write|Bash\s*,)/m);
});

test('sai-2 feedback gate advertises and accepts direct free-text replies', () => {
  const gate = artifact('sai/policies/artifact-feedback-gate.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const presentation = gate.slice(
    gate.indexOf('## Present the gate'),
    gate.indexOf('## On selecting the feedback option'),
  );

  assert.match(
    presentation,
    /Share your feedback on \{artifacts\} below\. You can also type feedback directly in the free-text box\./,
  );
  assert.match(
    presentation,
    /Feedback on \{artifacts\}; you can also type feedback directly in the free-text box\./,
  );
  assert.match(presentation, /Present exactly two choices/);
  assert.match(presentation, /Give feedback \(Recommended\)/);
  assert.match(presentation, /Give more feedback/);
  assert.match(gate, /non-empty reply[\s\S]{0,260}neither declared option[\s\S]{0,260}## On "Give feedback"/i);
  assert.match(gate, /directly[\s\S]{0,180}(?:no|without)[\s\S]{0,100}(?:additional|second|clean).*prompt/i);
  assert.match(coordinator, /artifacts\s*=\s*design\.md,\s*tasks\.md,\s*interfaces\.md/);
  assert.match(coordinator, /proceed-label\s*=\s*Continue/);
});

// ─── Step 2: command-progress-plan-protocol (coordinator-contract.md) ───────

test('Step 2: dispatch passes exactly wrapper_echo_value and arguments_value; the plan is not carried in the envelope or any reconstruction field', () => {
  const coordinator = artifact('sai/orchestration/coordinator-contract.md');

  assert.match(coordinator, /exactly[\s\S]{0,120}wrapper_echo_value/,
    'the contract should state the dispatch passes exactly wrapper_echo_value');
  assert.match(coordinator, /exactly[\s\S]{0,120}arguments_value/,
    'the contract should state the dispatch passes exactly arguments_value');
  assert.match(
    coordinator,
    /(?:envelope|reconstruction)[\s\S]{0,240}(?:never|not)[\s\S]{0,160}plan|plan[\s\S]{0,240}(?:never|not)[\s\S]{0,160}(?:envelope|reconstruction)/i,
    'the contract should state the plan is not carried in the envelope or any reconstruction field'
  );
  assert.match(coordinator, /progress_plan/,
    'the phase-adapter field set should admit progress_plan');
});

test('Step 2: progress_plan is an optional static ordered adapter field, fully known at dispatch and immutable', () => {
  const coordinator = artifact('sai/orchestration/coordinator-contract.md');

  assert.match(coordinator, /optional[\s\S]{0,120}progress_plan|progress_plan[\s\S]{0,120}optional/i,
    'progress_plan should be optional in the phase-adapter field set');
  assert.match(coordinator, /static[\s\S]{0,200}(?:ordered|order)|(?:ordered|order)[\s\S]{0,200}progress_plan|progress_plan[\s\S]{0,200}(?:static|ordered)/i,
    'progress_plan should be static and ordered');
  assert.match(coordinator, /(?:fully known|known) at dispatch[\s\S]{0,160}progress_plan|progress_plan[\s\S]{0,240}(?:immutable|never changes|fixed at dispatch)/i,
    'progress_plan should be fully known at dispatch and immutable for the invocation');
});

test('Step 2: a progress event reporting an undeclared step id is ignored; the plan is never extended or amended', () => {
  const coordinator = artifact('sai/orchestration/coordinator-contract.md');

  assert.match(coordinator, /undeclared/,
    'the contract should address undeclared step ids');
  assert.match(coordinator, /(?:ignored|ignore)[\s\S]{0,240}undeclared|undeclared[\s\S]{0,240}(?:ignored|ignore)/i,
    'a progress event listing an undeclared step id should be ignored');
  assert.match(coordinator, /never[\s\S]{0,100}(?:extended|amended)|(?:extended|amended)[\s\S]{0,100}never/i,
    'the plan should never be extended or amended');
});

test('Step 2: progress-event paths join the changed-file union in first-seen order and are never reset', () => {
  const coordinator = artifact('sai/orchestration/coordinator-contract.md');

  assert.match(coordinator, /continue_after_progress/,
    'the lifecycle should continue the same worker with continue_after_progress');
  assert.match(coordinator, /(?:first[- ]seen|first seen)[\s\S]{0,120}order|order[\s\S]{0,120}(?:first[- ]seen|first seen)/i,
    'union joins should preserve first-seen order');
  assert.match(coordinator, /(?:union|changed[- ]?files)[\s\S]{0,240}(?:never|not)[\s\S]{0,60}reset|reset[\s\S]{0,240}(?:never|not)[\s\S]{0,120}(?:union|changed[- ]?files)/i,
    'a progress event should never reset the union');
});

test('Step 2: the union non-reset enumeration includes progress events', () => {
  const coordinator = artifact('sai/orchestration/coordinator-contract.md');

  assert.match(coordinator, /event:\s*progress|event\s*=\s*progress|progress event/i,
    'the lifecycle should handle progress events');
  assert.match(coordinator, /non[- ]reset[\s\S]{0,200}enumerat|enumerat[\s\S]{0,200}non[- ]reset/i,
    'the union enumeration should be non-reset');
  assert.match(coordinator, /enumerat[\s\S]{0,200}progress|progress[\s\S]{0,200}enumerat/i,
    'the non-reset enumeration should include progress events');
});

// ─── Step 3: command-progress-plan-protocol (worker-lifecycle.md) ───────────

test('Step 3: worker-lifecycle defines the progress-event block with exactly event: progress, step_ids, changed_files, nonterminal status, and protocol-only continue_after_progress', () => {
  const lifecycle = artifact('sai/orchestration/worker-lifecycle.md');

  assert.match(lifecycle, /event:\s*"?progress"?/,
    'the lifecycle should define the progress event with exactly event: progress');
  assert.match(lifecycle, /step_ids:\s*string\[\]/,
    'the progress-event block should carry step_ids: string[]');
  assert.match(lifecycle, /changed_files:\s*string\[\]/,
    'the progress-event block should carry changed_files: string[]');
  assert.match(lifecycle, /non[- ]?terminal|not a lifecycle status|not a status/i,
    'the lifecycle should state the progress event is nonterminal and not a lifecycle status');
  assert.match(lifecycle, /changed_files[\s\S]{0,60}like[\s\S]{0,40}notice|like[\s\S]{0,40}notice[\s\S]{0,60}changed_files/i,
    'the lifecycle should state the progress event carries changed_files like the notice');
  assert.match(lifecycle, /protocol[- ]?only acknowledgement[\s\S]{0,80}continue_after_progress|continue_after_progress[\s\S]{0,120}protocol[- ]?only/i,
    'continue_after_progress should be a protocol-only acknowledgement');
});

test('Step 3: continue_after_progress is excluded from opaque input history, user-answer handling, and pending feedback', () => {
  const lifecycle = artifact('sai/orchestration/worker-lifecycle.md');

  assert.match(lifecycle, /continue_after_progress/,
    'the lifecycle should define continue_after_progress');
  assert.match(lifecycle, /opaque[\s\S]{0,200}(?:input )?histor|(?:input )?histor[\s\S]{0,200}opaque/i,
    'the lifecycle should mention opaque input history');
  assert.match(lifecycle, /user[- ]answer/i,
    'the lifecycle should mention user-answer handling');
  assert.match(lifecycle, /pending[\s\S]{0,100}feedback/i,
    'the lifecycle should mention pending feedback');
  assert.match(lifecycle, /(?:excluded|absent)[\s\S]{0,320}(?:opaque|user[- ]answer|pending feedback)|(?:opaque|user[- ]answer|pending feedback)[\s\S]{0,320}(?:excluded|absent)/i,
    'the lifecycle should exclude continue_after_progress from those interaction-history surfaces');
});

test('the lifecycle obliges planned workers to emit progress and keeps payload validation for plan-absent workers', () => {
  const lifecycle = artifact('sai/orchestration/worker-lifecycle.md');

  assert.match(lifecycle, /design[\s\S]{0,200}spec[- ]proposal[\s\S]{0,200}implementation[- ]planning[\s\S]{0,200}review[\s\S]{0,200}security[\s\S]{0,200}performance[\s\S]{0,200}accessibility/i,
    'the emitter set should name all seven routed workers in order');
  assert.match(lifecycle, /SHALL[\s\S]{0,160}emit[\s\S]{0,240}(?:one progress event|new plan steps?)/i,
    'emission should be a SHALL obligation for planned workers with newly completed steps');
  assert.match(lifecycle, /emit[\s\S]{0,240}after[\s\S]{0,160}resolution|after[\s\S]{0,160}resolution[\s\S]{0,240}emit/i,
    'emission should be gated after prerequisite checks and scope resolution');
  assert.match(lifecycle, /no progress plan[\s\S]{0,240}(?:may emit no|optional|unchanged|payload validation)/i,
    'only plan-absent workers or planned workers with no new step may emit none');
  assert.match(lifecycle, /unchanged|payload validation/i,
    'the plan-absent carve-out should preserve payload validation');
});

// ─── Step 4: command-progress-plan-protocol (design coordinator.md) ─────────

test('Step 4: design coordinator declares the plan with the four canonical steps in order', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  for (const id of ['prereqs-resolution', 'specs-approval', 'research', 'artifacts']) {
    assert.match(coordinator, new RegExp(id.replace(/-/g, '\\-')),
      `the plan should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /prereqs-resolution[\s\S]{0,300}specs-approval[\s\S]{0,300}research[\s\S]{0,300}artifacts/,
    'the four canonical step ids should be declared in order'
  );
  assert.match(coordinator, /prereqs-resolution[\s\S]{0,200}Prerequisites and change resolution/i,
    'prereqs-resolution should carry the "Prerequisites and change resolution" label');
  assert.match(coordinator, /specs-approval[\s\S]{0,200}Specs approval gate/i,
    'specs-approval should carry the "Specs approval gate" label');
  assert.match(coordinator, /research[\s\S]{0,200}Research and open questions/i,
    'research should carry the "Research and open questions" label');
  assert.match(coordinator, /artifacts[\s\S]{0,200}Artifact generation and verification/i,
    'artifacts should carry the "Artifact generation and verification" label');
});

test('Step 4: the design worker contract enumerates the same four step ids in the same order', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  assert.match(
    worker,
    /prereqs-resolution[\s\S]{0,800}specs-approval[\s\S]{0,800}research[\s\S]{0,800}artifacts/,
    'the design worker contract should enumerate the same four step ids in the same order'
  );
});

test('Step 4: the coordinator nonterminal-extensions line admits progress events resumed with continue_after_progress', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /nonterminal[-_ ]extensions?/i,
    'the coordinator should declare its nonterminal extensions');
  assert.match(
    coordinator,
    /nonterminal[-_ ]extensions?[\s\S]{0,300}continue_after_progress|continue_after_progress[\s\S]{0,300}nonterminal[-_ ]extensions?/i,
    'the nonterminal-extensions line should admit progress events'
  );
  assert.match(
    coordinator,
    /resume[\s\S]{0,200}continue_after_progress|continue_after_progress[\s\S]{0,200}resume/i,
    'progress events should resume the worker with continue_after_progress'
  );
});

test('Step 4: the full plan renders at dispatch before the first worker result with an empty marked set', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /at dispatch/i,
    'the full plan should render at dispatch');
  assert.match(
    coordinator,
    /before[\s\S]{0,100}first[\s\S]{0,100}worker result|first[\s\S]{0,100}worker result[\s\S]{0,160}before/i,
    'the render should occur before the first worker result'
  );
  assert.match(coordinator, /in_progress/,
    'the plan should use the in_progress mark value');
  assert.match(coordinator, /pending/,
    'the plan should use the pending mark value');
  assert.match(coordinator, /first[\s\S]{0,160}in_progress|in_progress[\s\S]{0,160}first/i,
    'the first step should render in_progress');
  assert.match(
    coordinator,
    /(?:remaining|rest|others?)[\s\S]{0,160}pending|pending[\s\S]{0,160}(?:remaining|rest|others?)/i,
    'the remaining steps should render pending'
  );
  assert.match(coordinator, /empty[\s\S]{0,160}mark|mark(?:ed)?[\s\S]{0,160}empty|unmarked/i,
    'the marked set should be empty at dispatch');
});

test('Step 4: completed runs render every unmarked step completed; failed and cancelled freeze the list', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /completed[\s\S]{0,240}unmarked|unmarked[\s\S]{0,240}completed/i,
    'a completed run should render every unmarked step completed');
  assert.match(
    coordinator,
    /(?:all|every)[\s\S]{0,120}steps?[\s\S]{0,160}completed|completed[\s\S]{0,160}(?:all|every)[\s\S]{0,120}steps?/i,
    'a completed run should render all steps completed'
  );
  assert.match(
    coordinator,
    /failed[\s\S]{0,200}(?:freeze|frozen|as last rendered)|cancelled[\s\S]{0,200}(?:freeze|frozen|as last rendered)/i,
    'failed or cancelled runs should freeze the list'
  );
  assert.match(coordinator, /as last rendered|last render/i,
    'the freeze should preserve the list as last rendered');
});

test('Step 4: needs_input is a terminal lifecycle status but not a run-closing one and leaves the list unchanged', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(coordinator, /needs_input/,
    'the coordinator should handle the needs_input lifecycle status');
  assert.match(
    coordinator,
    /needs_input[\s\S]{0,240}(?:unchanged|as last rendered|leaves? the (?:plan )?list)|(?:unchanged|leaves? the (?:plan )?list)[\s\S]{0,240}needs_input/i,
    'needs_input should leave the plan list unchanged'
  );
  assert.match(coordinator, /needs_input[\s\S]{0,240}terminal|terminal[\s\S]{0,240}needs_input/i,
    'needs_input should be described as a terminal lifecycle status');
  assert.match(
    coordinator,
    /needs_input[\s\S]{0,240}(?:not|never)[\s\S]{0,160}(?:run[- ]closing|clos)|(?:not|never)[\s\S]{0,160](?:run[- ]closing|clos)[\s\S]{0,240}needs_input/i,
    'needs_input should not be a run-closing status'
  );
});

// ─── Step 5: command-progress-plan-protocol (sai-2-design-worker.md) ────────

test('Step 5: the design worker contract emits one progress event per completed batch after resolution, ids in plan order, changed_files since the preceding result', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  assert.match(worker, /progress event/i,
    'the design worker contract should define the progress event emission');
  assert.match(
    worker,
    /(?:one|a single|each|per)[\s\S]{0,200}progress event[\s\S]{0,240}(?:completed )?batch|(?:completed )?batch[\s\S]{0,200}(?:one|a single|each|per)[\s\S]{0,200}progress event/i,
    'the contract should emit one progress event per completed batch'
  );
  assert.match(
    worker,
    /after[\s\S]{0,160}resolution|resolution[\s\S]{0,160}after|never[\s\S]{0,120}before[\s\S]{0,120}resolution|before[\s\S]{0,120}resolution[\s\S]{0,120}never/i,
    'progress emission should happen only after resolution'
  );
  assert.match(
    worker,
    /step[\s\S]{0,40}ids?[\s\S]{0,240}plan order|plan order[\s\S]{0,240}step[\s\S]{0,40}ids?|ids?[\s\S]{0,160}plan order|plan order[\s\S]{0,160}ids?/i,
    'emitted step ids should follow plan order'
  );
  assert.match(
    worker,
    /changed_files[\s\S]{0,240}(?:preceding|previous|since)|(?:preceding|previous|since)[\s\S]{0,240}changed_files/i,
    'changed_files should carry paths written since the preceding result'
  );
});

test('Step 5: the startup act is one batch and emits one event carrying every step id that act completed (startup-act-is-one-batch)', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  assert.match(worker, /startup act|startup[- ]act/i,
    'the contract should name the startup act');
  assert.match(
    worker,
    /(?:fast[- ]track|prereqs?|prerequisites)[\s\S]{0,320}resolution[\s\S]{0,240}(?:startup|batch)|(?:startup|batch)[\s\S]{0,240}(?:fast[- ]track|prereqs?|prerequisites)[\s\S]{0,320}resolution/i,
    'the startup act should bundle fast-track parsing, prerequisites, and resolution'
  );
  assert.match(
    worker,
    /startup[\s\S]{0,300}(?:one|single)[\s\S]{0,160}batch|(?:one|single)[\s\S]{0,160}batch[\s\S]{0,300}startup/i,
    'the startup act should be one batch'
  );
  assert.match(
    worker,
    /every[\s\S]{0,200}step id|step ids?[\s\S]{0,240}completed/i,
    'the startup event should carry every step id that act completed'
  );
});

test('Step 5: fast-track-skipped gate steps fold into the completed batch with no separate skipped field (skipped-steps-fold-into-the-batch)', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  assert.match(worker, /fast[- ]track/i,
    'the contract should address fast-track handling');
  assert.match(worker, /skip/i,
    'the contract should address skipped steps');
  assert.match(
    worker,
    /fold(?:s|ed|ing)?[\s\S]{0,240}completed batch|completed batch[\s\S]{0,240}fold/i,
    'fast-track-skipped gate steps should fold into the completed batch'
  );
  assert.match(
    worker,
    /(?:no|without|never)[\s\S]{0,120}(?:separate|own)[\s\S]{0,160}skipped|skipped[\s\S]{0,120}(?:field|flag)|(?:no|without|never)[\s\S]{0,200}skipped field/i,
    'folded steps should carry no separate skipped field'
  );
});

test('Step 5: the run closes with exactly one terminal lifecycle status, never a progress event in place of a terminal payload (terminal-payload-still-closes)', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  assert.match(
    worker,
    /(?:exactly|only)[\s\S]{0,200}terminal|terminal[\s\S]{0,240}(?:exactly|only)|single[\s\S]{0,120}terminal|terminal[\s\S]{0,120}single/i,
    'the run should close with exactly one terminal lifecycle status'
  );
  assert.match(
    worker,
    /clos(?:e|es|ing|ure)[\s\S]{0,240}terminal|terminal[\s\S]{0,240}clos/i,
    'the run should close with a terminal status'
  );
  assert.match(
    worker,
    /never[\s\S]{0,120}progress event|progress event[\s\S]{0,160}never/i,
    'the close should never be a progress event'
  );
  assert.match(
    worker,
    /(?:in place of|instead of|substitut(?:e|es|ing))[\s\S]{0,240}terminal|terminal[\s\S]{0,240}(?:in place of|instead of|substitut)/i,
    'a progress event should never be emitted in place of a terminal payload'
  );
});

// ─── Step 6: command-progress-plan-protocol (design-worker bindings) ─────────

test('Step 6: claude binding updates the harness task list on each progress event, marking reported ids completed and the leading unmarked step in_progress (claude-task-list-update / claude-marks-a-progress-batch)', () => {
  const binding = artifact('sai/orchestration/workers/bindings/claude/design-worker.md');

  assert.match(binding, /progress event/i,
    'the binding should act on each progress event');
  assert.match(binding, /task list/i,
    'the binding should update the harness task list');
  assert.match(binding, /completed[\s\S]{0,240}in_progress|in_progress[\s\S]{0,240}completed/i,
    'reported ids should render completed and the leading unmarked step should render in_progress');
  assert.match(binding, /unmarked[\s\S]{0,200}in_progress|in_progress[\s\S]{0,200}unmarked/i,
    'the in_progress mark should apply to the leading unmarked step');
  assert.match(binding, /deriv/i,
    'the marks should follow the deterministic derivation');
  assert.match(binding, /mechanism/i,
    'the update should go through the harness task-list mechanism');
  assert.match(binding, /incrementality/i,
    'the binding should address incrementality');
  assert.match(
    binding,
    /incrementality[\s\S]{0,240}(?:non[- ]?normative|not[\s\S]{0,80}(?:normative|a contract)|optimization)|(?:non[- ]?normative|not[\s\S]{0,80}(?:normative|a contract)|optimization)[\s\S]{0,240}incrementality/i,
    'incrementality should be a non-normative binding-level optimization'
  );
});

test('Step 6: opencode binding issues one todowrite call per progress event replacing the full array with completed, in_progress, and pending under a constant priority (opencode-todowrite-full-replacement / opencode-replaces-the-full-array)', () => {
  const binding = artifact('sai/orchestration/workers/bindings/opencode/design-worker.md');

  assert.match(binding, /todowrite/i,
    'the binding should use the todowrite tool');
  assert.match(binding, /progress event/i,
    'the todowrite emission should happen per progress event');
  assert.match(binding, /(?:one|a single|exactly one)[\s\S]{0,200}todowrite|todowrite[\s\S]{0,200}(?:one|a single|exactly one)/i,
    'each progress event should produce exactly one todowrite call');
  assert.match(binding, /todos[\s\S]{0,120}array|full[\s\S]{0,120}(?:todos|array)/i,
    'the call should carry the full todos array');
  assert.match(
    binding,
    /completed[\s\S]{0,240}in_progress[\s\S]{0,240}pending|pending[\s\S]{0,240}in_progress[\s\S]{0,240}completed/i,
    'the array should map completed, the first incomplete step, and the remaining pending steps'
  );
  assert.match(binding, /constant[\s\S]{0,160}priority|priority[\s\S]{0,160}constant/i,
    'the priority should be constant on every entry');
});

test('Step 6: both bindings emit no task list / todowrite call below the three-declared-step threshold (claude-renders-below-threshold-plans / opencode-renders-below-threshold-plans)', () => {
  const claude = artifact('sai/orchestration/workers/bindings/claude/design-worker.md');
  const opencode = artifact('sai/orchestration/workers/bindings/opencode/design-worker.md');

  for (const binding of [claude, opencode]) {
    assert.match(binding, /three/i,
      'the binding should state the declared-step threshold');
    assert.match(binding, /(?:below|fewer than|less than)[\s\S]{0,120}three|three[\s\S]{0,120}(?:below|fewer than|less than)/i,
      'the threshold should be below three declared steps');
    assert.match(binding, /(?:no|without|never)[\s\S]{0,160}(?:task list|todowrite)/i,
      'no task list / todowrite call should be emitted below the threshold');
  }
});

test('Step 6: the neutral policy records the emission-ownership invariant and the opencode binding states its subagent-restriction reason (task-list-emission-coordinator-only / worker-never-emits-the-tool-call / opencode-subagent-restriction)', () => {
  const policy = artifact('sai/policies/todo-structure.md');
  const claude = artifact('sai/orchestration/workers/bindings/claude/design-worker.md');
  const opencode = artifact('sai/orchestration/workers/bindings/opencode/design-worker.md');

  assert.match(policy, /coordinator[\s\S]{0,200}(?:owns?|emission|exclusively)/i,
    'the policy should record the coordinator-owned emission invariant');
  assert.match(policy, /(?:never|not)[\s\S]{0,160}(?:worker|subagent)|worker[\s\S]{0,120}(?:never|not)/i,
    'the policy should state the worker never emits the tool call');

  for (const binding of [claude, opencode]) {
    assert.match(binding, /todo-structure\.md/,
      'both bindings should reference the neutral todo-structure policy');
  }

  assert.match(opencode, /subagent/i,
    'the opencode binding should note the worker is a subagent');
  assert.match(opencode, /disabl[\s\S]{0,200}subagent|subagent[\s\S]{0,200}disabl/i,
    'the binding should tie the disabled-by-default tool to the subagent context');
  assert.match(opencode, /by default/i,
    'the binding should state the tool is disabled by default in subagents');
});

// ─── Step 2: todo-list-step-timestamps (design bindings) ────────────────────

test('Step 2: the design bindings stamp the task list with HH:mm via per-harness wall-clock commands, acquired coordinator-only (per-harness-time-command / stamp-emission-coordinator-only)', () => {
  const claude = artifact('sai/orchestration/workers/bindings/claude/design-worker.md');
  const opencode = artifact('sai/orchestration/workers/bindings/opencode/design-worker.md');

  assert.match(claude, /date \+%H:%M/,
    'the Claude design binding should name `date +%H:%M` as its wall-clock command');
  assert.match(opencode, /Get-Date -Format "HH:mm"/,
    'the opencode design binding should name `Get-Date -Format "HH:mm"` as its wall-clock command');

  for (const binding of [claude, opencode]) {
    assert.match(binding, /Stamping is coordinator-only/,
      'the binding should state the stamping is coordinator-only');
    assert.match(binding, /never from the worker subagent/,
      'the binding should state the wall-clock call never originates from the worker subagent');
  }
});

// ─── Step 6: command-progress-plan-protocol (audit documentation) ───────────

test('documentation records the audit progress-plan orientation section', () => {
  const agents = artifact('AGENTS.md');

  assert.match(agents, /### Audit coordinators and workers/,
    'AGENTS.md should record the audit coordinator/worker orientation section');
  assert.match(agents, /Milestone Stamp[\s\S]{0,160}no|no[\s\S]{0,160}Milestone Stamp/i,
    'the audit orientation section should state audit plans carry no Milestone Stamp');
});

test('Step 2 design wrappers document the same overview language option', () => {
  for (const relativePath of [
    'commands/claude/sai-2-design.md',
    'commands/opencode/sai-2-design.md',
  ]) {
    const source = artifact(relativePath);
    assert.match(
      source,
      /argument-hint:.*--overview-lang <language>.*--fast-track/,
      `${relativePath} should document both optional flags`
    );
  }
});

test('Step 2 design worker validates and defaults the invocation language before resolution', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');

  assert.match(worker, /--overview-lang <language>/);
  assert.match(worker, /English/);
  assert.match(worker, /missing.*value|value.*missing/i);
  assert.match(worker, /duplicate/i);
  assert.match(worker, /before.*resolution|resolution.*before/i);
  assert.match(worker, /change name.*before|before.*change name/i);
  assert.match(worker, /fast-track.*(?:either|regardless)|(?:either|regardless).*fast-track/i);
});

test('Step 2 carries overview_language through the worker and generation continuation', () => {
  const worker = artifact('sai/orchestration/workers/sai-2-design-worker.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const bindings = [
    artifact('sai/orchestration/workers/bindings/claude/design-worker.md'),
    artifact('sai/orchestration/workers/bindings/opencode/design-worker.md'),
  ].join('\n');

  for (const source of [worker, coordinator, bindings]) {
    assert.match(source, /overview_language/);
    assert.match(source, /generation|generator/i);
  }
  assert.match(coordinator, /continuation[\s\S]{0,300}overview_language/i);
  assert.match(worker, /worker result|result[\s\S]{0,180}overview_language/i);
  assert.match(worker, /not persisted|never.*persist/i);
});

// ─── Step 3: retired-party prose guard ──────────────────────────────────────

test('Step 3: corrected active routed contract passes the retired-party guard', () => {
  const lineBearingReferences = auditActiveReferences(repoRoot)
    .filter(reference => reference.line !== undefined);

  assert.deepEqual(lineBearingReferences, []);
});

test('Step 3: positive current-party assertion reports the retired reference and line', () => {
  const root = tempDir('sai-step-3-positive-audit-');
  try {
    writeFixture(root, 'sai/commands/design/invocation.md', 'Copilot is the current design worker.\n');

    assert.deepEqual(auditActiveReferences(root), [
      {
        file: 'sai/commands/design/invocation.md',
        reference: 'Copilot',
        line: 1,
      },
    ]);
  } finally {
    removeTempDir(root);
  }
});

test('Step 3: explicit retirement evidence passes and archived specifications are excluded', () => {
  const root = tempDir('sai-step-3-retirement-audit-');
  try {
    writeFixture(root, 'sai/commands/design/invocation.md', [
      'Copilot is absent from the current design worker.',
      'Inline Coordinator Adapter is excluded from the active route.',
      'sai/orchestration/inline-invocation.md is historical and removed.',
      'inline caller is not available and unsupported.',
      '',
    ].join('\n'));
    writeFixture(root, 'openspec/specs/_archived/legacy/spec.md',
      'Copilot is the current design worker.\n');

    assert.deepEqual(auditActiveReferences(root), []);
  } finally {
    removeTempDir(root);
  }
});

test('Step 3: the shared retired-party guard covers every invocation core and live contract specification', () => {
  const root = tempDir('sai-step-3-inventory-audit-');
  const invocationCores = [
    'sai/commands/spec/invocation.md',
    'sai/commands/design/invocation.md',
    'sai/commands/review/invocation.md',
    'sai/commands/security/invocation.md',
    'sai/commands/performance/invocation.md',
    'sai/commands/implement/invocation.md',
    'sai/commands/accessibility/invocation.md',
  ];
  const liveContractSpecifications = [
    'openspec/specs/design-coordinator/spec.md',
    'openspec/specs/implementation-harness-bindings/spec.md',
    'openspec/specs/implementation-coordinator/spec.md',
    'openspec/specs/coordinator-instruction-loading/spec.md',
    'openspec/specs/review-phase-worker/spec.md',
    'openspec/specs/security-phase-worker/spec.md',
    'openspec/specs/accessibility-phase-worker/spec.md',
    'openspec/specs/accessibility-worker-bindings/spec.md',
    'openspec/specs/accessibility-worker-installation/spec.md',
    'openspec/specs/deduplicate-sai-2-design/spec.md',
  ];
  const inventory = [...invocationCores, ...liveContractSpecifications];

  try {
    for (const relativePath of inventory) {
      writeFixture(root, relativePath, 'Copilot is the current design worker.\n');
    }

    const lineBearingReferences = auditActiveReferences(root)
      .filter(reference => reference.line !== undefined);

    assert.equal(lineBearingReferences.length, 17);
    assert.deepEqual(
      [...new Set(lineBearingReferences.map(reference => reference.file))].sort(),
      [...inventory].sort(),
    );
    assert.ok(lineBearingReferences.every(reference =>
      reference.reference === 'Copilot' && reference.line === 1));
  } finally {
    removeTempDir(root);
  }
});

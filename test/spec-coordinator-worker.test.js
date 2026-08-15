'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  SPEC_COORDINATOR_ARTIFACTS,
  REQUIRED_OPERATIONS,
} = require('../fixtures/spec-coordinator-worker.js');

const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const FEEDBACK_QUESTION = 'Share your feedback on {artifacts} below. You can also type feedback directly in the free-text box.';
const FEEDBACK_DESCRIPTION = 'Feedback on {artifacts}; you can also type feedback directly in the free-text box.';

const matrixManifest = loadInstallManifest(path.join(__dirname, '..'));
function matrixBinding(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'binding' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix binding should exist`);
  return item.text;
}

function countLiteral(source, value) {
  return source.split(value).length - 1;
}

// The canonical five-step spec progress plan shared by the coordinator declaration and
// the worker enumeration (sai/commands/spec/coordinator.md and worker.md).
const SPEC_PLAN_STEPS = [
  ['prereqs-and-change', 'Check prerequisites and resolve the change'],
  ['proposal', 'Write proposal.md'],
  ['specs', 'Write specs/**'],
  ['validation', 'Validate artifacts and derive the decision summary'],
  ['review', 'Review artifacts'],
];
const SPEC_PLAN_IDS = SPEC_PLAN_STEPS.map(([id]) => id);

// Extract the `id` — "label" plan-list entries, normalizing per-line indentation so the
// coordinator declaration and the worker enumeration compare content-wise.
function planList(source) {
  const pairs = [];
  const re = /^\s*- `([a-z-]+)`\s*—\s*"([^"]+)"\s*$/gm;
  let match;
  while ((match = re.exec(source)) !== null) pairs.push([match[1], match[2]]);
  return pairs;
}

test('Step 1 spec card uses neutral root protocols and retires flat canonical sources', () => {
  const coordinator = artifact('sai/commands/spec/coordinator.md');
  const worker = artifact('sai/commands/spec/worker.md');
  assert.match(coordinator, /@sai\/command-runner\.md/);
  assert.match(coordinator, /@sai\/worker-core\.md/);
  assert.match(worker, /@sai\/worker-core\.md/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-1-spec-proposal-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

test('spec invocation core loads only the technical instruction sequence', () => {
  const core = artifact('sai/commands/spec/invocation.md');

  const required = [
    'Fetch @skills/budget/SKILL.md',
    'Fetch @sai/policies/glossary-format.md',
    'Fetch @sai/commands/spec/instructions.md',
    'Fetch @skills/openspec-propose/SKILL.md',
    'Fetch @sai/policies/remember.md',
  ];
  let previous = -1;
  for (const instruction of required) {
    const position = core.indexOf(instruction);
    assert.ok(position > previous, `${instruction} should be loaded in order`);
    previous = position;
  }

  assert.match(core, /\*\*User's request:\*\*\s*\$ARGUMENTS/);
  assert.doesNotMatch(core, /Fetch @sai\/policies\/prereqs\.md/);
  assert.doesNotMatch(core, /Fetch @sai\/policies\/artifact-feedback-gate\.md/);
  assert.doesNotMatch(core, /Spec proposal done in openspec\/changes\//);
});

test('completion remains outside the spec invocation core', () => {
  const core = artifact('sai/commands/spec/invocation.md');
  const coordinator = artifact('sai/commands/spec/coordinator.md');
  const worker = artifact('sai/commands/spec/worker.md');

  assert.doesNotMatch(core, /decision summary|feedback gate|MANDATORY STOP|Spec proposal done in openspec\/changes\//i);
  assert.match(coordinator, /artifact-feedback-gate\.md/);
  assert.match(coordinator, /Spec proposal done in openspec\/changes\/\{name\}\/\./);
  assert.match(worker, /decision[- ]summary/i);
  assert.doesNotMatch(core, /sai\/orchestration\/inline-invocation\.md/);
});

test('feedback selection routes text through the coordinator once and preserves the proceed stop', () => {
  const coordinator = artifact('sai/commands/spec/coordinator.md');
  const worker = artifact('sai/commands/spec/worker.md');
  const core = artifact('sai/commands/spec/invocation.md');

  const policyPosition = coordinator.indexOf('Fetch @sai/policies/artifact-feedback-gate.md');
  const completionGatePosition = coordinator.search(/completion gate/i);
  assert.ok(policyPosition >= 0, 'coordinator should fetch the canonical feedback-gate policy');
  assert.ok(
    policyPosition < completionGatePosition,
    'feedback-gate policy should be fetched before the completion gate is applied',
  );

  assert.match(coordinator, /exactly one|one prompt|single prompt/i);
  assert.match(coordinator, /proposal\.md/);
  assert.match(coordinator, /specs\/\*\*/);
  assert.match(coordinator, /await|wait.*text|text.*wait/i);
  assert.match(coordinator, /forward.*feedback|feedback.*forward|continue the same worker/i);

  assert.match(worker, /forwarded feedback|feedback text|feedback input/i);
  assert.match(worker, /must not|without.*(emit|present)|do not.*(emit|present)/i);
  assert.equal(
    (coordinator.match(/MANDATORY STOP/g) || []).length,
    1,
    'the routed proceed branch should retain exactly one mandatory stop',
  );
  assert.doesNotMatch(core, /sai\/orchestration\/inline-invocation\.md/);
  assert.doesNotMatch(coordinator, /sai\/orchestration\/inline-invocation\.md/);
});

test('coordinator declares lifecycle-only ownership and the exact two-string envelope', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);
  assert.match(coordinator, /only metadata|user-facing spec coordinator/i);
  assert.match(coordinator, /wrapper_echo_value/);
  assert.match(coordinator, /arguments_value/);
  assert.match(coordinator, /exactly two|two strings/i);
  assert.match(coordinator, /allowed_nonterminal_extensions|extensions.*empty/i);
  assert.match(coordinator, /extension_handlers|handlers.*empty/i);
  assert.match(coordinator, /no design notice state/i);
  assert.deepEqual(REQUIRED_OPERATIONS, [
    'dispatch_worker', 'continue_same_worker', 'dispatch_one_replacement_worker',
  ]);
  assert.match(coordinator, /dispatch exactly one|start exactly one/i);
  assert.match(coordinator, /continue the same worker/i);
  assert.match(coordinator, /at most one replacement/i);
});

test('coordinator preserves closed statuses, ordered picker forwarding, and opaque history', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);
  assert.match(coordinator, /needs_input/);
  assert.match(coordinator, /completed/);
  assert.match(coordinator, /closed lifecycle statuses/);
  assert.match(coordinator, /question/);
  assert.match(coordinator, /options/);
  assert.match(coordinator, /answer_value/);
  assert.match(coordinator, /opaque input history/i);
  assert.match(coordinator, /order|ordered/i);
});

test('coordinator unions changed files in order and replaces a failed continuation once', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);
  assert.match(coordinator, /changed-file union/);
  assert.match(coordinator, /ordered duplicate-free/);
  assert.match(coordinator, /continue the same worker/i);
  assert.match(coordinator, /one replacement worker/i);
  assert.match(coordinator, /same[- ]worker.*before|before.*same[- ]worker/i);
  assert.match(coordinator, /at most one|one replacement|once/i);
});

test('worker owns prerequisites, resolution, artifacts, summary, and feedback responsibilities', () => {
  const worker = artifact(SPEC_COORDINATOR_ARTIFACTS.worker);
  for (const responsibility of [
    'prerequisite', 'resolved_change_name', 'artifact', 'summary', 'feedback',
  ]) assert.match(worker, new RegExp(responsibility, 'i'));
  assert.match(worker, /metadata[- ]only|metadata/);
  assert.doesNotMatch(worker, /artifact_contents/);
});

test('Claude and opencode bindings mirror envelope and continuation mechanics', () => {
  const claude = matrixBinding('claude', 'spec');
  const opencode = matrixBinding('opencode', 'spec');
  for (const binding of [claude, opencode]) {
    assert.match(binding, /original (InvocationEnvelope|envelope)/i);
    assert.match(binding, /continuation|Continue/i);
    assert.match(binding, /one bounded replacement|one replacement/i);
    assert.match(binding, /reconstruction fields|restored from the originating binding context/i);
  }
  assert.match(claude, /SendMessage|agent ID/i);
  assert.match(opencode, /task|session|continu/i);
});

test('Claude spec invocation routes through the launcher and neutral worker binding', () => {
  const wrapper = artifact('commands/claude/sai-1-spec.md');
  const launcher = artifact('sai/commands/spec/launcher.md');
  const claudeBinding = matrixBinding('claude', 'spec');
  const manifest = artifact('sai/install-manifest.json');
  assert.match(wrapper, /^model:\s*opus\s*$/m);
  assert.match(wrapper, /^effort:\s*medium\s*$/m);
  assert.match(wrapper, /spec[\\/]launcher\.md/);
    assert.doesNotMatch(wrapper, /sai-1-spec-proposal-worker/);
  assert.match(claudeBinding, /name:\s*"sai-1-spec-proposal-worker"/);
   assert.match(manifest, /agents[\\/]claude[\\/]worker-template\.md/);
    assert.match(manifest, /"path":\s*"sai-1-spec-proposal-worker\.md"/);
  assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/spec-worker\.md/);
  assert.match(launcher, /Fetch @sai\/commands\/spec\/coordinator\.md/);
    assert.doesNotMatch(wrapper, /Fetch @skills\/sai-1-spec-proposal-worker\/SKILL\.md/);
  assert.match(wrapper, /\$ARGUMENTS/);
});

test('opencode spec invocation routes through the launcher and neutral worker binding', () => {
  const wrapper = artifact('commands/opencode/sai-1-spec.md');
  const launcher = artifact('sai/commands/spec/launcher.md');
   assert.match(wrapper, /^model:\s*opencode-go\/deepseek-v4-flash\s*$/m);
  assert.match(wrapper, /spec[\\/]launcher\.md/);
   assert.doesNotMatch(wrapper, /sai-1-spec-proposal-worker/);
  assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/spec-worker\.md/);
  assert.match(launcher, /Fetch @sai\/commands\/spec\/coordinator\.md/);
    assert.doesNotMatch(wrapper, /Fetch @skills\/sai-1-spec-proposal-worker\/SKILL\.md/);
  assert.match(wrapper, /\$ARGUMENTS/);
});

test('README documents the routed spec architecture and proposal-only scope', () => {
  const readme = artifact('README.md');
  for (const harness of ['Claude Code', 'opencode']) {
    assert.match(readme, new RegExp(harness.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(readme, /Claude Code.*rout|rout.*Claude Code/i);
  assert.match(readme, /opencode.*rout|rout.*opencode/i);
  assert.match(readme, /spec.*core|core.*spec/i);
  assert.match(readme, /spec.*worker|worker.*spec/i);
  assert.match(readme, /proposal.*spec|spec.*proposal/i);
});

test('AGENTS documents the routed architecture, ownership, and artifact scope', () => {
  const agents = artifact('AGENTS.md');
  for (const harness of ['Claude Code', 'opencode']) {
    assert.match(agents, new RegExp(harness.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(agents, /Claude Code.*rout|rout.*Claude Code/i);
  assert.match(agents, /opencode.*rout|rout.*opencode/i);
  assert.match(agents, /spec.*core|core.*spec/i);
  assert.match(agents, /spec.*worker|worker.*spec/i);
  assert.match(agents, /proposal.*spec|spec.*proposal/i);
});

test('README model references and installation topology match routed metadata', () => {
  const readme = artifact('README.md');
  const claude = artifact('commands/claude/sai-1-spec.md');
  const opencode = artifact('commands/opencode/sai-1-spec.md');
  const manifest = artifact('sai/install-manifest.json');
  assert.match(readme, /opus/);
  assert.match(readme, /medium/);
   assert.match(readme, /opencode-go\/deepseek-v4-flash/);
  assert.match(readme, /commands[\\/]claude|Claude Code/);
  assert.match(readme, /commands[\\/]opencode|opencode/);
  assert.match(claude, /^model:\s*opus\s*$/m);
  assert.match(claude, /^effort:\s*medium\s*$/m);
   assert.match(opencode, /^model:\s*opencode-go\/deepseek-v4-flash\s*$/m);
  assert.match(manifest, /agents[\\/]claude[\\/]worker-template\.md/);
  assert.match(manifest, /"path":\s*"sai-1-spec-proposal-worker\.md"/);
});

test('sai-1 feedback gate advertises and accepts direct free-text replies', () => {
  const gate = artifact('sai/policies/artifact-feedback-gate.md');
  const coordinator = artifact('sai/commands/spec/coordinator.md');
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
  assert.match(coordinator, /artifacts\s*=\s*proposal\.md,\s*specs\/\*\*/);
  assert.match(coordinator, /proceed-label\s*=\s*Finish step/);
});

// ─── Step 5: progress-plan-spec-and-implement (spec coordinator/worker) ───────

test('Step 5: the spec adapter declares the canonical five-step plan in order with its labels', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);

  for (const id of SPEC_PLAN_IDS) {
    assert.match(coordinator, new RegExp(`\`${id}\``),
      `the spec plan should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /`prereqs-and-change`[\s\S]{0,300}`proposal`[\s\S]{0,300}`specs`[\s\S]{0,300}`validation`[\s\S]{0,300}`review`/,
    'the five canonical step ids should be declared in order'
  );
  assert.match(coordinator, /`prereqs-and-change`[\s\S]{0,200}Check prerequisites and resolve the change/,
    'prereqs-and-change should carry the "Check prerequisites and resolve the change" label');
  assert.match(coordinator, /`proposal`[\s\S]{0,200}Write proposal\.md/,
    'proposal should carry the "Write proposal.md" label');
  assert.match(coordinator, /`specs`[\s\S]{0,200}Write specs\/\*\*/,
    'specs should carry the "Write specs/**" label');
  assert.match(coordinator, /`validation`[\s\S]{0,200}Validate artifacts and derive the decision summary/,
    'validation should carry the "Validate artifacts and derive the decision summary" label');
  assert.match(coordinator, /`review`[\s\S]{0,200}Review artifacts/,
    'review should carry the "Review artifacts" label');
  assert.doesNotMatch(coordinator, /prereqs-resolution|proposal-and-specs|verification-summary|specs-approval/,
    'the spec plan should contain no retired three-step ids and no specs-approval step');
});

test('Step 5: the spec-proposal worker contract enumerates the same five ids in order', () => {
  const worker = artifact(SPEC_COORDINATOR_ARTIFACTS.worker);

  assert.match(
    worker,
    /exactly these canonical step ids, in[\s\S]{0,60}order:/,
    'the spec worker contract should enumerate the canonical ids in order'
  );
  assert.deepEqual(
    planList(worker),
    SPEC_PLAN_STEPS,
    'the spec worker contract should enumerate exactly the five ordered id/label pairs'
  );
});

test('Step 5: the spec coordinator renders the plan at dispatch and marks steps only from progress events', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);

  assert.match(coordinator, /at dispatch/i,
    'the full plan should render at dispatch');
  assert.match(coordinator, /in_progress/,
    'the plan should use the in_progress mark value');
  assert.match(coordinator, /pending/,
    'the plan should use the pending mark value');
  assert.match(coordinator, /first[\s\S]{0,160}in_progress|in_progress[\s\S]{0,160}first/i,
    'the first step should render in_progress at dispatch');
  assert.match(coordinator, /mark steps only from worker progress-event `step_ids`/,
    'steps should be marked only from worker progress events');
  assert.match(coordinator, /(?:remaining|rest|others?)[\s\S]{0,160}pending|pending[\s\S]{0,160}(?:remaining|rest|others?)/i,
    'the remaining steps should render pending');
});

test('Step 5: the spec coordinator reconciles the list at run-closing results', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);

  assert.match(coordinator, /completed[\s\S]{0,240}unmarked|unmarked[\s\S]{0,240}completed/i,
    'a completed run should render every unmarked step completed');
  assert.match(coordinator, /failed[\s\S]{0,200}(?:freeze|frozen|as last rendered)|cancelled[\s\S]{0,200}(?:freeze|frozen|as last rendered)/i,
    'failed or cancelled runs should leave the list as last rendered');
  assert.match(coordinator, /needs_input[\s\S]{0,240}(?:unchanged|as last rendered)|(?:unchanged|as last rendered)[\s\S]{0,240}needs_input/i,
    'a needs_input result should leave the list as last rendered');
});

test('Step 5: the spec worker contract emits one progress event per completed batch with the canonical batch ids', () => {
  const worker = artifact(SPEC_COORDINATOR_ARTIFACTS.worker);

  assert.match(worker, /Emit exactly one progress event per completed batch/,
    'the contract should emit one progress event per completed batch');
  assert.match(worker, /The startup act reports `prereqs-and-change`/,
    'the startup batch should carry prereqs-and-change');
  assert.match(worker, /the completed `proposal\.md` write reports `proposal`/,
    'the proposal batch should carry proposal');
  assert.match(worker, /the completed `specs\/\*\*` write reports `specs`/,
    'the specs batch should carry specs');
  assert.match(worker, /decision-summary derivation report `validation`/,
    'the verification batch should carry validation');
  assert.match(worker, /a completed worker-owned review pass reporting `High=0` reports `review`/,
    'a completed review pass should carry review');
  assert.match(worker, /in that batch's `changed_files`/,
    'the batch should carry changed_files since the preceding result');
  assert.match(worker, /feedback turn[\s\S]{0,240}(?:no|never|not)[\s\S]{0,120}progress/i,
    'feedback turns should emit no progress event');
  assert.match(worker, /Never emit before resolution/,
    'no progress event should be emitted before resolution');
  assert.match(worker, /one terminal lifecycle status/i,
    'the run should close with exactly one terminal lifecycle status');
});

test('Step 5: continue_after_progress is protocol-only and excluded from interaction history', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);

  assert.match(coordinator, /continue_after_progress/,
    'the coordinator should define continue_after_progress');
  assert.match(coordinator, /protocol[- ]?only/i,
    'the acknowledgement should be protocol-only');
  assert.match(coordinator, /(?:excluded|never|not recorded)[\s\S]{0,320}(?:opaque|user[- ]answer|pending feedback)|(?:opaque|user[- ]answer|pending feedback)[\s\S]{0,320}(?:excluded|never|not recorded)/i,
    'the acknowledgement should be excluded from opaque input history, user-answer handling, and pending feedback');
});

test('Step 5: the spec coordinator and policy drive the harness task list on progress events with the threshold rule', () => {
  const coordinator = artifact('sai/commands/spec/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');

  assert.match(coordinator, /progress event/i,
    'the coordinator should act on each progress event');
  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral todo-structure policy');
  assert.match(coordinator, /completed[\s\S]{0,240}in_progress|in_progress[\s\S]{0,240}completed/i,
    'reported ids should render completed and the leading unmarked step in_progress');
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

// ─── Step 2: todo-list-step-timestamps (spec coordinator) ──────────────────

test('Step 2: the spec coordinator renders task-list stamps coordinator-only via the todo-structure policy (stamp-emission-coordinator-only)', () => {
  const coordinator = artifact('sai/commands/spec/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');

  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral stamping policy');
  assert.match(policy, /stamp/i,
    'the policy should govern milestone stamp annotations');
  assert.match(policy, /coordinator session/i,
    'the policy should state stamp acquisition is coordinator-only');
  assert.match(policy, /never from a worker subagent/i,
    'the policy should state the wall-clock call never originates from the worker subagent');
  assert.doesNotMatch(coordinator, /date \+%H:%M|Get-Date/,
    'per-harness wall-clock commands no longer live in the coordinator body');
});

// ─── Step 2: spec-design-review-progress-step (spec coordinator/worker) ───────

test('Step 2: the spec coordinator declares exactly the five ordered plan ids with their labels', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);

  assert.match(coordinator, /canonical five-step progress plan[\s\S]{0,200}in order, with exactly these ids and labels/,
    'the coordinator should declare the canonical five-step plan with the exactness clause');
  for (const id of SPEC_PLAN_IDS) {
    assert.match(coordinator, new RegExp(`\`${id}\``),
      `the coordinator should declare the ${id} step id`);
  }
  assert.match(
    coordinator,
    /`prereqs-and-change`[\s\S]{0,300}`proposal`[\s\S]{0,300}`specs`[\s\S]{0,300}`validation`[\s\S]{0,300}`review`/,
    'the five canonical step ids should be declared in order'
  );
  assert.match(coordinator, /`prereqs-and-change`[\s\S]{0,200}Check prerequisites and resolve the change/,
    'prereqs-and-change should carry the "Check prerequisites and resolve the change" label');
  assert.match(coordinator, /`proposal`[\s\S]{0,200}Write proposal\.md/,
    'proposal should carry the "Write proposal.md" label');
  assert.match(coordinator, /`specs`[\s\S]{0,200}Write specs\/\*\*/,
    'specs should carry the "Write specs/**" label');
  assert.match(coordinator, /`validation`[\s\S]{0,200}Validate artifacts and derive the decision summary/,
    'validation should carry the "Validate artifacts and derive the decision summary" label');
  assert.match(coordinator, /`review`[\s\S]{0,200}Review artifacts/,
    'review should carry the "Review artifacts" label');
  assert.doesNotMatch(coordinator, /prereqs-resolution|proposal-and-specs|verification-summary/,
    'the coordinator should contain no step ids beyond the declared five');
});

test('Step 2: the coordinator plan declaration and the worker enumeration are byte-identical lists', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);
  const worker = artifact(SPEC_COORDINATOR_ARTIFACTS.worker);

  assert.deepEqual(planList(coordinator), SPEC_PLAN_STEPS,
    'the coordinator plan declaration should be exactly the five ordered id/label pairs');
  assert.deepEqual(planList(worker), SPEC_PLAN_STEPS,
    'the worker enumeration should be exactly the five ordered id/label pairs');
  assert.deepEqual(planList(coordinator), planList(worker),
    'the coordinator declaration and the worker enumeration should be byte-identical lists (content-wise)');
});

test('Step 2: the spec worker emits one progress event per act carrying the canonical id and newly changed paths', () => {
  const worker = artifact(SPEC_COORDINATOR_ARTIFACTS.worker);

  assert.match(worker, /Emit exactly one progress event per completed batch/,
    'each act should emit exactly one progress event');
  assert.match(worker, /The startup act reports `prereqs-and-change`/,
    'the startup act should emit one progress event carrying prereqs-and-change');
  assert.match(worker, /the completed `proposal\.md` write reports `proposal`/,
    'the proposal act should emit one progress event carrying proposal');
  assert.match(worker, /the completed `specs\/\*\*` write reports `specs`/,
    'the specs act should emit one progress event carrying specs');
  assert.match(worker, /decision-summary derivation report `validation`/,
    'the validation act should emit one progress event carrying validation');
  assert.match(worker, /list every path written since the preceding result/,
    'each progress event should carry the newly changed paths');
  assert.match(worker, /changed_files/,
    'the worker contract should keep the changed_files field');
  assert.match(worker, /Report ids in plan order/,
    'progress event ids should be reported in plan order');
});

test('Step 2: a completed worker-owned review pass emits review once for High=0 only', () => {
  const worker = artifact(SPEC_COORDINATOR_ARTIFACTS.worker);
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);

  assert.match(worker, /A completed pass with `High=0` converges/,
    'the marking rule should apply to a completed pass');
  assert.match(worker, /`Medium` and `Low` do not extend the loop/,
    'Medium/Low-only findings should still permit the review mark');
  assert.match(worker, /including an empty finding set/,
    'an empty-findings pass should still permit the review mark');
  assert.match(worker, /emits `review` once when still unmarked/,
    'the review mark should be emitted exactly once on convergence');
  assert.equal((worker.match(/emits `review`/g) || []).length, 1,
    'review should be emitted exactly once, only by the High=0 convergence clause');
  assert.match(worker, /A completed pass with `High>0` dispatches a fresh reviewer while both caps permit/,
    'a completed pass with High>0 should not emit the review mark');
  assert.match(worker, /leave `review` unmarked/,
    'cap-exhaustion outcomes should leave the review mark unmarked');
  assert.match(coordinator, /an unmarked evidence-marked `review` step is left exactly as last rendered/,
    'an unmarked review step stays unmarked through reconciliation');
});

test('Step 2: the spec coordinator skips reconciliation for pre-gate completion and reconciles at Finish-step close except unmarked review', () => {
  const coordinator = artifact(SPEC_COORDINATOR_ARTIFACTS.coordinator);

  assert.match(coordinator, /pre-gate and does not reconcile/,
    'a pre-gate completed result should trigger no reconciliation');
  assert.match(coordinator, /`Finish step` proceed selection is the spec phase's reconciliation trigger/,
    'reconciliation should apply at the Finish step close');
  assert.match(coordinator, /every eligible unmarked step renders `completed`/,
    'every eligible unmarked step should render completed');
  assert.match(coordinator, /an unmarked evidence-marked `review` step is left exactly as last rendered/,
    'an unmarked review step should be excluded from reconciliation');
  assert.match(coordinator, /never the bare `review` id/,
    'the carve-out is the evidence-marked designation, never the bare review id');
  assert.match(coordinator, /`failed`, `cancelled`, and `needs_input` leave the list exactly as last rendered/,
    'failed, cancelled, and needs_input should leave the list as last rendered');
});

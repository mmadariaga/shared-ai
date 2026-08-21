'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { auditActiveReferences } = require('../bin/orchestration-source-audit.js');
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

function matrixAgent(harness, phase) {
  const item = matrixRenderFor(matrixManifest, harness, path.join(__dirname, '..'))
    .find(entry => entry.kind === 'agent' && entry.phase === phase);
  assert.ok(item, `${harness}/${phase} matrix agent should exist`);
  return item.text;
}

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

// ─── Step 3: spec-design-review-progress-step — interface stubs ────────────
// The Step 3 interface stubs expose the required contract symbols (the
// seven-step design progress plan, the design review-pass input sets, and the
// retired step ids) as pure data with no production logic. The assertions
// below compare the production instruction surface against these stubs, so a
// RED run fails until the GREEN body lands the contract.

const DESIGN_PROGRESS_PLAN = [
  ['prereqs-resolution', 'Check prerequisites'],
  ['research', 'Research and resolve open questions'],
  ['design', 'Write design.md'],
  ['tasks', 'Write tasks.md'],
  ['interfaces', 'Write interfaces.md'],
  ['review', 'Review artifacts'],
  ['overview', 'Generate change-overview.md'],
];
const DESIGN_PROGRESS_PLAN_LINES = DESIGN_PROGRESS_PLAN.map(([id, label]) => `${id}: "${label}"`);
const DESIGN_PROGRESS_PLAN_IDS = DESIGN_PROGRESS_PLAN.map(([id]) => id);
const RETIRED_DESIGN_PLAN_IDS = ['specs-approval', 'artifacts'];

function declaredStepLines(source) {
  const known = new Set([...DESIGN_PROGRESS_PLAN_IDS, ...RETIRED_DESIGN_PLAN_IDS]);
  const lines = [];
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim().replace(/^[-*]\s*/, '').replace(/\s+/g, ' ');
    let id = null;
    let label = null;
    let match = line.match(/^([a-z][a-z0-9-]*):\s*(.+)$/);
    if (match && known.has(match[1])) {
      id = match[1];
      label = match[2].trim();
    } else {
      match = line.match(/^`([a-z][a-z0-9-]*)`\s*[—:\-]\s*(.+)$/);
      if (match && known.has(match[1])) {
        id = match[1];
        label = match[2].trim();
      }
    }
    if (id === null) continue;
    if ((label.startsWith('"') && label.endsWith('"'))
      || (label.startsWith("'") && label.endsWith("'"))
      || (label.startsWith('`') && label.endsWith('`'))) {
      label = label.slice(1, -1);
    }
    lines.push(`${id}: "${label}"`);
  }
  return lines;
}

test('Step 1 design card uses neutral root protocols and retires flat canonical sources', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const worker = artifact('sai/commands/design/worker.md');
  assert.match(coordinator, /@sai\/orchestration\/command-runner\.md/);
  assert.match(coordinator, /@sai\/orchestration\/worker-core\.md/);
  assert.match(worker, /@sai\/orchestration\/worker-core\.md/);
  for (const relativePath of [
    'sai/orchestration/coordinator-contract.md',
    'sai/orchestration/worker-lifecycle.md',
    'sai/orchestration/workers/sai-2-design-worker.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), false,
      `${relativePath} should be absent from the active source layout`);
  }
});

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
  const coordinator = artifact('sai/orchestration/command-runner.md');
  const lifecycle = artifact('sai/orchestration/worker-core.md');
  const worker = artifact('sai/commands/design/worker.md');
  assert.match(coordinator, /completed|needs_input|failed|cancelled/);
  assert.match(coordinator, /changed_files.*union|union.*changed_files/i);
  assert.match(lifecycle, /resolved_change_name/);
  assert.match(lifecycle, /binding-owned/);
  assert.match(worker, /Fetch @sai\/orchestration\/worker-core\.md/);
  for (const harness of ['claude', 'opencode']) {
    assert.match(matrixBinding(harness, 'design'), /worker/i);
  }
});

// ─── specs/deduplicate-sai-2-design/spec.md ────────────────────────────────

test('design wrappers activate routed Claude/opencode entry and preserve phase boundary', () => {
  const claude = artifact('commands/claude/sai-2-design.md');
  const opencode = artifact('commands/opencode/sai-2-design.md');
  const launcher = artifact('sai/commands/design/launcher.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');

    assert.match(claude, /^model: opus$/m);
    assert.match(claude, /^effort: medium$/m);
     assert.match(claude, /^allowed-tools: Read, Glob, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList$/m);
    assert.doesNotMatch(claude, /sai-2-design-worker/);
   assert.doesNotMatch(claude, /sai-3-implementation-worker/);
     assert.match(claude, /sai\/commands\/design\/launcher\.md/);
    assert.doesNotMatch(claude, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);

    assert.match(opencode, /^model: opencode-go\/deepseek-v4-flash$/m);
   assert.match(opencode, /^variant: max$/m);
    assert.match(opencode, /^subtask: false$/m);
    assert.doesNotMatch(opencode, /^agent:/m);
    assert.doesNotMatch(opencode, /sai-2-design-worker/);
   assert.doesNotMatch(opencode, /sai-3-implementation-worker/);
     assert.match(opencode, /sai\/commands\/design\/launcher\.md/);
    assert.doesNotMatch(opencode, /Fetch @skills\/sai-2-design-worker\/SKILL\.md/);
   for (const [harness, source] of [['claude', claude], ['opencode', opencode]]) {
     assert.match(source, /InvocationEnvelope:/,
       `${harness} design wrapper should forward an InvocationEnvelope`);
     assert.match(source, /command_name:\s*design/,
       `${harness} design wrapper should forward command_name: design`);
     assert.match(source, /arguments_value:\s*\$ARGUMENTS/,
       `${harness} design wrapper should forward the complete arguments_value`);
     assert.doesNotMatch(source, /^\s*\*\*[^*\r\n]*(?:argument|arguments)[^*\r\n]*\*\*\s*\$ARGUMENTS\s*$/m,
       `${harness} design wrapper should not use transcript-labelled argument extraction`);
   }
   assert.match(claude, /wrapper_echo_value:\s*""/,
     'Claude design should preserve the empty wrapper_echo_value');
   assert.match(opencode, /wrapper_echo_value:\s*\$ARGUMENTS/,
     'opencode design should preserve the opaque wrapper_echo_value');

   assert.match(coordinator, /arguments_value/,
      'the design coordinator should consume the forwarded arguments_value');
    for (const argumentsValue of [
      'envelope-only-change-name-resolution --fast-track',
      '--fast-track envelope-only-change-name-resolution',
    ]) {
      assert.match(opencode, /arguments_value:\s*\$ARGUMENTS/,
        `opencode design should forward the complete argument order: ${argumentsValue}`);
      assert.match(claude, /arguments_value:\s*\$ARGUMENTS/,
        `Claude design should forward the complete argument order: ${argumentsValue}`);
    }

   assert.match(launcher, /sai\/commands\/design\/coordinator\.md/, 'launcher should load the design coordinator');
   assert.match(launcher, /Fetch @sai\/orchestration\/workers\/bindings\/design-worker\.md/, 'launcher should load the design worker binding');

  for (const relativePath of [
    'sai/commands/design/coordinator.md',
    'sai/commands/implement/coordinator.md',
  ]) {
    assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), true, `${relativePath} should be available`);
  }

  const spec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.match(spec, /Claude Code and opencode SHALL invoke the routed design coordinator/i);
  assert.match(spec, /no supported entrypoint SHALL require a legacy loader/i);
  assert.doesNotMatch(artifact('sai/commands/design/instructions.md'), /sai\/orchestration\/inline-invocation\.md/);
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
  const worker = artifact('sai/commands/design/worker.md');

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

  const utilityCommands = ['archive', 'backfill', 'commit', 'explore', 'pr', 'status', 'worktree'];
  const activeSources = [
    ...utilityCommands.map(name => artifact(`sai/commands/${name}/body.md`)),
    artifact('sai/commands/apply/coordinator.md'),
    artifact('sai/commands/apply/invocation.md'),
    artifact('sai/commands/apply/runner.md'),
    artifact('sai/commands/apply/red-worker.md'),
    artifact('sai/commands/apply/green-worker.md'),
    artifact('sai/commands/commit/instructions.md'),
    artifact('sai/commands/spec/coordinator.md'),
    artifact('sai/commands/design/coordinator.md'),
    artifact('sai/commands/design/worker.md'),
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

test('Step 2 design adapter opts into recovery through the same worker and reports bounded attempt metadata', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(coordinator, /recovery_policy\s*:\s*true/,
    'the design adapter should explicitly opt into recovery');
  assert.match(coordinator, /continue_after_recovery/,
    'the design adapter should acknowledge recovery through continue_after_recovery');
  assert.match(worker, /continue_after_recovery/,
    'the design worker should consume the recovery continuation');
  assert.match(coordinator, /(?:failure_class|failure class)[\s\S]{0,260}(?:attempt ordinal|attempts spent|ordinal)/i,
    'the coordinator should report the failure class together with the attempt ordinal');
  assert.match(worker, /(?:failure_class|failure class)[\s\S]{0,260}(?:attempt ordinal|attempts spent|ordinal)/i,
    'the worker contract should preserve the failure class and attempt ordinal');
  assert.match(coordinator, /recovery[\s\S]{0,360}(?:same[- ]worker|same worker)/i,
    'design recovery should remain on the same worker');
  assert.match(coordinator, /recovery[\s\S]{0,420}(?:never|must not|not)[\s\S]{0,160}replacement worker/i,
    'design recovery must never route through a replacement worker');
});

const DESIGN_WORKER_CONTRACT_PROMPT =
  'Worker contract: Fetch @sai/commands/design/worker.md and follow it exactly.';

test('Step 2 both harness design bindings fetch the identical neutral design worker contract', () => {
  for (const harness of ['claude', 'opencode']) {
    const binding = matrixBinding(harness, 'design');
    assert.equal(countLiteral(binding, DESIGN_WORKER_CONTRACT_PROMPT), 1,
      `${harness} design binding should fetch the shared neutral worker contract exactly once`);
    assert.match(binding, new RegExp(DESIGN_WORKER_CONTRACT_PROMPT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${harness} design binding should embed the identical worker-contract prompt substring`);
  }
});

test('Step 2 the shared contract and template preserve the same five-field contract; the schema instruction does not restate it', () => {
  const fiveFields = ['status', 'changed_files', 'validation', 'failure_details', 'failure_kind'];

  // The shared generation contract carries the closed five-field envelope.
  const instruction = artifact('sai/commands/design/change-overview.md');
  for (const field of fiveFields) {
    assert.match(instruction, new RegExp('`' + field + '`'),
      `sai/commands/design/change-overview.md should preserve the ${field} field`);
  }

  // The schema change-overview instruction is an informative reference only and
  // MUST NOT restate the five-field envelope.
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  assert.match(schema, /sai\/commands\/design\/change-overview\.md/);
  const overviewInstruction = schema.slice(
    schema.indexOf('id: change-overview'),
    schema.indexOf('id: implementation'),
  );
  for (const field of fiveFields) {
    assert.doesNotMatch(overviewInstruction, new RegExp('`' + field + '`'),
      `schema change-overview instruction must not restate the ${field} field`);
  }

  // The change-overview template continues to reference the five-field contract.
  const template = artifact('openspec/schemas/sai-workflow/templates/change-overview.md');
  assert.match(template, /five generator fields|five[\s\S]{0,20}fields?/,
    'the change-overview template should preserve the same five-field contract reference');
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

  for (const text of [readme, agents]) {
    assert.match(text, /sai-2-design/);
    assert.match(text, /openspec\/changes\/\{change-name\}\/design\.md|design\.md/);
    assert.match(text, /tasks\.md/);
    assert.match(text, /interfaces\.md/);
  }
  for (const text of [claude, opencode]) {
    assert.match(text, /sai\/install-manifest\.json/);
    assert.match(text, /doctor/);
    assert.match(text, /uninstall/);
    assert.match(text, /sai\/policies/);
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

  for (const text of [readme, agents]) {
    assert.match(text, /sai\/install-manifest\.json/);
    assert.match(text, /doctor/);
    assert.match(text, /uninstall/);
    assert.match(text, /sai\/policies/);
  }
  for (const text of [claude, opencode]) {
    assert.match(text, /sai\/install-manifest\.json/);
    assert.match(text, /doctor/);
    assert.match(text, /uninstall/);
    assert.match(text, /sai\/policies/);
    assert.match(text, /sai\/orchestration/);
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
      Buffer.from(matrixAgent('claude', 'design')),
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
  const instruction = artifact('sai/commands/design/instructions.md');
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
  const instruction = artifact('sai/commands/design/instructions.md');

  assert.match(instruction, /extract(?:ed|s)?[\s\S]{0,200}`## Target State`|`## Target State`[\s\S]{0,200}extract(?:ed|s)?/i,
    'the instruction should reference the extracted ## Target State block comparison');
  assert.match(instruction, /normalize[\s\S]{0,180}(?:line endings|CRLF)[\s\S]{0,180}trailing whitespace/i,
    'the comparison should normalize line endings and trailing whitespace');
  assert.match(instruction, /(?:only when|only if)[\s\S]{0,160}differ|differ[\s\S]{0,160}(?:present|display)|present(?:ed)?[\s\S]{0,120}only[\s\S]{0,120}differ/i,
    'the block comparison should be presented only when the blocks differ');
  assert.match(instruction, /None — no step contracts/,
    'the instruction should define the exact None — no step contracts sentinel');
});

test('routed Claude wrappers expose the exact coordinator and panel tool scope', () => {
  const routedWrappers = [
    'commands/claude/sai-2-design.md',
    'commands/claude/sai-3-implement.md',
    'commands/claude/sai-5-review.md',
    'commands/claude/sai-6-security.md',
    'commands/claude/sai-7-performance.md',
    'commands/claude/sai-8-accessibility.md',
  ];
  const routedTools = ['Read', 'Glob', 'Skill', 'Agent', 'SendMessage', 'AskUserQuestion', 'TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList'];

  for (const relativePath of routedWrappers) {
    const source = artifact(relativePath);
    const match = source.match(/^allowed-tools:\s*(.+)$/m);
    assert.ok(match, `${relativePath} should declare allowed-tools`);
    const toolNames = match[1].split(',').map(tool => tool.trim());
    assert.deepEqual(toolNames, routedTools,
      `${relativePath} should keep the exact routed scope with panel tools`);
    for (const forbidden of ['Edit', 'Write', 'Grep', 'Bash']) {
      assert.equal(match[1].includes(forbidden), false,
        `${relativePath} must not expose ${forbidden}`);
    }
  }
});

test('Claude apply declares its existing execution capabilities and panel tools explicitly', () => {
  const source = artifact('commands/claude/sai-4-apply.md');
  assert.match(source, /^allowed-tools: Read, Glob, Grep, Edit, Write, Bash, Skill, Agent, SendMessage, AskUserQuestion, TaskCreate, TaskUpdate, TaskGet, TaskList$/m);
  assert.doesNotMatch(source, /^allowed-tools:[^\n]*\bTask\b/m);
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
  assert.match(status, /Fetch @sai\/adapters\/claude\/boot\.md and follow it\./);
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
  const coordinator = artifact('sai/orchestration/command-runner.md');

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
  const coordinator = artifact('sai/orchestration/command-runner.md');

  assert.match(coordinator, /optional[\s\S]{0,120}progress_plan|progress_plan[\s\S]{0,120}optional/i,
    'progress_plan should be optional in the phase-adapter field set');
  assert.match(coordinator, /static[\s\S]{0,200}(?:ordered|order)|(?:ordered|order)[\s\S]{0,200}progress_plan|progress_plan[\s\S]{0,200}(?:static|ordered)/i,
    'progress_plan should be static and ordered');
  assert.match(coordinator, /(?:fully known|known) at dispatch[\s\S]{0,160}progress_plan|progress_plan[\s\S]{0,240}(?:immutable|never changes|fixed at dispatch)/i,
    'progress_plan should be fully known at dispatch and immutable for the invocation or active adapter segment');
  assert.match(coordinator, /immutable[\s\S]{0,80}(?:invocation|active adapter segment)/i,
    'progress_plan immutability accepts invocation or active-adapter-segment scope');
});

test('chained phase composition: consecutive-only activation, malformed close, isolation continuity, final-only terminal', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /ordered[\s\S]{0,80}(?:sequence|list)[\s\S]{0,80}phase adapter/i,
    'composition must declare ordered multi-adapter execution');
  assert.match(runner, /(?:only|exactly)[\s\S]{0,80}(?:successor|adapter)[\s\S]{0,80}i\s*\+\s*1|position `?i\s*\+\s*1`?/i,
    'only the consecutive successor at i+1 may activate');
  assert.match(runner, /malformed[\s\S]{0,200}(?:close|without advancing)|without advancing/i,
    'malformed transitions and failed/cancelled outcomes close without advancing');
  assert.match(runner, /Isolation Mode[\s\S]{0,200}(?:shall not|must not|does not)[\s\S]{0,120}(?:clear|reset)[\s\S]{0,120}supervisor/i,
    'chained Isolation Mode must preserve supervisor state');
  assert.match(runner, /(?:final|sole)[\s\S]{0,120}terminal_navigation|only the final adapter/i,
    'only the final (or sole) adapter emits the closing terminal');
  assert.match(runner, /single phase adapter[\s\S]{0,160}(?:unchanged|one-phase)|one-adapter[\s\S]{0,160}(?:unchanged|identical)/i,
    'single-phase invocation must remain unchanged');
  assert.match(runner, /progress_plan[\s\S]{0,240}(?:active adapter segment|immutable for the active)/i,
    'progress_plan immutability is per active adapter segment under composition');
});

test('Step 2: a progress event reporting an undeclared step id is ignored; the plan is never extended or amended', () => {
  const coordinator = artifact('sai/orchestration/command-runner.md');

  assert.match(coordinator, /undeclared/,
    'the contract should address undeclared step ids');
  assert.match(coordinator, /(?:ignored|ignore)[\s\S]{0,240}undeclared|undeclared[\s\S]{0,240}(?:ignored|ignore)/i,
    'a progress event listing an undeclared step id should be ignored');
  assert.match(coordinator, /never[\s\S]{0,100}(?:extended|amended)|(?:extended|amended)[\s\S]{0,100}never/i,
    'the plan should never be extended or amended');
});

test('Step 2: progress-event paths join the changed-file union in first-seen order and are never reset', () => {
  const coordinator = artifact('sai/orchestration/command-runner.md');

  assert.match(coordinator, /continue_after_progress/,
    'the lifecycle should continue the same worker with continue_after_progress');
  assert.match(coordinator, /(?:first[- ]seen|first seen)[\s\S]{0,120}order|order[\s\S]{0,120}(?:first[- ]seen|first seen)/i,
    'union joins should preserve first-seen order');
  assert.match(coordinator, /(?:union|changed[- ]?files)[\s\S]{0,240}(?:never|not)[\s\S]{0,60}reset|reset[\s\S]{0,240}(?:never|not)[\s\S]{0,120}(?:union|changed[- ]?files)/i,
    'a progress event should never reset the union');
});

test('Step 2: the union non-reset enumeration includes progress events', () => {
  const coordinator = artifact('sai/orchestration/command-runner.md');

  assert.match(coordinator, /event:\s*progress|event\s*=\s*progress|progress event/i,
    'the lifecycle should handle progress events');
  assert.match(coordinator, /non[- ]reset[\s\S]{0,200}enumerat|enumerat[\s\S]{0,200}non[- ]reset/i,
    'the union enumeration should be non-reset');
  assert.match(coordinator, /enumerat[\s\S]{0,200}progress|progress[\s\S]{0,200}enumerat/i,
    'the non-reset enumeration should include progress events');
});

// ─── Step 3: command-progress-plan-protocol (worker-lifecycle.md) ───────────

test('Step 3: worker-lifecycle defines the progress-event block with exactly event: progress, step_ids, changed_files, nonterminal status, and protocol-only continue_after_progress', () => {
  const lifecycle = artifact('sai/orchestration/worker-core.md');

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
  const lifecycle = artifact('sai/orchestration/worker-core.md');

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
  const lifecycle = artifact('sai/orchestration/worker-core.md');

  assert.match(lifecycle, /design[\s\S]{0,200}spec[- ]proposal[\s\S]{0,200}implementation[- ]planning[\s\S]{0,200}review[\s\S]{0,200}security[\s\S]{0,200}performance[\s\S]{0,200}accessibility/i,
    'the emitter set should name all seven routed workers in order');
  assert.match(lifecycle, /SHALL[\s\S]{0,160}(?:return|emit)[\s\S]{0,240}(?:one progress event|new plan steps?)/i,
    'emission should be a SHALL obligation for planned workers with newly completed steps');
  assert.match(lifecycle, /emit[\s\S]{0,240}after[\s\S]{0,160}resolution|after[\s\S]{0,160}resolution[\s\S]{0,240}emit/i,
    'emission should be gated after prerequisite checks and scope resolution');
  assert.match(lifecycle, /no progress plan[\s\S]{0,240}(?:may emit no|optional|unchanged|payload validation)/i,
    'only plan-absent workers or planned workers with no new step may emit none');
  assert.match(lifecycle, /unchanged|payload validation/i,
    'the plan-absent carve-out should preserve payload validation');
});

// ─── Step 4: command-progress-plan-protocol (design coordinator.md) ─────────

test('Step 3: the design coordinator declares exactly the seven ordered progress-plan step ids and labels', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.deepEqual(declaredStepLines(coordinator), DESIGN_PROGRESS_PLAN_LINES,
    'the coordinator plan declaration should be exactly the seven canonical id/label lines in order');
});

test('Step 3: the design worker enumerates the same seven step ids and labels byte-for-byte as the coordinator', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const worker = artifact('sai/commands/design/worker.md');

  assert.deepEqual(declaredStepLines(worker), DESIGN_PROGRESS_PLAN_LINES,
    'the worker should enumerate exactly the same seven canonical id/label lines in order');
  assert.deepEqual(declaredStepLines(worker), declaredStepLines(coordinator),
    'the worker enumeration should equal the coordinator plan declaration byte-for-byte');
});

test('Step 3: no standalone specs-approval or artifacts step id remains declared in the design plan', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const worker = artifact('sai/commands/design/worker.md');

  for (const retired of RETIRED_DESIGN_PLAN_IDS) {
    assert.equal(declaredStepLines(coordinator).some(line => line.startsWith(`${retired}:`)), false,
      `the coordinator plan should declare no ${retired} step`);
    assert.equal(declaredStepLines(worker).some(line => line.startsWith(`${retired}:`)), false,
      `the worker enumeration should declare no ${retired} step`);
  }
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
  const policy = artifact('sai/policies/todo-structure.md');

  assert.match(coordinator, /at dispatch/i,
    'the full plan should render at dispatch');
  assert.match(
    policy,
    /render precedes the dispatch call itself, not merely the first worker result/i,
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
  const worker = artifact('sai/commands/design/worker.md');

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
  const worker = artifact('sai/commands/design/worker.md');

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

test('Step 3: the startup act emits exactly one progress event carrying only prereqs-resolution', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /startup act|startup[- ]act/i,
    'the contract should name the startup act');
  assert.match(
    worker,
    /(?:fast[- ]track|prereqs?|prerequisites)[\s\S]{0,320}(?:approv|gate)[\s\S]{0,320}(?:resolution|startup)|(?:resolution|startup)[\s\S]{0,320}(?:approv|gate)[\s\S]{0,320}(?:fast[- ]track|prereqs?|prerequisites)/i,
    'the startup act should bundle fast-track parsing, prerequisites, the specs approval gate, and resolution'
  );
  assert.match(
    worker,
    /(?:one|single)[\s\S]{0,200}(?:startup|event)[\s\S]{0,160}progress|progress[\s\S]{0,160}(?:one|single)[\s\S]{0,200}(?:startup|event)/i,
    'the startup act should emit exactly one progress event'
  );
  assert.match(
    worker,
    /carri(?:es|ed|ing)?[\s\S]{0,160}only[\s\S]{0,120}["'`]?prereqs-resolution["'`]?/i,
    'the startup event should carry only prereqs-resolution'
  );
  assert.doesNotMatch(
    worker,
    /step_?ids?:[\s\S]{0,120}["'`]?specs-approval["'`]?/i,
    'no progress event should carry specs-approval as a step id'
  );
});

test('Step 5: the run closes with exactly one terminal lifecycle status, never a progress event in place of a terminal payload (terminal-payload-still-closes)', () => {
  const worker = artifact('sai/commands/design/worker.md');

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

test('Step 6: the design coordinator and policy update the harness task list on each progress event, marking reported ids completed and the leading unmarked step in_progress (claude-task-list-update / claude-marks-a-progress-batch)', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');

  assert.match(coordinator, /progress event/i,
    'the coordinator should act on each progress event');
  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral todo-structure policy');
  assert.match(policy, /completed[\s\S]{0,240}in_progress|in_progress[\s\S]{0,240}completed/i,
    'reported ids should render completed and the leading unmarked step should render in_progress');
  assert.match(policy, /first step in plan order[\s\S]{0,160}not in the marked set renders `in_progress`/i,
    'the in_progress mark should apply to the leading unmarked step');
  assert.match(policy, /deriv/i,
    'the marks should follow the deterministic derivation');
  assert.match(policy, /task list/i,
    'the policy should govern the harness task-list mechanism');
  assert.doesNotMatch(coordinator, /incrementality/i,
    'incrementality is a retired binding-level optimization, not carried by the coordinator');
});

test('Step 6: the design coordinator and policy drive the opencode todowrite rendering with completed, in_progress, and pending states (opencode-todowrite-full-replacement / opencode-replaces-the-full-array)', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');

  assert.match(coordinator, /progress event/i,
    'the todowrite emission should be driven per progress event');
  assert.match(policy, /todowrite/i,
    'the policy should name the opencode todowrite tool');
  assert.match(policy, /pending[\s\S]{0,240}in_progress[\s\S]{0,240}completed/i,
    'the array should map completed, the first incomplete step, and the remaining pending steps');
});

test('Step 6: the policy renders no task list / todowrite call below the three-declared-step threshold (claude-renders-below-threshold-plans / opencode-renders-below-threshold-plans)', () => {
  const policy = artifact('sai/policies/todo-structure.md');

  assert.match(policy, /three/i,
    'the policy should state the declared-step threshold');
  assert.match(policy, /(?:below|fewer than|less than)[\s\S]{0,120}three|three[\s\S]{0,120}(?:below|fewer than|less than)/i,
    'the threshold should be below three declared steps');
  assert.match(policy, /(?:no|without|never)[\s\S]{0,160}(?:task list|todowrite)/i,
    'no task list / todowrite call should be emitted below the threshold');
});

test('Step 6: the neutral policy records the emission-ownership invariant and the opencode subagent-restriction reason (task-list-emission-coordinator-only / worker-never-emits-the-tool-call / opencode-subagent-restriction)', () => {
  const policy = artifact('sai/policies/todo-structure.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(policy, /coordinator[\s\S]{0,200}(?:owns?|emission|exclusively)/i,
    'the policy should record the coordinator-owned emission invariant');
  assert.match(policy, /(?:never|not)[\s\S]{0,160}(?:worker|subagent)|worker[\s\S]{0,120}(?:never|not)/i,
    'the policy should state the worker never emits the tool call');

  assert.match(coordinator, /todo-structure\.md/,
    'the coordinator should reference the neutral todo-structure policy');

  assert.match(policy, /subagent/i,
    'the policy should note the worker is a subagent');
  assert.match(policy, /disabl[\s\S]{0,200}subagent|subagent[\s\S]{0,200}disabl/i,
    'the policy should tie the disabled-by-default tool to the subagent context');
  assert.match(policy, /by default/i,
    'the policy should state the tool is disabled by default in subagents');
});

// ─── Step 2: todo-list-step-timestamps (design coordinator) ─────────────────

test('Step 2: the design coordinator renders task-list stamps coordinator-only via the todo-structure policy, with no shell grant on the wrapper (stamp-emission-coordinator-only)', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const policy = artifact('sai/policies/todo-structure.md');
  const claudeWrapper = artifact('commands/claude/sai-2-design.md');

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
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /--overview-lang <language>/);
  assert.match(worker, /English/);
  assert.match(worker, /missing.*value|value.*missing/i);
  assert.match(worker, /duplicate/i);
  assert.match(worker, /before.*resolution|resolution.*before/i);
  assert.match(worker, /change name.*before|before.*change name/i);
  assert.match(worker, /fast-track.*(?:either|regardless)|(?:either|regardless).*fast-track/i);
});

test('Step 2 carries overview_language through the worker and generation continuation', () => {
  const worker = artifact('sai/commands/design/worker.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const bindings = [
    matrixBinding('claude', 'design'),
    matrixBinding('opencode', 'design'),
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

// ─── Step 3: spec-design-review-progress-step (design granular progress) ────

test('Step 3: research, design, tasks, and interfaces writes emit separate ordered progress batches with only newly changed paths', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(
    worker,
    /separate[\s\S]{0,60}ordered[\s\S]{0,60}(?:progress )?batches?/i,
    'the progress batches should be separate and ordered'
  );
  assert.match(
    worker,
    /only[\s\S]{0,160}newly[\s\S]{0,80}changed|newly[\s\S]{0,80}changed[\s\S]{0,160}only/i,
    'each progress batch should carry only newly changed paths'
  );
  for (const id of ['research', 'design', 'tasks', 'interfaces']) {
    assert.match(
      worker,
      new RegExp(`${id.replace(/-/g, '\\-')}[\\s\\S]{0,60}(?:write|writing|batch)[\\s\\S]{0,160}(?:own|separate|progress|event)|(?:own|separate|progress|event)[\\s\\S]{0,160}${id.replace(/-/g, '\\-')}[\\s\\S]{0,60}(?:write|writing|batch)`, 'i'),
      `the ${id} write act should emit its own progress batch`
    );
  }
});

test('Step 3: external findings cover exactly the three design artifacts without a worker reviewer dispatch', () => {
  const worker = artifact('sai/commands/design/worker.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const source = `${worker}\n${coordinator}`;

  assert.match(source, /external[\s-]+(?:artifact[- ]review )?findings?/i,
    'design review evidence should be supplied externally');
  for (const artifactName of ['design\.md', 'tasks\.md', 'interfaces\.md']) {
    assert.match(source, new RegExp(`external[\\s\\S]{0,500}${artifactName}|${artifactName}[\\s\\S]{0,500}external`, 'i'),
      `${artifactName} should be part of the external findings surface`);
  }
  assert.match(source, /findings?[\s\S]{0,220}(?:only|limited|restricted)[\s\S]{0,180}(?:design\.md|tasks\.md|interfaces\.md)|(?:design\.md|tasks\.md|interfaces\.md)[\s\S]{0,220}(?:only|limited|restricted)[\s\S]{0,180}findings?/i,
    'external findings should be restricted to the three design artifacts');
  assert.match(worker, /does not create the findings, dispatch an artifact reviewer, or own the review operation/i,
    'the design worker must not dispatch or own a reviewer');
  assert.doesNotMatch(worker, /reviewer[\s\S]{0,160}(?:receive|given|gets?|read)/i,
    'the worker must not contain the retired reviewer isolation section');
});

test('Step 3: a valid external design Summary marks review once, rejects missing or malformed evidence, and stays monotonic', () => {
  const worker = artifact('sai/commands/design/worker.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');
  const source = `${worker}\n${coordinator}`;

  assert.match(source, /base[- ]form[\s\S]{0,220}Summary:|Summary:[\s\S]{0,220}base[- ]form/i,
    'design review evidence should use the canonical base-form Summary');
  assert.match(source, /Summary:\s*High=<count>\s*Medium=<count>\s*Low=<count>/i,
    'the design findings contract should preserve the base-form tally');
  assert.match(source, /High=0[\s\S]{0,300}(?:emit|report|mark)[\s\S]{0,180}`?review`?|(?:emit|report|mark)[\s\S]{0,180}`?review`?[\s\S]{0,300}High=0/i,
    'a valid external High=0 Summary should mark the review step');
  assert.match(source, /missing or malformed base-form `?Summary:?[`"']?[\s\S]{0,220}(?:not review completion|does not mark|no `?review`?)/i,
    'missing or malformed Summary evidence must not mark review');
  assert.match(source, /High>0/,
    'High findings should be handled as a distinct non-converged outcome');
  assert.match(source, /High>0[\s\S]{0,120}emits no `?review`?|(?:emits no `?review`?)[\s\S]{0,120}High>0/i,
    'High findings should be processed without a new review mark');
  assert.match(source, /monotonic|once[\s\S]{0,180}(?:marked|completed)[\s\S]{0,180}(?:remain|never)[\s\S]{0,120}(?:marked|unmark|clear)/i,
    'review marks should be monotonic');
});

test('Step 3: after interfaces the design worker proceeds without an automatic reviewer', () => {
  const worker = artifact('sai/commands/design/worker.md');

  assert.match(worker, /interfaces\.md[\s\S]{0,500}(?:overview|next|proceed|complete)|(?:overview|next|proceed|complete)[\s\S]{0,500}interfaces\.md/i,
    'the post-interfaces path should proceed to the next design outcome');
  assert.match(worker, /does not create the findings, dispatch an artifact reviewer, or own the review operation/i,
    'the worker must not start an automatic reviewer after interfaces');
});

test('Step 3: a pre-gate completed design result leaves the overview step unmarked and performs no reconciliation', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(
    coordinator,
    /(?:pre-?gate|before the gate|ahead of the gate)[\s\S]{0,240}(?:completed|terminal|result)/i,
    'the coordinator should address pre-gate completed results'
  );
  assert.match(
    coordinator,
    /overview[\s\S]{0,200}(?:remains|stay)[\s\S]{0,120}(?:unmarked|unmark|not marked)/i,
    'the overview step should remain unmarked before the gate closes'
  );
  assert.match(
    coordinator,
    /(?:pre-?gate|before the gate)[\s\S]{0,300}(?:no|never|without)[\s\S]{0,120}reconcil|(?:no|never|without)[\s\S]{0,120}reconcil[\s\S]{0,300}(?:pre-?gate|before the gate)/i,
    'no reconciliation should occur on a pre-gate completed result'
  );
});

test('Step 3: a post-gate successful overview terminal reconciles every eligible unmarked step except review', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(
    coordinator,
    /(?:post-?gate|after the gate)[\s\S]{0,300}(?:overview|generation)[\s\S]{0,160}(?:terminal|success)/i,
    'the reconciliation rule should apply to the post-gate successful overview terminal'
  );
  assert.match(coordinator, /reconcil/i,
    'the coordinator should own the terminal reconciliation');
  assert.match(
    coordinator,
    /reconcil[\s\S]{0,300}(?:eligible[\s\S]{0,120}unmarked|unmarked)[\s\S]{0,160}except[\s\S]{0,80}`?review`?/i,
    'reconciliation should cover every eligible unmarked step except review'
  );
});

test('Step 3: a failed overview terminal leaves the plan list unchanged and reconciles nothing', () => {
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(
    coordinator,
    /failed[\s\S]{0,300}(?:overview|generation)[\s\S]{0,300}(?:terminal|result|outcome)/i,
    'the coordinator should address a failed overview terminal'
  );
  assert.match(
    coordinator,
    /(?:list|plan)[\s\S]{0,160}unchanged|unchanged[\s\S]{0,160}(?:list|plan)/i,
    'a failed overview terminal should leave the list unchanged'
  );
  assert.match(
    coordinator,
    /failed[\s\S]{0,400}(?:no|without|never)[\s\S]{0,160}reconcil|(?:no|without|never)[\s\S]{0,160}reconcil[\s\S]{0,400}failed/i,
    'a failed overview terminal should reconcile nothing'
  );
});

test('Step 1: design artifact feedback gate uses explicit modes while the coordinator supplies only interactive parameters', () => {
  const gate = artifact('sai/policies/artifact-feedback-gate.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(gate, /`mode`[\s\S]{0,180}optional|optional[\s\S]{0,180}`mode`/i);
  assert.match(gate, /interactive/);
  assert.match(gate, /supervised/);
  assert.match(gate, /##[^\n]*supervised/i);
  assert.match(coordinator, /artifacts\s*=\s*design\.md,\s*tasks\.md,\s*interfaces\.md/);
  assert.match(coordinator, /proceed-label\s*=\s*Continue/);

  const gateUse = coordinator.slice(
    coordinator.indexOf('Fetch @sai/policies/artifact-feedback-gate.md'),
    coordinator.indexOf('Fetch @sai/policies/artifact-feedback-gate.md') + 700,
  );
  assert.doesNotMatch(gateUse, /(?:^|[\s,(`])mode\s*[:=]/i);
});

test('Step 3: design worker leaves mode-dependent gate ownership to the coordinator without mode-aware workers', () => {
  const worker = artifact('sai/commands/design/worker.md');
  const coordinator = artifact('sai/commands/design/coordinator.md');

  assert.match(worker, /External findings consumption|findings MUST be supplied by an external `?sai-explore`?/i,
    'the design worker should consume external findings rather than own review mode');
  assert.match(worker, /does not create the findings, dispatch an artifact reviewer, or own the review operation/i,
    'the design worker should not own a reviewer or review mode');
  assert.doesNotMatch(worker, /coexists? with and never replaces the supervised pipeline/i,
    'the retired worker-owned review coexistence wording should be absent');
  assert.doesNotMatch(
    coordinator,
    /(?:^|[\s,(`])mode\s*[:=]\s*(?:interactive|supervised)/i,
    'the standalone design coordinator should omit mode from its gate invocation',
  );
  assert.match(
    coordinator,
    /Design done in openspec\/changes\/\{name\}\/\. Run \\?`\/sai-3-implement \{name\}\\?` \*\*in a new chat\*\* when ready\./i,
    'standalone design completion should end with the Continue handoff sentence',
  );
  assert.doesNotMatch(
    coordinator,
    /(?:mode\s*[:=]\s*supervised[\s\S]{0,360}(?:overview-generation|change-overview)|(?:overview-generation|change-overview)[\s\S]{0,360}mode\s*[:=]\s*supervised)/i,
    'standalone design should not couple supervised mode to overview generation',
  );
});

test('Step 6 compatibility keeps diagnosis-driven recovery shared, apply-owned, and out of the design registry', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  const apply = [
    artifact('sai/commands/apply/coordinator.md'),
    artifact('sai/commands/apply/runner.md'),
    artifact('sai/commands/apply/invocation.md'),
  ].join('\n');
  const design = artifact('sai/commands/design/coordinator.md');
  const diagnosisRecovery = /diagnosis[- ]driven recovery|distinct[- ]diagnosis|diagnosis[_ -]?key/i;

  assert.match(runner, diagnosisRecovery,
    'the shared command runner should carry diagnosis-driven recovery');
  assert.match(apply, diagnosisRecovery,
    'the apply route should carry diagnosis-driven recovery');

  assert.match(design, /recovery_policy\s*:\s*true/,
    'the design adapter should retain its recovery policy opt-in');

  const registryDeclaration = /The sole runtime registry for this algorithm is:/i;
  const registryRow = /\|\s*design-overview-repair\s*\|/i;
  assert.match(runner, registryDeclaration,
    'the shared command runner should declare the sole recovery registry');
  assert.equal(countLiteral(runner, '| design-overview-repair |'), 1,
    'the shared command runner should contain exactly one registered recovery surface');
  assert.match(runner, registryRow,
    'the shared command runner should contain the registered recovery surface');
  for (const [surface, source] of [
    ['design coordinator', design],
    ['apply route', apply],
  ]) {
    assert.doesNotMatch(source, registryDeclaration,
      `${surface} must not redeclare the recovery registry`);
    assert.doesNotMatch(source, registryRow,
      `${surface} must not contain a recovery registry row`);
  }
});

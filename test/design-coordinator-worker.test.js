'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function artifact(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.ok(fs.existsSync(fullPath), `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

// ─── specs/deduplicate-sai-2-design/spec.md ────────────────────────────────

test('design wrappers activate routed Claude/opencode entry and preserve inline Copilot boundary', () => {
  const claude = artifact('commands/claude/sai-2-design.md');
  const opencode = artifact('commands/opencode/sai-2-design.md');
  const copilot = artifact('commands/copilot/sai-2-design.prompt.md');

  assert.match(claude, /^model: claude-opus-4-8$/m);
  assert.match(claude, /^effort: low$/m);
  assert.match(claude, /^allowed-tools: Skill, Agent, SendMessage, AskUserQuestion$/m);
  assert.match(claude, /sai-design-planning-worker/);
  assert.match(claude, /sai-implementation-planning-worker/);
  assert.match(claude, /sai-2-design\.md/);

  assert.doesNotMatch(opencode, /^model:/m);
  assert.match(opencode, /^agent: sai-design-coordinator$/m);
  assert.match(opencode, /^subtask: false$/m);
  assert.match(opencode, /sai-design-planning-worker/);
  assert.match(opencode, /sai-implementation-planning-worker/);
  assert.match(opencode, /sai-2-design\.md/);
  assert.ok(opencode.includes('**Change-name argument and and optional flags:** $ARGUMENTS'));

  assert.match(copilot, /model: Claude Opus 4\.8 \(copilot\)/);
  assert.match(copilot, /tools: \[vscode, read, search, edit, execute, web\]/);
  assert.match(copilot, /sai-2-design-inline\.md/);
  assert.doesNotMatch(copilot, /sai-design-planning-worker|sai-implementation-planning-worker/);

  const spec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.match(spec, /inactive[- ]infrastructure[- ]boundary/i);
  assert.match(spec, /all three.*wrappers/i);
});

test('shared feedback gate defines routed design ownership without changing canonical gate rules', () => {
  const gate = artifact('sai/instructions/artifact-feedback-gate.md');
  assert.match(gate, /Routed design ownership adapter/);
  assert.match(gate, /sai-1-spec.*inline Copilot retain all existing inline behavior/i);
  assert.match(gate, /coordinator owns picker presentation.*iteration counter.*pending raw feedback/i);
  assert.match(gate, /worker owns per-item judgment.*design-artifact edits.*verification.*discard reasons.*summary/i);
  assert.match(gate, /single-sourced in their existing sections/i);
});

test('routed design coordinator has no technical I/O and owns only lifecycle routing', () => {
  const coordinator = artifact('sai/commands/sai-2-design.md');
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
  assert.doesNotMatch(spec, /worker.*payload.*(?:agent.*ID|task.*ID)/i);
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
  assert.match(spec, /sai-implementation-planning-worker/);
  assert.match(spec, /sai-design-planning-worker/);
  assert.match(spec, /\*.*deny/);
});

test('design worker denies all task targets before allowing only explore', () => {
  const spec = artifact('openspec/specs/design-harness-bindings/spec.md');

  assert.match(spec, /explore.*allow|allow.*explore/i);
  assert.match(spec, /task\['\*'\]|task\.\*.*deny/i);
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

// ─── Harness-specific tests ────────────────────────────────────────────────

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
  const copilot = artifact('INSTALL.copilot.md');

  for (const text of [readme, agents, claude, opencode, copilot]) {
    assert.match(text, /sai-2-design/);
    assert.match(text, /openspec\/changes\/\{change-name\}\/design\.md|design\.md/);
    assert.match(text, /tasks\.md/);
    assert.match(text, /interfaces\.md/);
  }

  assert.match(readme, /sai-design-planning-worker/);
  assert.match(agents, /sai-design-planning-worker/);

  assert.match(readme, /Claude Code.*low-effort.*coordinator.*high-effort.*design worker/i);
  assert.match(readme, /opencode.*GLM 5\.2.*variant: high/i);
  assert.match(readme, /continue_after_notice/);
  assert.match(readme, /Continue now.*fresh namespace/i);
  assert.match(readme, /Proposal Complexity.*descriptive/i);
  assert.match(readme, /named.*agent.*not.*command.*model/i);

  assert.match(agents, /design-invocation-core\.md/);
  assert.match(agents, /design-worker\.md/);
  assert.match(agents, /agents\/claude\/sai-design-planning-worker\.md/);
  assert.match(agents, /skills\/claude\/sai-design-planning-worker\/SKILL\.md/);
  assert.match(agents, /skills\/opencode\/sai-design-planning-worker\/SKILL\.md/);
  assert.match(agents, /fresh namespace/i);
  assert.match(agents, /Copilot.*inline.*adapter/i);

  assert.match(claude, /\.sai-design-planning-worker\.owner\.json/);
  assert.match(claude, /low[- ]effort/);
  assert.match(claude, /high[- ]effort/);
  assert.match(claude, /collision/i);
  assert.match(claude, /does not adopt|without adoption|non-adopt/i);
  assert.match(claude, /restart.*re-?install|re-?install.*restart/i);

  assert.match(opencode, /sai-design-coordinator/);
  assert.match(opencode, /sai-design-planning-worker/);
  assert.match(opencode, /variant.*high/);
  assert.match(opencode, /permission/);
  assert.match(opencode, /agent: sai-design-coordinator/);
  assert.match(opencode, /subtask: false/);
  assert.match(opencode, /no `model` field|no model field/i);
  assert.match(opencode, /collision/i);
  assert.match(opencode, /excludes?.*opencode\.json|opencode\.json.*excludes?/i);
  assert.match(opencode, /restart opencode/i);

  assert.match(copilot, /remains inline/i);
  assert.match(copilot, /no portable cross-turn continuation contract/i);
  assert.match(copilot, /budget-explorer/);
  assert.match(copilot, /subagent support/i);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { auditActiveReferences } = require('../bin/orchestration-source-audit.js');
const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const { readProjected, commandTools } = require('./helpers/capability-source');
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
  return readProjected(relativePath);
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeTempDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Step 3: spec-design-review-progress-step — interface stubs ────────────
// The Step 3 interface stubs expose the required contract symbols (the
// opted-in six-step and unopted five-step design progress plans and the
// retired step ids) as pure data with no
// production logic. The assertions below compare the production instruction
// surface against these stubs, so a RED run fails until the GREEN body lands
// the contract.

const OPTED_IN_DESIGN_PROGRESS_PLAN = [
  ['prereqs-resolution', 'Resolve change'],
  ['research', 'Research and resolve open questions'],
  ['design', 'Write design.md'],
  ['tasks', 'Write tasks.md'],
  ['interfaces', 'Write interfaces.md'],
  ['overview', 'Generate change-overview.md'],
];
const UNOPTED_DESIGN_PROGRESS_PLAN = OPTED_IN_DESIGN_PROGRESS_PLAN.slice(0, -1);
const OPTED_IN_DESIGN_PROGRESS_PLAN_LINES = OPTED_IN_DESIGN_PROGRESS_PLAN
  .map(([id, label]) => `${id}: "${label}"`);
const UNOPTED_DESIGN_PROGRESS_PLAN_LINES = UNOPTED_DESIGN_PROGRESS_PLAN
  .map(([id, label]) => `${id}: "${label}"`);
const DESIGN_PROGRESS_PLAN_IDS = OPTED_IN_DESIGN_PROGRESS_PLAN.map(([id]) => id);
const RETIRED_DESIGN_PLAN_IDS = ['specs-approval', 'artifacts', 'review'];

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

function countPlanOccurrences(lines, plan) {
  let count = 0;
  for (let start = 0; start <= lines.length - plan.length; start += 1) {
    if (plan.every((line, index) => lines[start + index] === line)) count += 1;
  }
  return count;
}

function assertPlanVariants(source, owner) {
  const lines = declaredStepLines(source);
  assert.ok(
    countPlanOccurrences(lines, OPTED_IN_DESIGN_PROGRESS_PLAN_LINES) >= 1,
    `${owner} should declare the opted-in six-step plan`,
  );
  assert.ok(
    countPlanOccurrences(lines, UNOPTED_DESIGN_PROGRESS_PLAN_LINES) >= 2,
    `${owner} should declare the unopted five-step plan separately from the opted-in prefix`,
  );
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

// ─── specs/deduplicate-sai-2-design/spec.md ────────────────────────────────

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
    schema.indexOf('id: review'),
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
  assert.match(spec, /MUST delegate.*source[- ]code discovery.*explore[\s\S]*SHALL not call Read, Glob, or Grep directly/i,
    'worker should delegate source discovery and forbid direct file reads');
});

// ─── specs/design-coordinator/spec.md ──────────────────────────────────────

test('design coordinator spec defines DesignInvocationEnvelope', () => {
  const spec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.match(spec, /DesignInvocationEnvelope/);
  assert.match(spec, /arguments_value/);
  assert.doesNotMatch(spec, /wrapper_echo_value/,
    'the design invocation envelope must not define wrapper_echo_value');
});

test('design coordinator spec retires the removed continuation route', () => {
  const spec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.doesNotMatch(spec, /Continue[- ]?[Nn]ow|continue-now|continue now/);
});

test('design coordinator spec retires the removed continuation envelope', () => {
  const spec = artifact('openspec/specs/design-coordinator/spec.md');

  assert.doesNotMatch(spec, /ContinueNowEnvelope/);
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
  assert.doesNotMatch(coordinator, /ContinueNowEnvelope/,
    'the removed continuation envelope must remain absent');
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

test('Step 5 documentation records manifest projections and routed-source boundaries', () => {
  const readme = artifact('README.md');
  const guide = artifact('docs/sequential-pipeline.md');
  const agents = artifact('AGENTS.md');

  assert.match(agents, /sai\/install-manifest\.json/);
  assert.match(agents, /doctor/);
  assert.match(agents, /uninstall/);
  assert.match(agents, /sai\/policies/);
  assert.match(readme, /doctor/);
  assert.match(readme, /uninstall/);
  assert.match(readme, /docs\/sequential-pipeline\.md/);
  assert.match(agents, /sai\/orchestration\//);
  assert.match(agents, /shared Orchestration Core/i);
  assert.match(guide, /AGENTS\.md/);
  assert.match(agents, /routed worker bindings/i);
});

test('Step 3 documentation names only routed Claude Code and opencode support', () => {
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

test('Target State contract lives in the design instruction and design template', () => {
  const instruction = artifact('sai/commands/design/steps/design.md');
  const designTemplate = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const interfacesTemplate = artifact('openspec/schemas/sai-workflow/templates/interfaces.md');

  for (const heading of ['### Architecture Snapshot', '### File Manifest']) {
    assert.match(instruction, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `design instruction should contain ${heading}`);
  }

  assert.match(instruction, /## Target State/);

  for (const contract of [designTemplate]) {
    assert.match(contract, /### Architecture Snapshot/);
    assert.match(contract, /### File Manifest/);
  }

  for (const text of [designTemplate]) {
    const targetStateIndex = text.indexOf('## Target State');
    const contextIndex = text.indexOf('## Context');
    assert.ok(targetStateIndex !== -1, 'design surface should contain ## Target State');
    assert.ok(contextIndex !== -1, 'design surface should contain ## Context');
    assert.ok(targetStateIndex < contextIndex,
      '## Target State should be placed before other top-level design sections');
  }
  assert.ok(instruction.indexOf('## Target State') < instruction.indexOf('### Architecture Snapshot'),
    'the design step should deliver Target State before its nested sections');

  assert.doesNotMatch(interfacesTemplate, /## Target State/);
  assert.doesNotMatch(interfacesTemplate, /### Architecture Snapshot/);
  assert.doesNotMatch(interfacesTemplate, /### File Manifest/);
});

test('Claude implement declares its execution capabilities and panel tools explicitly', () => {
  const source = artifact('commands/claude/sai-3-implement.md');
  assert.equal(source.match(/^allowed-tools: (.+)$/m)[1], commandTools('sai-3-implement'));
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
  assert.equal(status.match(/^allowed-tools: (.+)$/m)[1], commandTools('sai-status'));
  assert.match(status, /Fetch @sai\/adapters\/claude\/boot\.md and follow it\./);
  assert.doesNotMatch(status, /allowed-tools:[^\n]*(?:Edit|Write|Bash\s*,)/m);
  assert.doesNotMatch(status, /(?:^|,\s*)Bash\(git(?::|\s|,)/,
    'sai-status must not gain a free git grant');
  const worktree = artifact('commands/claude/sai-worktree.md');
  assert.equal(worktree.match(/^allowed-tools: (.+)$/m)[1], commandTools('sai-worktree'));
});

// ─── Step 2: command-progress-plan-protocol (coordinator-contract.md) ───────

test('Step 2: dispatch passes exactly arguments_value; the plan is not carried in the envelope or any reconstruction field', () => {
  const coordinator = artifact('sai/orchestration/command-runner.md');

  assert.match(coordinator, /exactly[\s\S]{0,120}arguments_value/,
    'the contract should state the dispatch passes exactly arguments_value');
  assert.doesNotMatch(coordinator, /wrapper_echo_value/,
    'the runner must not construct or forward wrapper_echo_value');
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
  // Composition rules live in composition.md, layered on the runner (ADR 0187).
  const runner = `${artifact('sai/orchestration/command-runner.md')}
${artifact('sai/orchestration/composition.md')}`;
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

  assert.match(lifecycle, /design[\s\S]{0,200}spec[- ]proposal[\s\S]{0,200}security[\s\S]{0,200}performance[\s\S]{0,200}accessibility/i,
    'the emitter set should name the five routed workers in order');
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

// ─── Step 5: command-progress-plan-protocol (sai-2-design-worker.md) ────────

// ─── Step 6: command-progress-plan-protocol (design-worker bindings) ─────────

test('Step 6: the policy renders no task list / todowrite call below the three-declared-step threshold (claude-renders-below-threshold-plans / opencode-renders-below-threshold-plans)', () => {
  const policy = artifact('sai/policies/todo-structure.md');

  assert.match(policy, /three/i,
    'the policy should state the declared-step threshold');
  assert.match(policy, /(?:below|fewer than|less than)[\s\S]{0,120}three|three[\s\S]{0,120}(?:below|fewer than|less than)/i,
    'the threshold should be below three declared steps');
  assert.match(policy, /(?:no|without|never)[\s\S]{0,160}(?:task list|todowrite)/i,
    'no task list / todowrite call should be emitted below the threshold');
});

// ─── Step 2: todo-list-step-timestamps (design coordinator) ─────────────────

// ─── Step 6: command-progress-plan-protocol (audit documentation) ───────────

test('documentation records the audit orientation section, which retired the panel progress plan', () => {
  const agents = artifact('AGENTS.md');

  assert.match(agents, /### Audit coordinators and workers/,
    'AGENTS.md should record the audit coordinator/worker orientation section');
  const section = agents.slice(agents.indexOf('### Audit coordinators and workers'), agents.indexOf('### Commit coordinator and worker'));
  assert.match(section, /run outside the shared orchestration, in the shape of `\/sai-4-review`/);
  assert.doesNotMatch(section, /Milestone Stamp|progress plan|todo-structure/,
    'the audit orientation section states no panel plan: the audits render none');
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
    'sai/commands/design/invocation.md',
    'sai/commands/review/invocation.md',
    'sai/commands/security/invocation.md',
    'sai/commands/performance/invocation.md',
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

    assert.equal(lineBearingReferences.length, 15);
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

// ─── RED slice: single-source design artifact contract pointers ─────────────

const DESIGN_ARTIFACT_POINTERS = [
  { id: 'design', anchor: '### Generate design.md' },
  { id: 'tasks', anchor: '### Generate tasks.md' },
  { id: 'interfaces', anchor: '### Generate interfaces.md' },
];

const DESIGN_INSTRUCTION_FORBIDDEN_SUBSTRINGS = [
  'ADR/DDR',
  'Record family',
  'Provenance',
  'Verify-first',
  'Architecture Snapshot',
  'File Manifest',
  'None — no step contracts',
  'Endpoint Map',
  '**Routing**',
  '**Files Affected**',
  '**Testing Strategy**',
];

const PRE_CHANGE_DESIGN_GRAPH = Object.freeze({
  design: { generates: 'design.md', requires: ['proposal', 'specs'] },
  tasks: { generates: 'tasks.md', requires: ['specs', 'design'] },
  interfaces: { generates: 'interfaces.md', requires: ['tasks'] },
  apply: { requires: ['tasks'], tracks: ['tasks.md'] },
});

function escapeSchemaContractRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function schemaIdHeader(line) {
  return line.match(/^(\s*)(?:-\s*)?id:\s*([A-Za-z0-9_-]+)\s*(?:#.*)?$/);
}

function schemaEntryForContract(schema, id) {
  const lines = schema.split(/\r?\n/);
  const start = lines.findIndex(line => {
    const match = schemaIdHeader(line);
    return match && match[2] === id;
  });
  assert.ok(start >= 0, `schema.yaml should contain the ${id} artifact entry`);

  const header = schemaIdHeader(lines[start]);
  const headerIndent = header[1].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = schemaIdHeader(lines[index]);
    if (match && match[1].length <= headerIndent) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function schemaLiteralBlockForContract(section, field) {
  const lines = section.split(/\r?\n/);
  const markerPattern = new RegExp(`^(\\s*)${field}:\\s*\\|[+-]?\\s*$`);
  const markerIndex = lines.findIndex(line => markerPattern.test(line));
  assert.ok(markerIndex >= 0, `${field} should be a literal block`);

  const markerIndent = lines[markerIndex].match(/^\s*/)[0].length;
  let end = lines.length;
  for (let index = markerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && line.match(/^\s*/)[0].length <= markerIndent) {
      end = index;
      break;
    }
  }

  const body = lines.slice(markerIndex + 1, end);
  const nonEmpty = body.filter(line => line.trim());
  assert.ok(nonEmpty.length > 0, `${field} literal block should not be empty`);
  const contentIndent = Math.min(...nonEmpty.map(line => line.match(/^\s*/)[0].length));
  return body.map(line => line.trim() ? line.slice(contentIndent) : '').join('\n').trim();
}

function schemaFieldForContract(section, field) {
  const lines = section.split(/\r?\n/);
  const fieldPattern = new RegExp(`^([ \\t]*)${field}:[ \\t]*(.*)$`);
  const fieldIndex = lines.findIndex(line => fieldPattern.test(line));
  assert.ok(fieldIndex >= 0, `schema section should contain ${field}`);
  const match = lines[fieldIndex].match(fieldPattern);
  if (/^\|[+-]?\s*$/.test(match[2].trim())) {
    return schemaLiteralBlockForContract(section, field);
  }
  if (match[2].trim() === '') {
    const fieldIndent = match[1].length;
    const items = [];
    for (let index = fieldIndex + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.trim()) continue;
      const indent = line.match(/^[ \t]*/)[0].length;
      if (indent < fieldIndent || (indent === fieldIndent && !line.trim().startsWith('-'))) break;
      if (line.trim().startsWith('-')) items.push(line.trim().slice(1).trim());
    }
    if (items.length > 0) return `[${items.join(', ')}]`;
  }
  return match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
}

function schemaTopLevelSectionForContract(schema, name) {
  const lines = schema.split(/\r?\n/);
  const headerPattern = new RegExp(`^(\\s*)${name}:\\s*$`);
  const start = lines.findIndex(line => headerPattern.test(line));
  assert.ok(start >= 0, `schema.yaml should contain the ${name} section`);

  const headerIndent = lines[start].match(/^\s*/)[0].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && line.match(/^\s*/)[0].length <= headerIndent) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function schemaListForContract(value) {
  const normalized = value.trim();
  const content = normalized.startsWith('[')
    ? normalized.slice(1, normalized.lastIndexOf(']'))
    : normalized;
  if (!content.trim()) return [];
  return content.split(',').map(item => item.trim().replace(/^-\s*/, '').replace(/^(['"])(.*)\1$/, '$2'));
}

test('design artifact schema instructions are non-empty command-owned pointers with no duplicated contract detail', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');

  for (const { id, anchor } of DESIGN_ARTIFACT_POINTERS) {
    const entry = schemaEntryForContract(schema, id);
    const instruction = schemaLiteralBlockForContract(entry, 'instruction');

    assert.ok(instruction.trim().length > 0, `${id} instruction should be non-empty`);
    assert.match(instruction, /sai\/commands\/design\/instructions\.md/,
      `${id} instruction should point to the shared design instruction`);
    assert.match(instruction, new RegExp(escapeSchemaContractRegExp(anchor)),
      `${id} instruction should name its generation anchor`);
    for (const forbidden of DESIGN_INSTRUCTION_FORBIDDEN_SUBSTRINGS) {
      assert.doesNotMatch(instruction, new RegExp(escapeSchemaContractRegExp(forbidden)),
        `${id} instruction should not duplicate ${forbidden}`);
    }
  }
});

test('design artifact schema preserves the fixed pre-change graph baseline and does not advertise Endpoint Map', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  const design = schemaEntryForContract(schema, 'design');
  const description = schemaFieldForContract(design, 'description');
  assert.doesNotMatch(description, /Endpoint Map/,
    'the design description should not advertise Endpoint Map');

  for (const id of ['design', 'tasks', 'interfaces']) {
    const entry = schemaEntryForContract(schema, id);
    const expected = PRE_CHANGE_DESIGN_GRAPH[id];
    assert.equal(schemaFieldForContract(entry, 'generates'), expected.generates,
      `${id} should preserve its pre-change generated artifact`);
    assert.deepEqual(schemaListForContract(schemaFieldForContract(entry, 'requires')), expected.requires,
      `${id} should preserve its pre-change requirements`);
  }

  const apply = schemaTopLevelSectionForContract(schema, 'apply');
  assert.deepEqual(schemaListForContract(schemaFieldForContract(apply, 'requires')),
    PRE_CHANGE_DESIGN_GRAPH.apply.requires,
    'apply should preserve its pre-change requirements');
  assert.deepEqual(schemaListForContract(schemaFieldForContract(apply, 'tracks')),
    PRE_CHANGE_DESIGN_GRAPH.apply.tracks,
    'apply should track tasks.md');
});

// ─── RED slice: single-source design artifact skeleton oracle ───────────────

const DESIGN_SKELETON_TEMPLATES = [
  {
    id: 'design',
    path: 'openspec/schemas/sai-workflow/templates/design.md',
    anchor: '### Generate design.md',
  },
  {
    id: 'tasks',
    path: 'openspec/schemas/sai-workflow/templates/tasks.md',
    anchor: '### Generate tasks.md',
  },
  {
    id: 'interfaces',
    path: 'openspec/schemas/sai-workflow/templates/interfaces.md',
    anchor: '### Generate interfaces.md',
  },
];

const DESIGN_SKELETON_AUTHORITY = 'sai/commands/design/instructions.md';
const DESIGN_SKELETON_FORBIDDEN = [
  'Endpoint Map',
  'None — no step contracts',
  'Hard to reverse',
  'Surprising without context',
  'Real trade-off',
  'domain invariant',
  'ordered routing test',
];

const DESIGN_TOP_LEVEL_SKELETON = [
  '## Target State',
  '## Context',
  '## Goals / Non-Goals',
  '## Decisions',
  '## Risks / Trade-offs',
  '## Migration Plan',
  '## Open Questions',
  '## Manual Verification',
];

const TASKS_SKELETON_MARKERS = [
  '**Routing**',
  '**Files Affected**',
  '**What Will Be Done**',
  '**Testing Strategy**',
  '**Existing Tests Broken**',
  '## Required Documentation',
  '### Spec files',
  '### Local files',
  '### External URLs',
  '## Implementation Context',
];

function countSkeletonLiteral(source, value) {
  return source.split(value).length - 1;
}

function assertSkeletonOrder(source, markers, label) {
  let cursor = -1;
  for (const marker of markers) {
    const position = source.indexOf(marker);
    assert.ok(position > cursor,
      `${label} should contain ${marker} after the preceding skeleton marker`);
    cursor = position;
  }
}

test('RED skeleton oracle pins the single-source design artifact contracts', () => {
  const templates = Object.fromEntries(
    DESIGN_SKELETON_TEMPLATES.map(({ id, path: templatePath }) => [id, artifact(templatePath)]),
  );
  const design = templates.design;
  const tasks = templates.tasks;
  const interfaces = templates.interfaces;

  assertSkeletonOrder(design, DESIGN_TOP_LEVEL_SKELETON, 'design.md');

  const targetStateStart = design.indexOf('## Target State');
  const nextTopLevel = design.indexOf('\n## ', targetStateStart + '## Target State'.length);
  const targetState = design.slice(targetStateStart, nextTopLevel === -1 ? undefined : nextTopLevel);
  assertSkeletonOrder(targetState, [
    '### Architecture Snapshot',
    '### File Manifest',
  ], 'design.md ## Target State');
  assert.doesNotMatch(design, /^## Endpoint Map\s*$/m,
    'design.md must not contain an ## Endpoint Map section');

  assert.match(design, /^\*\*Provenance\*\*:\s*(?:<!--.*-->)?\s*$/m,
    'design.md must contain a **Provenance**: marker with an optional inline placeholder');
  assert.match(design, /^\*\*Record family\*\*:\s*(?:<!--.*-->)?\s*$/m,
    'design.md must contain a **Record family**: marker with an optional inline placeholder');

  assertSkeletonOrder(tasks, TASKS_SKELETON_MARKERS, 'tasks.md');

  // Required Documentation section contracts (read from actual instruction file, not template)
  const designTasksInstruction = artifact('sai/commands/design/steps/tasks.md');
  assert.match(designTasksInstruction, /### Spec files[\s\S]*?### Local files[\s\S]*?### External URLs/,
    'tasks.md instruction must list Spec files before Local files before External URLs');
  assert.match(designTasksInstruction, /<path>\s*—\s*<note>/,
    'tasks.md instruction must describe <path> — <note> format for Local files');
  assert.match(designTasksInstruction, /<URL>\s*—\s*<note>/,
    'tasks.md instruction must describe <URL> — <note> format for External URLs');
  assert.match(designTasksInstruction, /no path or URL is listed twice[\s\S]*?every spec[\s\S]*?lives only under Spec files/,
    'tasks.md instruction must state the no-duplicate rule for specs under Spec files');
  assert.doesNotMatch(designTasksInstruction, /### Local files[\s\S]*?use line ranges/,
    'tasks.md instruction Local files section must not contain "use line ranges" instruction');

  assert.match(interfaces, /^\*\*Interfaces\*\*/m,
    'interfaces.md must contain the **Interfaces** marker');
  assert.match(interfaces, /^\*\*Test assertions\*\*/m,
    'interfaces.md must contain the **Test assertions** marker');
  assert.match(interfaces, /^## Step (?:N|\d+)(?:\b|\s|:|—|-)/m,
    'interfaces.md must contain a ## Step N heading');

  for (const { id, anchor } of DESIGN_SKELETON_TEMPLATES) {
    const template = templates[id];
    assert.equal(countSkeletonLiteral(template, DESIGN_SKELETON_AUTHORITY), 1,
      `${id}.md must have exactly one shared design-instruction authority path`);
    assert.equal(countSkeletonLiteral(template, anchor), 1,
      `${id}.md must have exactly one ${anchor} generation anchor`);

    for (const forbidden of DESIGN_SKELETON_FORBIDDEN) {
      assert.equal(template.includes(forbidden), false,
        `${id}.md must not retain the forbidden ${forbidden} substring`);
    }
  }

  assert.doesNotMatch(design, /^\s*\|\s*Method\s*\|/m,
    'design.md must not retain an endpoint Method table header');
  assert.doesNotMatch(design, /^\s*\|\s*Path\s*\|/m,
    'design.md must not retain an endpoint Path table header');
});

// ─── Step 5: split architecture snapshot by boundary ───────────────────────

const ARCHITECTURE_BOUNDARY_HEADINGS = [
  '#### External Surfaces',
  '#### Internal Public Surfaces',
];
const ARCHITECTURE_SECTION_HEADINGS = [
  '### Architecture Snapshot',
  '### File Manifest',
];
const WHOLE_INVENTORY_EMPTY_SENTINEL = 'None — no planned public surfaces';
const FILE_MANIFEST_EMPTY_SENTINEL = 'None';

function escapeArchitectureLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertExternalFirstBoundaryHeadings(source, label) {
  let cursor = source.indexOf('### Architecture Snapshot');
  if (cursor === -1) cursor = source.indexOf('### Snapshot');
  assert.ok(cursor >= 0, `${label} should declare its architecture snapshot heading`);

  const nextSiblingOffset = source.slice(cursor + 4).search(/\n### (?!#)/);
  const nextSibling = nextSiblingOffset === -1 ? -1 : cursor + 4 + nextSiblingOffset;
  const architecture = source.slice(cursor, nextSibling === -1 ? undefined : nextSibling);
  for (const heading of ARCHITECTURE_BOUNDARY_HEADINGS) {
    const position = architecture.indexOf(heading);
    assert.ok(position >= 0,
      `${label} should contain ${heading} after its architecture snapshot heading`);
    assert.ok(position > 0,
      `${label} should nest ${heading} below its architecture snapshot heading`);
    cursor = position;
  }
}

function assertArchitectureEmptinessContract(source, label) {
  const wholeInventory = escapeArchitectureLiteral(WHOLE_INVENTORY_EMPTY_SENTINEL);
  assert.match(source, new RegExp(`(?:whole|entire|shared)[\\s\\-]*inventory[\\s\\S]{0,260}${wholeInventory}|${wholeInventory}[\\s\\S]{0,260}(?:whole|entire|shared)[\\s\\-]*inventory`, 'i'),
    `${label} should define a shared whole-inventory empty form`);
  assert.match(source, /(?:External|external)[\s\S]{0,260}None|None[\s\S]{0,260}(?:External|external)/,
    `${label} should define an external block-specific empty form`);
  assert.match(source, /(?:Internal|internal)[\s\S]{0,260}None|None[\s\S]{0,260}(?:Internal|internal)/,
    `${label} should define an internal block-specific empty form`);
  if (label === 'live design instructions') {
    assert.match(source, new RegExp(`File Manifest[\\s\\S]{0,320}${escapeArchitectureLiteral(FILE_MANIFEST_EMPTY_SENTINEL)}`, 'i'),
      `${label} should keep File Manifest emptiness independently representable`);
    assert.match(source, /(?:independent|separate|own|regardless)[\s\S]{0,180}(?:File Manifest|manifest)|(?:File Manifest|manifest)[\s\S]{0,180}(?:independent|separate|own|regardless)/i,
      `${label} should keep File Manifest None independent of architecture emptiness`);
  }
}

test('Step 5: live design instructions use external-first nested boundary headings', () => {
  for (const [label, relativePath] of [
    ['live design step', 'sai/commands/design/steps/design.md'],
  ]) {
    assertExternalFirstBoundaryHeadings(artifact(relativePath), label);
  }
});

test('Step 5: live design distinguishes shared, block-specific, and File Manifest empty forms', () => {
  for (const [label, relativePath] of [
    ['live design step', 'sai/commands/design/steps/design.md'],
  ]) {
    assertArchitectureEmptinessContract(artifact(relativePath), label);
  }
  assert.equal(FILE_MANIFEST_EMPTY_SENTINEL, 'None', 'File Manifest should retain its plain None sentinel literal');
  assert.match(WHOLE_INVENTORY_EMPTY_SENTINEL, /^None\s+[—-]\s+no planned public surfaces$/,
    'the shared whole-inventory sentinel should remain a fixed English literal');
});

test('overview excludes Architecture Snapshot and its complete subtree', () => {
  const overview = artifact('sai/commands/design/change-overview.md');

  assert.match(overview, /Exclude sections named `Architecture Snapshot`[\s\S]*with their complete subtrees/);
  assert.doesNotMatch(overview, /#### External Surfaces|#### Internal Public Surfaces/);
});

test('overview wrappers and source headings stay English while explanatory prose translates', () => {
  const overview = artifact('sai/commands/design/change-overview.md');

  assert.match(overview, /overview_language/);
  assert.match(overview, /Keep source headings and labels verbatim in English; use English structural wrappers/);
  assert.match(overview, /translate only natural-language explanatory prose/);
});

test('Step 5: unclear boundary classification falls back to external and File Manifest is a direct inventory', () => {
  const instructions = artifact('sai/commands/design/steps/design.md');
  assert.match(instructions,
    /unclear[\s\S]{0,220}external|external[\s\S]{0,220}unclear/i,
    'live design instructions should route unclear boundary classification to external');
  assert.match(instructions,
    /(?:direct(?:ly)?|explicit(?:ly)?)[\s\S]{0,240}(?:inventory|File Manifest|source artifacts?|files?|paths?)|(?:inventory|File Manifest|source artifacts?|files?|paths?)[\s\S]{0,240}(?:direct(?:ly)?|explicit(?:ly)?)/i,
    'live design instructions should require a direct source inventory');
});

test('Step 5: design templates keep exactly two Target State siblings, retain their order, and have no nested boundary headings', () => {
  const design = artifact('openspec/schemas/sai-workflow/templates/design.md');
  const targetStateStart = design.indexOf('## Target State');
  const nextTopLevel = design.indexOf('\n## ', targetStateStart + '## Target State'.length);
  const targetState = design.slice(targetStateStart, nextTopLevel === -1 ? undefined : nextTopLevel);
  const headings = (targetState.match(/^### (?!#).+$/gm) || []);

  assert.deepEqual(headings, ARCHITECTURE_SECTION_HEADINGS,
    'design.md should keep exactly the Architecture Snapshot and File Manifest siblings');
  assertSkeletonOrder(targetState, ARCHITECTURE_SECTION_HEADINGS, 'design.md ## Target State');
  assert.doesNotMatch(targetState, /^#### (?:External Surfaces|Internal Public Surfaces)\s*$/m,
    'design.md templates must not embed boundary headings in the Target State skeleton');
  assert.doesNotMatch(design, /^## Endpoint Map\s*$/m,
    'design.md templates must not contain an Endpoint Map section');
});

test('Step 5: schema keeps the pre-change design graph and does not advertise Endpoint Map', () => {
  const schema = artifact('openspec/schemas/sai-workflow/schema.yaml');
  assert.doesNotMatch(schema, /Endpoint Map/,
    'schema.yaml must not advertise Endpoint Map');

  for (const id of ['design', 'tasks', 'interfaces']) {
    const entry = schemaEntryForContract(schema, id);
    const expected = PRE_CHANGE_DESIGN_GRAPH[id];
    assert.equal(schemaFieldForContract(entry, 'generates'), expected.generates,
      `${id} should preserve its pre-change generated artifact`);
    assert.deepEqual(schemaListForContract(schemaFieldForContract(entry, 'requires')), expected.requires,
      `${id} should preserve its pre-change requirements`);
  }
});

test('composition rules load only in composition coordinators (ADR 0187)', () => {
  const runner = artifact('sai/orchestration/command-runner.md');
  assert.match(runner, /`sai\/orchestration\/composition\.md`/,
    'the runner should name the composition file');
  assert.doesNotMatch(runner, /Fetch @sai\/orchestration\/composition\.md/,
    'the runner must not load composition rules for every command');
  for (const card of ['sai/commands/deep-review/coordinator.md']) {
    assert.match(artifact(card), /Fetch @sai\/orchestration\/composition\.md/,
      `${card} should load the composition rules`);
  }
});

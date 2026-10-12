'use strict';

// Ownership moved from one phase worker to the coordinator and five part
// workers. These checks retain the former lifecycle, installation, permission,
// progress, evidence, durable-plan, and two-harness invariants at their new owners.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const jsonc = require('jsonc-parser');
const { readProjected } = require('./helpers/capability-source');
const { loadInstallManifest, matrixRenderFor } = require('../bin/install-manifest');
const { installClaude, installOpencode } = require('../bin/install-flow');
const { enumerateClaude, enumerateOpencode, buildDeletionSet, runDeletion } = require('../bin/uninstall-flow');
const { main: doctor } = require('../bin/doctor');
const root = path.join(__dirname, '..');
const agents = ['ui', 'frontend', 'backend', 'infra', 'other'];
const artifact = file => readProjected(file);
const coordinator = () => artifact('sai/commands/implement/coordinator.md');
const worker = () => artifact('sai/commands/implement/worker.md');
const render = harness => matrixRenderFor(loadInstallManifest(root), harness, root);
const planIds = ['prereqs-resolution', 'collapse-implemented-steps', 'artifact-analysis', 'documentation-review', 'plan-generation', 'validation'];
const temporaryRoot = fs.existsSync('/tmp/opencode') ? '/tmp/opencode' : os.tmpdir();

test('implement maintains interfaces.md: collapse-implemented-steps prunes both files', () => {
  const collapse = artifact('sai/commands/implement/steps/collapse-implemented-steps.md');
  assert.match(collapse, /interfaces.md/);
  assert.match(collapse, /integer key N/);
});

test('implement maintains interfaces.md: plan-generation appends audit-step contracts', () => {
  const source = artifact('sai/commands/implement/steps/audit-ingestion.md');
  assert.match(source, /Audit-step interface contracts/);
  assert.match(source, /appending an audit step.*also append.*## Step N:.*contract section/i);
  assert.match(source, /modified interface.*testable assertion/);
  assert.match(source, /anchor to requirements.*specs\/\*\*.*only/i);
  assert.match(source, /RED block.*determined by testability/i);
});

test('implement maintains interfaces.md: validation ensures RED block contract invariant for audit steps', () => {
  const source = artifact('sai/commands/implement/steps/validation.md');
  assert.match(source, /RED block contract invariant.*audit-derived steps/);
  assert.match(source, /every audit-derived step.*carries a RED block.*exact, unambiguous matching.*## Step N:?.*contract/i);
  assert.match(source, /case 3.*unreachable/);
  assert.match(source, /adding the missing.*## Step N/);
});

test('Judgment Rubric for Audit Findings admits three outcomes: Apply, Discard, and Escalate', () => {
  const source = artifact('sai/commands/implement/steps/audit-ingestion.md');
  assert.match(source, /classify the finding as \*\*Apply\*\*.*\*\*Discard\*\*.*\*\*Escalate\*\*|classify.*Apply.*Discard.*Escalate/i);
  assert.match(source, /Apply\/Discard\/Escalate classification/);
});

test('Escalate findings are defined as contradicting existing decisions/requirements or exceeding scope', () => {
  const source = artifact('sai/commands/implement/steps/audit-ingestion.md');
  assert.match(source, /Escalate.*findings are those that contradict an existing decision or requirement.*criterion 3.*or propose work.*exceeds.*scope.*criterion 5/i);
  assert.match(source, /new acceptance criteria.*not yet established/);
  assert.match(source, /stops.*before.*plan-generation.*appends/i);
});

test('Escalation detection lives exclusively in artifact-analysis step', () => {
  const analysis = artifact('sai/commands/implement/steps/audit-ingestion.md');
  const generation = artifact('sai/commands/implement/steps/plan-generation.md');
  assert.match(analysis, /Escalation Detection and Handoff/);
  assert.match(analysis, /check whether any finding was classified as \*\*Escalate\*\*.*If escalations exist/i);
  assert.doesNotMatch(generation, /\bEscalat/);
  assert.match(generation, /Apply\/Discard classification (?:that|from) `artifact-analysis`/);
});

test('an escalation ends the run in artifact-analysis before plan-generation', () => {
  const source = artifact('sai/commands/implement/steps/audit-ingestion.md');
  assert.match(source, /Do NOT continue to `plan-generation`/);
  assert.match(source, /Return `failed`, with `summary` carrying every emitted Ready to Propose block/);
});

test('Escalation handoff emits Ready to Propose block with correct fields', () => {
  const source = artifact('sai/commands/implement/steps/audit-ingestion.md');
  assert.match(source, /emit a `Ready to Propose` block from `sai\/policies\/ready-to-propose-format\.md`/);
  assert.match(source, /Change name.*derived from the escalated work/);
  assert.match(source, /What.*summary of the escalated work/);
  assert.match(source, /Why.*describing the gap.*citing the source artifacts and finding ids/);
  assert.match(source, /Research Leads.*repository-relative paths.*escalated findings point to.*codebase/);
  assert.match(source, /do NOT use artifact offsets or finding id suffixes/i);
  assert.match(source, /Edge Cases[\s\S]*?None[\s\S]*?Implementation Details[\s\S]*?None/);
});

test('Escalation groups findings by scope of work, emits one block per new change', () => {
  const source = artifact('sai/commands/implement/steps/audit-ingestion.md');
  assert.match(source, /Group escalated findings by the scope of work they imply/);
  assert.match(source, /two findings from different artifacts belong in the same group when they describe the same missing change/);
  assert.match(source, /one block per escalation group/);
  assert.match(source, /`summary` carrying every emitted Ready to Propose block/);
});

test('rare implement blocks load only when their condition holds', () => {
  const analysis = artifact('sai/commands/implement/steps/artifact-analysis.md');
  const generation = artifact('sai/commands/implement/steps/plan-generation.md');
  assert.match(analysis, /Fetch @sai\/commands\/implement\/steps\/audit-ingestion\.md[^\n]*skip it silently/);
  assert.match(generation, /Fetch @sai\/commands\/implement\/steps\/rerun-preservation\.md[^\n]*skip it silently/);
  assert.match(analysis, /### Validate design decisions for ADR\/DDR/);
});

test('apply branch selection lives in its own step and the plan template carries no prelude', () => {
  assert.match(artifact('sai/commands/apply/coordinator.md'), /Fetch @sai\/commands\/apply\/steps\/branch-selection\.md only when the picker must be presented/);
  assert.match(artifact('sai/commands/apply/steps/branch-selection.md'), /Suggest branch/);
  assert.doesNotMatch(artifact('sai/commands/implement/implementation-plan.template.md'), /## Prerequisites/);
});

test('re-run INCOMPLETE gate sits inside the audit-append section with the pinned audit-step heading', () => {
  const rerun = artifact('sai/commands/implement/steps/rerun-preservation.md');
  const append = rerun.slice(rerun.indexOf('##### Append audit-derived steps'));
  const classify = rerun.slice(rerun.indexOf('##### Classify each prior step'), rerun.indexOf('##### Preserve the prior file'));
  assert.match(append, /INCOMPLETE gate/);
  assert.doesNotMatch(classify, /return `failed`/);
  assert.match(rerun, /#### Step N: Address <kind> findings/);
  assert.match(artifact('sai/commands/implement/steps/plan-generation.md'), /#### Step N: Address <kind> findings/);
  assert.match(artifact('sai/commands/implement/steps/validation.md'), /needs a new audit step/);
  assert.doesNotMatch(worker(), /exactly one new step for each audit artifact/);
});

test('first-run plan generation fetches the plan template and re-run preservation does not', () => {
  const template = /Fetch @sai\/commands\/implement\/implementation-plan\.template\.md/;
  assert.match(artifact('sai/commands/implement/steps/plan-generation.md'), template);
  assert.doesNotMatch(artifact('sai/commands/implement/steps/rerun-preservation.md'), template);
});

test('implementation uses neutral core protocols and retains retired-source absence', () => {
  assert.match(worker(), /Fetch @sai\/orchestration\/worker-core\.md/);
  for (const file of ['sai/orchestration/coordinator-contract.md', 'sai/orchestration/worker-lifecycle.md', 'sai/orchestration/workers/sai-3-implementation-worker.md', 'sai/commands/implement/invocation.md', 'sai/commands/implement/instructions.md']) assert.equal(fs.existsSync(path.join(root, file)), false);
  const retirement = loadInstallManifest(root).retirements.find(item => item.id === 'retired-sai-3-implement-instructions');
  assert.equal(retirement.destination.path, 'commands/implement/instructions.md');
});

test('five identical planners retain shipped models, research access, and one common contract', () => {
  for (const harness of ['claude', 'opencode']) {
    const items = render(harness).filter(item => item.kind === 'agent' && item.phase === 'implementation');
    assert.equal(items.length, 5);
    for (const item of items) {
      assert.match(item.text, /Fetch @sai\/commands\/implement\/worker\.md/);
      assert.doesNotMatch(item.text, /wrapper_echo_value/);
      if (harness === 'claude') {
        assert.match(item.text, /^model: opus$/m);
        assert.match(item.text, /^effort: medium$/m);
        for (const tool of ['Read', 'Glob', 'Grep', 'Bash', 'Edit', 'Write', 'Agent', 'Skill', 'SendMessage', 'WebFetch']) assert.ok(item.text.match(/^tools: (.*)$/m)[1].split(', ').includes(tool));
      } else {
        assert.match(item.text, /^model: opencode-go\/deepseek-v4\.1-flash$/m);
        assert.match(item.text, /^variant: max$/m);
        assert.match(item.text, /^mode: subagent$/m);
      }
    }
  }
});

test('every binding owns its native ready dispatch, continuation, and replacement mechanics', () => {
  for (const harness of ['claude', 'opencode']) {
    const items = render(harness).filter(item => item.kind === 'binding' && item.phase === 'implementation');
    assert.equal(items.length, 5);
    for (const item of items) {
      const name = item.entry.workerName;
      assert.ok(item.text.includes(`subagent_type: "${name}"`));
      assert.match(item.text, /event: ready/);
      assert.match(item.text, /continuation/i);
      assert.match(item.text, /replacement/i);
      assert.match(item.text, /reconstruction[ _]fields|originating binding context/i);
      assert.match(item.text, /arguments_value/);
      assert.doesNotMatch(item.text, /wrapper_echo_value/);
      if (harness === 'claude') {
        assert.match(item.text, /run_in_background: true/);
        assert.match(item.text, /SendMessage/);
        assert.doesNotMatch(item.text, /Agent[\s\S]{0,120}resume/);
      } else {
        assert.match(item.text, /task\(task_id: "<captured task ID>"/);
        assert.doesNotMatch(item.text, /run_in_background: true/);
      }
    }
  }
});

test('thin wrappers retain model, envelope, and harness independence while bootstrap loads five bindings', () => {
  const bootstrap = artifact('sai/commands/implement/command-bootstrap.md');
  assert.equal((bootstrap.match(/^Fetch /gm) || []).length, 5);
  for (const agent of agents) assert.ok(bootstrap.includes(`implementation-${agent}-worker.md`));
  for (const harness of ['claude', 'opencode']) {
    const wrapper = artifact(`commands/${harness}/sai-3-implement.md`);
    assert.match(wrapper, /command_name: implement/);
    assert.match(wrapper, /arguments_value: \$ARGUMENTS/);
    assert.match(wrapper, /Fetch @sai\/commands\/implement\/command-bootstrap\.md/);
    assert.doesNotMatch(wrapper, /wrapper_echo_value|Fetch @skills\/sai-3-.*worker\/SKILL\.md/);
    if (harness === 'claude') {
      assert.match(wrapper, /^model: sonnet$/m);
      assert.match(wrapper, /^effort: high$/m);
      assert.match(wrapper, /Write/);
    } else {
      assert.match(wrapper, /^model: opencode-go\/muse-spark-1\.3-contributor#xhigh$/m);
      assert.match(wrapper, /^subtask: false$/m);
      assert.doesNotMatch(wrapper, /^agent:|^variant:/m);
    }
  }
});

test('opencode sample stays file-based and retains schema, depth, and narrow external-directory permission', () => {
  const config = jsonc.parse(artifact('configs/opencode.jsonc'));
  assert.ok(config.$schema);
  assert.equal(config.experimental.subagent_depth, 2);
  assert.equal(Object.hasOwn(config, 'subagent_depth'), false);
  assert.equal(Object.hasOwn(config, 'agent'), false);
  assert.equal(config.permission.external_directory['~/.config/opencode/sai/**'], 'allow');
});

test('coordinator owns resolution and checks artifacts in order without an environment prerequisite check', () => {
  assert.match(coordinator(), /0\/1\/N protocol/);
  assert.match(coordinator(), /Use change '\{name\}'\?/);
  assert.match(coordinator(), /Which change\?/);
  assert.match(coordinator(), /Check `proposal\.md`,\s+`design\.md`, `tasks\.md` in order/);
  assert.match(coordinator(), /Reuse a supervisor-resolved name without asking again/);
  assert.match(coordinator(), /Run no OpenSpec environment prerequisite check/);
  assert.match(worker(), /Resolve no change,\s+perform no common preparation/);
  assert.doesNotMatch(coordinator() + worker(), /openspec CLI not found|OpenSpec not initialized|schema: sai-workflow/);
});

test('coordinator-owned common analysis preserves documentation, decision, and amendment authorization', () => {
  assert.match(coordinator(), /Execute common steps yourself, once/);
  assert.match(coordinator(), /ADR\/DDR culture\/permission/);
  assert.match(coordinator(), /existing defective-sai-2 authorization rule; sai-1 defects still escalate/);
  assert.match(worker(), /never amend\s+design\/tasks\/interfaces or auto-correct shared inputs/);
  const generation = artifact('sai/commands/implement/steps/plan-generation.md');
  assert.match(generation, /exactly one correction path/);
  assert.match(generation, /Without fast-track.*needs_input/s);
  assert.match(generation, /defect in `sai-1`.*always escalates/s);
  assert.match(generation, /multiple preserving correction paths escalates/);
  assert.match(generation, /never correct `change-overview.md` directly/i);
});

test('category dispatch is concurrent, complete-task, agent-selected, and failure isolated', () => {
  assert.match(coordinator(), /one native concurrent\s+batch/);
  assert.match(coordinator(), /one worker for all its Steps; empty agents do not/);
  assert.match(coordinator(), /backend combines backend\/data, other combines docs\/other/);
  assert.match(coordinator(), /never by paths, context, difficulty, or inferred\s+model ability/);
  assert.match(coordinator(), /Missing or invalid categories stop before any worker activates/);
  assert.match(coordinator(), /never substitute a model or another agent/);
  assert.match(coordinator(), /Never cancel siblings because one\s+worker fails, is cancelled, needs input, or loses transport/);
  assert.match(coordinator(), /Collect every\s+sibling's terminal result and retain all valid parts/);
});

test('ready handshake and closed worker-result validation apply to every required category', () => {
  assert.match(coordinator(), /zero-task ready call/);
  const source = coordinator();
  assert.match(source, /Capture every\s+handle and validate each `event: ready` before any task disclosure/);
  assert.match(source, /If ready or\s+handle capture fails, open no guard window and disclose no task/);
  const ready = source.indexOf("worker's zero-task ready call");
  const handles = source.indexOf('Capture every', ready);
  const snapshot = source.indexOf('snapshot once immediately before task disclosure', handles);
  const disclosure = source.indexOf("Then disclose each worker's one complete task", snapshot);
  assert.ok(ready >= 0 && handles > ready && snapshot > handles && disclosure > snapshot,
    'concurrent ready dispatch and all handles precede one snapshot and task disclosure');
  assert.match(source, /Reuse an\s+already-running window; never derive a separate baseline per child/);
  assert.match(worker(), /Return `event: ready` with empty `changed_files` before task disclosure/);
  assert.match(coordinator(), /Every post-resolution child result requires `resolved_change_name`/);
  assert.match(coordinator(), /assigned change, string `summary`, and string-list `changed_files`/);
  assert.match(coordinator(), /payload status must be exactly one of/i);
  const validator = path.join(root, 'sai/tools/worker-report-validator.js');
  for (const result of [
    { status: 'completed', summary: 'Done', changed_files: 'not an array', resolved_change_name: 'example' },
    { status: 'needs_input', summary: 'Ask', changed_files: [], resolved_change_name: 'example' },
  ]) {
    const output = spawnSync(process.execPath, [validator, 'validate', '--kind', 'terminal'], { input: JSON.stringify(result), encoding: 'utf8' });
    assert.notEqual(output.status, 0);
  }
});

test('child adapters preserve one-string envelope, exact input transport, and binding-owned identifiers', () => {
  const source = coordinator();
  for (const field of ['original_envelope', 'dispatch_operation', 'continuation_operation', 'extension_handlers', 'replacement_reconstruction_fields', 'terminal_navigation']) assert.ok(source.includes(field));
  assert.match(worker(), /exactly one opaque `arguments_value` string/);
  assert.match(source, /opaque_input_history.*exact `question`.*ordered\s+`options`.*selected `answer_value`/s);
  assert.match(source, /answer-only continuation forwards only the selected answer_value\s+through the captured binding, without reconstructing an InvocationEnvelope/);
  assert.match(source, /Await that same worker's next payload and re-present repeated requests/);
  assert.match(source, /`continuation_reference` is binding-owned/);
  assert.match(source, /binding identifiers are not worker input/);
});

test('recovery is independent per child, assignment-bounded, and reconstructs exact original state', () => {
  assert.match(coordinator(), /bounded-recovery ledger per\s+worker/);
  assert.match(coordinator(), /budgets independently/);
  assert.match(coordinator(), /authorized child recovery surface is its exact part,\s+not implementation\.md/);
  assert.match(coordinator(), /Reconstruct a replacement with the original complete\s+task, resolved name, exact input history, assignment, and current run identity/);
  assert.match(coordinator(), /never silently reroute or change its model/);
  assert.match(worker(), /correct only the assigned part/);
});

test('shared planning evidence remains supplied-first and gap-driven with no speculative research', () => {
  const common = artifact('sai/commands/implement/steps/common.md');
  assert.match(common, /start from the \*\*supplied material\*\*/);
  assert.match(common, /goal names the Step and the gap/);
  assert.match(common, /return `needs_input` with a question that names the Step and the gap/);
  assert.match(common, /When the supplied material was enough, dispatch no explorer/);
  assert.match(common, /Researched gap: Step N/);
  assert.match(worker(), /planning.*assigned Steps only/s);
});

test('reruns retain unfinished work, candidate copies, and shared-interface pruning before verified publication', () => {
  const source = coordinator();
  assert.match(source, /record existing-plan presence before writing/);
  assert.match(source, /preserve the original plan and interfaces contents/);
  assert.match(source, /collapse and preservation operate on a candidate\s+copy/);
  assert.match(source, /keep every unfinished Step, code block, checkbox, and appendix unchanged/);
  assert.match(source, /existing plan is never regenerated from the template/);
  assert.match(source, /Stage interface pruning until successful\s+delivery/);
  const collapse = artifact('sai/commands/implement/steps/collapse-implemented-steps.md');
  assert.match(collapse, /all checkboxes checked in implementation\.md/);
  assert.match(collapse, /both files by the integer key N/);
  assert.match(collapse, /candidate copies.*retaining the originals/s);
});

test('final integration preserves ordering, interface conformance, RED before GREEN, verification, and STOP markers', () => {
  const generation = artifact('sai/commands/implement/steps/plan-generation.md');
  const common = artifact('sai/commands/implement/steps/common.md');
  const validation = artifact('sai/commands/implement/steps/validation.md');
  assert.match(coordinator(), /original numbering, and tasks\.md ordering/);
  assert.match(generation, /Interface conformance/);
  assert.match(common, /RED → GREEN/);
  assert.match(common, /Detail range/);
  assert.match(validation, /Every step has a Verification Checklist with an Automated section/);
  assert.match(validation, /Every step has a STOP & COMMIT marker/);
  assert.match(validation, /Functional-check encoding/);
  assert.match(validation, /Audit-append invariant/);
  assert.match(coordinator(), /Semantic\s+interface and test-impact checks remain your responsibility/);
  assert.match(worker(), /never production code, implementation\.md/);
});

test('partial or stale parts never publish and cleanup removes only owned successful-run files', () => {
  assert.match(coordinator(), /previous implementation\.md intact, print no completion/);
  assert.match(coordinator(), /verifying current run\/input\s+identity and assignment, never by matching a filename alone/);
  assert.match(coordinator(), /No partial plan is\s+complete/);
  assert.match(coordinator(), /Preserve unrelated files, other runs, and every failed\s+run; never recursively delete/);
  assert.match(coordinator(), /even temporary paths cleaned after success/);
});

test('coordinator alone owns the immutable six-step progress plan and common observations', () => {
  const source = coordinator();
  const rows = [...source.matchAll(/^\s*- `([a-z-]+)` — "([^"]+)"$/gm)];
  assert.deepEqual(rows.map(row => row[1]), planIds);
  assert.deepEqual(rows.map(row => row[2]), ['Resolve change', 'Collapse implemented steps', 'Analyze artifacts and validate decisions', 'Review required documentation', 'Write implementation.md', 'Validate implementation.md and the audit append']);
  assert.match(source, /loading each file only when its\s+work starts/);
  assert.match(source, /does not declare a worker step machine/);
  assert.match(source, /not in a child\s+task or reconstruction field/);
  assert.match(source, /coordinator-authored observations.*never worker\s+progress returns/s);
  assert.match(worker(), /emit no progress events/);
  assert.match(worker(), /Receive all assigned Steps as one complete task/);
  assert.doesNotMatch(worker(), /Active step: <id>/);
  assert.doesNotMatch(source, /step_machine: implement-standalone@1|`plan-simplification`/);
});

test('progress rendering retains response-sourced stamps, state derivation, threshold, and coordinator emission', () => {
  const policy = artifact('sai/policies/todo-structure.md');
  assert.match(policy, /first step in plan order.*not in the marked set renders `in_progress`/s);
  assert.match(policy, /Every remaining step renders `pending`/);
  assert.match(policy, /fewer than three.*SHALL NOT be rendered/s);
  assert.match(policy, /coordinator session, never from a worker subagent/);
  assert.match(policy, /todowrite/);
  assert.match(coordinator(), /validator response's `received_at` for milestone\s+stamps/);
  assert.match(coordinator(), /Reconcile all unmarked steps completed only after successful publication/);
  assert.match(coordinator(), /failed\/cancelled\/needs_input leave the last rendered state and stamps unchanged/);
  assert.doesNotMatch(coordinator(), /date \+%H:%M|Get-Date/);
});

test('success navigation stays positional while failed and cancelled outcomes suppress completion and transitions', () => {
  const source = coordinator();
  assert.match(source, /Child\s+`terminal_navigation` records the outcome only/);
  assert.match(source, /child's completed result alone invokes\s+neither transition nor completion/);
  assert.match(source, /Only successful publication completes plan-generation and validation/);
  assert.match(source, /Standalone or final segment prints/);
  assert.ok(source.includes('Implementation plan done in openspec/changes/{name}/. Review and run \\`/sai-4-apply {name}\\` (--fast-track) **in a new chat** when ready.'));
  assert.match(source, /Stop immediately/);
  assert.match(source, /non-final composition segment invokes only its authorized successor\s+transition/);
  assert.match(source, /On `failed`.*without the completion\s+message and without a composition transition/s);
  assert.match(source, /On `cancelled`.*without claiming completion\s+and without a composition transition/s);
});

test('no-commit guard windows remain control-boundary based and workers never mutate git', () => {
  assert.match(coordinator(), /Fetch @sai\/policies\/no-commit-guard\.md/);
  assert.match(coordinator(), /After all batch handles are captured and ready returns\s+validated, snapshot once immediately before task disclosure when no window is\s+running/);
  assert.match(coordinator(), /human\/mutation\/run boundaries.*not independently per child/s);
  assert.match(worker(), /Never run a\s+mutating git command/);
});

test('composition keeps successor authority, isolation continuity, and unchanged apply adapter', () => {
  const composition = artifact('sai/orchestration/composition.md');
  const build = artifact('sai/commands/meta-build/coordinator.md');
  assert.match(composition, /exactly the successor at position `i \+ 1`/);
  assert.match(composition, /must not infer the next phase.*worker summaries/s);
  assert.match(composition, /does not\s+invoke a harness boot adapter or wrapper/);
  assert.match(composition, /already-resolved change name/);
  assert.match(build, /existing apply adapter/);
  assert.match(build, /RED remains blind.*GREEN retains its absolute test-file prohibition/s);
  assert.match(build, /no implement worker step-machine pointer is sent/);
  assert.match(artifact('sai/commands/meta-build/command-bootstrap.md'), /Fetch @sai\/commands\/implement\/command-bootstrap\.md/);
});

test('design remains an independently stopped phase and implement makes no live-proof claims', () => {
  const design = artifact('sai/commands/design/coordinator.md');
  assert.match(design, /Design done in openspec\/changes\/\{name\}\//);
  assert.doesNotMatch(design, /After Continue|Continue now|implementation-worker binding|arguments_value:\s*resolved_change_name/);
  assert.doesNotMatch(coordinator(), /\b(?:live|runtime)\s+(?:probe|proof)\b|\bsmoke[- ]?(?:check|test)\b/i);
});

test('documentation retains model independence, artifact home, harness universality, upgrade and source boundaries', () => {
  const guide = artifact('docs/sequential-pipeline.md');
  const docs = artifact('README.md') + artifact('AGENTS.md');
  assert.match(guide, /independent[\s\S]{0,100}model/i);
  assert.match(guide, /openspec\/changes\/\{change-name\}\/implementation\.md/);
  assert.match(docs, /Claude Code/);
  assert.match(docs, /opencode/);
  assert.match(docs, /harness universality/i);
  assert.match(docs, /existing GitHub Copilot users must run the current uninstall command before upgrading/i);
  assert.match(docs, /orphaned Copilot files/i);
  assert.match(docs, /worker-template\.md.*worker-matrix/s);
  assert.doesNotMatch(docs, /agents\/claude\/sai-\d-[a-z-]*worker\.md|Inline Coordinator Adapter|inline-invocation\.md/);
  for (const key of ['claude-orchestration', 'opencode-orchestration']) assert.ok(loadInstallManifest(root).projections.some(item => item.id === key));
});

test('both harnesses install every category, preserve tunables, notify body replacement, and guard uninstall', async () => {
  for (const harness of ['claude', 'opencode']) {
    const base = fs.mkdtempSync(path.join(temporaryRoot, `sai-category-install-${harness}-`));
    const install = harness === 'claude' ? installClaude : installOpencode;
    install(base);
    for (const agent of agents) {
      const target = path.join(base, 'agents', `sai-3-${agent}-worker.md`);
      assert.ok(fs.existsSync(target));
      assert.equal(fs.existsSync(path.join(base, 'agents', `.sai-3-${agent}-worker.owner.json`)), false);
      assert.ok(fs.existsSync(path.join(base, 'sai', 'orchestration', 'workers', 'bindings', `implementation-${agent}-worker.md`)));
      const original = fs.readFileSync(target, 'utf8');
      const tuned = original.replace(/^model:.*$/m, 'model: user-model');
      fs.writeFileSync(target, tuned);
      install(base);
      assert.equal(fs.readFileSync(target, 'utf8'), tuned);
    }
    for (const agent of agents) fs.appendFileSync(path.join(base, 'agents', `sai-3-${agent}-worker.md`), '\nuser body divergence\n');
    const notices = [];
    const log = console.log;
    console.log = (...args) => notices.push(args.join(' '));
    try { install(base); } finally { console.log = log; }
    assert.equal(notices.filter(line => /managed agent differs.*overwritten/.test(line)).length, 5);
    const enumeration = harness === 'claude' ? enumerateClaude : enumerateOpencode;
    const entries = enumeration(base);
    for (const agent of agents) assert.ok(entries.some(entry => entry.dest === path.join(base, 'agents', `sai-3-${agent}-worker.md`)));
    const target = path.join(base, 'agents', 'sai-3-ui-worker.md');
    fs.appendFileSync(target, '\nlocal override\n');
    const categoryAgentPaths = new Set(agents.map(agent => path.join(base, 'agents', `sai-3-${agent}-worker.md`)));
    await runDeletion(entries.filter(entry => categoryAgentPaths.has(entry.dest)));
    assert.ok(fs.existsSync(target));
    for (const agent of agents.slice(1)) assert.equal(fs.existsSync(path.join(base, 'agents', `sai-3-${agent}-worker.md`)), false);
    if (harness === 'opencode') {
      const config = path.join(base, 'opencode.jsonc');
      assert.equal(jsonc.parse(fs.readFileSync(config, 'utf8')).agent, undefined);
      assert.equal(buildDeletionSet({ claudeBase: base, opencodeBase: base }).some(entry => entry.dest === config), false);
    }
  }
});

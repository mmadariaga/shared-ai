'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(absolutePath), true, `${relativePath} should exist`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function assertInOrder(text, fragments) {
  let cursor = -1;
  for (const fragment of fragments) {
    const next = text.indexOf(fragment, cursor + 1);
    assert.notEqual(next, -1, `expected ${fragment} after the previous option`);
    cursor = next;
  }
}

test('merge worker explains contextual alternatives and gates only semantic ambiguity', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const worker = read('sai/commands/merge/worker.md');
  const mergeSpec = read('openspec/specs/sai-merge-command/spec.md');
  const contextual = instructions.slice(instructions.indexOf('### Step 5A:'));

  assert.match(instructions, /Step 5A: Contextual conflict analysis and decision gate/);
  assert.match(instructions, /Facts/);
  assert.match(instructions, /Inferences/);
  assert.match(instructions, /different objectives[\s\S]{0,40}per their[\s\S]{0,30}declared rules,[\s\S]{0,20}different[\s\S]{0,20}strategies/);
  assert.match(instructions, /value `ours`/);
  assert.match(instructions, /value `theirs`/);
  assert.match(instructions, /value `synthesis`/);
  assert.match(instructions, /value: "more-context"/);
  assert.match(instructions, /obvious[\s\S]{0,220}do not emit a contextual `needs_input`/i);
  assert.match(instructions, /more-context[\s\S]{0,180}same worker/i);
  assert.match(instructions, /never invent a resolution/i);
  assert.match(instructions, /Never create a[\s\S]{0,60}synthesis[\s\S]{0,60}by concatenating/i);
  assert.match(instructions, /marker-free/);
  assert.doesNotMatch(contextual, /<plain description>/);
  assert.match(contextual, /Keep the current behavior[\s\S]{0,100}validation and response rules/);
  assert.match(contextual, /Keep the incoming behavior[\s\S]{0,100}validation and response rules/);
  assert.match(contextual, /Use the safe combined behavior[\s\S]{0,100}one owner for each rule/);
  assert.match(contextual, /Show more context before deciding/);
  assert.match(contextual, /reject malformed input before saving/);
  assert.match(contextual, /accept the legacy input format/);
  assert.match(contextual, /omit option 3/);
  assertInOrder(contextual, [
    'value: "ours"',
    'value: "theirs"',
    'value: "synthesis"',
    'value: "more-context"',
  ]);
  assert.doesNotMatch(contextual, /label:\s*["`]ours["`]/i);
  assert.doesNotMatch(contextual, /label:\s*["`]theirs["`]/i);
  assert.match(instructions, /## Complete resolution payload/);
  assert.match(instructions, /"selected_contextual_decisions"/);
  assert.match(instructions, /"files"/);
  assert.match(instructions, /region replacement/);
  assert.match(instructions, /git show :2:<file>/);
  assert.match(instructions, /git show :3:<file>/);
  assert.match(instructions, /materializable with.*git checkout/i);
  assert.match(instructions, /every region in a file resolves to the same side/i);
  assert.match(instructions, /synthesis[\s\S]{0,20}limited to the conflict[\s\S]{0,20}region/i);
  assert.match(instructions, /Never create a synthesis[\s\S]{0,80}by retyping[\s\S]{0,20}untouched lines/i);
  assert.match(instructions, /file with conflict regions resolving to different sides/i);
  assert.match(instructions, /conflicts with no region markers/i);
  assert.match(instructions, /E4[\s\S]{0,300}different sides/);
  assert.match(instructions, /E5[\s\S]{0,400}no region to splice/);
  assert.match(mergeSpec, /contextual complete alternatives/i);
  assert.match(mergeSpec, /Obvious conflict stays lightweight/);
  assert.match(mergeSpec, /Semantic conflict requires an informed human choice/);
  assert.doesNotMatch(mergeSpec, /labeled ours\/theirs variants for genuinely divergent code regions/);
  assert.match(worker, /never suppresses a[\s\S]{0,40}required[\s\S]{0,40}contextual decision/i);
  assert.match(worker, /more-context/);
  assert.match(worker, /only explicit decisions[\s\S]{0,30}unlock[\s\S]{0,30}proposal[\s\S]{0,30}delivery/i);
  assert.match(worker, /region replacement/);
  assert.match(worker, /git[\s\S]{0,50}checkout[\s\S]{0,100}ours[\s\S]{0,100}theirs/i);
});

test('merge conflicts use a closed hand-off before language selection and analysis', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const worker = read('sai/commands/merge/worker.md');
  const workerCore = read('sai/orchestration/worker-core.md');
  const runner = read('sai/orchestration/command-runner.md');
  const coordinator = read('sai/commands/merge/coordinator.md');
  const stepFour = instructions.slice(instructions.indexOf('### Step 4:'));

  assert.match(workerCore, /event: conflict_detected/);
  assert.match(workerCore, /affected_files: string\[\][\s\S]{0,100}continuation_state: language-selection\|strategy-analysis/);
  assert.match(runner, /phase-defined closed nonterminal extension/i);
  assert.match(runner, /conflict_detected[\s\S]{0,180}affected_files/);
  assert.match(coordinator, /allowed_nonterminal_extensions[\s\S]{0,260}conflict_detected/);
  assert.match(coordinator, /working-language question/);
  assert.match(coordinator, /AskUserQuestion/);
  assert.match(coordinator, /opencode[\s\S]{0,80}`question` tool/);

  assert.match(stepFour, /event: conflict_detected/);
  assert.match(stepFour, /changed_files: \[\]/);
  assert.match(stepFour, /affected_files: string\[\]/);
  assert.match(stepFour, /continuation_state: language-selection/);
  assertInOrder(stepFour, [
    'read the three versions',
    'Classify each conflicted file',
    'Return the following closed',
    'event: conflict_detected',
    'After the coordinator asks for and receives the working language',
  ]);

  // Verify that Step 4 defers alternative construction and Step 5A performs it
  assert.match(stepFour, /do not construct[\s\S]{0,50}complete alternatives/i, 'Step 4 should defer alternative construction');

  const step5a = instructions.slice(instructions.indexOf('### Step 5A:'));
  assert.match(step5a, /constructing the complete alternatives/i, 'Step 5A should begin by constructing alternatives');
  assertInOrder(step5a, [
    'internal decision value `ours`',
    'internal decision value `theirs`',
    'internal decision value `synthesis`',
  ]);

  assert.match(instructions, /clean.*never.*language|clean.*skip to Step 7/is);
  assert.match(worker, /does not chat directly with the user/);
  assert.match(worker, /continuation_state: strategy-analysis[\s\S]{0,180}without asking for a language again/);
});

test('merge strategy discussion separates ordinary text, native decisions, and open input', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const coordinator = read('sai/commands/merge/coordinator.md');
  const presentation = read('sai/commands/merge/presentation.md');

  assert.match(instructions, /Global resolution strategy proposal/);
  assert.match(instructions, /Apply this complete[\s\S]{0,100}strategy before changing the conflicted files/);
  assert.match(instructions, /apply-strategy/);
  assert.match(instructions, /revise-strategy/);
  assert.match(instructions, /decline-strategy/);
  assert.match(instructions, /empty[\s\S]{0,80}`options` list[\s\S]{0,120}free-form/);
  assert.match(instructions, /same worker[\s\S]{0,120}context or correction/);
  assert.match(instructions, /no resolution write, conflict-marker[\s\S]{0,100}before `apply-strategy`/);
  assert.match(coordinator, /two user-facing channels/);
  assert.match(coordinator, /ordinary conversation text/);
  assert.match(coordinator, /non-empty options/);
  assert.match(coordinator, /empty `options` list/);
  assert.match(coordinator, /never synthesize closed options/);
  assert.match(presentation, /render_information/);
  assert.match(presentation, /render_open_input/);
  assert.match(presentation, /complete global strategy/);
  assert.match(presentation, /Only an explicit confirmation of the\s+current strategy/);
  assert.match(presentation, /No conflict analysis,\s*strategy, or resolution prompt appears before/);
  assert.match(presentation, /new strategy confirmation/);
});

test('merge conflict re-entry preserves language and harness parity', () => {
  const coordinator = read('sai/commands/merge/coordinator.md');
  const worker = read('sai/commands/merge/worker.md');
  const presentation = read('sai/commands/merge/presentation.md');
  const claudePanel = read('sai/adapters/claude/panel-render.md');
  const opencodePanel = read('sai/adapters/opencode/panel-render.md');

  for (const contract of [coordinator, worker, presentation]) {
    assert.match(contract, /strategy-analysis/);
    assert.match(contract, /same worker/);
    assert.match(contract, /language again/);
    assert.match(contract, /application or verification/);
  }
  assert.match(coordinator, /Store the selected value in invocation-scoped `working_language`, outside[\s\S]{0,80}`arguments_value`/i);
  assert.match(coordinator, /selected value[\s\S]{0,120}unchanged/);
  assert.match(presentation, /Claude Code and opencode consume this same neutral/);
  assert.match(presentation, /same question text, option values, ordering, and continuation semantics/);
  assert.match(claudePanel, /coordinator session only/);
  assert.match(opencodePanel, /coordinator session only/);
  assert.match(presentation, /TaskUpdate.*TaskList.*todowrite/is);
});

test('merge branch and scope contracts filter candidates, label timestamps, and order full scope first', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const worker = read('sai/commands/merge/worker.md');
  const presentation = read('sai/commands/merge/presentation.md');
  const scopeInstructions = instructions.slice(instructions.indexOf('### Step 5: Runtime scope gate'));

  assert.match(instructions, /git branch --no-merged HEAD --format='%\(refname:short\) %\(committerdate:iso8601\)'/);
  assert.doesNotMatch(instructions, /git branch --list --format/);
  assert.match(instructions, /commits are not already reachable from the current\s+branch/);
  for (const contract of [instructions, worker, presentation]) {
    assert.match(contract, /YYYY-MM-DD HH:mm/);
  }
  assert.match(worker, /git branch --no-merged HEAD/);
  assert.match(presentation, /filtered them with `git branch --no-merged HEAD`/);

  for (const contract of [scopeInstructions, worker, presentation]) {
    assertInOrder(contract, [
      'Full scope (Recommended)',
      'Artifacts only (specs + ADR/DDR)',
      'Code only',
    ]);
  }
  assert.match(instructions, /only\s+with applicable category-specific scopes/);
  assert.match(presentation, /never show a category-specific\s+option for an absent category/);
});

test('merge coordinator keeps contextual decisions before all mutation and preserves fast-track scope limits', () => {
  const coordinator = read('sai/commands/merge/coordinator.md');
  const presentation = read('sai/commands/merge/presentation.md');
  const presentationSpec = read('openspec/specs/merge-presentation-seam/spec.md');

  assert.match(coordinator, /Fast-track changes only the documented runtime scope gate/i);
  assert.match(coordinator, /Contextual decision gate/);
  assert.match(coordinator, /before any[\s\S]{0,80}resolution write or staging/i);
  assert.match(coordinator, /`more-context`[\s\S]{0,220}(?:no mutation|no resolution write)/i);
  assert.match(coordinator, /<<<<<<<[\s\S]{0,120}=======([\s\S]{0,120})>>>>>>>/);
  assert.match(coordinator, /Do not reconstruct content from prose[\s\S]{0,50}concatenate[\s\S]{0,50}unselected alternatives/);
  assert.match(coordinator, /author a synthesis in the coordinator/);
  assert.match(coordinator, /parse and validate all[\s\S]{0,30}of[\s\S]{0,30}object atomically/);
  assert.match(coordinator, /Reject[\s\S]{0,100}diffs[\s\S]{0,100}complete files[\s\S]{0,100}hunks/);
  assert.match(coordinator, /source[\s\S]{0,200}regions/i);
  assert.match(coordinator, /After every record passes,[\s\S]{0,80}materialize each file/);
  assert.match(coordinator, /leave every conflict untouched[\s\S]{0,50}do not[\s\S]{0,20}stage/i);

  assert.match(presentation, /contextual-analysis/);
  assert.match(presentation, /contextual_decision_status/);
  assert.match(presentation, /only accepted option[\s\S]{0,100}values are[\s\S]{0,100}`ours`, `theirs`, optional `synthesis`, and `more-context`/i);
  assert.match(presentation, /must not write a resolution, remove conflict markers, or stage/i);
  assert.match(presentation, /complete,[\s\S]{0,40}marker-free alternative/i);
  assert.match(presentation, /## Complete resolution payload/);
  assert.match(presentation, /one complete `content` string for every conflicted file/);
  assert.match(presentation, /may derive a[\s\S]{0,30}file by applying a[\s\S]{0,30}region replacement/);
  assert.match(presentationSpec, /contextual-analysis\/decision/);
  assert.match(presentationSpec, /MUST NOT write or stage a resolution before that validation/);
  assert.match(presentationSpec, /Scenario: More-context preserves the decision boundary/);
});

test('merge adaptive TODO gives contextual analysis its own canonical route item', () => {
  const policy = read('sai/policies/todo-structure.md');

  assert.match(policy, /`contextual-analysis`/);
  assert.match(policy, /Analyze conflict alternatives/);
  assert.match(policy, /`scope`, `contextual-analysis`,[\s\S]{0,40}exactly[\s\r\n]+one applicable/);
  assert.match(policy, /more-context/);
  assert.match(policy, /Fast-track changes only the scope item;[\s\S]{0,20}it never bypasses a contextual human[\s\S]{0,20}decision/);
  assert.match(policy, /No TODO transition authorizes[\s\S]{0,20}a write or stage/);
});

test('merge-evidence-ladder: declared rules, evidence ladder, missing-rule notice, and prose-only strategy', () => {
  const instructions = read('sai/commands/merge/instructions.md');

  // Finding 3a: Provenance-scoped rule capture uses correct pathspec and filters
  assert.match(instructions, /git diff --name-status[\s\S]{0,40}<merge_base>[\s\S]{0,40}<target_sha\|source_sha>[\s\S]{0,40}--diff-filter=A,M[\s\S]{0,40}openspec\/specs\/[\s\S]{0,40}docs\/adr\/[\s\S]{0,40}docs\/ddr\//);
  assert.match(instructions, /Exclude `openspec\/changes\/archive\/\*\*` entirely/);
  assert.match(instructions, /include unsynced[\s\S]{0,20}openspec\/changes\/\*\//);

  // Finding 3b: Two-rung evidence ladder is stated with correct entry conditions
  assert.match(instructions, /Evidence ladder/);
  assert.match(instructions, /L1[\s\S]{0,20}Declared rule/);
  assert.match(instructions, /L2[\s\S]{0,20}Textual context/);
  assert.match(instructions, /entered only when[\s\S]{0,60}L1 is silent[\s\S]{0,80}the rule rejects[\s\S]{0,80}both sides/);

  // Finding 3c: Missing-rule notice literal is emitted when no governing rule
  assert.match(instructions, /\[No declared rule found for this region\]/);
  assert.match(instructions, /emit a[\s\S]{0,40}visible on-screen signal:[\s\S]{0,40}\[No declared rule found for this region\]/);
  assert.match(instructions, /Missing-rule notices[\s\S]{0,40}\[No declared rule found for this region\]/);

  // Finding 3d: Strategy proposal carries no file content for any conflict class
  const strategySection = instructions.slice(instructions.indexOf('#### Global resolution strategy proposal'));
  assert.match(strategySection, /strategy text carries prose only/);
  assert.match(strategySection, /complete file content[\s\S]{0,40}appears only in the JSON/);
  assert.match(strategySection, /prose-only resolution presentation/i);
  assert.doesNotMatch(strategySection.slice(0, strategySection.indexOf('Return the proposal as')), /semantic ambiguities[\s\S]{0,200}file content/i);

  // Verify single owner of prose-only rule
  assert.match(instructions, /#### Prose-only resolution presentation[\s\S]{0,500}strategy proposal text carries prose explanations only/);
  assert.match(instructions, /strategy proposal text carries prose explanations only[\s\S]{0,200}for all conflict[\s\S]{0,20}classes/);
  assert.match(instructions, /strategy proposal text carries prose explanations only[\s\S]{0,300}coordinator never reconstructs a resolution from prose/);
  assert.match(instructions, /strategy proposal text carries prose explanations only[\s\S]{0,300}JSON `files` records/);
});

test('merge region-scoped resolution: git-sourced outcomes, region replacements, and edge cases', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const worker = read('sai/commands/merge/worker.md');
  const coordinator = read('sai/commands/merge/coordinator.md');

  // Capability 1: Git-sourced branch outcomes
  assert.match(instructions, /internal decision value `ours` — obtained from `git show :2:<file>`/);
  assert.match(instructions, /internal decision value `theirs` — obtained from `git show :3:<file>`/);
  assert.match(instructions, /materializable with `git checkout --ours`/);
  assert.match(instructions, /materializable with `git checkout --theirs`/);
  assert.match(instructions, /every region in a file resolves to the same side/i);
  assert.match(worker, /every region in[\s\S]{0,30}the file resolves to the same side/i);
  assert.match(coordinator, /source[\s\S]{0,100}git-ours[\s\S]{0,100}git-theirs[\s\S]{0,100}authored/i);
  assert.match(coordinator, /git[\s\S]{0,100}checkout[\s\S]{0,100}ours[\s\S]{0,100}theirs/i);

  // Capability 2: Region-scoped synthesis
  assert.match(instructions, /synthesis[\s\S]{0,30}limited to the conflict[\s\S]{0,30}not[\s\S]{0,30}complete file/i);
  assert.match(instructions, /never create a synthesis[\s\S]{0,80}concatenating conflict fragments or by retyping[\s\S]{0,20}untouched lines/i);
  assert.match(worker, /regions[\s\S]{0,50}conflict_id[\s\S]{0,50}text/i);
  assert.match(worker, /replacement text[\s\S]{0,50}not a diff[\s\S]{0,50}complete file/i);

  // Capability 3: Region-replacement materialization
  assert.match(coordinator, /regions[\s\S]{0,80}conflict_id[\s\S]{0,80}text/i);
  assert.match(coordinator, /splice[\s\S]{0,100}text/i);
  assert.match(coordinator, /conflict[\s\S]{0,80}region/i);
  assert.match(coordinator, /working[\s\S]{0,20}file/i);

  // Edge Case 4: File with regions resolving to different sides
  assert.match(instructions, /E4 — File with conflict regions resolving to different sides/);
  assert.match(instructions, /outcome[\s\S]{0,30}necessarily[\s\S]{0,30}synthesis[\s\S]{0,30}definition/i);
  assert.match(instructions, /mixes sides/);
  assert.match(instructions, /Git shortcut[\s\S]{0,40}cannot be used/);
  assert.match(instructions, /offer only synthesis as an alternative/);

  // Edge Case 5: Conflicts with no region markers
  assert.match(instructions, /E5 — Conflicts with no region markers/);
  assert.match(instructions, /delete[\s\S]{0,50}modify[\s\S]{0,50}rename[\s\S]{0,50}rename[\s\S]{0,50}rename[\s\S]{0,50}delete/i);
  assert.match(instructions, /no region to splice/);
  assert.match(instructions, /Region replacement does not apply/);
  assert.match(instructions, /follow the same resolution path as[\s\S]{0,40}obvious conflicts/);

  // Verify coordinator inverts check 3 validation
  const validationSection = coordinator.slice(coordinator.indexOf('Before any write, parse and validate'));
  assert.match(validationSection, /source[\s\S]{0,100}git-ours[\s\S]{0,100}git-theirs[\s\S]{0,100}authored/i);
  assert.match(validationSection, /regions[\s\S]{0,100}conflict_id/i);
  assert.match(validationSection, /Reject[\s\S]{0,100}marker/i);
  assert.doesNotMatch(validationSection, /Reject.*region replacements/i);

  // Verify guarantees survive verbatim
  assert.match(coordinator, /author a synthesis in the coordinator/i);
  assert.match(coordinator, /atomically/i);
  assert.match(coordinator, /leave every conflict untouched[\s\S]{0,50}do not[\s\S]{0,20}stage/i);
});

test('merge lifecycle validation seam defines executable boundary', () => {
  const lifecycle = read('sai/commands/merge/lifecycle.md');
  const coordinator = read('sai/commands/merge/coordinator.md');
  const presentation = read('sai/commands/merge/presentation.md');

  // Lifecycle seam defines the state machine
  assert.match(lifecycle, /Lifecycle states/);
  assert.match(lifecycle, /preflight/);
  assert.match(lifecycle, /branch-selection/);
  assert.match(lifecycle, /merge-outcome/);
  assert.match(lifecycle, /language-selection/);
  assert.match(lifecycle, /contextual-analysis/);
  assert.match(lifecycle, /resolution/);
  assert.match(lifecycle, /verification/);
  assert.match(lifecycle, /adr-ddr/);
  assert.match(lifecycle, /authorization/);
  assert.match(lifecycle, /terminal/);

  // Lifecycle seam defines the validation contract
  assert.match(lifecycle, /Transition validation/);
  assert.match(lifecycle, /validate_transition/);
  assert.match(lifecycle, /current_state.*target_state.*operation_context/);
  assert.match(lifecycle, /valid \| invalid/);

  // Lifecycle seam defines integration points
  assert.match(lifecycle, /Integration point/);
  assert.match(lifecycle, /Before merge launch/);
  assert.match(lifecycle, /Before conflict analysis/);
  assert.match(lifecycle, /Before resolution writes/);
  assert.match(lifecycle, /Before verification/);
  assert.match(lifecycle, /Before commit authorization/);

  // Lifecycle seam is neutral and deterministic
  assert.match(lifecycle, /neutral/i);
  assert.match(lifecycle, /deterministic enforcement/i);
  assert.match(lifecycle, /allowed-transition table/i);

  // Coordinator fetches and references the lifecycle seam
  assert.match(coordinator, /Fetch @sai\/commands\/merge\/lifecycle\.md/);
  assert.match(coordinator, /lifecycle[\s\S]{0,20}validation seam/);
  assert.match(coordinator, /validate the lifecycle transition/);

  // Presentation references the lifecycle seam
  assert.match(presentation, /@sai\/commands\/merge\/lifecycle\.md/);
  assert.match(presentation, /lifecycle[\s\S]{0,20}validation seam/);
});

test('merge lifecycle defines explicit allowed-transition table with preconditions', () => {
  const lifecycle = read('sai/commands/merge/lifecycle.md');

  // Allowed transitions table is present
  assert.match(lifecycle, /Allowed transitions and preconditions/);
  assert.match(lifecycle, /current_state[\s\S]{0,40}target_state[\s\S]{0,40}precondition/);

  // Clean path transitions are defined
  assert.match(lifecycle, /merge-outcome[\s\S]{0,40}adr-ddr[\s\S]{0,80}merge_outcome = clean/);
  assert.match(lifecycle, /adr-ddr[\s\S]{0,40}authorization/);
  assert.match(lifecycle, /authorization[\s\S]{0,40}terminal/);

  // Conflicted path transitions are defined
  assert.match(lifecycle, /merge-outcome[\s\S]{0,40}language-selection[\s\S]{0,80}merge_outcome = conflicted/);
  assert.match(lifecycle, /language-selection[\s\S]{0,40}scope-selection/);
  assert.match(lifecycle, /scope-selection[\s\S]{0,40}contextual-analysis/);
  assert.match(lifecycle, /contextual-analysis[\s\S]{0,40}resolution/);
  assert.match(lifecycle, /resolution[\s\S]{0,40}verification/);
  assert.match(lifecycle, /verification[\s\S]{0,40}adr-ddr/);

  // Preconditions are defined for each transition
  assert.match(lifecycle, /environment checks complete/);
  assert.match(lifecycle, /branch selected.*merge provenance captured/is);
  assert.match(lifecycle, /working_language resolved/);
  assert.match(lifecycle, /selected_scope.*non-empty/is);
  assert.match(lifecycle, /strategy confirmed/);
  assert.match(lifecycle, /verification_result.*passed.*cap-exhausted/is);
  assert.match(lifecycle, /collision check complete or skipped/);
  assert.match(lifecycle, /authorization_status.*resolved/is);

  // Non-committing closure is defined
  assert.match(lifecycle, /non-committing closure/i);
  assert.match(lifecycle, /adr-ddr[\s\S]{0,40}terminal[\s\S]{0,120}authorization_status = cleared/is);
});

test('merge lifecycle rejects invalid transitions with no mutation', () => {
  const lifecycle = read('sai/commands/merge/lifecycle.md');
  const coordinator = read('sai/commands/merge/coordinator.md');

  // Invalid transition reporting is defined
  assert.match(lifecycle, /Invalid transitions/);
  assert.match(lifecycle, /result: "invalid"/);
  assert.match(lifecycle, /violated_precondition/);

  // Coordinator halts on invalid
  assert.match(coordinator, /invalid[\s\S]{0,200}halt before selecting the operation/i);
  assert.match(coordinator, /invalid[\s\S]{0,200}no mutation/i);
  assert.match(coordinator, /invalid[\s\S]{0,200}no presentation update/i);

  // Lifecycle enforces no mutation on invalid
  assert.match(lifecycle, /invalid[\s\S]{0,300}no mutation/i);
  assert.match(lifecycle, /invalid[\s\S]{0,300}dispatch no worker/i);
  assert.match(lifecycle, /invalid[\s\S]{0,300}no presentation update/i);
});

test('merge lifecycle clean path cannot enter conflict-only states', () => {
  const lifecycle = read('sai/commands/merge/lifecycle.md');

  // Clean path goes directly to adr-ddr
  assert.match(lifecycle, /merge-outcome[\s\S]{0,40}adr-ddr[\s\S]{0,80}merge_outcome = clean/);

  // Clean path skips conflict states
  assert.match(lifecycle, /clean path skips every conflict-only state/i);
  assert.match(lifecycle, /language-selection.*scope-selection.*contextual-analysis.*resolution.*verification/is);

  // Conflicted path requires language-selection first
  assert.match(lifecycle, /merge-outcome[\s\S]{0,40}language-selection[\s\S]{0,80}merge_outcome = conflicted/);
  assert.match(lifecycle, /conflicted path MUST enter language-selection/i);
});

test('merge lifecycle fast-track bypasses only scope selection', () => {
  const lifecycle = read('sai/commands/merge/lifecycle.md');
  const coordinator = read('sai/commands/merge/coordinator.md');

  // Fast-track can satisfy scope implicitly
  assert.match(lifecycle, /fast_track_active may satisfy scope implicitly/i);
  assert.match(lifecycle, /fast_track_active supplies full scope/i);

  // Fast-track does not bypass language
  assert.match(lifecycle, /language gate is never bypassed/i);
  assert.match(coordinator, /Fast-track changes only the documented runtime scope gate/i);

  // Other gates remain required
  assert.match(lifecycle, /working_language resolved to a non-empty token/);
  assert.match(lifecycle, /strategy confirmed/);
  assert.match(lifecycle, /verification_result/);
});

test('merge lifecycle preserves neutrality and worker/mutation ownership', () => {
  const lifecycle = read('sai/commands/merge/lifecycle.md');
  const coordinator = read('sai/commands/merge/coordinator.md');
  const presentation = read('sai/commands/merge/presentation.md');

  // Lifecycle is neutral
  assert.match(lifecycle, /neutral for Claude Code and opencode/i);
  assert.match(lifecycle, /Both harnesses[\s\S]{0,20}use the same state definitions/);

  // Validation is coordinator-owned
  assert.match(lifecycle, /coordinator-owned/i);
  assert.match(coordinator, /validation is deterministic and coordinator-owned/i);

  // Worker ownership preserved
  assert.match(lifecycle, /does not dispatch[\s\S]{0,40}worker/i);
  assert.match(lifecycle, /Technical analysis remains the worker's[\s\S]{0,10}responsibility/i);

  // Mutation ownership preserved
  assert.match(lifecycle, /every mutation remains the coordinator's responsibility/i);
  assert.match(coordinator, /does not change[\s\S]{0,40}worker ownership[\s\S]{0,40}mutation ownership/is);

  // Presentation updates only after validated transitions
  assert.match(presentation, /Presentation state updates occur[\s\S]{0,80}after a validated transition/i);
  assert.match(presentation, /invalid[\s\S]{0,40}validation result produces no presentation update/i);
});

test('merge lifecycle precondition details cover all operation contexts', () => {
  const lifecycle = read('sai/commands/merge/lifecycle.md');

  // Each precondition is detailed
  assert.match(lifecycle, /Precondition details/);

  // Check for key precondition phrases
  assert.match(lifecycle, /dirty-worktree gate has passed/);
  assert.match(lifecycle, /target_sha.*source_sha.*merge_base/is);
  assert.match(lifecycle, /clean path skips every conflict-only state/i);
  assert.match(lifecycle, /conflicted path MUST enter language-selection/i);
  assert.match(lifecycle, /working-language question has been answered/i);
  assert.match(lifecycle, /scope value has been selected/i);
  assert.match(lifecycle, /user has confirmed the current global strategy/i);
  assert.match(lifecycle, /every validated resolution file has been written/i);
  assert.match(lifecycle, /test suite has passed[\s\S]{0,50}three-round budget is exhausted/is);
  assert.match(lifecycle, /collision scan has completed[\s\S]{0,50}legitimately[\s\S]{0,20}skipped/is);
  assert.match(lifecycle, /authorization gate has been answered/i);
  assert.match(lifecycle, /non-committing closure/i);
});

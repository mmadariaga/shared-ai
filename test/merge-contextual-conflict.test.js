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
  assert.match(instructions, /different objectives,[\s\S]{0,80}different[\s\S]{0,20}strategies/);
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
  assert.match(instructions, /"content": "the complete final UTF-8 file contents as a JSON string"/);
  assert.match(instructions, /not a diff, hunk,[\s\S]{0,80}region replacement/);
  assert.match(mergeSpec, /contextual complete alternatives/i);
  assert.match(mergeSpec, /Obvious conflict stays lightweight/);
  assert.match(mergeSpec, /Semantic conflict requires an informed human choice/);
  assert.match(mergeSpec, /complete final file contents/);
  assert.doesNotMatch(mergeSpec, /labeled ours\/theirs variants for genuinely divergent code regions/);
  assert.match(worker, /never suppresses a[\s\S]{0,40}required[\s\S]{0,40}contextual decision/i);
  assert.match(worker, /more-context/);
  assert.match(worker, /only explicit decisions[\s\S]{0,30}unlock[\s\S]{0,30}proposal[\s\S]{0,30}delivery/i);
  assert.match(worker, /one record per conflicted file[\s\S]{0,160}complete final UTF-8 file contents/);
  assert.match(worker, /Return no diff, hunk, region replacement/);
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
    'Return the following closed',
    'event: conflict_detected',
    'After the coordinator asks for and receives the working language',
    'read the three versions',
    'Classify each conflicted file',
  ]);
  assert.match(stepFour, /before classification or semantic analysis/i);
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
  assert.match(coordinator, /Do not reconstruct content from prose,[\s\S]{0,20}concatenate unselected alternatives/);
  assert.match(coordinator, /author a synthesis in the coordinator/);
  assert.match(coordinator, /parse and validate all[\s\S]{0,30}of[\s\S]{0,30}object atomically/);
  assert.match(coordinator, /Reject diffs, hunks, region replacements/);
  assert.match(coordinator, /After every record passes,[\s\S]{0,80}write each `content` value exactly as supplied/);
  assert.match(coordinator, /leave every conflict untouched and do not stage/);

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

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '../sai/commands/explore/steps', file), 'utf8');

// Bound each assertion to its definition, not a file-wide or neighboring match.
function definition(text, marker) {
  let start = text.indexOf(marker);
  assert.notEqual(start, -1, `Missing question definition: ${marker}`);
  if (marker.startsWith('\n')) start += 1;
  const end = text.indexOf('\n', start);
  return text.slice(start, end === -1 ? text.length : end);
}

function assertPicker(text) {
  for (const required of ['harness-native picker', '"Closed-choice prompts"',
    '`sai/policies/remember.md`', '`AskUserQuestion`', 'Claude Code', '`question`', 'opencode']) {
    assert.ok(text.includes(required), `Missing local instruction: ${required}`);
  }
}

const definitions = [
  ['issue-intake.md', '**Work question.**'],
  ['issue-intake.md', 'Ask it only for an issue with the Ready to Propose form'],
  ['issue-intake.md', 'Ask it after `clean` or `declared-clean`'],
  ['open-decisions.md', '**Questions.**'],
  ['artifact-review-language-gate.md', '**Non-English gate**:'],
  ['crystallization-language-gates.md', "The gate's machinery"],
  ['route-selector.md', '1. **Backlog question:**'],
  ['route-selector.md', '- **One recorded change:**'],
  ['route-selector.md', '- **More than one recorded change (a slice set):**'],
  ['route-selector.md', '3. **Assignment question:**'],
  ['route-selector.md', '1. **Publication approval:**'],
  ['route-selector.md', '2. **Branch base:**'],
  ['route-selector.md', '**Skill ownership and completion.**'],
  ['route-selector.md', '5. **Existing expected branch.**'],
  ['route-selector.md', '\nPresent it through the harness-native picker'],
  ['route-selector.md', 'Then present the concise picker question'],
  ['pipeline-plan-unattended.md', 'Only when round 3 left `overview_language` unresolved'],
  ['route-selector.md', '**Question.** With nothing resolved'],
  ['pipeline-plan-unattended.md', '- **Escalation default**'],
  ['pipeline-plan-unattended.md', '**Design question autonomy**:'],
  ['review-loop.md', '**On Yes**:'],
  ['common.md', 'After the unchanged existing maturity text question'],
  ['implementation-details.md', 'Only after the established edge-case text question'],
  // Already-complete definitions must remain covered without rewriting them.
  ['common.md', 'When it fires, present the go/no-go'],
  ['poc-lane.md', '- **`<Cn> wins` (E4).**'],
];

for (const [file, marker] of definitions) {
  test(`${file}: ${marker} names both tools and the shared rule locally`, () => {
    assertPicker(definition(read(file), marker));
  });
}

test('pending Direct Build intervention names both tools and the shared rule in its own item', () => {
  const text = read('route-selector.md');
  const start = text.indexOf('2. When user intervention is needed');
  const end = text.indexOf('\n3. On an explicit executable resume choice', start);
  assert.ok(start >= 0 && end > start);
  assertPicker(text.slice(start, end));
});

test('a neighboring question cannot satisfy a missing local requirement', () => {
  const text = read('issue-intake.md');
  const marker = 'Ask it only for an issue with the Ready to Propose form';
  const local = definition(text, marker);
  for (const required of ['`AskUserQuestion`', '`question`', '`sai/policies/remember.md`']) {
    const mutated = text.replace(local, local.replace(required, 'removed'));
    assert.ok(mutated.includes(required), 'Other questions still contain the requirement');
    assert.throws(() => assertPicker(definition(mutated, marker)));
  }
});

test('explicit conversational questions stay plain text', () => {
  const invitation = definition(read('review-loop.md'), '**On the semantic path only**');
  assert.match(invitation, /plain conversational text/);
  assert.match(invitation, /never the harness option-picker/);
  assert.match(invitation, /exception covers ONLY this global invitation/);
  assert.match(definition(read('common.md'), '**List stages ('), /\*\*Display and question\*\*/);
  const lists = definition(fs.readFileSync(path.join(__dirname, '../sai/commands/explore/list-writing.md'), 'utf8'), '**Display and question.**');
  assert.match(lists, /one plain conversational question/);
  assert.match(lists, /never (?:as )?a native yes\/no picker/);
  const candidates = definition(read('poc-lane.md'), '**Stop 2 — candidate list agreement');
  assert.match(candidates, /one plain conversational question/);
  assert.match(candidates, /use no native yes\/no picker/);
  for (const text of [invitation, lists, candidates]) {
    assert.doesNotMatch(text, /Present it through the harness-native picker/);
  }
});

test('the shared rule retains picker-unavailable and capacity fallbacks', () => {
  const remember = fs.readFileSync(path.join(__dirname, '../sai/policies/remember.md'), 'utf8');
  assert.match(remember, /Plain text is the fallback, only on a surface without a native picker or for a set larger than the declared capacity/);
  assert.match(definition(read('issue-intake.md'), '- **Several unrelated issues**'), /falling back to numbered plain text beyond the harness picker capacity/);
  assert.match(definition(read('common.md'), '**Optional native stage selectors'), /unchanged text-only fallback/);
});

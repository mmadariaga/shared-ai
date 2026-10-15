'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'ready-to-propose.js');
const tool = require(TOOL);
const POLICY = fs.readFileSync(path.join(REPO_ROOT, 'sai', 'policies', 'issue-format.md'), 'utf8');

function issue({ maturity = 'Ready to propose', openQuestions = 'None.', scope, edge, notes, extra = '' } = {}) {
  return [
    '## Problem',
    'Re-confirming lists wastes turns.',
    '',
    '## Goal',
    'Convert a mature issue straight into a block.',
    '',
    '## Scope',
    scope === undefined ? '- A mature issue becomes a block\n- The block keeps the issue language' : scope,
    '',
    '## Non-goals',
    '- Changing the import skill',
    '',
    edge === null ? '' : `## Edge cases\n${edge === undefined ? '- E1 A rejected issue follows the planned steps.\n- E4 Slices keep the literal text.' : edge}\n`,
    notes === null ? '' : `## Implementation notes\n${notes === undefined ? '- I1 Add the convert subcommand.\n- I3 Add the shortcut intent.' : notes}\n`,
    extra,
    '## Open questions',
    openQuestions,
    '',
    '## Maturity',
    maturity,
    '',
    '<!-- backlog-id-counters: E=4 I=3 Q=0 -->',
  ].join('\n');
}

function run(args, input) {
  const result = spawnSync(process.execPath, [TOOL, 'convert', ...args], { input, encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr, payload: JSON.parse(result.stdout) };
}

test('the tool constants match the section set and Maturity values of the issue format policy', () => {
  const mandatory = POLICY.match(/mandatory sections are ([^.]*)\./s)[1];
  assert.deepEqual([...mandatory.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]), tool.ISSUE_MANDATORY_SECTIONS);
  const optional = POLICY.match(/Optional ([\s\S]*?) appear between/)[1];
  assert.deepEqual([...optional.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]), tool.ISSUE_OPTIONAL_SECTIONS);
  const maturity = POLICY.split('### Maturity — mandatory')[1].split('Require all preceding levels')[0];
  assert.deepEqual([...maturity.matchAll(/^- `([^`]+)`:/gm)].map((m) => m[1]), tool.MATURITY_VALUES);
});

test('a Ready to Propose issue converts to a dispatchable block with literal E/I lists and None for unsourced fields', () => {
  const { status, payload } = run([], issue());
  assert.equal(status, 0);
  assert.equal(payload.ready_to_propose_form, true);
  assert.equal(payload.converted, true);
  assert.deepEqual(payload.rejections, []);
  assert.equal(payload.proposed_change_name, 'convert-mature-issue-straight-block');
  assert.deepEqual(payload.edge_cases, ['E1 A rejected issue follows the planned steps.', 'E4 Slices keep the literal text.']);
  assert.deepEqual(payload.implementation_details, ['I1 Add the convert subcommand.', 'I3 Add the shortcut intent.']);
  const strict = tool.detect(payload.block, 'dispatchable');
  assert.equal(strict.ok, true);
  assert.equal(strict.blocks[0].hash, payload.validation.hash);
  for (const label of ['Alternatives Considered', 'Trade-offs Accepted', 'Model / Re-framings', 'Terms', 'Out of scope Implementation Details']) {
    assert.match(payload.block, new RegExp(`\\*\\*${label.replace(/[/]/g, '\\/')}\\*\\*:\\n- None\\n`));
  }
  assert.match(payload.block, /\*\*Why\*\*: Re-confirming lists wastes turns\./);
  assert.match(payload.block, /\*\*What\*\*: Convert a mature issue straight into a block\./);
  assert.match(payload.block, /\*\*Key constraints\*\*:\n- Changing the import skill\n/);
  assert.match(payload.block, /\*\*Edge Cases\*\*:\n- E1 A rejected issue follows the planned steps\.\n- E4 Slices keep the literal text\.\n/);
  assert.doesNotMatch(payload.block, /Request Additional Notes/);
  assert.doesNotMatch(payload.block, /backlog-id-counters/);
});

test('the declared-clean flag adds the Request Additional Notes line and --change-name sets the name', () => {
  const { payload } = run(['--declared-clean', '--change-name', 'my-change'], issue());
  assert.equal(payload.converted, true);
  assert.match(payload.block, /\*\*Change name\*\*: my-change\n/);
  assert.ok(payload.block.includes(`**Request Additional Notes**:\n${tool.DECLARED_CLEAN_NOTE}\n**Overview language**: None`));
});

test('an issue without the Ready to Propose form returns the form flag and no block', () => {
  for (const maturity of ['Scope agreed', 'Idea', 'Not agreed yet.']) {
    const { status, payload } = run([], issue({ maturity }));
    assert.equal(status, 0);
    assert.equal(payload.ready_to_propose_form, false);
    assert.equal(payload.converted, false);
    assert.equal(payload.block, null);
  }
  const plain = run([], 'Just a paragraph about a bug.');
  assert.equal(plain.payload.ready_to_propose_form, false);
  assert.equal(plain.payload.maturity, null);
});

test('open questions, empty scope, unverifiable scope, and unidentified items are conversion rejections', () => {
  const codes = (text) => run([], text).payload.rejections.map((r) => r.code);
  const open = run([], issue({ openQuestions: '- Q1 Which provider?' }));
  assert.equal(open.status, 1);
  assert.equal(open.payload.block, null);
  assert.ok(open.payload.rejections.some((r) => r.code === 'OPEN_QUESTIONS_PRESENT'));
  assert.ok(codes(issue({ scope: 'Not agreed yet.' })).includes('EMPTY_ISSUE_SECTION'));
  assert.ok(codes(issue({ scope: '- Should the tool reject more issues?' })).includes('SCOPE_NOT_VERIFIABLE'));
  assert.ok(codes(issue({ edge: '- no identifier here' })).includes('UNIDENTIFIED_ITEM'));
});

test('an issue with no implementation notes is rejected by the dispatchable profile', () => {
  const { status, payload } = run([], issue({ notes: null }));
  assert.equal(status, 1);
  assert.ok(payload.rejections.some((r) => r.code === 'NO_IMPLEMENTATION_ITEM'));
});

test('an issue without optional sections converts those fields to None', () => {
  const { payload } = run([], issue({ edge: null }));
  assert.equal(payload.converted, true);
  assert.match(payload.block, /\*\*Edge Cases\*\*:\n- None\n/);
  assert.match(payload.block, /\*\*Research Leads\*\*:\n- None\n/);
  assert.match(payload.block, /\*\*Decisions & Rationale\*\*:\n- None\n/);
});

test('HTML issue text converts like the Markdown one and comments never carry content', () => {
  const html = '<h2>Problem</h2><div>Re-confirming &amp; waiting.</div><h2>Goal</h2><p>Convert <code>issue</code> text.</p>'
    + '<h2>Scope</h2><ul><li>A mature issue becomes a block</li></ul><h2>Non-goals</h2><ul><li>None</li></ul>'
    + '<h2>Edge cases</h2><ul><li>E1 A rejected issue follows the planned steps.</li></ul>'
    + '<h2>Implementation notes</h2><ul><li>I1 Add the subcommand.</li></ul>'
    + '<h2>Open questions</h2><p>None.</p><h2>Maturity</h2><p>Ready to propose</p>'
    + '<!-- hidden: **Alternatives Considered**\n- invented -->';
  const { status, payload } = run(['--change-name', 'html-issue'], html);
  assert.equal(status, 0);
  assert.equal(payload.converted, true);
  assert.match(payload.block, /\*\*Why\*\*: Re-confirming & waiting\./);
  assert.match(payload.block, /\*\*What\*\*: Convert `issue` text\./);
  assert.match(payload.block, /\*\*Capabilities in scope\*\*:\n- A mature issue becomes a block\n/);
  assert.match(payload.block, /\*\*Key constraints\*\*:\n- None\n/);
  assert.doesNotMatch(payload.block, /invented/);
});

test('the issue language is preserved and the hygiene pre-filter surfaces its flagged lines', () => {
  const text = issue({ notes: '- I1 Añadir el subcomando que ejecuta git commit al final.' });
  const { payload } = run(['--change-name', 'subcomando'], text);
  assert.match(payload.block, /I1 Añadir el subcomando que ejecuta git commit al final\./);
  assert.ok(payload.validation.flagged.some((entry) => entry.clause === 'mutating-git'));
});

test('convert reports usage errors for a missing flag value', () => {
  const result = spawnSync(process.execPath, [TOOL, 'convert', '--change-name'], { input: '', encoding: 'utf8' });
  assert.equal(result.status, 2);
});

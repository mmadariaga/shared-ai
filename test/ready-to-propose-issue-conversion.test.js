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

test('an issue with no implementation notes converts with - None as the I-list (E8)', () => {
  const { status, payload } = run([], issue({ notes: null }));
  assert.equal(status, 0);
  assert.equal(payload.converted, true);
  assert.deepEqual(payload.implementation_details, []);
  assert.match(payload.block, /\*\*Implementation Details\*\*:\n- None\n/);
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

test('E10 I7: HTML detection ignores tags inside code spans and fenced code blocks and defaults to Markdown', () => {
  const detector = require('../sai/tools/ready-to-propose');
  const markdown = 'Use `<p>` and `<br>` or `<div>` in text.\n\n```html\n<ul><li>x</li></ul>\n```\n\n- item';
  assert.equal(detector.isHtmlDescription(markdown), false);
  assert.equal(detector.issueToMarkdown(markdown), markdown);
  assert.equal(detector.isHtmlDescription('Only `<p>` and `<div>` literals'), false);
  assert.equal(detector.isHtmlDescription('<p>real</p> and `<b>`'), true);
  assert.equal(detector.isHtmlDescription('```\n<p>x</p>\n```\n<p>real</p>'), true);
  assert.equal(detector.isHtmlDescription('# Heading\n<p>x</p>'), false);
  assert.equal(detector.isHtmlDescription(''), false);
});

test('I4: an issue of any Maturity returns its per-section reading and the seed event (E5, E6)', () => {
  const { status, payload } = run([], issue({ maturity: 'Edge cases agreed', notes: null }));
  assert.equal(status, 0);
  assert.equal(payload.converted, false);
  assert.equal(payload.sections['explore-change'].status, 'present');
  assert.equal(payload.sections['review-edge-cases'].status, 'present');
  assert.deepEqual(payload.sections['review-edge-cases'].items, ['E1 A rejected issue follows the planned steps.', 'E4 Slices keep the literal text.']);
  assert.equal(payload.sections['implementation-details'].status, 'absent');
  assert.deepEqual(payload.open_questions, []);
  assert.deepEqual(payload.seed, {
    sections: {
      'explore-change': { state: 'agreed', source: 'issue' },
      'review-edge-cases': { state: 'agreed', source: 'issue', list: ['E1', 'E4'] },
      'implementation-details': { state: 'open', source: 'issue' },
    },
  });
});

test('E6: a section that says none explicitly is seeded agreed and empty; a blank or not-agreed one is open', () => {
  const none = run([], issue({ edge: '- None.', notes: 'Not agreed yet.' })).payload;
  assert.equal(none.sections['review-edge-cases'].status, 'explicitly-empty');
  assert.deepEqual(none.seed.sections['review-edge-cases'], { state: 'agreed', source: 'issue', list: [] });
  assert.equal(none.sections['implementation-details'].status, 'absent');
  assert.deepEqual(none.seed.sections['implementation-details'], { state: 'open', source: 'issue' });

  const unagreed = run([], issue({ scope: 'Not agreed yet.' })).payload;
  assert.equal(unagreed.sections['explore-change'].status, 'absent');
  assert.equal(unagreed.seed.sections['explore-change'].state, 'open');
});

test('E7: each open question marks the section it affects open, and one that maps to no single section marks explore-change', () => {
  const text = issue({ openQuestions: '- Q1 Should E1 reject empty input?\n- Q2 Does I3 need a flag?\n- Q3 Which provider is used?\n- Q4 Does E4 change I1?' });
  const { status, payload } = run([], text);
  assert.equal(status, 1, 'the block conversion still rejects the open questions');
  assert.deepEqual(payload.open_questions.map((q) => [q.affects, q.single]), [
    ['review-edge-cases', true],
    ['implementation-details', true],
    ['explore-change', false],
    ['explore-change', false],
  ]);
  for (const stage of ['explore-change', 'review-edge-cases', 'implementation-details']) {
    assert.equal(payload.seed.sections[stage].state, 'open', stage);
  }
  // The content stays as the starting proposal.
  assert.deepEqual(payload.seed.sections['review-edge-cases'].list, ['E1', 'E4']);

  const one = run([], issue({ openQuestions: '- Q1 Should E1 reject empty input?' })).payload;
  assert.equal(one.seed.sections['review-edge-cases'].state, 'open');
  assert.equal(one.seed.sections['implementation-details'].state, 'agreed');
  assert.equal(one.seed.sections['explore-change'].state, 'agreed');
});

test('text that is not an issue seeds every section open', () => {
  const { status, payload } = run([], 'Just a paragraph about a bug.');
  assert.equal(status, 0);
  for (const stage of ['explore-change', 'review-edge-cases', 'implementation-details']) {
    assert.deepEqual(payload.seed.sections[stage], { state: 'open', source: 'issue' });
  }
});

test('I5: compare reports metadata when only the origin lines differ and content otherwise', () => {
  const detector = require('../sai/tools/ready-to-propose');
  const base = [
    '## Ready to Propose', '', '**Change name**: x', '**What**: Adds a thing.', '**Why**: Needed.', '**Capabilities in scope**:', '- thing',
    '**Research Leads**:', '- None', '**Decisions & Rationale**:', '- None', '**Alternatives Considered**:', '- None', '**Trade-offs Accepted**:', '- None',
    '**Model / Re-framings**:', '- None', '**Key constraints**:', '- None', '**Terms**:', '- None', '**Edge Cases**:', '- E1: a', '**Implementation Details**:', '- I1: b',
    '**Out of scope Implementation Details**:', '- None', '**Overview language**: None', '', '---', '',
  ].join('\n');
  const originLine = '**Backlog origin**: https://github.com/team/repo/issues/11\n**What**:';
  const origin = base.replace('**What**:', originLine);
  const explore = origin.replace('**What**:', '**Explore origin**: claude 6b1f93a0-44bb-4449-a7c3-39b3ece9abea\n**What**:');

  assert.deepEqual(detector.compareBlocks(base, base), { amend_kind: 'metadata', changed_fields: [] });
  assert.deepEqual(detector.compareBlocks(base, origin), { amend_kind: 'metadata', changed_fields: ['Backlog origin'] });
  assert.deepEqual(detector.compareBlocks(origin, explore), { amend_kind: 'metadata', changed_fields: ['Explore origin'] });
  assert.deepEqual(detector.compareBlocks(explore, base), { amend_kind: 'metadata', changed_fields: ['Backlog origin', 'Explore origin'] });
  for (const [label, changed] of [
    ['What', base.replace('Adds a thing.', 'Adds another thing.')],
    ['Why', base.replace('Needed.', 'Wanted.')],
    ['Capabilities in scope', base.replace('- thing', '- thing\n- more')],
    ['Key constraints', base.replace('**Key constraints**:\n- None', '**Key constraints**:\n- Keep it small.')],
    ['Edge Cases', base.replace('- E1: a', '- E1: c')],
    ['Implementation Details', base.replace('- I1: b', '- I1: d')],
    ['Overview language', base.replace('**Overview language**: None', '**Overview language**: es')],
  ]) {
    assert.deepEqual(detector.compareBlocks(base, changed), { amend_kind: 'content', changed_fields: [label] }, label);
    assert.equal(detector.compareBlocks(origin, changed.replace('**What**:', originLine)).amend_kind, 'content', label);
  }
});

test('I5: the compare sub-command reads one stored and one amended block file', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'rtp-compare-'));
  try {
    const stored = path.join(dir, 'stored.md');
    const amended = path.join(dir, 'amended.md');
    const block = '## Ready to Propose\n\n**Change name**: x\n**What**: A.\n**Why**: B.\n\n---\n';
    fs.writeFileSync(stored, block);
    fs.writeFileSync(amended, block.replace('A.', 'C.'));
    const result = spawnSync(process.execPath, [TOOL, 'compare', '--stored-file', stored, '--block-file', amended], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { ok: true, amend_kind: 'content', changed_fields: ['What'] });
    const missing = spawnSync(process.execPath, [TOOL, 'compare', '--block-file', amended], { encoding: 'utf8' });
    assert.equal(missing.status, 1);
    assert.equal(JSON.parse(missing.stdout).ok, false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('I3: the seed carries identifiers only; an item without its own identifier takes the next unused number', () => {
  const { payload } = run([], issue({ maturity: 'Edge cases agreed', edge: '- E2 Kept as written.\n- An item with no identifier\n- E1 Another kept.', notes: null }));
  assert.deepEqual(payload.seed.sections['review-edge-cases'].list, ['E2', 'E3', 'E1']);
  assert.deepEqual(payload.sections['review-edge-cases'].items.length, 3);
  assert.ok(!JSON.stringify(payload.seed).includes('Kept as written'));
});

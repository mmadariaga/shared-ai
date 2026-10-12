'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'ready-to-propose.js');
const {
  checkLoose, checkStrict, checkDispatchable, detect, hashBlock, resolveJudgment,
  extractBlockTexts, LOOSE_LITERALS, HYGIENE_CLAUSES, VERDICTS_MARKER,
} = require(TOOL);

function run(args, input) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { input, encoding: 'utf8' });
  let payload = null;
  try {
    payload = JSON.parse(result.stdout);
  } catch (err) {
    // Not JSON output
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, payload };
}

function block(name, overrides = {}) {
  const fields = {
    'Change name': ` ${name}`,
    What: ' Adds a thing.',
    Why: ' Because it is needed.',
    'Capabilities in scope': '\n- thing: does a thing',
    'Research Leads': '\n- None',
    'Decisions & Rationale': '\n- None',
    'Alternatives Considered': '\n- None',
    'Trade-offs Accepted': '\n- None',
    'Model / Re-framings': '\n- None',
    'Key constraints': '\n- No format change.',
    Terms: '\n- None',
    'Edge Cases': '\n- E1: empty input fails.',
    'Implementation Details': '\n- I1: add the module.',
    'Out of scope Implementation Details': '\n- None',
    'Request Additional Notes': null,
    'Overview language': ' None',
    ...overrides,
  };
  const lines = ['## Ready to Propose', ''];
  for (const [label, value] of Object.entries(fields)) {
    if (value !== null) {
      lines.push(`**${label}**:${value}`);
    }
  }
  lines.push('', '---', '');
  return lines.join('\n');
}

function allViolations(verdict) {
  return [...verdict.violations, ...verdict.blocks.flatMap((b) => b.violations)];
}

// ---------------------------------------------------------------------------
// strict profile
// ---------------------------------------------------------------------------

test('strict: a canonical block passes and its name is extracted', () => {
  const verdict = checkStrict(block('add-thing'));
  assert.equal(verdict.ok, true, JSON.stringify(allViolations(verdict)));
  assert.deepEqual(verdict.names, ['add-thing']);
  assert.equal(verdict.blocks.length, 1);
});

test('strict: multiple blocks pass and names keep block order', () => {
  const text = `${block('slice-one')}\n${block('slice-two')}`;
  const verdict = checkStrict(text);
  assert.equal(verdict.ok, true, JSON.stringify(allViolations(verdict)));
  assert.deepEqual(verdict.names, ['slice-one', 'slice-two']);
});

test('strict: one invalid block fails the whole set and is identified by index', () => {
  const verdict = checkStrict(`${block('good-slice')}\n${block('bad-slice', { Terms: null })}`);
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.blocks[0].violations, []);
  assert.equal(verdict.blocks[1].index, 1);
  assert.ok(verdict.blocks[1].violations.some((v) => v.problem === 'MISSING_SECTION'));
});

test('strict: duplicate change names across the set fail', () => {
  const verdict = checkStrict(`${block('same-name')}\n${block('same-name')}`);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.violations.some((v) => v.problem === 'DUPLICATE_CHANGE_NAME'));
});

test('strict: fields omitted by the old lint list are required', () => {
  for (const label of ['Change name', 'What', 'Why', 'Terms', 'Overview language']) {
    const verdict = checkStrict(block('add-thing', { [label]: null }));
    assert.equal(verdict.ok, false, label);
    assert.ok(allViolations(verdict).some((v) => v.problem === 'MISSING_SECTION'
      && v.detail.includes(label)), label);
  }
});

test('strict: non-kebab-case change name fails', () => {
  const verdict = checkStrict(block('Add_Thing'));
  assert.ok(allViolations(verdict).some((v) => v.problem === 'INVALID_CHANGE_NAME'));
});

test('strict: a block not terminated by --- fails', () => {
  const text = block('add-thing').replace(/\n---\n$/, '\n');
  const verdict = checkStrict(text);
  assert.ok(allViolations(verdict).some((v) => v.problem === 'MISSING_SEPARATOR'));
});

test('strict: sections out of order fail', () => {
  const text = block('add-thing')
    .replace('**What**: Adds a thing.\n**Why**: Because it is needed.',
      '**Why**: Because it is needed.\n**What**: Adds a thing.');
  const verdict = checkStrict(text);
  assert.ok(allViolations(verdict).some((v) => v.problem === 'WRONG_SECTION_ORDER'));
});

test('strict: an empty mandatory section fails; - None passes', () => {
  const empty = checkStrict(block('add-thing', { 'Research Leads': '' }));
  assert.ok(allViolations(empty).some((v) => v.problem === 'EMPTY_SECTION'));
  assert.equal(checkStrict(block('add-thing')).ok, true);
});

test('strict: Request Additional Notes is optional, needs content, and sits before Overview language', () => {
  assert.equal(checkStrict(block('add-thing', { 'Request Additional Notes': '\nSome context.' })).ok, true);
  const none = checkStrict(block('add-thing', { 'Request Additional Notes': '\n- None' }));
  assert.ok(allViolations(none).some((v) => v.problem === 'EMPTY_SECTION'));
});

test('strict: Overview language must be the last line before ---', () => {
  const text = block('add-thing').replace('**Overview language**: None\n',
    '**Overview language**: None\ntrailing prose\n');
  const verdict = checkStrict(text);
  assert.ok(allViolations(verdict).some((v) => v.problem === 'OVERVIEW_LANGUAGE_NOT_LAST'));
});

test('strict: missing heading fails', () => {
  const verdict = checkStrict('no block here');
  assert.ok(verdict.violations.some((v) => v.problem === 'MISSING_BLOCK_HEADING'));
});

test('strict: prose in another language passes (labels stay English)', () => {
  const text = block('anadir-cosa', {
    What: ' Añade una cosa nueva.',
    Why: ' Porque hace falta.',
    'Key constraints': '\n- Sin cambios de formato.',
  });
  assert.equal(checkStrict(text).ok, true);
});

test('strict: CRLF line endings pass', () => {
  assert.equal(checkStrict(block('add-thing').replace(/\n/g, '\r\n')).ok, true);
});

// ---------------------------------------------------------------------------
// loose profile
// ---------------------------------------------------------------------------

test('loose: the nine literals are exactly backfill\'s quorum', () => {
  assert.deepEqual(LOOSE_LITERALS, [
    'Change name', 'What', 'Why', 'Capabilities in scope', 'Alternatives Considered',
    'Trade-offs Accepted', 'Key constraints', 'Edge Cases', 'Implementation Details',
  ]);
});

test('loose: literals anywhere, in any order, with no heading, pass', () => {
  const text = 'Implementation Details and Edge Cases; Key constraints, Trade-offs Accepted, '
    + 'Alternatives Considered, Capabilities in scope. Why? What? Change name.';
  assert.equal(checkLoose(text).ok, true);
});

test('loose: bold-insensitive (** stripped before searching)', () => {
  const text = LOOSE_LITERALS.map((l) => `**${l.slice(0, 2)}**${l.slice(2)}**: x`).join('\n');
  assert.equal(checkLoose(text).ok, true);
});

test('loose: case- and spacing-sensitive', () => {
  const lower = LOOSE_LITERALS.map((l) => l.toLowerCase()).join('\n');
  assert.equal(checkLoose(lower).ok, false);
  const spaced = LOOSE_LITERALS.map((l) => l.replace(/ /g, '  ')).join('\n');
  const verdict = checkLoose(spaced);
  assert.equal(verdict.ok, false);
  assert.ok(verdict.violations.every((v) => v.problem === 'MISSING_LITERAL'));
});

test('loose: a missing literal fails and is named', () => {
  const text = LOOSE_LITERALS.filter((l) => l !== 'Edge Cases').join('\n');
  const verdict = checkLoose(text);
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.violations.map((v) => v.detail), ['quorum literal "Edge Cases" is missing']);
});

test('loose: Request Additional Notes is neither required nor counted', () => {
  assert.equal(checkLoose(LOOSE_LITERALS.join('\n')).ok, true);
});

test('strict is a superset of loose: a strict-valid block passes loose', () => {
  const text = `${block('slice-one')}\n${block('slice-two', { 'Request Additional Notes': '\nNotes.' })}`;
  assert.equal(checkStrict(text).ok, true);
  assert.equal(checkLoose(text).ok, true);
});

test('E4: a block can pass loose and fail strict', () => {
  const text = LOOSE_LITERALS.map((l) => `**${l}**: x`).join('\n');
  assert.equal(detect(text, 'loose').ok, true);
  assert.equal(detect(text, 'strict').ok, false);
});

// ---------------------------------------------------------------------------
// dispatchable profile
// ---------------------------------------------------------------------------

test('dispatchable: a canonical block passes, carries a hash, and flags nothing', () => {
  const text = block('add-thing');
  const verdict = checkDispatchable(text);
  assert.equal(verdict.ok, true, JSON.stringify(allViolations(verdict)));
  assert.equal(verdict.dispatchable, true);
  assert.deepEqual(verdict.flagged, []);
  assert.equal(verdict.blocks[0].hash, hashBlock(extractBlockTexts(text)[0]));
  assert.match(verdict.blocks[0].hash, /^[0-9a-f]{64}$/);
});

test('dispatchable: a block with no in-scope implementation item fails (E1)', () => {
  const verdict = checkDispatchable(block('add-thing', { 'Implementation Details': '\n- None' }));
  assert.equal(verdict.ok, false);
  assert.ok(allViolations(verdict).some((v) => v.problem === 'NO_IMPLEMENTATION_ITEM'));
  assert.equal(checkStrict(block('add-thing', { 'Implementation Details': '\n- None' })).ok, true,
    'strict still accepts the empty section; only dispatchable rejects it');
});

test('dispatchable: - None stays valid under Out of scope Implementation Details', () => {
  assert.equal(checkDispatchable(block('add-thing')).ok, true);
});

test('dispatchable: every slice of a set needs its own in-scope item', () => {
  const text = `${block('slice-one')}\n${block('slice-two', { 'Implementation Details': '\n- None' })}`;
  const verdict = checkDispatchable(text);
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.blocks[0].violations, []);
  assert.ok(verdict.blocks[1].violations.some((v) => v.problem === 'NO_IMPLEMENTATION_ITEM'));
});

test('dispatchable: the pre-filter flags each clause with block, line, and clause id', () => {
  const cases = {
    'planning-artifact': 'Write tasks.md for the change.',
    'mutating-git': 'Then run git commit on the result.',
    'subagent-dispatch': 'Dispatch a worker to do it.',
    'published-spec-edit': 'Edit openspec/specs/foo/spec.md directly.',
  };
  for (const [clause, sentence] of Object.entries(cases)) {
    const text = block('add-thing', { Why: ` ${sentence}` });
    const verdict = checkDispatchable(text);
    const line = text.split('\n').findIndex((l) => l.startsWith('**Why**')) + 1;
    assert.deepEqual(verdict.flagged, [{ block: 0, line, clause }], clause);
    assert.equal(verdict.ok, true, 'flagging is not a structural violation');
    assert.equal(verdict.dispatchable, false, 'an unjudged flagged line is not dispatchable');
  }
});

test('dispatchable: ordinary prose is not flagged', () => {
  const text = block('add-thing', { Why: ' The design is simple; the git history stays untouched; the task list is short.' });
  assert.deepEqual(checkDispatchable(text).flagged, []);
});

test('dispatchable: a context verdict clears a flagged line; a violation verdict does not (E3, E4)', () => {
  const text = block('add-thing', { Why: ' The change documents git commit messages.' });
  const line = text.split('\n').findIndex((l) => l.startsWith('**Why**')) + 1;
  const context = [{ clause: 'mutating-git', line, evidence: 'subject matter', verdict: 'context' }];
  const cleared = checkDispatchable(`${text}\n${VERDICTS_MARKER}\n${JSON.stringify(context)}`);
  assert.equal(cleared.dispatchable, true);
  assert.equal(cleared.judgment.cleared.length, 1);
  const violation = [{ clause: 'mutating-git', line, evidence: 'requested work', verdict: 'violation' }];
  const rejected = checkDispatchable(`${text}\n${VERDICTS_MARKER}\n${JSON.stringify(violation)}`);
  assert.equal(rejected.dispatchable, false);
  assert.equal(rejected.judgment.violations.length, 1);
});

test('dispatchable: unknown, malformed, and unparseable verdicts keep the set undispatchable', () => {
  assert.equal(resolveJudgment([], [{ clause: 'mutating-git', line: 3, evidence: 'x', verdict: 'context' }]).ok, false);
  assert.equal(resolveJudgment([], [{ clause: 'nope', line: 3, evidence: 'x', verdict: 'context' }]).invalid.length, 1);
  assert.equal(resolveJudgment([{ block: 0, line: 3, clause: 'mutating-git' }],
    [{ clause: 'mutating-git', line: 3, evidence: '', verdict: 'context' }]).ok, false);
  const bad = checkDispatchable(`${block('add-thing')}\n${VERDICTS_MARKER}\nnot json`);
  assert.equal(bad.ok, false);
  assert.ok(bad.violations.some((v) => v.problem === 'VERDICTS_UNPARSEABLE'));
});

test('dispatchable: the clause ids are the four hygiene clauses', () => {
  assert.deepEqual(HYGIENE_CLAUSES.map((c) => c.id),
    ['planning-artifact', 'mutating-git', 'subagent-dispatch', 'published-spec-edit']);
});

test('dispatchable: the judgment policy lists exactly the tool\'s clause ids (I2)', () => {
  const policy = fs.readFileSync(path.join(REPO_ROOT, 'sai', 'policies', 'block-hygiene-judgment.md'), 'utf8');
  const clauses = policy.slice(policy.indexOf('## Clauses'), policy.indexOf('## Judging'));
  const listed = [...clauses.matchAll(/^- `([a-z-]+)` /gm)].map((m) => m[1]);
  assert.deepEqual(listed, HYGIENE_CLAUSES.map((c) => c.id));
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

test('cli: dispatchable exits 0 only when the set is dispatchable', () => {
  const clean = run(['check', '--profile', 'dispatchable'], block('add-thing'));
  assert.equal(clean.status, 0, clean.stderr);
  assert.equal(clean.payload.dispatchable, true);
  const pending = run(['check', '--profile', 'dispatchable'], block('add-thing', { Why: ' About git push.' }));
  assert.equal(pending.status, 1);
  assert.equal(pending.payload.ok, true);
  assert.equal(pending.payload.judgment.pending.length, 1);
});

test('cli: strict on stdin prints a JSON verdict and exits 0', () => {
  const result = run(['check', '--profile', 'strict'], block('add-thing'));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.payload.ok, true);
  assert.equal(result.payload.profile, 'strict');
  assert.deepEqual(result.payload.names, ['add-thing']);
});

test('cli: loose without quorum exits 1 with violations', () => {
  const result = run(['check', '--profile', 'loose', '--json'], 'plain request text');
  assert.equal(result.status, 1);
  assert.equal(result.payload.ok, false);
  assert.equal(result.payload.violations.length, 9);
});

test('cli: usage errors exit 2', () => {
  assert.equal(run(['check'], '').status, 2);
  assert.equal(run(['check', '--profile', 'medium'], '').status, 2);
  assert.equal(run(['--profile', 'strict'], '').status, 2);
  assert.equal(run(['check', '--profile', 'strict', '--bogus'], '').status, 2);
});

test('cli hash: prints the sha256 of the single block and ignores text around it', () => {
  const text = block('add-thing');
  const bare = run(['hash'], text);
  assert.equal(bare.status, 0, bare.stderr);
  assert.equal(bare.payload.ok, true);
  assert.equal(bare.payload.hash, hashBlock(extractBlockTexts(text)[0]));
  assert.equal(bare.payload.hash, detect(text, 'dispatchable').blocks[0].hash);
  const wrapped = run(['hash'], `--direct-build\n${text}`);
  assert.equal(wrapped.payload.hash, bare.payload.hash);
});

test('cli hash: a truncated or altered block hashes differently', () => {
  const text = block('add-thing');
  const original = run(['hash'], text).payload.hash;
  const cut = run(['hash'], text.slice(0, Math.floor(text.length / 2)));
  assert.notEqual(cut.payload && cut.payload.hash, original);
  const altered = run(['hash'], text.replace('Adds a thing.', 'Adds two things.'));
  assert.notEqual(altered.payload.hash, original);
});

test('cli hash: anything other than exactly one block exits 1', () => {
  const none = run(['hash'], 'no block here');
  assert.equal(none.status, 1);
  assert.equal(none.payload.ok, false);
  assert.equal(none.payload.blocks, 0);
  const two = run(['hash'], `${block('one-change')}\n${block('two-change')}`);
  assert.equal(two.status, 1);
  assert.equal(two.payload.blocks, 2);
});

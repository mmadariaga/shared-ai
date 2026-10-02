'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'ready-to-propose.js');
const { checkLoose, checkStrict, detect, LOOSE_LITERALS } = require(TOOL);

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
// CLI
// ---------------------------------------------------------------------------

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

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const merge = require('../sai/tools/merge');

const ROOT = path.join(__dirname, '..');
const TOOL = path.join(ROOT, 'sai/tools/merge.js');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const lines = (...items) => items.map(item => `${item}\n`).join('');

function git(cwd, args, allowedFailure = false) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowedFailure) assert.equal(run.status, 0, run.stderr);
  return run;
}

function repository(t) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-merge-final-review-'));
  const cwd = path.join(parent, 'repo');
  fs.mkdirSync(cwd);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.name', 'Test']);
  git(cwd, ['config', 'user.email', 'test@example.com']);
  git(cwd, ['config', 'core.autocrlf', 'false']);
  return { parent, cwd };
}

const commit = (cwd, subject, files) => {
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(cwd, name), text);
  git(cwd, ['add', '-A']);
  git(cwd, ['commit', '-m', subject]);
};

const PARAGRAPH = ['The command asks only at the start.', 'It resolves every conflict by commit intent.', 'It verifies against the baseline.', 'It never pushes anything.'];
const FILLER = Array.from({ length: 8 }, (_, i) => `filler line ${i + 1}`);
// A document with the paragraph slot `first` and `second` apart by filler, so git merges both additions without a conflict.
const document = (before, after) => lines('title', ...before, ...FILLER, ...after, 'footer');
const provenanceOf = (cwd, method, squash) => merge.provenance(cwd, 'refs/heads/main', method, squash);

// Both sides add the same paragraph at different places: a clean rebase leaves it twice.
function duplicatedRebase(t, { sidePrefix = [], extraTarget = {} } = {}) {
  const { parent, cwd } = repository(t);
  commit(cwd, 'base', { 'doc.md': document(['alpha'], ['omega']) });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'docs: describe the command', { 'doc.md': document(['alpha', ...sidePrefix, ...PARAGRAPH], ['omega']), ...extraTarget });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'docs: describe the command again', { 'doc.md': document(['alpha'], ['omega', ...PARAGRAPH]) });
  git(cwd, ['checkout', 'feature']);
  const captured = provenanceOf(cwd, 'rebase', 'no');
  assert.equal(git(cwd, ['rebase', 'main'], true).status, 0, 'the rebase replays without a conflict');
  return { parent, cwd, captured };
}

test('I7, E12: a rebase without conflicts that duplicated a paragraph is flagged with path:line and the byte range of each occurrence', t => {
  const { cwd, captured } = duplicatedRebase(t);
  const result = merge.duplicates(cwd, captured);
  assert.equal(result.outcome, 'success');
  assert.equal(result.data.min_lines, 4);
  assert.deepEqual(result.data.files_examined, ['doc.md']);
  assert.equal(result.data.blocks.length, 1);
  const [block] = result.data.blocks;
  assert.equal(block.significant_lines, 4);
  assert.equal(block.target_count, 1);
  assert.equal(block.source_count, 1);
  assert.deepEqual(block.occurrences.map(item => item.location), ['doc.md:3', 'doc.md:' + (3 + PARAGRAPH.length + FILLER.length + 1)]);
  const bytes = fs.readFileSync(path.join(cwd, 'doc.md'));
  for (const item of block.occurrences) assert.equal(bytes.subarray(item.start, item.end).toString(), lines(...PARAGRAPH));
});

test('I7: a duplicate that spans more than four lines is one block, not a window per line', t => {
  const longer = [...PARAGRAPH, 'It keeps one worker.', 'It reports every duplicate.'];
  const { parent, cwd } = repository(t);
  commit(cwd, 'base', { 'doc.md': document(['alpha'], ['omega']) });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'docs: describe', { 'doc.md': document(['alpha', ...longer], ['omega']) });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'docs: describe again', { 'doc.md': document(['alpha'], ['omega', ...longer]) });
  git(cwd, ['checkout', 'feature']);
  const captured = provenanceOf(cwd, 'rebase', 'no');
  assert.equal(git(cwd, ['rebase', 'main'], true).status, 0);
  const { blocks } = merge.duplicates(cwd, captured).data;
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].significant_lines, 6);
  assert.equal(blocks[0].occurrences.length, 2);
  assert.ok(parent);
});

test('E10: a block already duplicated on one side is not flagged', t => {
  const { cwd } = repository(t);
  commit(cwd, 'base', { 'doc.md': document(['alpha'], ['omega']) });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'docs: repeat on purpose', { 'doc.md': document(['alpha', ...PARAGRAPH], ['omega', ...PARAGRAPH]) });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'docs: unrelated edit', { 'doc.md': lines('title', 'alpha', ...FILLER, 'omega', 'footer', 'a new closing line') });
  git(cwd, ['checkout', 'feature']);
  const captured = provenanceOf(cwd, 'rebase', 'no');
  assert.equal(git(cwd, ['rebase', 'main'], true).status, 0);
  const result = merge.duplicates(cwd, captured);
  assert.equal(result.data.blocks.length, 0);
  assert.deepEqual(result.data.files_examined, ['doc.md']);
});

test('E10: blank lines and punctuation-only lines do not count, and a block below four significant lines is not flagged', t => {
  const short = ['one two', 'three four', '}', ');', '', '---'];
  const spread = ['first line here', '', '}', 'second line here', '  ', 'third line here', '/* */', 'fourth line here'];
  for (const [name, block, expected] of [['three significant lines among punctuation', short, 0], ['four significant lines spread over blank and brace lines', spread, 1]]) {
    const { cwd } = repository(t);
    commit(cwd, 'base', { 'doc.md': document(['alpha'], ['omega']) });
    git(cwd, ['checkout', '-b', 'feature']);
    commit(cwd, 'docs: add', { 'doc.md': document(['alpha', ...block], ['omega']) });
    git(cwd, ['checkout', 'main']);
    commit(cwd, 'docs: add again', { 'doc.md': document(['alpha'], ['omega', ...block]) });
    git(cwd, ['checkout', 'feature']);
    const captured = provenanceOf(cwd, 'rebase', 'no');
    assert.equal(git(cwd, ['rebase', 'main'], true).status, 0);
    assert.equal(merge.duplicates(cwd, captured).data.blocks.length, expected, name);
  }
});

test('E12: a merge without conflicts is checked on the staged tree, and indentation does not hide a duplicate', t => {
  const { cwd } = repository(t);
  commit(cwd, 'base', { 'doc.md': document(['alpha'], ['omega']) });
  git(cwd, ['checkout', '-b', 'feature']);
  commit(cwd, 'docs: add', { 'doc.md': document(['alpha', ...PARAGRAPH], ['omega']) });
  git(cwd, ['checkout', 'main']);
  commit(cwd, 'docs: add indented', { 'doc.md': document(['alpha'], ['omega', ...PARAGRAPH.map(line => `    ${line}`)]) });
  const captured = provenanceOf(cwd, 'merge', 'not-applicable');
  git(cwd, ['merge', '--no-ff', '--no-commit', 'refs/heads/feature'], true);
  assert.equal(git(cwd, ['ls-files', '--unmerged']).stdout, '');
  const { blocks } = merge.duplicates(cwd, captured).data;
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].occurrences.length, 2);
});

test('I7: a file equal to one side, a binary file, and a file only one side touched are never examined as introduced', t => {
  const { cwd, captured } = duplicatedRebase(t, { extraTarget: { 'only-branch.md': lines(...PARAGRAPH, ...PARAGRAPH), 'blob.bin': Buffer.from([0, 1, 2, 3]).toString('latin1') } });
  const result = merge.duplicates(cwd, captured);
  assert.deepEqual(result.data.files_examined, ['doc.md'], 'a file the source never touched equals the target side');
  assert.equal(result.data.blocks.length, 1);
});

test('I7: a file the tool cannot compare is listed as skipped, never guessed at', t => {
  const { cwd } = repository(t);
  const body = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const latin1 = items => Buffer.from(items.map(item => `${item}\n`).join(''), 'latin1');
  fs.writeFileSync(path.join(cwd, 'old.txt'), latin1(body));
  git(cwd, ['add', '-A']); git(cwd, ['commit', '-m', 'base']);
  git(cwd, ['checkout', '-b', 'feature']);
  fs.writeFileSync(path.join(cwd, 'old.txt'), latin1(['caf\xe9', ...body]));
  git(cwd, ['commit', '-qam', 'edit top']);
  git(cwd, ['checkout', 'main']);
  fs.writeFileSync(path.join(cwd, 'old.txt'), latin1([...body, 'na\xefve']));
  git(cwd, ['commit', '-qam', 'edit bottom']);
  const captured = provenanceOf(cwd, 'merge', 'not-applicable');
  git(cwd, ['merge', '--no-ff', '--no-commit', 'refs/heads/feature']);
  const { data } = merge.duplicates(cwd, captured);
  assert.deepEqual(data.skipped, [{ path: 'old.txt', reason: 'not-utf-8' }]);
  assert.deepEqual(data.files_examined, []);
});

test('I7: an unmerged index and a missing provenance are rejected', t => {
  const { cwd, captured } = duplicatedRebase(t);
  assert.throws(() => merge.duplicates(cwd, { action: 'conflicts', data: {} }), /captured provenance required/);
  const { cwd: other } = repository(t);
  commit(other, 'base', { 'f.txt': lines('a') });
  git(other, ['checkout', '-b', 'feature']);
  commit(other, 'edit', { 'f.txt': lines('b') });
  git(other, ['checkout', 'main']);
  commit(other, 'edit', { 'f.txt': lines('c') });
  const stop = merge.provenance(other, 'refs/heads/feature', 'merge', 'not-applicable');
  git(other, ['merge', '--no-ff', '--no-commit', 'refs/heads/feature'], true);
  assert.throws(() => merge.duplicates(other, stop), /final resolved integration state/);
  assert.ok(captured);
});

test('I7: the CLI reads the provenance from an input file and records the receipt outside the repository', t => {
  const { parent, cwd, captured } = duplicatedRebase(t);
  const input = path.join(parent, 'provenance.json');
  const record = path.join(parent, 'duplicates-1.json');
  fs.writeFileSync(input, JSON.stringify(captured));
  const run = spawnSync(process.execPath, [TOOL, 'duplicates', '--input-file', input, '--record', record, '--json', '--cwd', cwd], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout);
  const payload = JSON.parse(run.stdout);
  assert.equal(payload.record, record);
  assert.equal(payload.data.blocks.length, 1);
  assert.equal(JSON.parse(fs.readFileSync(record, 'utf8')).data.blocks.length, 1);
  assert.match(spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' }).stdout, /duplicates/);
});

test('I8: the occurrence range feeds merge.js correction and write, so the defect is removed through the tool', t => {
  const { parent, cwd, captured } = duplicatedRebase(t);
  const [block] = merge.duplicates(cwd, captured).data.blocks;
  const second = block.occurrences[1];
  const snapshot = merge.correction(cwd, [{ path: 'doc.md', category: 'specs', before_hash: second.before_hash,
    regions: [{ start: second.start, end: second.end, conflict_id: 'specs:doc.md#1' }] }]);
  const recordFile = path.join(parent, 'final-correction-1.json');
  const written = merge.write(cwd, JSON.parse(JSON.stringify(snapshot)), recordFile, { conflict_id: 'specs:doc.md#1', text: '' });
  assert.equal(written.outcome, 'success', JSON.stringify(written.errors));
  git(cwd, ['add', 'doc.md']);
  assert.equal(merge.duplicates(cwd, captured).data.blocks.length, 0, 'the duplicate is gone after the correction');
  assert.equal(fs.readFileSync(path.join(cwd, 'doc.md'), 'utf8').split(PARAGRAPH[0]).length - 1, 1);
});

test('I5, I8, E13, E14, E15: the coordinator reviews the final tree before the suite, creates the worker lazily, and reports duplicates', () => {
  const card = read('sai/commands/merge/coordinator.md');
  const final = card.slice(card.indexOf('## Final'), card.indexOf('## Commit messages'));
  assert.ok(final.indexOf('**Final-tree review.**') < final.indexOf('**Verify.**'), 'the review precedes the suite');
  assert.match(final, /`git diff --cached --name-only <source_sha>`/);
  assert.match(final, /commits that replayed without conflicts/);
  assert.match(final, /a clean launch/);
  assert.match(final, /`merge\.js duplicates --record <run>\/duplicates-\{k\}\.json --input-file <run>\/provenance\.json`/);
  assert.match(final, /an intentional repetition stays/);
  assert.match(final, /create the worker when none exists/);
  assert.match(final, /final-correction\.md/);
  assert.match(final, /`merge\.js correction --record <run>\/final-correction-\{k\}\.json`/);
  assert.match(final, /You write no repository file yourself/);
  assert.match(final, /On a merge the corrections join the merge commit/);
  assert.match(final, /one additional local commit on top of the rebased branch/);
  assert.match(card, /A run whose stops all take the shortcut and need no final-tree correction, test correction, or renumbering plan creates no worker/);
  assert.match(card.slice(card.indexOf('## Close')), /each introduced duplicate block[^.]*what was done about it/);
  assert.match(card.slice(card.indexOf('## Close')), /shortcut file with its one-line reason/);
  assert.match(card, /`final-review`/);
});

test('the final-correction step, the duplicates mechanics, and the transport table are in step with the tool', () => {
  const step = read('sai/commands/merge/steps/final-correction.md');
  assert.match(step, /status: completed \| failed/);
  assert.doesNotMatch(step, /status: done|\| blocked|`blocked`/);
  assert.match(step, /Fetch `@sai\/commands\/merge\/steps\/common\.md`/);
  assert.match(step, /`merge\.js duplicates`/);
  const mechanics = read('sai/commands/merge/mechanics.md');
  for (const text of ['## Introduced duplicates', '`duplicates`', 'min_lines', 'before_hash', 'blank, brace-only, punctuation-only']) {
    assert.ok(mechanics.includes(text), `mechanics documents ${text}`);
  }
  assert.match(read('sai/policies/worker-report-transport.md'), /test-correction and final-correction name analysis and corrections/);
  assert.match(read('AGENTS.md'), /`final-correction`/);
});

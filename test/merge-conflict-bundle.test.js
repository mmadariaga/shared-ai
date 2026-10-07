'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const merge = require('../sai/tools/merge');

const TOOL = path.join(__dirname, '..', 'sai/tools/merge.js');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

function git(cwd, args, allowedFailure = false) {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowedFailure) assert.equal(run.status, 0, run.stderr);
  return run;
}

// `versions` maps a path to its [base, source, target] contents; null leaves the path absent.
function conflicted(t, versions, { setup = () => {}, prepare = {} } = {}) {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-merge-bundle-'));
  const cwd = path.join(parent, 'repo');
  fs.mkdirSync(cwd);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  git(cwd, ['init', '-b', 'main']);
  git(cwd, ['config', 'user.name', 'Test']);
  git(cwd, ['config', 'user.email', 'test@example.com']);
  git(cwd, ['config', 'core.autocrlf', 'false']);
  setup(cwd);
  const put = index => {
    for (const [name, contents] of Object.entries(versions)) {
      if (contents[index] === null) fs.rmSync(path.join(cwd, name), { force: true });
      else fs.writeFileSync(path.join(cwd, name), contents[index]);
    }
    prepare[index]?.(cwd);
    git(cwd, ['add', '-A']);
  };
  put(0); git(cwd, ['commit', '-m', 'base']);
  git(cwd, ['checkout', '-b', 'feature']);
  put(1); git(cwd, ['commit', '-m', 'source subject', '-m', 'source body']);
  git(cwd, ['checkout', 'main']);
  put(2); git(cwd, ['commit', '-m', 'target subject']);
  assert.equal(git(cwd, ['merge', '--no-ff', '--no-commit', 'refs/heads/feature'], true).status, 1);
  const record = path.join(parent, 'snapshot.json');
  const view = cli(cwd, ['conflicts', '--record', record]).payload;
  return { parent, cwd, record, recordHash: view.record_hash, snapshot: JSON.parse(fs.readFileSync(record, 'utf8')) };
}

function cli(cwd, args, input = '') {
  const run = spawnSync(process.execPath, [TOOL, ...args, '--json', '--cwd', cwd], { input });
  return { status: run.status, payload: JSON.parse(run.stdout.toString('utf8')) };
}

const lines = (value, count = 12) => {
  const pad = Array.from({ length: count }, (_, i) => `keep ${i}`).join('\n');
  return `head\n${pad}\nvalue=${value}\n${pad}\ntail\n`;
};
const reference = fixture => ['--record', fixture.record, '--record-hash', fixture.recordHash];

test('the bundle carries each region with its three versions, bounded context and both sides\' commit messages', t => {
  const fixture = conflicted(t, { 'f.txt': [lines('base'), lines('source'), lines('target')] });
  const result = cli(fixture.cwd, ['bundle', ...reference(fixture)]);
  assert.equal(result.status, 0);
  const [file] = result.payload.data.files;
  assert.equal(file.conflict_category, 'text');
  assert.equal(file.resolution, 'regions-or-whole-side');
  assert.deepEqual([file.encoding, file.eol], ['utf-8', 'lf']);
  assert.deepEqual(file.sides_present, { base: true, ours: true, theirs: true });
  const [region] = file.regions;
  assert.equal(region.conflict_id, fixture.snapshot.data.files[0].regions[0].conflict_id);
  assert.deepEqual([region.ours, region.base, region.theirs], ['value=target\n', 'value=base\n', 'value=source\n']);
  assert.equal(region.base_from, 'mapped');
  assert.equal(region.start_line, 14);
  assert.equal(region.context_before, 'keep 9\nkeep 10\nkeep 11\n');
  assert.equal(region.context_after, 'keep 0\nkeep 1\nkeep 2\n');
  assert.deepEqual(file.commits.ours.messages.map(item => item.subject), ['target subject']);
  assert.deepEqual(file.commits.theirs.messages.map(item => [item.subject, item.body]), [['source subject', 'source body']]);
  assert.equal(result.payload.data.sides.theirs, git(fixture.cwd, ['rev-parse', 'MERGE_HEAD']).stdout.trim());
  // The bundle is bounded: no whole file travels with it.
  assert.ok(!JSON.stringify(result.payload).includes('keep 5'));
  const wide = merge.bundle(fixture.cwd, fixture.snapshot, 0).data.files[0].regions[0];
  assert.deepEqual([wide.context_before, wide.context_after], ['', '']);
  assert.throws(() => merge.bundle(fixture.cwd, fixture.snapshot, 21), /--context/);
});

test('the bundle maps the base through earlier edits and takes it from diff3 markers when Git wrote them', t => {
  const shifted = value => `added by target\n${lines(value)}`;
  const mapped = conflicted(t, { 'f.txt': [lines('base'), lines('source'), shifted('target')] });
  const region = merge.bundle(mapped.cwd, mapped.snapshot).data.files[0].regions[0];
  assert.deepEqual([region.base, region.base_from], ['value=base\n', 'mapped']);

  const diff3 = conflicted(t, { 'f.txt': [lines('base'), lines('source'), lines('target')] },
    { setup: cwd => git(cwd, ['config', 'merge.conflictStyle', 'diff3']) });
  const marked = merge.bundle(diff3.cwd, diff3.snapshot).data.files[0].regions[0];
  assert.deepEqual([marked.ours, marked.base, marked.theirs, marked.base_from], ['value=target\n', 'value=base\n', 'value=source\n', 'markers']);

  const added = conflicted(t, { 'new.txt': [null, 'source\n', 'target\n'], 'keep.txt': ['x\n', 'x\n', 'x\n'] });
  const both = merge.bundle(added.cwd, added.snapshot).data.files[0];
  assert.deepEqual([both.regions[0].base, both.regions[0].base_from, both.sides_present.base], [null, 'unavailable', false]);
});

test('conflicts with no text to compare appear with their category and no content', t => {
  const binary = value => Buffer.from([0, 1, 2, value, 0, 255]);
  const fixture = conflicted(t, {
    'image.bin': [binary(1), binary(2), binary(3)],
    'gone.txt': [lines('base'), null, lines('target')],
    'moved.txt': [lines('moved', 20), null, null],
  }, { prepare: {
    1: cwd => fs.writeFileSync(path.join(cwd, 'moved-source.txt'), lines('moved', 20)),
    2: cwd => fs.writeFileSync(path.join(cwd, 'moved-target.txt'), lines('moved', 20)),
  } });
  const files = Object.fromEntries(merge.bundle(fixture.cwd, fixture.snapshot).data.files.map(file => [file.path, file]));
  assert.equal(files['image.bin'].conflict_category, 'binary');
  assert.equal(files['gone.txt'].conflict_category, 'deleted-on-one-side');
  assert.deepEqual(files['gone.txt'].sides_present, { base: true, ours: true, theirs: false });
  for (const name of ['moved.txt', 'moved-source.txt', 'moved-target.txt']) assert.equal(files[name].conflict_category, 'renamed', name);
  for (const file of Object.values(files)) {
    assert.equal(file.resolution, 'whole-side-only', file.path);
    assert.deepEqual(file.regions, [], file.path);
    assert.ok(!('encoding' in file), file.path);
  }
  const rejected = cli(fixture.cwd, ['write', ...reference(fixture)], JSON.stringify({ conflict_id: 'code:gone.txt#1', text: 'x\n' }));
  assert.equal(rejected.status, 1);
  assert.match(rejected.payload.errors[0], /unknown region/);
});

test('a file whose encoding cannot be determined admits only a whole-side choice', t => {
  const latin1 = value => Buffer.from(lines(`caf\xE9 ${value}`), 'latin1');
  const fixture = conflicted(t, { 'legacy.txt': [latin1('base'), latin1('source'), latin1('target')] });
  const [file] = merge.bundle(fixture.cwd, fixture.snapshot).data.files;
  assert.equal(file.conflict_category, 'encoding-undetermined');
  assert.equal(file.resolution, 'whole-side-only');
  assert.deepEqual(file.regions, []);
  const before = fs.readFileSync(path.join(fixture.cwd, 'legacy.txt'));
  const id = fixture.snapshot.data.files[0].regions[0].conflict_id;
  const rejected = cli(fixture.cwd, ['write', ...reference(fixture)], JSON.stringify({ conflict_id: id, text: 'value=resolved\n' }));
  assert.equal(rejected.status, 1);
  assert.match(rejected.payload.errors[0], /encoding undetermined; whole-side choice only: legacy\.txt/);
  assert.deepEqual(fs.readFileSync(path.join(fixture.cwd, 'legacy.txt')), before);
});

test('the write keeps the file\'s BOM, encoding and line endings whatever the text arrives with', t => {
  const crlf = value => Buffer.concat([BOM, Buffer.from(`título=${value}\r\nsecond\r\nthird\r\n`)]);
  const fixture = conflicted(t, { 'bom.txt': [crlf('base'), crlf('source'), crlf('target')] });
  const [captured] = fixture.snapshot.data.files;
  assert.equal(captured.regions[0].start, 0, 'a first-line conflict puts the marker before the BOM');
  const [file] = merge.bundle(fixture.cwd, fixture.snapshot).data.files;
  assert.deepEqual([file.encoding, file.eol], ['utf-8-bom', 'crlf']);
  assert.equal(file.regions[0].ours, 'título=target\r\n');

  // The text arrives with LF, its own BOM, and as UTF-16 with BOM from the shell.
  const text = '﻿título=resuelto\nañadido\n';
  const id = captured.regions[0].conflict_id;
  const utf16 = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(JSON.stringify({ conflict_id: id, text }), 'utf16le')]);
  const written = cli(fixture.cwd, ['write', ...reference(fixture)], utf16);
  assert.equal(written.status, 0, JSON.stringify(written.payload));
  const expected = Buffer.concat([BOM, Buffer.from('título=resuelto\r\nañadido\r\nsecond\r\nthird\r\n')]);
  assert.deepEqual(fs.readFileSync(path.join(fixture.cwd, 'bom.txt')), expected);
  assert.deepEqual(written.payload.written, [{ path: 'bom.txt', conflict_ids: [id], encoding: 'utf-8-bom', eol: 'crlf', hash: hash(expected), pending: [] }]);

  // The existing resolution check validates the tool's write from the same text.
  const payload = { selected_contextual_decisions: [], files: [{ path: 'bom.txt', category: 'code', source: 'authored',
    regions: [{ conflict_id: id, text }], decisions: [] }] };
  const source = JSON.stringify({ status: 'completed', changed_files: ['bom.txt'],
    summary: `Applied.\n## Complete resolution payload\n\`\`\`json\n${JSON.stringify(payload)}\n\`\`\`\n` });
  assert.equal(merge.checkResolution(fixture.cwd, fixture.snapshot, source, []).outcome, 'success');

  const lf = conflicted(t, { 'f.txt': [lines('base'), lines('source'), lines('target')] });
  const lfId = lf.snapshot.data.files[0].regions[0].conflict_id;
  assert.equal(cli(lf.cwd, ['write', ...reference(lf)], JSON.stringify({ conflict_id: lfId, text: 'value=resolved\r\n' })).status, 0);
  assert.equal(fs.readFileSync(path.join(lf.cwd, 'f.txt'), 'utf8'), lines('resolved'));
});

test('regions are written one call at a time or together, and a region can be rewritten', t => {
  const two = (a, b) => `${lines(a)}${lines(b)}`;
  const fixture = conflicted(t, { 'f.txt': [two('base', 'base'), two('source', 'source'), two('target', 'target')] });
  const [first, second] = fixture.snapshot.data.files[0].regions.map(region => region.conflict_id);
  const target = path.join(fixture.cwd, 'f.txt');
  const one = cli(fixture.cwd, ['write', ...reference(fixture)], JSON.stringify({ conflict_id: second, text: 'value=two\n' }));
  assert.deepEqual(one.payload.written[0].pending, [first]);
  const both = cli(fixture.cwd, ['write', ...reference(fixture)], JSON.stringify([{ conflict_id: first, text: 'value=one\n' }, { conflict_id: second, text: 'value=second\n' }]));
  assert.deepEqual(both.payload.written[0].pending, []);
  assert.equal(fs.readFileSync(target, 'utf8'), two('one', 'second'));

  // A change the tool did not make stops the next write.
  fs.appendFileSync(target, 'stray\n');
  const stray = fs.readFileSync(target);
  const blocked = cli(fixture.cwd, ['write', ...reference(fixture)], JSON.stringify({ conflict_id: first, text: 'value=again\n' }));
  assert.equal(blocked.status, 1);
  assert.match(blocked.payload.errors[0], /file changed outside the tool: f\.txt/);
  assert.deepEqual(fs.readFileSync(target), stray);
});

test('a rejected write places nothing: markers, unknown regions and a changed record', t => {
  const fixture = conflicted(t, { 'f.txt': [lines('base'), lines('source'), lines('target')] });
  const id = fixture.snapshot.data.files[0].regions[0].conflict_id;
  const target = path.join(fixture.cwd, 'f.txt');
  const before = fs.readFileSync(target);
  const attempt = input => cli(fixture.cwd, ['write', ...reference(fixture)], JSON.stringify(input));
  for (const [input, pattern] of [
    [{ conflict_id: id, text: 'a\n<<<<<<< HEAD\nb\n' }, /conflict markers in text/],
    [{ conflict_id: id, text: 'a\n=======\nb\n' }, /conflict markers in text/],
    [{ conflict_id: 'code:f.txt#9', text: 'value=resolved\n' }, /unknown region: code:f\.txt#9/],
    [{ conflict_id: id }, /text required/],
    // One invalid item rejects the whole call, valid items included.
    [[{ conflict_id: id, text: 'value=resolved\n' }, { conflict_id: 'code:other.txt#1', text: 'x\n' }], /unknown region: code:other\.txt#1/],
  ]) {
    const result = attempt(input);
    assert.equal(result.status, 1);
    assert.equal(result.payload.outcome, 'failure');
    assert.deepEqual(result.payload.written, []);
    assert.match(result.payload.errors.join('\n'), pattern);
    assert.deepEqual(fs.readFileSync(target), before);
  }
  assert.ok(!fs.existsSync(`${fixture.record}.writes.json`));
  const changed = cli(fixture.cwd, ['write', '--record', fixture.record, '--record-hash', hash('other')], JSON.stringify({ conflict_id: id, text: 'x\n' }));
  assert.equal(changed.status, 2);
  assert.match(changed.payload.error, /missing or changed snapshot hash/);
  assert.deepEqual(fs.readFileSync(target), before);
});

test('the write serves coordinator-named correction ranges after staging', t => {
  const fixture = conflicted(t, { 'f.txt': [lines('base'), lines('source'), lines('target')] });
  const id = fixture.snapshot.data.files[0].regions[0].conflict_id;
  const target = path.join(fixture.cwd, 'f.txt');
  assert.equal(cli(fixture.cwd, ['write', ...reference(fixture)], JSON.stringify({ conflict_id: id, text: 'value=wrong\n' })).status, 0);
  git(fixture.cwd, ['add', 'f.txt']);
  const current = fs.readFileSync(target);
  const start = current.indexOf('value=wrong\n');
  const record = path.join(fixture.parent, 'correction.json');
  const view = cli(fixture.cwd, ['correction', '--record', record], JSON.stringify([{ path: 'f.txt', category: 'code',
    before_hash: hash(current), regions: [{ start, end: start + 'value=wrong\n'.length, conflict_id: id }] }])).payload;
  const corrected = cli(fixture.cwd, ['write', '--record', record, '--record-hash', view.record_hash], JSON.stringify({ conflict_id: id, text: 'value=right\n' }));
  assert.equal(corrected.status, 0, JSON.stringify(corrected.payload));
  assert.equal(fs.readFileSync(target, 'utf8'), lines('right'));
  assert.throws(() => merge.bundle(fixture.cwd, JSON.parse(fs.readFileSync(record, 'utf8'))), /not a correction snapshot/);
});

test('the worker stages name the bundle and the tool-owned write', () => {
  const strategy = merge.instructions('strategy');
  const apply = merge.instructions('apply');
  assert.match(strategy, /merge-tool> bundle --record/);
  assert.match(apply, /merge-tool> write --record/);
  assert.doesNotMatch(strategy + apply, /git cat-file blob/);
});

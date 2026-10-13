'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TOOL = path.join(__dirname, '..', 'sai', 'tools', 'decision-records.js');

function project(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-decision-records-'));
  for (const relativePath of files) {
    const fullPath = path.join(root, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '# record\n');
  }
  return root;
}

function run(root, args) {
  return spawnSync(process.execPath, [TOOL, ...args, '--cwd', root], { encoding: 'utf8' });
}

function inventory(files, family = 'ddr', prepare = () => {}) {
  const root = project(files);
  try {
    prepare(root);
    const result = run(root, ['inventory', '--family', family, '--json']);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('E11: a family folder ignored in git is reported as it is on disk', () => {
  let ignored = null;
  const report = inventory(
    ['.gitignore', 'docs/ddr/0000-INDEX.md', 'docs/ddr/0041-last-decision.md'],
    'ddr',
    (root) => {
      fs.writeFileSync(path.join(root, '.gitignore'), 'docs/\n');
      spawnSync('git', ['init', '--quiet'], { cwd: root });
      ignored = spawnSync('git', ['check-ignore', '--quiet', 'docs/ddr/0000-INDEX.md'], { cwd: root }).status;
    },
  );

  assert.equal(ignored, 0, 'the fixture index should be ignored in git');
  assert.equal(report.index_exists, true);
  assert.deepEqual(report.records, [
    { number: '0041', suffix: '', path: 'docs/ddr/0041-last-decision.md', archived: false },
  ]);
  assert.equal(report.next_number, '0042');
});

test('E12: a missing family folder has no index, no records, and next number 0001', () => {
  assert.deepEqual(inventory([], 'adr'), {
    family: 'adr',
    index_exists: false,
    records: [],
    next_number: '0001',
    duplicates: [],
  });
});

test('E13: records without an index are listed and the index stays absent', () => {
  const report = inventory(['docs/ddr/0003-third.md', 'docs/ddr/0007-seventh.md']);

  assert.equal(report.index_exists, false);
  assert.deepEqual(report.records.map((record) => record.path),
    ['docs/ddr/0003-third.md', 'docs/ddr/0007-seventh.md']);
  assert.equal(report.next_number, '0008');
});

test('E14: files sharing number and suffix are duplicates and the next number is the highest plus one', () => {
  const report = inventory([
    'docs/adr/0000-INDEX.md',
    'docs/adr/0004-first-slug.md',
    'docs/adr/0004-second-slug.md',
    'docs/adr/0005a-one.md',
    'docs/adr/0005a-two.md',
    'docs/adr/0005b-other.md',
  ], 'adr');

  assert.deepEqual(report.duplicates, [
    { number: '0004', suffix: '', paths: ['docs/adr/0004-first-slug.md', 'docs/adr/0004-second-slug.md'] },
    { number: '0005', suffix: 'a', paths: ['docs/adr/0005a-one.md', 'docs/adr/0005a-two.md'] },
  ]);
  assert.equal(report.next_number, '0006');
});

test('E15: only NNNN-slug.md and NNNNx-slug.md files are records, and a suffix counts under its number', () => {
  const report = inventory([
    'docs/adr/0000-INDEX.md',
    'docs/adr/0174-plain.md',
    'docs/adr/0175a-first-half.md',
    'docs/adr/0175b-second-half.md',
    'docs/adr/README.md',
    'docs/adr/0200-not-markdown.txt',
    'docs/adr/999-short-number.md',
    'docs/adr/0300.md',
    'docs/adr/0400-nested/0400-inside-a-folder.md',
  ], 'adr');

  assert.deepEqual(report.records, [
    { number: '0174', suffix: '', path: 'docs/adr/0174-plain.md', archived: false },
    { number: '0175', suffix: 'a', path: 'docs/adr/0175a-first-half.md', archived: false },
    { number: '0175', suffix: 'b', path: 'docs/adr/0175b-second-half.md', archived: false },
  ]);
  assert.equal(report.next_number, '0176');
  assert.deepEqual(report.duplicates, []);
});

test('E16: archived records are listed as archived and count toward the next number', () => {
  const report = inventory([
    'docs/ddr/0002-live.md',
    'docs/ddr/archive/0000-INDEX.md',
    'docs/ddr/archive/0009-retired.md',
  ]);

  assert.equal(report.index_exists, false, 'only docs/<family>/0000-INDEX.md is the index');
  assert.deepEqual(report.records, [
    { number: '0002', suffix: '', path: 'docs/ddr/0002-live.md', archived: false },
    { number: '0009', suffix: '', path: 'docs/ddr/archive/0009-retired.md', archived: true },
  ]);
  assert.equal(report.next_number, '0010');
});

test('each family is read from its own folder', () => {
  const report = inventory(['docs/adr/0000-INDEX.md', 'docs/adr/0012-an-adr.md'], 'ddr');

  assert.equal(report.index_exists, false);
  assert.deepEqual(report.records, []);
});

test('a missing or unknown family is a usage error', () => {
  const root = project([]);
  try {
    assert.equal(run(root, ['inventory']).status, 2);
    assert.equal(run(root, ['inventory', '--family', 'rfc']).status, 2);
    assert.equal(run(root, ['--family', 'adr']).status, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

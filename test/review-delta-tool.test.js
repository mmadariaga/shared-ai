'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const { snapshot, delta, parseNameStatus } = require('../sai/tools/review-delta.js');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'review-delta.js');

function tool(args, cwd) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: 'utf8' });
  let payload = null;
  if (result.status === 0) payload = JSON.parse(result.stdout);
  return { status: result.status, payload, stderr: result.stderr };
}

function git(cwd, args) {
  const result = spawnSync('git', ['-c', 'user.email=test@example.com', '-c', 'user.name=test', ...args], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function makeRepo() {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-review-delta-'));
  git(root, ['init', '-q']);
  fs.writeFileSync(path.join(root, '.gitignore'), 'ignored/\n');
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-q', '-m', 'base']);
  return root;
}

const cleanup = root => fs.rmSync(root, { recursive: true, force: true });
const write = (root, name, text) => {
  fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
  fs.writeFileSync(path.join(root, name), text);
};

test('snapshot leaves the real index, the staging, and the working tree untouched', () => {
  const root = makeRepo();
  try {
    write(root, 'a.txt', 'two\n');
    write(root, 'staged.txt', 'staged\n');
    git(root, ['add', 'staged.txt']);
    write(root, 'untracked.txt', 'new\n');
    const indexBefore = fs.readFileSync(path.join(root, '.git', 'index'));
    const statusBefore = git(root, ['status', '--porcelain']);

    const result = snapshot(root);
    assert.equal(result.verdict, 'clean');
    assert.match(result.tree, /^[0-9a-f]{40,64}$/);
    assert.deepEqual(fs.readFileSync(path.join(root, '.git', 'index')), indexBefore);
    assert.equal(git(root, ['status', '--porcelain']), statusBefore);
    const files = git(root, ['ls-tree', '-r', '--name-only', result.tree]).split('\n').filter(Boolean);
    assert.deepEqual(files.sort(), ['.gitignore', 'a.txt', 'staged.txt', 'untracked.txt']);
  } finally {
    cleanup(root);
  }
});

test('delta reports changed, added, and deleted paths with their diff, including untracked files', () => {
  const root = makeRepo();
  try {
    const first = snapshot(root).tree;
    write(root, 'a.txt', 'two\n');
    write(root, 'fresh.txt', 'fresh\n');
    const second = snapshot(root).tree;
    const result = delta(first, second, root);
    assert.equal(result.verdict, 'changed');
    assert.deepEqual(result.paths, [{ status: 'M', path: 'a.txt' }, { status: 'A', path: 'fresh.txt' }]);
    assert.match(result.diff, /\+two/);
    assert.match(result.diff, /\+fresh/);

    fs.rmSync(path.join(root, 'fresh.txt'));
    const third = snapshot(root).tree;
    assert.deepEqual(delta(second, third, root).paths, [{ status: 'D', path: 'fresh.txt' }]);
  } finally {
    cleanup(root);
  }
});

test('a fix that changes nothing yields an empty delta', () => {
  const root = makeRepo();
  try {
    write(root, 'a.txt', 'two\n');
    const first = snapshot(root).tree;
    const second = snapshot(root).tree;
    assert.equal(first, second);
    const result = delta(first, second, root);
    assert.equal(result.verdict, 'empty');
    assert.deepEqual(result.paths, []);
  } finally {
    cleanup(root);
  }
});

test('an ignored path enters a snapshot only when it is named', () => {
  const root = makeRepo();
  try {
    write(root, 'ignored/notes.md', 'v1\n');
    const without = snapshot(root).tree;
    assert.ok(!git(root, ['ls-tree', '-r', '--name-only', without]).includes('ignored/notes.md'));

    const withPath = snapshot(root, ['ignored/notes.md', 'does-not-exist.md', '../outside.md']).tree;
    assert.ok(git(root, ['ls-tree', '-r', '--name-only', withPath]).includes('ignored/notes.md'));

    write(root, 'ignored/notes.md', 'v2\n');
    const changed = snapshot(root, ['ignored/notes.md']).tree;
    assert.deepEqual(delta(withPath, changed, root).paths, [{ status: 'M', path: 'ignored/notes.md' }]);
    assert.equal(git(root, ['status', '--porcelain', '--ignored']).includes('ignored/'), true);
  } finally {
    cleanup(root);
  }
});

test('delta compares a snapshot with a commit', () => {
  const root = makeRepo();
  try {
    write(root, 'a.txt', 'two\n');
    const result = delta('HEAD', snapshot(root).tree, root);
    assert.equal(result.verdict, 'changed');
    assert.deepEqual(result.paths, [{ status: 'M', path: 'a.txt' }]);
  } finally {
    cleanup(root);
  }
});

test('snapshot works in a repository without commits', () => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-review-delta-'));
  try {
    git(root, ['init', '-q']);
    write(root, 'a.txt', 'one\n');
    const result = snapshot(root);
    assert.equal(result.verdict, 'clean');
    assert.equal(git(root, ['ls-tree', '-r', '--name-only', result.tree]).trim(), 'a.txt');
  } finally {
    cleanup(root);
  }
});

test('outside a repository both sub-commands report n/a', () => {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-review-delta-plain-'));
  try {
    const snap = tool(['snapshot', '--cwd', dir], dir);
    assert.equal(snap.status, 0);
    assert.equal(snap.payload.verdict, 'n/a');
    assert.equal(snap.payload.tree, null);
    const diff = tool(['delta', 'HEAD', 'HEAD', '--cwd', dir], dir);
    assert.equal(diff.status, 0);
    assert.equal(diff.payload.verdict, 'n/a');
  } finally {
    cleanup(dir);
  }
});

test('the CLI prints JSON, rejects bad usage, and leaves no temporary index behind', () => {
  const root = makeRepo();
  try {
    const snap = tool(['snapshot', '--cwd', root], root);
    assert.equal(snap.status, 0);
    assert.equal(snap.payload.verdict, 'clean');
    const again = tool(['delta', snap.payload.tree, snap.payload.tree, '--cwd', root], root);
    assert.equal(again.payload.verdict, 'empty');

    assert.equal(tool([], root).status, 2);
    assert.equal(tool(['delta', 'HEAD'], root).status, 2);
    assert.equal(tool(['delta', '--evil', 'HEAD'], root).status, 2);
    assert.equal(tool(['delta', 'no-such-ref', 'HEAD', '--cwd', root], root).status, 2);
    assert.equal(tool(['bogus'], root).status, 2);

    const { resolveTempRoot } = require('../sai/tools/temp-root.js');
    const leftovers = fs.readdirSync(resolveTempRoot('claude')).filter(name => name.startsWith('review-delta-'));
    assert.deepEqual(leftovers, []);
  } finally {
    cleanup(root);
  }
});

test('parseNameStatus reads NUL-separated entries', () => {
  assert.deepEqual(parseNameStatus('M\0a b.txt\0A\0c.txt\0'), [{ status: 'M', path: 'a b.txt' }, { status: 'A', path: 'c.txt' }]);
  assert.deepEqual(parseNameStatus(''), []);
});

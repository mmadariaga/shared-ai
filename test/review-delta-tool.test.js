'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const { snapshot, delta, parseNameStatus, restore } = require('../sai/tools/review-delta.js');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'review-delta.js');

function tool(args, cwd) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: 'utf8' });
  let payload = null;
  if (result.status === 0 || result.stdout.trim().startsWith('{')) {
    try { payload = JSON.parse(result.stdout); } catch (err) { payload = null; }
  }
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

test('restore writes a modified path back, removes a created one, and leaves a dirty baseline path alone', () => {
  const root = makeRepo();
  try {
    // The dirty baseline: a user change that predates the snapshot.
    write(root, 'a.txt', 'user change\n');
    write(root, 'untouched.txt', 'user file\n');
    const before = snapshot(root);
    assert.equal(before.verdict, 'clean');

    // A worker changes one path, creates another, and creates one under a new folder.
    write(root, 'a.txt', 'worker change\n');
    write(root, 'created.txt', 'worker file\n');
    write(root, 'nested/deep/created.txt', 'worker file\n');
    git(root, ['add', 'a.txt']);
    const indexBefore = fs.readFileSync(path.join(root, '.git', 'index'));

    const result = restore(before.tree, ['a.txt', 'created.txt', 'nested/deep/created.txt'], root);
    assert.equal(result.verdict, 'restored');
    assert.deepEqual(result.paths, [
      { path: 'a.txt', action: 'written' },
      { path: 'created.txt', action: 'removed' },
      { path: 'nested/deep/created.txt', action: 'removed' },
    ]);
    assert.equal(fs.readFileSync(path.join(root, 'a.txt'), 'utf8'), 'user change\n', 'the modified path holds its snapshot content again');
    assert.equal(fs.existsSync(path.join(root, 'created.txt')), false, 'the created file is gone');
    assert.equal(fs.existsSync(path.join(root, 'nested')), false, 'the created directories are pruned');
    assert.equal(fs.readFileSync(path.join(root, 'untouched.txt'), 'utf8'), 'user file\n', 'a path outside the call keeps its content');
    assert.deepEqual(fs.readFileSync(path.join(root, '.git', 'index')), indexBefore, 'the index is untouched');
    assert.equal(git(root, ['status', '--porcelain']).trim(), 'MM a.txt\n?? untouched.txt', 'the staged worker content and the dirty baseline survive');
  } finally {
    cleanup(root);
  }
});

test('restore refuses a path outside the repository or a directory entry, and the CLI reports it', () => {
  const root = makeRepo();
  try {
    const before = snapshot(root);
    assert.equal(restore(before.tree, ['../outside.txt'], root).verdict, 'refused');
    write(root, 'dir/file.txt', 'x\n');
    const withDir = snapshot(root);
    const refused = restore(withDir.tree, ['dir'], root);
    assert.equal(refused.verdict, 'refused');
    assert.match(refused.reason, /directory/);

    const cli = tool(['restore', withDir.tree, '--cwd', root, 'dir'], root);
    assert.equal(cli.status, 1);
    assert.equal(cli.payload.verdict, 'refused');
    assert.equal(tool(['restore', '--cwd', root], root).status, 2, 'restore needs a tree and at least one path');
    const restored = tool(['restore', withDir.tree, '--cwd', root, 'dir/file.txt'], root);
    assert.equal(restored.status, 0);
    assert.equal(restored.payload.verdict, 'restored');
  } finally {
    cleanup(root);
  }
});

test('restore brings back a file whose folder the worker deleted, and a symbolic link as a link', () => {
  const root = makeRepo();
  try {
    write(root, 'deep/dir/kept.txt', 'original\n');
    fs.symlinkSync('deep/dir/kept.txt', path.join(root, 'link'));
    const before = snapshot(root);
    fs.rmSync(path.join(root, 'deep'), { recursive: true, force: true });
    fs.rmSync(path.join(root, 'link'));
    const result = restore(before.tree, ['deep/dir/kept.txt', 'link'], root);
    assert.equal(result.verdict, 'restored');
    assert.equal(fs.readFileSync(path.join(root, 'deep/dir/kept.txt'), 'utf8'), 'original\n');
    assert.equal(fs.lstatSync(path.join(root, 'link')).isSymbolicLink(), true, 'a link is restored as a link');
    // Windows stores the link target with backslashes, so compare the normalized form.
    assert.equal(fs.readlinkSync(path.join(root, 'link')).split(path.sep).join('/'), 'deep/dir/kept.txt');
  } finally {
    cleanup(root);
  }
});

test('restore writes nothing when one named path is refused', () => {
  const root = makeRepo();
  try {
    write(root, 'a.txt', 'before\n');
    write(root, 'dir/file.txt', 'x\n');
    const before = snapshot(root);
    write(root, 'a.txt', 'worker\n');
    const refused = restore(before.tree, ['a.txt', 'dir'], root);
    assert.equal(refused.verdict, 'refused');
    assert.equal(fs.readFileSync(path.join(root, 'a.txt'), 'utf8'), 'worker\n', 'the earlier path was not written');
  } finally {
    cleanup(root);
  }
});

test('parseNameStatus reads NUL-separated entries', () => {
  assert.deepEqual(parseNameStatus('M\0a b.txt\0A\0c.txt\0'), [{ status: 'M', path: 'a b.txt' }, { status: 'A', path: 'c.txt' }]);
  assert.deepEqual(parseNameStatus(''), []);
});

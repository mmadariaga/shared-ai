'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const { snapshot, verify, parseLists, within, N_A, REF_RE } = require('../sai/tools/slice-path-scope.js');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'slice-path-scope.js');
const POLICY = path.join(REPO_ROOT, 'sai', 'policies', 'slice-path-scope.md');

function tool(args, cwd, input = '') {
  const result = spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: 'utf8', input });
  let payload = null;
  if (result.stdout.trim() && args.includes('--json')) {
    try {
      payload = JSON.parse(result.stdout);
    } catch (err) {
      assert.fail(`tool stdout was not JSON: ${result.stdout}`);
    }
  }
  return { status: result.status, payload, stdout: result.stdout, stderr: result.stderr };
}

function git(cwd, args) {
  const result = spawnSync(
    'git',
    ['-c', 'user.email=test@example.com', '-c', 'user.name=test', ...args],
    { cwd, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result;
}

function write(root, relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function makeDir() {
  return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-slice-path-scope-test-'));
}

/** A repository with two committed files and one edit the user made earlier. */
function makeRepo() {
  const root = makeDir();
  git(root, ['init', '-q']);
  write(root, 'src/a.js', 'a\n');
  write(root, 'notes.txt', 'notes\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-q', '-m', 'base']);
  write(root, 'notes.txt', 'notes edited by the user\n');
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function gitStatus(root) {
  return git(root, ['status', '--porcelain=v1', '--untracked-files=all']).stdout;
}

test('snapshot records the already-modified files and returns a reference', () => {
  const root = makeRepo();
  try {
    const payload = snapshot(root);
    assert.equal(payload.verdict, 'clean');
    assert.ok(REF_RE.test(payload.snapshot));
    assert.deepEqual(payload.modified, ['notes.txt']);
  } finally {
    cleanup(root);
  }
});

test('the tool leaves the repository untouched', () => {
  const root = makeRepo();
  try {
    const before = gitStatus(root);
    const head = git(root, ['rev-parse', 'HEAD']).stdout;
    const taken = tool(['snapshot', '--json', '--cwd', root], REPO_ROOT);
    tool(['verify', '--snapshot', taken.payload.snapshot, '--json', '--cwd', root], REPO_ROOT, 'src\n---\nsrc\n');
    assert.equal(gitStatus(root), before);
    assert.equal(git(root, ['rev-parse', 'HEAD']).stdout, head);
  } finally {
    cleanup(root);
  }
});

test('verify is clean when every change since the snapshot is a slice path', () => {
  const root = makeRepo();
  try {
    const { snapshot: ref } = snapshot(root);
    write(root, 'src/a.js', 'a changed\n');
    write(root, 'src/b.js', 'b\n');
    const payload = verify(ref, 'src/a.js\nsrc/b.js\n', root);
    assert.equal(payload.verdict, 'clean');
    assert.deepEqual(payload.foreign, []);
    assert.deepEqual(payload.uncovered, []);
    assert.equal(payload.cover_checked, false);
  } finally {
    cleanup(root);
  }
});

test('a file that was already modified and stays as it was is never foreign', () => {
  const root = makeRepo();
  try {
    const { snapshot: ref } = snapshot(root);
    write(root, 'src/a.js', 'a changed\n');
    const payload = verify(ref, 'src/a.js\n', root);
    assert.deepEqual(payload.foreign, []);
  } finally {
    cleanup(root);
  }
});

test('verify reports a change outside the slice paths as foreign and exits 1', () => {
  const root = makeRepo();
  try {
    const taken = tool(['snapshot', '--json', '--cwd', root], REPO_ROOT);
    write(root, 'src/a.js', 'a changed\n');
    write(root, 'other/new.txt', 'new\n');
    write(root, 'notes.txt', 'notes edited again\n');
    const result = tool(['verify', '--snapshot', taken.payload.snapshot, '--json', '--cwd', root], REPO_ROOT, 'src/a.js\n');
    assert.equal(result.status, 1);
    assert.equal(result.payload.verdict, 'mismatch');
    assert.deepEqual(result.payload.foreign, ['notes.txt', 'other/new.txt']);
  } finally {
    cleanup(root);
  }
});

test('an already-modified file that is also a slice path counts as a slice path', () => {
  const root = makeRepo();
  try {
    const { snapshot: ref } = snapshot(root);
    write(root, 'notes.txt', 'notes edited by the slice\n');
    const payload = verify(ref, 'notes.txt\n', root);
    assert.equal(payload.verdict, 'clean');
  } finally {
    cleanup(root);
  }
});

test('staging and committing since the snapshot are detected as changes', () => {
  const root = makeRepo();
  try {
    const { snapshot: ref } = snapshot(root);
    git(root, ['add', 'notes.txt']);
    assert.deepEqual(verify(ref, '', root).foreign, ['notes.txt']);
    git(root, ['commit', '-q', '-m', 'commit notes']);
    assert.deepEqual(verify(ref, '', root).foreign, ['notes.txt']);
  } finally {
    cleanup(root);
  }
});

test('verify with no change and no list is clean', () => {
  const root = makeRepo();
  try {
    const { snapshot: ref } = snapshot(root);
    const result = tool(['verify', '--snapshot', ref, '--json', '--cwd', root], REPO_ROOT);
    assert.equal(result.status, 0);
    assert.equal(result.payload.verdict, 'clean');
  } finally {
    cleanup(root);
  }
});

test('an order whose paths miss a slice path is reported as uncovered (E7)', () => {
  const root = makeRepo();
  try {
    const { snapshot: ref } = snapshot(root);
    write(root, 'src/a.js', 'a changed\n');
    write(root, 'openspec/changes/archive/2026-01-01-x/proposal.md', 'p\n');
    const lists = [
      'src/a.js',
      'openspec/changes/archive/2026-01-01-x',
      'openspec/specs/x/spec.md',
      '---',
      'openspec/changes/archive/2026-01-01-x',
      'openspec/specs',
    ].join('\n');
    const result = tool(['verify', '--snapshot', ref, '--json', '--cwd', root], REPO_ROOT, lists);
    assert.equal(result.status, 1);
    assert.equal(result.payload.verdict, 'mismatch');
    assert.equal(result.payload.cover_checked, true);
    assert.deepEqual(result.payload.uncovered, ['src/a.js']);
    assert.deepEqual(result.payload.foreign, []);

    const complete = tool(['verify', '--snapshot', ref, '--json', '--cwd', root], REPO_ROOT, `${lists}\nsrc/a.js\n`);
    assert.equal(complete.status, 0);
    assert.equal(complete.payload.verdict, 'clean');
  } finally {
    cleanup(root);
  }
});

test('a listed directory covers the paths beneath it and nothing beside it', () => {
  assert.ok(within('src/a.js', ['src']));
  assert.ok(within('src', ['src']));
  assert.ok(!within('src-old/a.js', ['src']));
  assert.ok(!within('src', ['src/a.js']));
});

test('lists are normalized, de-duplicated, and split at the separator', () => {
  const lists = parseLists('./src\\a.js\r\nsrc/a.js\n\ndocs/\n---\nsrc/\n');
  assert.deepEqual(lists.slice, ['src/a.js', 'docs']);
  assert.deepEqual(lists.cover, ['src']);
  assert.equal(parseLists('src/a.js\n').cover, null);
});

test('outside a repository snapshot and verify resolve n/a and exit 0', () => {
  const root = makeDir();
  try {
    const taken = tool(['snapshot', '--json', '--cwd', root], REPO_ROOT);
    assert.equal(taken.status, 0);
    assert.equal(taken.payload.verdict, 'n/a');
    assert.equal(taken.payload.snapshot, N_A);
    assert.equal(taken.payload.reason, 'not-a-git-repository');
    const checked = tool(['verify', '--snapshot', N_A, '--json', '--cwd', root], REPO_ROOT, 'src/a.js\n');
    assert.equal(checked.status, 0);
    assert.equal(checked.payload.verdict, 'n/a');
    assert.equal(checked.payload.reason, 'snapshot-unavailable');
  } finally {
    cleanup(root);
  }
});

test('usage and IO errors exit 2 and never print a verdict', () => {
  const unknownRef = 'f'.repeat(64);
  for (const [args, input] of [
    [['bogus', '--json'], ''],
    [['verify', '--json'], ''],
    [['verify', '--snapshot', 'not-a-ref', '--json'], ''],
    [['verify', '--snapshot', unknownRef, '--json'], ''],
    [['verify', '--snapshot', N_A, '--json'], '../outside.txt\n'],
    [['verify', '--snapshot', N_A, '--json'], 'a\n---\nb\n---\nc\n'],
    [['snapshot', '--snapshot', N_A, '--json'], ''],
    [['snapshot', 'extra', '--json'], ''],
    [['snapshot', '--json', '--cwd', path.join(REPO_ROOT, 'no-such-dir')], ''],
  ]) {
    const result = tool(args, REPO_ROOT, input);
    assert.equal(result.status, 2, `expected exit 2 for ${args.join(' ')}`);
    assert.ok(!result.stdout.includes('"verdict"'), 'an error never yields a verdict');
  }
});

test('--help exits 0 and documents the closed exit codes', () => {
  const result = tool(['--help'], REPO_ROOT);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Exit codes: 0 = clean or n\/a; 1 = mismatch; 2 = usage or IO error\./);
  assert.match(result.stdout, /--snapshot/);
  assert.match(result.stdout, /--cwd/);
});

test('the policy is the single source of the invocation and the coverage rule', () => {
  const policy = fs.readFileSync(POLICY, 'utf8');
  assert.match(policy, /node <tool-path> snapshot --json --cwd <project-root>/);
  assert.match(policy, /node <tool-path> verify --snapshot <slice_snapshot> --json --cwd <project-root>/);
  assert.match(policy, /Fetch @sai\/policies\/tool-resolution\.md/);
  assert.match(policy, /## Commit coverage/);
  for (const field of ['`foreign`', '`uncovered`', '`clean`', '`mismatch`', '`n/a`']) {
    assert.ok(policy.includes(field), `the policy must name ${field}`);
  }
  for (const card of [
    'sai/commands/explore/steps/pipeline-direct-build.md',
    'sai/commands/archive/coordinator.md',
  ]) {
    const body = fs.readFileSync(path.join(REPO_ROOT, card), 'utf8');
    assert.match(body, /@sai\/policies\/slice-path-scope\.md` § Commit coverage/, `${card} must reference the coverage rule`);
    assert.ok(!body.includes('slice-path-scope.js'), `${card} must not restate the tool invocation`);
  }
});

test('Direct Build takes the initial snapshot before the implementer dispatch and holds it as run state', () => {
  const pipeline = fs.readFileSync(
    path.join(REPO_ROOT, 'sai', 'commands', 'explore', 'steps', 'pipeline-direct-build.md'),
    'utf8',
  );
  assert.match(pipeline, /`slice_snapshot` \(the initial snapshot reference/);
  const step1 = pipeline.split('\n').find((line) => line.includes('1. **Implement**'));
  assert.ok(step1.indexOf('slice-path-scope.md') < step1.indexOf('dispatch the `sai-direct-build-worker`'));
  const step8 = pipeline.split('\n').find((line) => line.includes('8. **Archive execution and pre-authorized commit**'));
  assert.ok(step8.indexOf('§ Commit coverage') < step8.indexOf('continue the SAME `sai-archive-worker`'));
});

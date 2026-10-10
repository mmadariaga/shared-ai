'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { execute } = require('../sai/tools/new-change-branch');
const { expandInstallManifest } = require('../bin/install-manifest');
const manifest = require('../sai/install-manifest.json');

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function fixture(t, initial = true) {
  const temporaryRoot = fs.existsSync('/tmp/opencode') ? '/tmp/opencode' : os.tmpdir();
  const cwd = fs.mkdtempSync(path.join(temporaryRoot, 'new-change-branch-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  if (initial) {
    git(cwd, 'init', '-b', 'main');
    git(cwd, 'config', 'user.name', 'Test');
    git(cwd, 'config', 'user.email', 'test@example.invalid');
    fs.writeFileSync(path.join(cwd, 'file'), 'base');
    git(cwd, 'add', 'file');
    git(cwd, 'commit', '-m', 'base');
  }
  return cwd;
}
function create(cwd, extra = {}) {
  const base = execute('base', { base: 'main' }, cwd);
  return execute('create', { type: 'feat', name: 'New Change', base: 'main', sha: base.sha, ...extra }, cwd);
}
function refs(cwd) { return git(cwd, 'for-each-ref', '--format=%(refname):%(objectname)'); }

test('E1: no repository and unborn HEAD stop without creating a branch', (t) => {
  const cwd = fixture(t, false);
  assert.equal(execute('inspect', {}, cwd).status, 'failed');
  git(cwd, 'init', '-b', 'main');
  const before = refs(cwd);
  assert.equal(execute('inspect', {}, cwd).status, 'failed');
  assert.equal(create(cwd).status, 'failed');
  assert.equal(refs(cwd), before);
});

test('E2/E3: both naming formats, normalization, exact identifiers and invalid input', (t) => {
  const cwd = fixture(t);
  assert.equal(execute('name', { type: 'docs', name: '  User GUIDE! ' }, cwd).branch, 'docs/user-guide');
  assert.equal(execute('name', { type: 'fix', name: 'Fix Bug', id: 'AbC-42' }, cwd).branch, 'fix/AbC-42_fix-bug');
  const before = refs(cwd);
  for (const input of [{ type: 'other', name: 'x' }, { type: 'feat', name: ' ' }, { type: 'feat' },
    { type: 'feat', name: 'x', id: 'bad..id' }, { type: 'feat', name: 'x', id: '' }]) {
    assert.equal(execute('name', input, cwd).status, 'failed');
  }
  assert.equal(refs(cwd), before);
});

test('E4/E6: nearest tip, alphabetical full-ref ties, symbolic exclusion and unique bases', (t) => {
  const cwd = fixture(t);
  git(cwd, 'branch', 'z-parent');
  git(cwd, 'branch', 'a-parent');
  git(cwd, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  git(cwd, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main');
  git(cwd, 'switch', '-c', 'current');
  const r = execute('inspect', {}, cwd);
  assert.equal(r.parent, 'refs/heads/a-parent');
  assert.deepEqual(r.bases, ['refs/heads/current', 'refs/heads/a-parent', 'refs/heads/main', 'refs/remotes/origin/main']);
  git(cwd, 'commit', '--allow-empty', '-m', 'nearer');
  git(cwd, 'branch', 'nearest');
  assert.equal(execute('inspect', {}, cwd).parent, 'refs/heads/nearest');
});

test('E5/E6: bound counts HEAD as first commit; absent options and detached HEAD', (t) => {
  const cwd = fixture(t);
  git(cwd, 'switch', '-c', 'current');
  for (let i = 0; i < 19; i++) git(cwd, 'commit', '--allow-empty', '-m', `c${i}`);
  assert.equal(execute('inspect', {}, cwd).parent, 'refs/heads/main');
  git(cwd, 'commit', '--allow-empty', '-m', 'outside');
  assert.equal(execute('inspect', {}, cwd).parent, null);
  git(cwd, 'branch', '-m', 'main', 'old');
  assert.deepEqual(execute('inspect', {}, cwd).bases, ['refs/heads/current']);
  git(cwd, 'switch', '--detach', 'HEAD');
  assert.equal(execute('inspect', {}, cwd).current, null);
  assert.deepEqual(execute('inspect', {}, cwd).bases, ['refs/heads/current']);
});

test('first-parent traversal does not match a merged-side tip', (t) => {
  const cwd = fixture(t);
  git(cwd, 'switch', '-c', 'side');
  git(cwd, 'commit', '--allow-empty', '-m', 'side');
  git(cwd, 'switch', 'main');
  git(cwd, 'commit', '--allow-empty', '-m', 'main');
  git(cwd, 'merge', '--no-ff', 'side', '-m', 'merge');
  assert.equal(execute('inspect', {}, cwd).parent, null);
});

test('E7/E9/E10: invalid bases, moved base, occupied names and cancellation leave refs unchanged', (t) => {
  const cwd = fixture(t);
  const before = refs(cwd);
  for (const base of ['missing', '--help', '']) {
    assert.equal(execute('base', { base }, cwd).status, 'failed');
    assert.equal(create(cwd, { base }).status, 'failed');
  }
  assert.equal(create(cwd, { sha: '0'.repeat(40) }).status, 'failed');
  assert.equal(create(cwd, { cancelled: true }).status, 'cancelled');
  assert.equal(refs(cwd), before);
  git(cwd, 'branch', 'feat/new-change');
  const occupied = refs(cwd);
  const r = create(cwd);
  assert.equal(r.status, 'failed');
  assert.equal(r.attempted, false);
  assert.equal(r.created, false);
  assert.equal(refs(cwd), occupied);
});

test('E8: staged, unstaged and untracked work survives successful switch; no tracking', (t) => {
  const cwd = fixture(t);
  fs.writeFileSync(path.join(cwd, 'file'), 'staged');
  git(cwd, 'add', 'file');
  fs.writeFileSync(path.join(cwd, 'file'), 'unstaged');
  fs.writeFileSync(path.join(cwd, 'untracked'), 'keep');
  const status = git(cwd, 'status', '--porcelain');
  const staged = git(cwd, 'show', ':file');
  const r = create(cwd, { id: 'WI-80' });
  assert.equal(r.status, 'completed');
  assert.equal(r.branch, 'feat/WI-80_new-change');
  assert.equal(git(cwd, 'symbolic-ref', '--short', 'HEAD'), r.branch);
  assert.equal(git(cwd, 'rev-parse', 'HEAD'), r.sha);
  assert.equal(git(cwd, 'status', '--porcelain'), status);
  assert.equal(git(cwd, 'show', ':file'), staged);
  assert.equal(fs.readFileSync(path.join(cwd, 'file'), 'utf8'), 'unstaged');
  assert.equal(fs.readFileSync(path.join(cwd, 'untracked'), 'utf8'), 'keep');
  assert.equal(git(cwd, 'for-each-ref', '--format=%(upstream)', `refs/heads/${r.branch}`), '');
});

test('E8/E10: blocked switching reports state and preserves work without creating a branch', (t) => {
  const cwd = fixture(t);
  git(cwd, 'switch', '-c', 'other');
  fs.writeFileSync(path.join(cwd, 'file'), 'other');
  git(cwd, 'add', 'file');
  git(cwd, 'commit', '-m', 'other');
  git(cwd, 'switch', 'main');
  fs.writeFileSync(path.join(cwd, 'file'), 'keep');
  const before = refs(cwd);
  const { sha } = execute('base', { base: 'other' }, cwd);
  const r = create(cwd, { base: 'other', sha });
  assert.equal(r.status, 'failed');
  assert.equal(r.attempted, true);
  assert.equal(r.created, false);
  assert.equal(r.active_branch, 'main');
  assert.ok(r.incomplete);
  assert.equal(refs(cwd), before);
  assert.equal(fs.readFileSync(path.join(cwd, 'file'), 'utf8'), 'keep');
});

test('E8: creation rechecks merge and both rebase states', (t) => {
  const cwd = fixture(t);
  const before = refs(cwd);
  for (const marker of ['MERGE_HEAD', 'rebase-merge', 'rebase-apply']) {
    const p = path.join(cwd, '.git', marker);
    if (marker === 'MERGE_HEAD') fs.writeFileSync(p, git(cwd, 'rev-parse', 'HEAD'));
    else fs.mkdirSync(p);
    assert.equal(execute('inspect', {}, cwd).status, 'failed');
    const r = create(cwd);
    assert.equal(r.status, 'failed');
    assert.equal(r.attempted, false);
    assert.equal(refs(cwd), before);
    fs.rmSync(p, { recursive: true });
  }
});

test('read-only failures omit creation-specific incomplete reporting; create failures retain it', (t) => {
  const cwd = fixture(t);
  const before = refs(cwd);
  for (const [operation, input, directory] of [
    ['inspect', {}, fixture(t, false)],
    ['name', { type: 'feat', name: '' }, cwd],
    ['base', { base: 'missing' }, cwd],
  ]) {
    const result = execute(operation, input, directory);
    assert.equal(result.status, 'failed');
    assert.equal(Object.hasOwn(result, 'incomplete'), false);
    assert.equal(result.attempted, false);
    assert.equal(result.created, false);
  }
  const result = create(cwd, { name: '' });
  assert.equal(result.status, 'failed');
  assert.equal(result.incomplete, 'creation not executed');
  assert.equal(result.active_branch, 'main');
  assert.equal(result.attempted, false);
  assert.equal(result.created, false);
  assert.equal(refs(cwd), before);
});

test('CLI uses stdin JSON and reports invalid input without creating a branch', (t) => {
  const cwd = fixture(t);
  const tool = path.resolve(__dirname, '../sai/tools/new-change-branch.js');
  const before = refs(cwd);
  const r = spawnSync(process.execPath, [tool, 'create'], { cwd, input: '{', encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).created, false);
  assert.equal(refs(cwd), before);
});

test('instruction checks cover context questions, native pickers, safety and both harness projections', () => {
  const skill = fs.readFileSync(path.resolve(__dirname, '../skills/universal/new-change-branch/SKILL.md'), 'utf8');
  for (const pattern of [/disable-model-invocation: true/, /explicit user request/, /relevant conversation context/,
    /Ask only for missing or ambiguous/, /references describe different/, /Preserve the selected identifier exactly/,
    /AskUserQuestion/, /opencode.*question/, /free-text/, /paginate/, /never automatically choose a base/i,
    /safe-operations/, /tool-resolution.md/, /without fetching/, /without calling `create`/,
    /never discard work or automatically stash/, /Do not clean up or retry automatically/]) assert.match(skill, pattern);
  const repoRoot = path.resolve(__dirname, '..');
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = Object.fromEntries(['agents', 'commands', 'config', 'sai', 'skills', 'root'].map(key => [key, path.join(os.tmpdir(), 'new-change-branch-projection', harness, key)]));
    const entries = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    for (const source of ['skills/universal/new-change-branch/SKILL.md', 'sai/tools/new-change-branch.js']) {
      assert.ok(entries.some(e => e.sourcePath === path.join(repoRoot, source)), `${harness}: ${source}`);
    }
  }
  assert.equal(manifest.capabilities.assignments.commands['new-change-branch'], 'new-change-branch-command');
  const profile = manifest.capabilities.profiles['new-change-branch-command'];
  assert.equal(profile.question, true);
  assert.ok(profile.skills.includes('safe-operations'));
  assert.deepEqual(profile.shell, ['node {sai}/tools/new-change-branch.js *']);
});

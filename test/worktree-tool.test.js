'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');
const { parsePorcelain, deriveBranch } = require('../sai/tools/worktree.js');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'worktree.js');

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout;
}

function tool(args, cwd) {
  const result = spawnSync(process.execPath, [TOOL, ...args, '--json', '--cwd', cwd], { cwd, encoding: 'utf8' });
  let payload = null;
  if (result.stdout.trim()) {
    try {
      payload = JSON.parse(result.stdout);
    } catch (err) {
      assert.fail(`tool stdout was not JSON: ${result.stdout}`);
    }
  }
  return { status: result.status, payload, stderr: result.stderr };
}

function makeRepo() {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-worktree-'));
  const repo = path.join(parent, 'demo');
  fs.mkdirSync(repo);
  git(['init', '-b', 'main'], repo);
  git(['config', 'user.email', 'test@example.com'], repo);
  git(['config', 'user.name', 'Test'], repo);
  fs.writeFileSync(path.join(repo, 'README.md'), 'demo\n');
  git(['add', '.'], repo);
  git(['commit', '-m', 'init'], repo);
  return { parent, repo };
}

function cleanup(parent) {
  fs.rmSync(parent, { recursive: true, force: true });
}

test('the manifest projects sai tools to both harnesses', () => {
  const manifest = loadInstallManifest(REPO_ROOT);
  const rule = manifest.projections.find(projection => projection.id === 'sai-tools');
  assert.deepEqual(rule, {
    id: 'sai-tools',
    source: 'sai/tools',
    destination: { class: 'sai', path: 'tools' },
    harnesses: ['claude', 'opencode'],
    strategy: 'copy',
    recursive: true,
    include: ['**/*.js'],
    ownership: 'managed',
    drift: 'content',
  });
  assert.equal(manifest.projections.filter(projection => projection.source === 'sai/tools').length, 1);
});

test('both harnesses receive every tool as a managed content-tracked file', () => {
  const manifest = loadInstallManifest(REPO_ROOT);
  const sources = fs.readdirSync(path.join(REPO_ROOT, 'sai', 'tools')).filter(name => name.endsWith('.js'));
  assert.ok(sources.includes('worktree.js'));
  assert.ok(sources.includes('check-delta-headers.js'), 'the pre-existing tool is projected too');

  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = {
      sai: path.join('/root', harness, 'sai'),
      commands: path.join('/root', harness, 'commands'),
      agents: path.join('/root', harness, 'agents'),
      skills: path.join('/root', harness, 'skills'),
      config: path.join('/root', harness, 'config'),
      root: path.join('/root', harness),
    };
    const projected = expandInstallManifest(manifest, { harness, repoRoot: REPO_ROOT, destinationRoot })
      .filter(item => item.id === 'sai-tools');
    assert.deepEqual(
      projected.map(item => path.basename(item.destinationPath)).sort(),
      [...sources].sort(),
    );
    for (const item of projected) {
      assert.equal(item.ownership, 'managed');
      assert.equal(item.drift, 'content');
      assert.equal(path.basename(path.dirname(item.destinationPath)), 'tools');
    }
  }
});

test('porcelain parsing keeps a detached entry branchless instead of inventing one', () => {
  const entries = parsePorcelain([
    'worktree /a/demo',
    'HEAD 1111111111111111111111111111111111111111',
    'branch refs/heads/main',
    '',
    'worktree /a/demo.worktree-1',
    'HEAD 2222222222222222222222222222222222222222',
    'detached',
    '',
  ].join('\n'));
  assert.equal(entries.length, 2);
  assert.equal(entries[0].branch, 'main');
  assert.equal(entries[1].branch, null);
  assert.equal(entries[1].path, '/a/demo.worktree-1');
});

test('branch derivation strips only a leading main-repo-name prefix', () => {
  assert.equal(deriveBranch('demo.worktree-3', 'demo'), 'worktree-3');
  assert.equal(deriveBranch('feature-x', 'demo'), 'feature-x');
  assert.equal(deriveBranch('demo.', 'demo'), 'demo.');
});

test('inventory marks main and current, and create takes the free slot beside the main worktree', () => {
  const { parent, repo } = makeRepo();
  try {
    const first = tool(['inventory'], repo);
    assert.equal(first.status, 0);
    assert.equal(first.payload.worktrees.length, 1);
    assert.equal(first.payload.worktrees[0].isMain, true);
    assert.equal(first.payload.worktrees[0].isCurrent, true);
    assert.equal(first.payload.worktrees[0].deletable, false);
    assert.equal(first.payload.mainBranch, 'main');
    assert.equal(first.payload.mainRepoName, 'demo');
    assert.equal(first.payload.proposedName, 'demo.worktree-1');
    assert.equal(first.payload.proposedBranch, 'worktree-1');

    const created = tool(['create'], repo);
    assert.equal(created.status, 0);
    assert.equal(created.payload.branch, 'worktree-1');
    assert.equal(created.payload.indexing, undefined, 'create never runs the indexing pass itself');
    assert.match(created.payload.indexAnnouncement, /^codegraph init is about to run in /);
    assert.ok(created.payload.indexAnnouncement.includes(created.payload.path));
    assert.equal(fs.realpathSync.native(path.dirname(created.payload.path)), fs.realpathSync.native(parent));

    const second = tool(['inventory'], repo);
    assert.equal(second.payload.proposedName, 'demo.worktree-2');
    const linked = second.payload.worktrees.find(entry => entry.name === 'demo.worktree-1');
    assert.equal(linked.deletable, true);
    assert.equal(linked.branch, 'worktree-1');

    // A dirty target is refused without --force, and the refusal mutates nothing.
    fs.writeFileSync(path.join(created.payload.path, 'scratch.txt'), 'unsaved\n');
    const refused = tool(['remove', created.payload.path], repo);
    assert.equal(refused.status, 1);
    assert.equal(refused.payload.reason, 'dirty');
    assert.ok(refused.payload.statusLines.some(line => line.includes('scratch.txt')));
    assert.ok(fs.existsSync(created.payload.path));

    const removed = tool(['remove', created.payload.path, '--force'], repo);
    assert.equal(removed.status, 0);
    assert.equal(removed.payload.forced, true);
    assert.equal(removed.payload.branch, 'worktree-1');
    assert.equal(removed.payload.branchDeletionApplicable, true);
    assert.ok(!fs.existsSync(created.payload.path));

    // The branch still exists, so slot 1 is not free until it is deleted.
    assert.equal(tool(['inventory'], repo).payload.proposedName, 'demo.worktree-2');
    assert.equal(tool(['delete-branch', 'worktree-1'], repo).status, 0);
    assert.equal(tool(['inventory'], repo).payload.proposedName, 'demo.worktree-1');

    // The main and current worktree, and an unregistered path, are all refused.
    const own = tool(['remove', repo], repo);
    assert.equal(own.status, 1);
    assert.equal(own.payload.reason, 'not-deletable');
    const stranger = tool(['remove', path.join(parent, 'nowhere')], repo);
    assert.equal(stranger.status, 1);
    assert.equal(stranger.payload.reason, 'not-registered');
  } finally {
    cleanup(parent);
  }
});

test('create refuses a separator, a traversal, an existing directory, an invalid refname, and a taken branch', () => {
  const { parent, repo } = makeRepo();
  try {
    const cases = [
      ['nested/child', 'invalid-name'],
      ['..', 'invalid-name'],
      ['bad~name', 'invalid-branch'],
      ['main', 'branch-exists'],
    ];
    for (const [name, reason] of cases) {
      const refused = tool(['create', name], repo);
      assert.equal(refused.status, 1, `expected refusal for ${name}`);
      assert.equal(refused.payload.refused, true);
      assert.equal(refused.payload.reason, reason, `unexpected reason for ${name}`);
    }

    fs.mkdirSync(path.join(parent, 'taken'));
    const occupied = tool(['create', 'taken'], repo);
    assert.equal(occupied.status, 1);
    assert.equal(occupied.payload.reason, 'directory-exists');
    assert.equal(fs.readdirSync(path.join(parent, 'taken')).length, 0, 'a refusal mutates nothing');
  } finally {
    cleanup(parent);
  }
});

test('delete-branch refuses an unmerged branch and a skipped merge check without --force', () => {
  const { parent, repo } = makeRepo();
  try {
    git(['checkout', '-q', '-b', 'unmerged'], repo);
    fs.writeFileSync(path.join(repo, 'work.txt'), 'work\n');
    git(['add', '.'], repo);
    git(['commit', '-q', '-m', 'work'], repo);
    git(['checkout', '-q', 'main'], repo);
    git(['branch', 'merged-branch'], repo);

    const missing = tool(['delete-branch', 'no-such-branch'], repo);
    assert.equal(missing.status, 1);
    assert.equal(missing.payload.reason, 'branch-missing');

    const merged = tool(['delete-branch', 'merged-branch'], repo);
    assert.equal(merged.status, 0);
    assert.equal(merged.payload.merged, true);
    assert.equal(merged.payload.forced, false);

    const refused = tool(['delete-branch', 'unmerged'], repo);
    assert.equal(refused.status, 1);
    assert.equal(refused.payload.reason, 'unmerged');
    assert.equal(refused.payload.mergeCheckSkipped, false);
    assert.ok(git(['branch', '--list', 'unmerged'], repo).trim().length > 0, 'a refusal mutates nothing');

    // With the main worktree detached there is no branch to compare against.
    git(['checkout', '-q', '--detach'], repo);
    const skipped = tool(['delete-branch', 'unmerged'], repo);
    assert.equal(skipped.status, 1);
    assert.equal(skipped.payload.reason, 'merge-check-skipped');
    assert.equal(skipped.payload.mergeCheckSkipped, true);

    const forced = tool(['delete-branch', 'unmerged', '--force'], repo);
    assert.equal(forced.status, 0);
    assert.equal(forced.payload.forced, true);
    assert.equal(forced.payload.merged, null);
    assert.equal(forced.payload.mergeCheckSkipped, true);
  } finally {
    cleanup(parent);
  }
});

test('only create announces the indexing pass, and the pass reports exactly one result line', () => {
  const { parent, repo } = makeRepo();
  try {
    const created = tool(['create'], repo);
    assert.equal(created.status, 0);

    // The pass is a separate call, so the pre-announcement can precede it.
    const indexed = tool(['index', created.payload.path], repo);
    assert.equal(indexed.status, 0);
    assert.ok(['created', 'unavailable', 'failed'].includes(indexed.payload.indexing.status));
    assert.equal(indexed.payload.indexing.message.split(String.fromCharCode(10)).length, 1, 'exactly one result line');
    assert.ok(fs.existsSync(created.payload.path), 'the pass never rolls the worktree back');

    // Delete-side calls and inventory re-renders carry no announcement at all.
    for (const call of [['inventory'], ['remove', created.payload.path]]) {
      const payload = tool(call, repo).payload;
      assert.equal(payload.indexAnnouncement, undefined, `${call[0]} must not announce indexing`);
      assert.equal(payload.indexing, undefined, `${call[0]} must not run indexing`);
    }
    const branch = tool(['delete-branch', 'worktree-1'], repo).payload;
    assert.equal(branch.indexAnnouncement, undefined);
    assert.equal(branch.indexing, undefined);
  } finally {
    cleanup(parent);
  }
});

test('an unknown sub-command is a usage error, not a refusal', () => {
  const unknown = spawnSync(process.execPath, [TOOL, 'frobnicate', '--json'], { encoding: 'utf8' });
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr, /unknown sub-command/);
});

test('the worktree instructions drive the tool instead of re-deriving its checks', () => {
  const instructions = fs.readFileSync(
    path.join(REPO_ROOT, 'sai', 'commands', 'worktree', 'instructions.md'),
    'utf8',
  );
  assert.match(instructions, /node <tool-path> <sub-command> \[arguments\] --json --cwd <invoking-directory>/);
  // The tool path is copied from a listed literal, never composed from a root string.
  for (const candidate of [
    '`.claude/sai/tools/worktree.js`',
    '`~/.claude/sai/tools/worktree.js`',
    '`.opencode/sai/tools/worktree.js`',
    '`~/.config/opencode/sai/tools/worktree.js`',
  ]) {
    assert.ok(instructions.includes(candidate), `instructions must list ${candidate} verbatim`);
  }
  assert.ok(!instructions.includes('~/.opencode/'), 'the opencode user-global root is ~/.config/opencode/');
  assert.match(instructions, /opencode debug paths/);
  // The Create flow announces the indexing pass before running it, and only there.
  const createStep = instructions.slice(instructions.indexOf('### Step 3'), instructions.indexOf('### Step 4'));
  const deleteStep = instructions.slice(instructions.indexOf('### Step 4'));
  const announcement = createStep.indexOf('indexAnnouncement');
  const pass = createStep.indexOf('run `index <path>`');
  assert.ok(announcement >= 0, 'Step 3 must print the pre-announcement');
  assert.ok(pass > announcement, 'the pre-announcement must precede the indexing pass');
  assert.match(createStep, /single one-line result notice/);
  assert.ok(!deleteStep.includes('indexAnnouncement'), 'the Delete flow never announces indexing');
  assert.ok(!deleteStep.includes('index <path>'), 'the Delete flow never runs the indexing pass');
  assert.match(instructions, /verbatim/);
  for (const sub of ['inventory', 'create', 'remove', 'delete-branch']) {
    assert.ok(instructions.includes(`\`${sub}`), `instructions must name the ${sub} sub-command`);
  }
  assert.match(instructions, /exit 1[\s\S]{0,200}Nothing was mutated/);
  assert.match(instructions, /verbatim/);
  assert.match(instructions, /`Create`, `Delete`, `Exit`/);
  // The prose no longer restates the checks the tool owns.
  assert.ok(!/git worktree list --porcelain/.test(instructions));
  assert.ok(!/git check-ref-format/.test(instructions));
  assert.ok(!/merge-base --is-ancestor/.test(instructions));
});

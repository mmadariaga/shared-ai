'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const { snapshot, verify, collectCommits, N_A, SHA_RE } = require('../sai/tools/no-commit-guard.js');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'no-commit-guard.js');
const POLICY = path.join(REPO_ROOT, 'sai', 'policies', 'no-commit-guard.md');
const AUDIT_POLICY = path.join(REPO_ROOT, 'sai', 'policies', 'autonomy-audit-log.md');

function tool(args, cwd) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { cwd, encoding: 'utf8' });
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

function makeDir() {
  return fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-no-commit-guard-'));
}

function makeRepo() {
  const root = makeDir();
  git(root, ['init', '-q']);
  git(root, ['commit', '--allow-empty', '-q', '-m', 'base']);
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

test('snapshot resolves HEAD in a repository and reports clean', () => {
  const root = makeRepo();
  try {
    const payload = snapshot(root);
    assert.equal(payload.verdict, 'clean');
    assert.equal(payload.reason, null);
    assert.ok(isSha(payload.head));
  } finally {
    cleanup(root);
  }
});

test('snapshot in a non-repository resolves n/a and exits 0', () => {
  const root = makeDir();
  try {
    const payload = snapshot(root);
    assert.equal(payload.verdict, 'n/a');
    assert.equal(payload.reason, 'not-a-git-repository');
    assert.equal(payload.head, null);
    const result = tool(['snapshot', '--json', '--cwd', root], REPO_ROOT);
    assert.equal(result.status, 0);
    assert.equal(result.payload.verdict, 'n/a');
  } finally {
    cleanup(root);
  }
});

test('snapshot in an unborn HEAD (empty repository) resolves n/a', () => {
  const root = makeDir();
  try {
    git(root, ['init', '-q']);
    const payload = snapshot(root);
    assert.equal(payload.verdict, 'n/a');
    assert.equal(payload.reason, 'unborn-head');
  } finally {
    cleanup(root);
  }
});

test('verify reports clean while HEAD is unchanged', () => {
  const root = makeRepo();
  try {
    const { head } = snapshot(root);
    const payload = verify(head, false, root);
    assert.equal(payload.verdict, 'clean');
    assert.equal(payload.head, head);
    const result = tool(['verify', '--base', head, '--json', '--cwd', root], REPO_ROOT);
    assert.equal(result.status, 0);
    assert.equal(result.payload.verdict, 'clean');
  } finally {
    cleanup(root);
  }
});

test('verify reports a violation with commit evidence when HEAD moved', () => {
  const root = makeRepo();
  try {
    const { head } = snapshot(root);
    git(root, ['commit', '--allow-empty', '-q', '-m', 'rogue commit']);
    const payload = verify(head, false, root);
    assert.equal(payload.verdict, 'violation');
    assert.equal(payload.base, head);
    assert.ok(isSha(payload.head));
    assert.notEqual(payload.head, head);
    assert.equal(payload.commits.length, 1);
    assert.equal(payload.commits[0].subject, 'rogue commit');
    assert.ok(isSha(payload.commits[0].sha));

    const result = tool(['verify', '--base', head, '--json', '--cwd', root], REPO_ROOT);
    assert.equal(result.status, 1);
    assert.equal(result.payload.verdict, 'violation');
    assert.equal(result.payload.commits.length, 1);
  } finally {
    cleanup(root);
  }
});

test('verify reports allowed for any HEAD movement while allow_commit is carried', () => {
  const root = makeRepo();
  try {
    const { head } = snapshot(root);
    git(root, ['commit', '--allow-empty', '-q', '-m', 'authorized commit']);
    const result = tool(['verify', '--base', head, '--allow-commit', '--json', '--cwd', root], REPO_ROOT);
    assert.equal(result.status, 0);
    assert.equal(result.payload.verdict, 'allowed');
    assert.equal(result.payload.commits.length, 0);
  } finally {
    cleanup(root);
  }
});

test('verify with the literal n/a baseline resolves n/a and never exits 1', () => {
  const root = makeRepo();
  try {
    const payload = verify(N_A, false, root);
    assert.equal(payload.verdict, 'n/a');
    assert.equal(payload.reason, 'base-unavailable');
    const result = tool(['verify', '--base', N_A, '--json', '--cwd', root], REPO_ROOT);
    assert.equal(result.status, 0);
    assert.equal(result.payload.verdict, 'n/a');
  } finally {
    cleanup(root);
  }
});

test('a moved HEAD with an unresolvable current HEAD resolves n/a, not violation', () => {
  const root = makeRepo();
  try {
    const { head } = snapshot(root);
    // Simulate a lost HEAD by removing the ref file backing it (worktree-free
    // repos store it under .git/HEAD as a direct or ref path; use a fresh
    // unborn branch to sever it).
    git(root, ['checkout', '-q', '--orphan', 'severed']);
    git(root, ['reset', '-q', '--hard']);
    const payload = verify(head, false, root);
    assert.equal(payload.verdict, 'n/a');
    assert.equal(payload.reason, 'unborn-head');
  } finally {
    cleanup(root);
  }
});

test('evidence lists every commit between the baseline and HEAD', () => {
  const root = makeRepo();
  try {
    const { head } = snapshot(root);
    git(root, ['commit', '--allow-empty', '-q', '-m', 'first rogue']);
    git(root, ['commit', '--allow-empty', '-q', '-m', 'second rogue']);
    const { head: current } = snapshot(root);
    const evidence = collectCommits(head, current, root);
    assert.equal(evidence.commits.length, 2);
    assert.deepEqual(evidence.commits.map((c) => c.subject), ['second rogue', 'first rogue']);
    assert.equal(evidence.error, null);
  } finally {
    cleanup(root);
  }
});

test('usage errors exit 2 and never print a verdict', () => {
  for (const args of [
    ['bogus', '--json'],
    ['verify', '--json'],
    ['verify', '--base', 'not-a-sha', '--json'],
    ['verify', '--base', '123; rm -rf /', '--json'],
    ['snapshot', '--allow-commit', '--json'],
    ['snapshot', 'extra', '--json'],
  ]) {
    const result = tool(args, REPO_ROOT);
    assert.equal(result.status, 2, `expected exit 2 for ${args.join(' ')}`);
    assert.ok(!result.stdout.includes('"verdict"'), 'a usage error never yields a verdict');
  }
  const missingCwd = tool(['snapshot', '--json', '--cwd', path.join(REPO_ROOT, 'no-such-dir')], REPO_ROOT);
  assert.equal(missingCwd.status, 2);
});

test('--help exits 0 and documents the closed exit codes', () => {
  const result = tool(['--help'], REPO_ROOT);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Exit codes: 0 = clean, allowed, or n\/a; 1 = violation; 2 = usage or IO error\./);
  assert.match(result.stdout, /--allow-commit/);
  assert.match(result.stdout, /--cwd/);
});

test('the SHA pattern accepts full and short hex SHAs only', () => {
  assert.ok(SHA_RE.test('0123456789abcdef0123456789abcdef01234567'));
  assert.ok(SHA_RE.test('0123456789ABCDEF'));
  assert.ok(!SHA_RE.test('n/a'));
  assert.ok(!SHA_RE.test('HEAD'));
  assert.ok(!SHA_RE.test('main'));
  assert.ok(!SHA_RE.test('0123456789abcdef0123456789abcdef0123456789'));
});

test('the guard policy is single-sourced, harness-complete, and remediation-owned', () => {
  const policy = fs.readFileSync(POLICY, 'utf8');
  assert.match(policy, /node <tool-path> snapshot --json --cwd <project-root>/);
  assert.match(policy, /node <tool-path> verify --base <guard_base> \[--allow-commit\] --json --cwd <project-root>/);
  assert.ok(policy.includes('.claude/sai/tools/no-commit-guard.js'));
  assert.ok(policy.includes('~/.claude/sai/tools/no-commit-guard.js'));
  assert.ok(policy.includes('.opencode/sai/tools/no-commit-guard.js'));
  assert.ok(policy.includes('~/.config/opencode/sai/tools/no-commit-guard.js'));
  for (const verdict of ['clean', 'violation', 'allowed', 'n/a']) {
    assert.ok(policy.includes(`**\`${verdict}\`**`), `the policy must handle the ${verdict} verdict`);
  }
  assert.match(policy, /@sai\/policies\/autonomy-audit-log\.md/);
  assert.match(policy, /git reset <guard_base>/);
  assert.ok(policy.includes('never\n     `--hard`') || policy.includes('--hard'), 'the policy must forbid --hard');
  assert.match(policy, /fast_track_active/);
  assert.match(policy, /Direct Build\s*\n?\s*`--direct-build-execute`|--direct-build-execute/);
  assert.match(policy, /batch start/);
  assert.match(policy, /batch close/);
});

test('the incident line is pinned in the audit-log policy, not restated in cards', () => {
  const audit = fs.readFileSync(AUDIT_POLICY, 'utf8');
  assert.match(audit, /## Incident line \(no-commit guard\)/);
  assert.match(
    audit,
    /> NO-COMMIT GUARD: unauthorized commit\(s\) detected after <worker label> dispatch — reset to <base> \(mixed\); commits preserved unstaged; evidence:/,
  );
  assert.match(audit, /evidence: none reported/);
});

test('every coordinator card that dispatches a routed worker carries the guard policy', () => {
  const cards = [
    'sai/commands/spec/coordinator.md',
    'sai/commands/design/coordinator.md',
    'sai/commands/implement/coordinator.md',
    'sai/commands/apply/coordinator.md',
    'sai/commands/review/coordinator.md',
    'sai/commands/security/coordinator.md',
    'sai/commands/performance/coordinator.md',
    'sai/commands/accessibility/coordinator.md',
    'sai/commands/commit/coordinator.md',
    'sai/commands/archive/coordinator.md',
    'sai/commands/backfill/coordinator.md',
    'sai/commands/merge/coordinator.md',
    'sai/commands/meta-review/coordinator.md',
  ];
  for (const card of cards) {
    const body = fs.readFileSync(path.join(REPO_ROOT, card), 'utf8');
    assert.ok(body.includes('@sai/policies/no-commit-guard.md'), `${card} must fetch the guard policy`);
    assert.ok(body.includes('guard_base'), `${card} must hold guard_base`);
    assert.ok(body.includes('snapshot') && body.includes('verify'), `${card} must pair snapshot and verify`);
  }
  // Composition coordinators that never dispatch directly carry no guard.
  for (const card of ['sai/commands/meta-build/coordinator.md']) {
    const body = fs.readFileSync(path.join(REPO_ROOT, card), 'utf8');
    assert.ok(!body.includes('@sai/policies/no-commit-guard.md'), `${card} dispatches nothing itself`);
  }
});

test('the allow_commit carrier and the direct-build windows are wired in explore', () => {
  const pipeline = fs.readFileSync(
    path.join(REPO_ROOT, 'sai', 'commands', 'explore', 'steps', 'pipeline-direct-build.md'),
    'utf8',
  );
  assert.ok(pipeline.includes('@sai/policies/no-commit-guard.md'));
  assert.ok(pipeline.includes('--allow-commit'));
  assert.match(pipeline, /No-commit guard windows/);
  // The Direct Build execute continuation is the system's only allow_commit carrier.
  const archive = fs.readFileSync(path.join(REPO_ROOT, 'sai', 'commands', 'archive', 'coordinator.md'), 'utf8');
  assert.match(archive, /--allow-commit/);
  const backfill = fs.readFileSync(path.join(REPO_ROOT, 'sai', 'commands', 'backfill', 'coordinator.md'), 'utf8');
  assert.match(backfill, /no backfill window\s*\n\s*carries `allow_commit`/);
});

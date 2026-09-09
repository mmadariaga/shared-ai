'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'pr.js');
const LINT_TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'lint.js');

function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed with status ${result.status}: ${result.stderr}`);
  }
  return result.stdout;
}

function tool(subcommand, args, cwd, stdin = null) {
  const fullArgs = [TOOL, subcommand, ...args, '--json', '--cwd', cwd];
  const options = { cwd, encoding: 'utf8' };
  if (stdin !== null) options.input = stdin;

  const result = spawnSync(process.execPath, fullArgs, options);
  let payload = null;
  if (result.stdout.trim()) {
    try {
      payload = JSON.parse(result.stdout);
    } catch (err) {
      return { status: result.status, payload: null, stderr: result.stderr, stdout: result.stdout };
    }
  }
  return { status: result.status, payload, stderr: result.stderr, stdout: result.stdout };
}

function lintTool(check, text) {
  const fullArgs = [LINT_TOOL, check, text, '--json'];
  const result = spawnSync(process.execPath, fullArgs, { encoding: 'utf8' });
  let payload = null;
  if (result.stdout.trim()) {
    try {
      payload = JSON.parse(result.stdout);
    } catch (err) {
      return { status: result.status, payload: null, stderr: result.stderr, stdout: result.stdout };
    }
  }
  return { status: result.status, payload, stderr: result.stderr, stdout: result.stdout };
}

function makeRepo() {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-pr-'));
  const repo = path.join(parent, 'demo');
  fs.mkdirSync(repo);
  git(['init', '-b', 'main'], repo);
  git(['config', 'user.email', 'test@example.com'], repo);
  git(['config', 'user.name', 'Test'], repo);
  return { parent, repo };
}

function makeRepoWithCommits() {
  const { parent, repo } = makeRepo();

  // Create initial commit on main
  fs.writeFileSync(path.join(repo, 'README.md'), 'initial\n');
  git(['add', '.'], repo);
  git(['commit', '-m', 'chore: initial'], repo);

  // Create a feature branch
  git(['checkout', '-b', 'feature-branch'], repo);

  // Add some commits to the feature branch
  fs.writeFileSync(path.join(repo, 'file1.js'), 'console.log("feature 1")\n');
  git(['add', '.'], repo);
  git(['commit', '-m', 'feat: add feature 1'], repo);

  fs.writeFileSync(path.join(repo, 'file2.js'), 'console.log("feature 2")\n');
  git(['add', '.'], repo);
  git(['commit', '-m', 'feat: add feature 2'], repo);

  return { parent, repo };
}

function makeRepoWithChangeArtifacts() {
  const { parent, repo } = makeRepoWithCommits();

  // Create change artifacts directory
  const changeDir = path.join(repo, 'openspec', 'changes', 'test-feature');
  fs.mkdirSync(changeDir, { recursive: true });

  // Create proposal.md
  fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Test Feature\n\nProposal content\n');

  // Create specs directory with some specs
  const specsDir = path.join(changeDir, 'specs');
  fs.mkdirSync(specsDir, { recursive: true });
  fs.writeFileSync(path.join(specsDir, 'capability-1.md'), '# Capability 1\n');
  fs.mkdirSync(path.join(specsDir, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(specsDir, 'sub', 'capability-2.md'), '# Capability 2\n');

  // Create an audit file
  fs.writeFileSync(path.join(changeDir, 'review.md'), '# Review\n\nReview content\n');

  return { parent, repo, changeDir };
}

function cleanup(parent) {
  fs.rmSync(parent, { recursive: true, force: true });
}

test('collect reports correct parent..HEAD commit range', () => {
  const { parent, repo } = makeRepoWithCommits();
  try {
    const result = tool('collect', [], repo);
    assert.equal(result.status, 0);
    assert.equal(result.payload.current_branch, 'feature-branch');
    assert.equal(result.payload.parent_branch, 'main');
    // Should have 2 commits in feature-branch..main range (actually HEAD..main, so negative)
    // Or main..feature-branch = 2 commits
    assert.equal(result.payload.commit_count, 2);
    assert.equal(result.payload.commits.length, 2);
  } finally {
    cleanup(parent);
  }
});

test('collect reports artifact presence and absence', () => {
  const { parent, repo, changeDir } = makeRepoWithChangeArtifacts();
  try {
    const result = tool('collect', ['--change', 'test-feature'], repo);
    assert.equal(result.status, 0);
    assert.equal(result.payload.artifacts.proposal, true);
    assert.equal(result.payload.artifacts.design, false);
    assert.equal(result.payload.artifacts.implementation, false);
    assert.equal(result.payload.artifacts.review, true);
    assert.equal(result.payload.artifacts.security, false);
  } finally {
    cleanup(parent);
  }
});

test('collect stops when proposal.md is absent', () => {
  const { parent, repo } = makeRepoWithCommits();
  try {
    // Create change directory without proposal.md
    const changeDir = path.join(repo, 'openspec', 'changes', 'missing-proposal');
    fs.mkdirSync(changeDir, { recursive: true });

    const result = tool('collect', ['--change', 'missing-proposal'], repo);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('proposal.md not found'));
  } finally {
    cleanup(parent);
  }
});

test('collect continues when only design or audit files are absent', () => {
  const { parent, repo, changeDir } = makeRepoWithChangeArtifacts();
  try {
    const result = tool('collect', ['--change', 'test-feature'], repo);
    assert.equal(result.status, 0);
    // Design and security files are absent, but collect should still succeed
    assert.equal(result.payload.artifacts.design, false);
    assert.equal(result.payload.artifacts.security, false);
  } finally {
    cleanup(parent);
  }
});

test('collect reports gh availability', () => {
  const { parent, repo } = makeRepoWithCommits();
  try {
    const result = tool('collect', [], repo);
    assert.equal(result.status, 0);
    assert.ok(typeof result.payload.gh_available === 'boolean');
    // gh is likely not available in test environment
  } finally {
    cleanup(parent);
  }
});

test('collect reports capability specs', () => {
  const { parent, repo, changeDir } = makeRepoWithChangeArtifacts();
  try {
    const result = tool('collect', ['--change', 'test-feature'], repo);
    assert.equal(result.status, 0);
    assert.ok(Array.isArray(result.payload.artifacts.specs));
    assert.ok(result.payload.artifacts.specs.some(s => s.includes('capability-1.md')));
    assert.ok(result.payload.artifacts.specs.some(s => s.includes('sub')));
  } finally {
    cleanup(parent);
  }
});

test('collect reports empty specs list when specs directory absent', () => {
  const { parent, repo } = makeRepoWithCommits();
  try {
    // Create minimal change directory
    const changeDir = path.join(repo, 'openspec', 'changes', 'no-specs');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '# Test\n');

    const result = tool('collect', ['--change', 'no-specs'], repo);
    assert.equal(result.status, 0);
    assert.deepEqual(result.payload.artifacts.specs, []);
  } finally {
    cleanup(parent);
  }
});

// PR Title Validation Tests
test('pr-title-rules rejects title > 70 characters', () => {
  const result = lintTool('pr-title-rules', 'feat: this is a title that is way too long and exceeds the seventy character limit');
  assert.equal(result.status, 1);
  assert.ok(result.payload.violations.some(v => v.problem === 'TITLE_TOO_LONG'));
});

test('pr-title-rules rejects title without Conventional Commits prefix', () => {
  const result = lintTool('pr-title-rules', 'this is not a valid title format');
  assert.equal(result.status, 1);
  assert.ok(result.payload.violations.some(v => v.problem === 'INVALID_FORMAT'));
});

test('pr-title-rules rejects title with trailing period', () => {
  const result = lintTool('pr-title-rules', 'feat: add new feature.');
  assert.equal(result.status, 1);
  assert.ok(result.payload.violations.some(v => v.problem === 'TRAILING_PERIOD'));
});

test('pr-title-rules rejects title with emoji', () => {
  const result = lintTool('pr-title-rules', 'feat: add feature 🎉');
  assert.equal(result.status, 1);
  assert.ok(result.payload.violations.some(v => v.problem === 'CONTAINS_EMOJI'));
});

test('pr-title-rules accepts valid title', () => {
  const result = lintTool('pr-title-rules', 'feat: extract deterministic PR mechanics');
  assert.equal(result.status, 0);
  assert.equal(result.payload.violations.length, 0);
});

test('pr-title-rules accepts title with scope', () => {
  const result = lintTool('pr-title-rules', 'feat(pr): extract deterministic PR mechanics');
  assert.equal(result.status, 0);
  assert.equal(result.payload.violations.length, 0);
});

test('pr-title-rules accepts various Conventional Commits types', () => {
  const types = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore', 'perf', 'build', 'ci', 'style', 'revert'];
  for (const type of types) {
    const result = lintTool('pr-title-rules', `${type}: do something`);
    assert.equal(result.status, 0, `Failed for type: ${type}`);
  }
});

test('collect reports changed files as structured entries with status and path', () => {
  const { parent, repo } = makeRepoWithCommits();
  try {
    const result = tool('collect', [], repo);
    assert.equal(result.status, 0);
    assert.ok(Array.isArray(result.payload.changed_files));

    // Each entry should be an object with status and path
    for (const file of result.payload.changed_files) {
      assert.ok(typeof file === 'object', 'Each entry should be an object');
      assert.ok(file.status, 'Each entry should have a status field');
      assert.ok(file.path, 'Each entry should have a path field');
      assert.ok(typeof file.status === 'string', 'Status should be a string');
      assert.ok(typeof file.path === 'string', 'Path should be a string');
    }
  } finally {
    cleanup(parent);
  }
});

test('collect normalizes changed file paths to forward slashes', () => {
  const { parent, repo } = makeRepoWithCommits();
  try {
    const result = tool('collect', [], repo);
    assert.equal(result.status, 0);

    // All paths should use forward slashes, not backslashes
    for (const file of result.payload.changed_files) {
      assert.ok(!file.path.includes('\\'), `Path should not contain backslashes: ${file.path}`);
      // Path should contain forward slashes where directories are nested
      if (file.path.includes('/')) {
        assert.ok(file.path.split('/').length > 1, `Path appears to be a file path: ${file.path}`);
      }
    }
  } finally {
    cleanup(parent);
  }
});

test('collect reports capability specs with forward slashes', () => {
  const { parent, repo, changeDir } = makeRepoWithChangeArtifacts();
  try {
    const result = tool('collect', ['--change', 'test-feature'], repo);
    assert.equal(result.status, 0);

    // All spec paths should use forward slashes
    for (const spec of result.payload.artifacts.specs) {
      assert.ok(!spec.includes('\\'), `Spec path should not contain backslashes: ${spec}`);
      assert.ok(spec.includes('/'), `Spec path should contain forward slashes: ${spec}`);
    }
  } finally {
    cleanup(parent);
  }
});

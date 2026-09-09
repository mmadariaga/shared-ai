'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..');
const TOOL = path.join(REPO_ROOT, 'sai', 'tools', 'commit.js');

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

function makeRepo() {
  const parent = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'sai-commit-'));
  const repo = path.join(parent, 'demo');
  fs.mkdirSync(repo);
  git(['init', '-b', 'main'], repo);
  git(['config', 'user.email', 'test@example.com'], repo);
  git(['config', 'user.name', 'Test'], repo);
  return { parent, repo };
}

function makeRepoWithCommit() {
  const { parent, repo } = makeRepo();
  fs.writeFileSync(path.join(repo, 'README.md'), 'initial\n');
  git(['add', '.'], repo);
  git(['commit', '-m', 'chore: initial'], repo);
  return { parent, repo };
}

function cleanup(parent) {
  fs.rmSync(parent, { recursive: true, force: true });
}

function getHeadCommit(cwd) {
  return git(['rev-parse', 'HEAD'], cwd).trim();
}

test('E1 - collect exits 1 when nothing is staged', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    const result = tool('collect', [], repo);
    assert.equal(result.status, 1);
    assert.equal(result.payload.has_staged, false);
  } finally {
    cleanup(parent);
  }
});

test('H1 - collect handles empty repository (no commits) gracefully', () => {
  const { parent, repo } = makeRepo();
  try {
    // Stage a file
    fs.writeFileSync(path.join(repo, 'test.txt'), 'content\n');
    git(['add', 'test.txt'], repo);

    const result = tool('collect', [], repo);
    assert.equal(result.status, 0);
    assert.equal(result.payload.has_staged, true);
    assert.equal(result.payload.detected_style.match_rate, 0);
    assert.deepEqual(result.payload.detected_style.detected_types, []);
  } finally {
    cleanup(parent);
  }
});

test('E2 - validation failure leaves repository uncommitted', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage a file
    fs.writeFileSync(path.join(repo, 'test.txt'), 'updated\n');
    git(['add', 'test.txt'], repo);

    const beforeHeadCommit = getHeadCommit(repo);

    // Apply with invalid message
    const result = tool('apply', [], repo, 'invalid message\n');
    assert.equal(result.status, 1);
    assert.equal(result.payload.ok, false);
    assert.ok(result.payload.violations.length > 0);

    // Verify no commit was created
    const afterHeadCommit = getHeadCommit(repo);
    assert.equal(beforeHeadCommit, afterHeadCommit);
  } finally {
    cleanup(parent);
  }
});

test('E3 - detected sensitive file blocks commit without acknowledgement', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage a sensitive file
    fs.writeFileSync(path.join(repo, '.env'), 'SECRET_KEY=abc\n');
    git(['add', '.env'], repo);

    const beforeHeadCommit = getHeadCommit(repo);

    // Apply with valid message but no acknowledgement
    const result = tool('apply', [], repo, 'chore: add env config\n');
    assert.equal(result.status, 1);
    assert.equal(result.payload.ok, false);
    assert.ok(result.payload.detected_sensitive_files.includes('.env'));

    // Verify no commit was created
    const afterHeadCommit = getHeadCommit(repo);
    assert.equal(beforeHeadCommit, afterHeadCommit);
  } finally {
    cleanup(parent);
  }
});

test('E4 - acknowledgement list must match exactly (unacknowledged file blocks)', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage two sensitive files
    fs.writeFileSync(path.join(repo, '.env'), 'SECRET_KEY=abc\n');
    fs.writeFileSync(path.join(repo, 'credentials.txt'), 'password=xyz\n');
    git(['add', '.env', 'credentials.txt'], repo);

    const beforeHeadCommit = getHeadCommit(repo);

    // Try to acknowledge only one
    const result = tool('apply', ['--acknowledge-secrets', '.env'], repo, 'chore: add secrets\n');
    assert.equal(result.status, 1);
    assert.ok(result.payload.unacknowledged.includes('credentials.txt'));

    // Verify no commit was created
    const afterHeadCommit = getHeadCommit(repo);
    assert.equal(beforeHeadCommit, afterHeadCommit);
  } finally {
    cleanup(parent);
  }
});

test('E4 - acknowledgement list must match exactly (extra acknowledged file blocks)', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage one sensitive file
    fs.writeFileSync(path.join(repo, '.env'), 'SECRET_KEY=abc\n');
    git(['add', '.env'], repo);

    const beforeHeadCommit = getHeadCommit(repo);

    // Try to acknowledge a file that is not staged
    const result = tool('apply', ['--acknowledge-secrets', '.env,nonexistent.txt'], repo, 'chore: add env\n');
    assert.equal(result.status, 1);
    assert.ok(result.payload.extra_acknowledged.includes('nonexistent.txt'));

    // Verify no commit was created
    const afterHeadCommit = getHeadCommit(repo);
    assert.equal(beforeHeadCommit, afterHeadCommit);
  } finally {
    cleanup(parent);
  }
});

test('I7 - exact acknowledgement commits successfully', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage a sensitive file
    fs.writeFileSync(path.join(repo, '.env'), 'SECRET_KEY=abc\n');
    git(['add', '.env'], repo);

    const beforeHeadCommit = getHeadCommit(repo);

    // Apply with exact acknowledgement
    const result = tool('apply', ['--acknowledge-secrets', '.env'], repo, 'chore: add env config\n');
    assert.equal(result.status, 0);
    assert.equal(result.payload.success, true);

    // Verify commit was created
    const afterHeadCommit = getHeadCommit(repo);
    assert.notEqual(beforeHeadCommit, afterHeadCommit);

    // Verify commit message
    const subject = git(['log', '-1', '--pretty=format:%s'], repo);
    assert.equal(subject, 'chore: add env config');
  } finally {
    cleanup(parent);
  }
});

test('collect provides inferred scope from file path prefix', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage a file in a subdirectory
    fs.mkdirSync(path.join(repo, 'api'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'api', 'test.js'), 'code\n');
    git(['add', 'api/test.js'], repo);

    const result = tool('collect', [], repo);
    assert.equal(result.status, 0);
    assert.equal(result.payload.inferred_scope, 'api');
  } finally {
    cleanup(parent);
  }
});

test('collect reports file statistics correctly', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage a file with changes
    fs.writeFileSync(path.join(repo, 'file.txt'), 'line1\nline2\nline3\n');
    git(['add', 'file.txt'], repo);

    const result = tool('collect', [], repo);
    assert.equal(result.status, 0);
    assert.equal(result.payload.file_count, 1);
    assert.ok(result.payload.total_insertions >= 3);
  } finally {
    cleanup(parent);
  }
});

test('apply returns validation violations on format error', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage a file
    fs.writeFileSync(path.join(repo, 'test.txt'), 'updated\n');
    git(['add', 'test.txt'], repo);

    // Apply with message that has no conventional commits prefix
    const result = tool('apply', [], repo, 'this is not a conventional commit\n');
    assert.equal(result.status, 1);
    assert.equal(result.payload.ok, false);
    assert.ok(Array.isArray(result.payload.violations));
    assert.ok(result.payload.violations.length > 0);
    assert.equal(result.payload.violations[0].problem, 'INVALID_FORMAT');
  } finally {
    cleanup(parent);
  }
});

test('detect repository style returns adoption branch data', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Add several conventional commits
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(repo, `file${i}.txt`), `content${i}\n`);
      git(['add', `.`], repo);
      git(['commit', '-m', `feat: add file ${i}`], repo);
    }

    // Stage one more file
    fs.writeFileSync(path.join(repo, 'latest.txt'), 'latest\n');
    git(['add', 'latest.txt'], repo);

    const result = tool('collect', [], repo);
    assert.equal(result.status, 0);
    assert.equal(result.payload.detected_style.match_rate, 100);
    assert.ok(result.payload.detected_style.detected_types.includes('feat'));
  } finally {
    cleanup(parent);
  }
});

test('message body with special characters round-trips byte-for-byte', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage a file
    fs.writeFileSync(path.join(repo, 'test.txt'), 'updated\n');
    git(['add', 'test.txt'], repo);

    // Message with special characters: newlines, dollar signs, backticks, quotes
    const message = `feat: add feature

First body line with $VAR and "quotes".
Second body line with 'single quotes'.
Third line with \`backticks\`.
Blank line below:

Last line after blank.`;

    // Apply with message containing special characters
    const result = tool('apply', [], repo, message);
    assert.equal(result.status, 0);
    assert.equal(result.payload.success, true);

    // Retrieve the committed message
    const committed = git(['log', '-1', '--format=%B'], repo).trimEnd();

    // Verify the message round-trips exactly
    assert.equal(committed, message);
  } finally {
    cleanup(parent);
  }
});

test('collect --amend with empty staging area does not exit 1', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // No staged changes
    const result = tool('collect', ['--amend'], repo);
    assert.equal(result.status, 0);
    assert.ok(result.payload.amend_target);
    assert.ok(result.payload.amend_target.sha);
    assert.ok(result.payload.amend_target.subject);
  } finally {
    cleanup(parent);
  }
});

test('collect --amend reports target commit and pushed status', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    const result = tool('collect', ['--amend'], repo);
    assert.equal(result.status, 0);
    assert.ok(result.payload.amend_target);
    assert.equal(typeof result.payload.amend_target.sha, 'string');
    assert.equal(typeof result.payload.amend_target.subject, 'string');
    assert.equal(typeof result.payload.amend_target.already_pushed, 'boolean');
    // Repository has no remotes, so should be false
    assert.equal(result.payload.amend_target.already_pushed, false);
  } finally {
    cleanup(parent);
  }
});

test('apply --amend replaces previous commit message without creating additional commit', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Stage a file
    fs.writeFileSync(path.join(repo, 'test.txt'), 'updated\n');
    git(['add', 'test.txt'], repo);

    // Get commit count before amend
    const commitsBefore = git(['rev-list', '--count', 'HEAD'], repo).trim();

    // Apply with --amend
    const result = tool('apply', ['--amend'], repo, 'chore: amended message');
    assert.equal(result.status, 0);
    assert.equal(result.payload.success, true);

    // Verify commit count is unchanged
    const commitsAfter = git(['rev-list', '--count', 'HEAD'], repo).trim();
    assert.equal(commitsAfter, commitsBefore);

    // Verify message changed
    const subject = git(['log', '-1', '--pretty=format:%s'], repo);
    assert.equal(subject, 'chore: amended message');
  } finally {
    cleanup(parent);
  }
});

test('amend with message body preserves body byte-for-byte', () => {
  const { parent, repo } = makeRepoWithCommit();
  try {
    // Message with special characters for amend
    const message = `feat: amend with body

Body line with $VAR and "quotes".
Second line with 'single quotes'.
Blank line below:

Last line after blank.`;

    // Apply with --amend
    const result = tool('apply', ['--amend'], repo, message);
    assert.equal(result.status, 0);
    assert.equal(result.payload.success, true);

    // Retrieve the amended message
    const committed = git(['log', '-1', '--format=%B'], repo).trimEnd();

    // Verify body round-trips exactly
    assert.equal(committed, message);
  } finally {
    cleanup(parent);
  }
});

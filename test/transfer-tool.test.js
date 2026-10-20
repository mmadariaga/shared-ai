'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOL = path.join(__dirname, '..', 'sai', 'tools', 'transfer.js');
const transfer = require(TOOL);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const POSIX = process.platform !== 'win32';

function sandbox() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-transfer-test-'));
  const tmp = path.join(base, 'tmp');
  const project = path.join(base, 'project');
  fs.mkdirSync(tmp);
  fs.mkdirSync(project);
  return { base, tmp, project, cleanup: () => fs.rmSync(base, { recursive: true, force: true }) };
}

function cli(args, { input, env, cwd } = {}) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { input, encoding: 'utf8', cwd, env: { ...process.env, ...env } });
  return { status: result.status, json: result.stdout ? JSON.parse(result.stdout) : null, stderr: result.stderr };
}

// Linux ignores the temp environment: the Claude Code root is /tmp/claude-{uid},
// which the harness owns. Stand in for it the way the CI workflow does for
// /tmp/opencode, and leave it in place.
function saiRoot(box) {
  if (process.platform !== 'linux') return path.join(fs.realpathSync(box.tmp), 'claude', 'sai');
  const harness = `/tmp/claude-${process.getuid()}`;
  if (!fs.existsSync(harness)) fs.mkdirSync(harness, { mode: 0o700 });
  return path.join(harness, 'sai');
}

function open(box) {
  const result = cli(['open', '--harness', 'claude'], { env: { TMPDIR: box.tmp, TEMP: box.tmp, TMP: box.tmp } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(path.dirname(result.json.dir), saiRoot(box));
  return result.json.dir;
}

test('open creates one unique private directory under the harness temp root', () => {
  const box = sandbox();
  try {
    const first = open(box);
    const second = open(box);
    assert.notEqual(first, second);
    assert.equal(path.dirname(fs.realpathSync(first)), saiRoot(box));
    assert.match(path.basename(first), /^sai-transfer-[A-Za-z0-9]{6}$/);
    if (POSIX) assert.equal(fs.statSync(first).mode & 0o777, 0o700);
  } finally {
    box.cleanup();
  }
});

test('open reports a concrete blocker when the temp base is missing and creates nothing', { skip: process.platform === 'linux' }, () => {
  const box = sandbox();
  try {
    const missing = path.join(box.base, 'absent');
    const result = cli(['open', '--harness', 'claude'], { env: { TMPDIR: missing, TEMP: missing, TMP: missing } });
    assert.equal(result.status, 2);
    assert.equal(result.json.ok, false);
    assert.match(result.json.error, /missing/);
    assert.equal(fs.existsSync(missing), false);
  } finally {
    box.cleanup();
  }
});

test('open on opencode/Linux uses the injected filesystem and reports the /tmp/opencode blocker', { skip: !POSIX }, () => {
  const io = { lstatSync() { const error = new Error('x'); error.code = 'ENOENT'; throw error; } };
  assert.throws(() => transfer.open('opencode', { io, platform: 'linux' }), /\/tmp\/opencode is missing/);
});

test('put writes stdin bytes, returns the absolute path and sha256, and replaces on rewrite', () => {
  const box = sandbox();
  try {
    const dir = open(box);
    const content = 'line one\r\nline two ünïcode\n';
    const put = cli(['put', '--dir', dir, '--path', 'specs/cap/spec.md'], { input: content });
    assert.equal(put.status, 0, put.stderr);
    assert.equal(put.json.path, path.join(dir, 'specs', 'cap', 'spec.md'));
    assert.equal(put.json.sha256, sha(content));
    assert.equal(fs.readFileSync(put.json.path, 'utf8'), content);
    const again = cli(['put', '--dir', dir, '--path', 'specs/cap/spec.md'], { input: 'corrected\n' });
    assert.equal(again.json.sha256, sha('corrected\n'));
    assert.equal(fs.readFileSync(again.json.path, 'utf8'), 'corrected\n');
  } finally {
    box.cleanup();
  }
});

test('put rejects absolute, escaping, empty-segment, backslash and reserved paths', () => {
  const box = sandbox();
  try {
    const dir = open(box);
    for (const bad of ['/etc/passwd', '../escape.md', 'a/../../escape.md', 'a//b.md', './a.md', 'a\\b.md', '.sai-transfer']) {
      const result = cli(['put', '--dir', dir, '--path', bad], { input: 'x' });
      assert.equal(result.status, 2, `expected usage failure for ${bad}`);
    }
    assert.equal(fs.existsSync(path.join(box.tmp, 'escape.md')), false);
  } finally {
    box.cleanup();
  }
});

test('put and verify refuse a directory that is not a transfer directory', () => {
  const box = sandbox();
  try {
    const plain = path.join(box.tmp, 'sai-transfer-abc123');
    fs.mkdirSync(plain);
    assert.equal(cli(['put', '--dir', plain, '--path', 'a.md'], { input: 'x' }).status, 1);
    assert.equal(cli(['put', '--dir', box.tmp, '--path', 'a.md'], { input: 'x' }).status, 1);
    assert.equal(cli(['close', '--dir', plain]).status, 1);
    assert.equal(fs.existsSync(plain), true);
  } finally {
    box.cleanup();
  }
});

test('verify accepts a matching reference and rejects a sha256 mismatch', () => {
  const box = sandbox();
  try {
    const dir = open(box);
    const put = cli(['put', '--dir', dir, '--path', 'proposal.md'], { input: 'body\n' }).json;
    const ok = cli(['verify', '--dir', dir, '--path', put.path, '--sha256', put.sha256]);
    assert.equal(ok.status, 0);
    assert.equal(ok.json.sha256, put.sha256);
    fs.writeFileSync(put.path, 'changed\n');
    const bad = cli(['verify', '--dir', dir, '--path', put.path, '--sha256', put.sha256]);
    assert.equal(bad.status, 1);
    assert.match(bad.json.error, /sha256 differs/);
  } finally {
    box.cleanup();
  }
});

test('verify rejects a missing file, a malformed hash, a repository path and the marker file', () => {
  const box = sandbox();
  try {
    const dir = open(box);
    assert.equal(cli(['verify', '--dir', dir, '--path', path.join(dir, 'nope.md'), '--sha256', sha('x')]).json.error, 'Referenced transfer file is missing');
    const put = cli(['put', '--dir', dir, '--path', 'a.md'], { input: 'a' }).json;
    assert.match(cli(['verify', '--dir', dir, '--path', put.path, '--sha256', 'ABC']).json.error, /64 lowercase hex/);
    const inRepo = path.join(box.project, 'proposal.md');
    fs.writeFileSync(inRepo, 'a');
    const outside = cli(['verify', '--dir', dir, '--path', inRepo, '--sha256', sha('a')]);
    assert.equal(outside.status, 1);
    assert.match(outside.json.error, /outside the transfer directory/);
    const marker = cli(['verify', '--dir', dir, '--path', path.join(dir, '.sai-transfer'), '--sha256', sha('')]);
    assert.equal(marker.status, 1);
  } finally {
    box.cleanup();
  }
});

test('verify rejects dot-dot traversal that resolves outside the directory', () => {
  const box = sandbox();
  try {
    const dir = open(box);
    const outside = path.join(box.tmp, 'outside.md');
    fs.writeFileSync(outside, 'a');
    const result = cli(['verify', '--dir', dir, '--path', `${dir}/../outside.md`, '--sha256', sha('a')]);
    assert.equal(result.status, 1);
    assert.match(result.json.error, /outside the transfer directory/);
  } finally {
    box.cleanup();
  }
});

test('verify rejects a symbolic-link file and a path through a symbolic-link directory', { skip: !POSIX }, () => {
  const box = sandbox();
  try {
    const dir = open(box);
    const secret = path.join(box.project, 'secret.md');
    fs.writeFileSync(secret, 'secret');
    fs.symlinkSync(secret, path.join(dir, 'link.md'));
    const viaFile = cli(['verify', '--dir', dir, '--path', path.join(dir, 'link.md'), '--sha256', sha('secret')]);
    assert.equal(viaFile.status, 1);
    assert.match(viaFile.json.error, /symbolic link/);
    fs.symlinkSync(box.project, path.join(dir, 'linkdir'));
    const viaDir = cli(['verify', '--dir', dir, '--path', path.join(dir, 'linkdir', 'secret.md'), '--sha256', sha('secret')]);
    assert.equal(viaDir.status, 1);
    assert.match(viaDir.json.error, /symbolic link/);
    const put = cli(['put', '--dir', dir, '--path', 'linkdir/new.md'], { input: 'x' });
    assert.equal(put.status, 1);
    assert.equal(fs.existsSync(path.join(box.project, 'new.md')), false);
  } finally {
    box.cleanup();
  }
});

test('materialize copies the verified bytes identically and creates parent directories', () => {
  const box = sandbox();
  try {
    const dir = open(box);
    const bytes = Buffer.from([0x23, 0x20, 0x54, 0x0d, 0x0a, 0xc3, 0xa9, 0x00, 0xff, 0x0a]);
    const put = cli(['put', '--dir', dir, '--path', 'specs/cap/spec.md'], { input: bytes }).json;
    const destination = 'openspec/changes/x/specs/cap/spec.md';
    const result = cli(['materialize', '--dir', dir, '--path', put.path, '--sha256', put.sha256, '--destination', destination, '--cwd', box.project]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readFileSync(path.join(box.project, destination)), bytes);
    assert.equal(result.json.sha256, sha(bytes));
  } finally {
    box.cleanup();
  }
});

test('materialize writes nothing when the transfer file changed after validation', () => {
  const box = sandbox();
  try {
    const dir = open(box);
    const put = cli(['put', '--dir', dir, '--path', 'proposal.md'], { input: 'validated\n' }).json;
    fs.writeFileSync(put.path, 'tampered\n');
    const result = cli(['materialize', '--dir', dir, '--path', put.path, '--sha256', put.sha256, '--destination', 'out/proposal.md', '--cwd', box.project]);
    assert.equal(result.status, 1);
    assert.equal(fs.existsSync(path.join(box.project, 'out')), false);
  } finally {
    box.cleanup();
  }
});

test('materialize rejects a destination outside the project root or through an escaping symbolic link', () => {
  const box = sandbox();
  try {
    const dir = open(box);
    const put = cli(['put', '--dir', dir, '--path', 'a.md'], { input: 'a' }).json;
    const args = destination => ['materialize', '--dir', dir, '--path', put.path, '--sha256', put.sha256, '--destination', destination, '--cwd', box.project];
    assert.equal(cli(args('../escape.md')).status, 1);
    assert.equal(cli(args(path.join(box.base, 'abs.md'))).status, 1);
    assert.equal(fs.existsSync(path.join(box.base, 'escape.md')), false);
    assert.equal(fs.existsSync(path.join(box.base, 'abs.md')), false);
    if (POSIX) {
      fs.symlinkSync(box.tmp, path.join(box.project, 'out'));
      assert.equal(cli(args('out/a.md')).status, 1);
      assert.equal(fs.existsSync(path.join(box.tmp, 'a.md')), false);
    }
  } finally {
    box.cleanup();
  }
});

test('close removes only its own transfer directory and tolerates a repeat', () => {
  const box = sandbox();
  try {
    const first = open(box);
    const second = open(box);
    cli(['put', '--dir', first, '--path', 'specs/cap/spec.md'], { input: 'a' });
    const sibling = path.join(box.tmp, 'keep.txt');
    fs.writeFileSync(sibling, 'keep');
    const closed = cli(['close', '--dir', first]);
    assert.equal(closed.status, 0);
    assert.equal(closed.json.removed, true);
    assert.equal(fs.existsSync(first), false);
    assert.equal(fs.existsSync(second), true);
    assert.equal(fs.existsSync(sibling), true);
    assert.equal(fs.existsSync(box.tmp), true);
    const repeat = cli(['close', '--dir', first]);
    assert.equal(repeat.status, 0);
    assert.equal(repeat.json.removed, false);
  } finally {
    box.cleanup();
  }
});

test('close does not follow a symbolic link planted at the directory name', { skip: !POSIX }, () => {
  const box = sandbox();
  try {
    const victim = path.join(box.project, 'victim');
    fs.mkdirSync(victim);
    fs.writeFileSync(path.join(victim, 'file.txt'), 'x');
    fs.writeFileSync(path.join(victim, '.sai-transfer'), '');
    const link = path.join(box.tmp, 'sai-transfer-abc123');
    fs.symlinkSync(victim, link);
    assert.equal(cli(['close', '--dir', link]).status, 1);
    assert.equal(fs.existsSync(path.join(victim, 'file.txt')), true);
  } finally {
    box.cleanup();
  }
});

test('usage errors exit 2 with JSON', () => {
  assert.equal(cli([]).status, 2);
  assert.equal(cli(['frobnicate']).status, 2);
  assert.equal(cli(['open']).status, 2);
  assert.equal(cli(['open', '--harness', 'vscode']).status, 2);
  assert.equal(cli(['put', '--bogus']).status, 2);
});

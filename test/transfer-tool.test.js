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
  if (process.platform !== 'linux') return path.join(fs.realpathSync.native(box.tmp), 'claude', 'sai');
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
    assert.equal(path.dirname(fs.realpathSync.native(first)), saiRoot(box));
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

test('put --exclusive creates a new file, refuses an existing name atomically, and leaves the first file untouched (E5)', () => {
  const box = sandbox();
  try {
    const dir = open(box);
    const first = cli(['put', '--dir', dir, '--path', 'report.json', '--exclusive'], { input: 'first\n' });
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.json.sha256, sha('first\n'));
    if (POSIX) assert.equal(fs.statSync(first.json.path).mode & 0o777, 0o600);

    const again = cli(['put', '--dir', dir, '--path', 'report.json', '--exclusive'], { input: 'second\n' });
    assert.equal(again.status, 1);
    assert.equal(again.json.ok, false);
    assert.equal(again.json.check, 'failed');
    assert.match(again.json.error, /already exists/);
    assert.equal(fs.readFileSync(first.json.path, 'utf8'), 'first\n');
    assert.equal(sha(fs.readFileSync(first.json.path)), first.json.sha256);

    // Without the flag the default replaces, as block export and backfill drafts rely on.
    const replaced = cli(['put', '--dir', dir, '--path', 'report.json'], { input: 'third\n' });
    assert.equal(replaced.status, 0, replaced.stderr);
    assert.equal(fs.readFileSync(first.json.path, 'utf8'), 'third\n');
  } finally {
    box.cleanup();
  }
});

test('put --exclusive uses one exclusive-create open and leaves no partial file when the write fails', () => {
  const { dir } = transfer.open('claude');
  try {
    const calls = [];
    const io = Object.create(fs);
    io.openSync = (target, flag, mode) => { calls.push(flag); return fs.openSync(target, flag, mode); };
    transfer.put(dir, 'a.json', Buffer.from('a'), { io, exclusive: true });
    assert.deepEqual(calls, ['wx']);
    assert.throws(() => transfer.put(dir, 'a.json', Buffer.from('b'), { io, exclusive: true }), /already exists/);
    assert.equal(fs.readFileSync(path.join(dir, 'a.json'), 'utf8'), 'a');

    const failing = Object.create(fs);
    failing.writeFileSync = (target, ...rest) => {
      if (typeof target === 'number') throw Object.assign(new Error('disk full'), { code: 'ENOSPC' });
      return fs.writeFileSync(target, ...rest);
    };
    assert.throws(() => transfer.put(dir, 'b.json', Buffer.from('b'), { io: failing, exclusive: true }), /disk full/);
    assert.equal(fs.existsSync(path.join(dir, 'b.json')), false, 'a failed exclusive write leaves no partial file');
    assert.equal(transfer.put(dir, 'b.json', Buffer.from('b'), { exclusive: true }).sha256, sha('b'));
  } finally {
    transfer.close(dir);
  }
});

test('put --exclusive refuses an existing symbolic link name instead of writing through it', { skip: !POSIX }, () => {
  const { dir } = transfer.open('claude');
  try {
    const outside = path.join(dir, 'real.json');
    fs.writeFileSync(outside, 'real');
    fs.symlinkSync(outside, path.join(dir, 'link.json'));
    assert.throws(() => transfer.put(dir, 'link.json', Buffer.from('x'), { exclusive: true }), /not a regular file/);
    assert.equal(fs.readFileSync(outside, 'utf8'), 'real');
  } finally {
    transfer.close(dir);
  }
});

test('every worker card that spells the report put command saves with --exclusive', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  for (const file of ['sai/policies/worker-report-transport.md', 'sai/commands/implement/worker-common.md',
    'sai/commands/plan/worker-common.md', 'sai/commands/review/worker.md', 'sai/commands/audit/worker-common.md',
    'sai/commands/commit/worker.md', 'sai/commands/merge/worker.md']) {
    assert.match(read(file), /transfer\.js put --dir <report-dir> --path <[^>]+>(\.yaml|\.json)? --exclusive --input-file/, file);
  }
  for (const file of ['sai/commands/archive/worker.md', 'sai/commands/backfill/worker.md', 'sai/commands/merge/steps/common.md']) {
    assert.match(read(file), /transfer\.js put --exclusive/, file);
  }
  // Block export and backfill drafts keep the replacing default.
  assert.doesNotMatch(read('sai/commands/backfill/worker.md'), /put --dir <transfer-dir>[^`]*--exclusive/);
  assert.doesNotMatch(read('sai/policies/ready-to-propose-format.md'), /--exclusive/);
});

// ─── accept and watch: recovery of undelivered worker reports ────────────────

function age(file, milliseconds) {
  const when = new Date(Date.now() - milliseconds);
  fs.utimesSync(file, when, when);
}

test('accept records a verified reference once and reports a repeat as already recorded', () => {
  const { dir } = transfer.open('claude');
  try {
    const saved = transfer.put(dir, 'completed-1.json', Buffer.from('one'), { exclusive: true });
    assert.deepEqual(transfer.accept(dir, saved, { check: true }), { path: saved.path, sha256: saved.sha256, already: false, recorded: false });
    assert.deepEqual(transfer.accept(dir, saved), { path: saved.path, sha256: saved.sha256, already: false, recorded: true });
    assert.deepEqual(transfer.accept(dir, saved), { path: saved.path, sha256: saved.sha256, already: true, recorded: false });
    assert.equal(transfer.accept(dir, saved, { check: true }).already, true);
    assert.equal(fs.readFileSync(path.join(dir, transfer.LEDGER), 'utf8').trim().split('\n').length, 1, 'the ledger holds the reference once');
    assert.equal(transfer.accept(dir, { path: saved.path, sha256: sha('other') }, { check: true }).already, false, 'a different hash is a different reference');
  } finally {
    transfer.close(dir);
  }
});

test('accept verifies the reference: a missing file, a wrong hash, and the reserved names fail the check', () => {
  const { dir } = transfer.open('claude');
  try {
    const saved = transfer.put(dir, 'completed-1.json', Buffer.from('one'), { exclusive: true });
    assert.throws(() => transfer.accept(dir, { path: saved.path, sha256: sha('wrong') }), /sha256 differs/);
    assert.throws(() => transfer.accept(dir, { path: path.join(dir, 'absent.json'), sha256: sha('x') }), /missing/);
    assert.throws(() => transfer.accept(dir, { path: path.join(dir, transfer.LEDGER), sha256: sha('x') }), /outside the transfer directory/);
    assert.throws(() => transfer.put(dir, transfer.LEDGER, Buffer.from('x')), /reserved name/);
    assert.equal(fs.existsSync(path.join(dir, transfer.LEDGER)), false, 'a failed accept records nothing');
  } finally {
    transfer.close(dir);
  }
});

test('watch returns the unrecorded reports in creation order once the settle delay has passed', async () => {
  const { dir } = transfer.open('claude');
  try {
    const first = transfer.put(dir, 'completed-a.json', Buffer.from('a'), { exclusive: true });
    const second = transfer.put(dir, 'completed-b.json', Buffer.from('b'), { exclusive: true });
    fs.writeFileSync(path.join(dir, 'completed-c.draft.json'), 'draft');
    age(first.path, 120000);
    age(second.path, 90000);
    age(path.join(dir, 'completed-c.draft.json'), 120000);
    const found = await transfer.watch(dir, { settleMs: 60000, maxMs: 1000, pollMs: 10 });
    assert.equal(found.ended, 'found');
    assert.deepEqual(found.reports.map(report => path.basename(report.path)), ['completed-a.json', 'completed-b.json']);
    assert.deepEqual(found.reports.map(report => report.sha256), [sha('a'), sha('b')], 'the tool computes the hash');
    transfer.accept(dir, first);
    const rest = await transfer.watch(dir, { settleMs: 60000, maxMs: 1000, pollMs: 10 });
    assert.deepEqual(rest.reports, [second], 'an accepted reference is not reported again');
    transfer.accept(dir, second);
    assert.deepEqual(await transfer.watch(dir, { settleMs: 0, maxMs: 30, pollMs: 10 }), { reports: [], ended: 'max' });
  } finally {
    transfer.close(dir);
  }
});

test('watch treats a report younger than the settle delay as in flight and sees it once it has settled', async () => {
  const { dir } = transfer.open('claude');
  try {
    const young = transfer.put(dir, 'completed-1.json', Buffer.from('young'), { exclusive: true });
    assert.deepEqual(await transfer.watch(dir, { settleMs: 60000, maxMs: 40, pollMs: 10 }), { reports: [], ended: 'max' });
    let at = Date.now();
    const sleeps = [];
    const settled = await transfer.watch(dir, {
      settleMs: 60000, maxMs: 120000, pollMs: 1000,
      now: () => at,
      sleep: async milliseconds => { sleeps.push(milliseconds); at += 40000; },
    });
    assert.deepEqual(settled.reports, [young]);
    assert.ok(sleeps.length >= 1 && sleeps.every(milliseconds => milliseconds <= 1000), 'it polls inside the process');
  } finally {
    transfer.close(dir);
  }
});

test('watch ends at its maximum without a report, and ends empty when the directory is closed under it', async () => {
  const { dir } = transfer.open('claude');
  const started = Date.now();
  assert.deepEqual(await transfer.watch(dir, { settleMs: 0, maxMs: 60, pollMs: 20 }), { reports: [], ended: 'max' });
  assert.ok(Date.now() - started >= 50, 'it waited for the maximum');
  let polls = 0;
  const closing = await transfer.watch(dir, { settleMs: 0, maxMs: 60000, pollMs: 10, sleep: async () => { if (++polls === 2) transfer.close(dir); } });
  assert.deepEqual(closing, { reports: [], ended: 'closed' });
  await assert.rejects(transfer.watch(dir, { maxMs: 10 }), /absolute path|existing directory/);
});

test('the watch and accept sub-commands run from the command line with duration flags', () => {
  const { dir } = transfer.open('claude');
  const box = sandbox();
  try {
    const saved = transfer.put(dir, 'completed-1.json', Buffer.from('cli'), { exclusive: true });
    age(saved.path, 5000);
    const empty = path.join(box.base, 'paths.json');
    fs.writeFileSync(empty, '[]');
    const found = cli(['watch', '--dir', dir, '--settle', '1s', '--max', '2s', '--poll', '50ms', '--input-file', empty]);
    assert.equal(found.status, 0, found.stderr);
    assert.equal(found.json.ok, true);
    assert.equal(found.json.command, 'watch');
    assert.deepEqual(found.json.reports, [saved]);
    const accepted = cli(['accept', '--dir', dir, '--path', saved.path, '--sha256', saved.sha256]);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.equal(accepted.json.recorded, true);
    assert.equal(cli(['accept', '--dir', dir, '--path', saved.path, '--sha256', saved.sha256, '--check']).json.already, true);
    const none = cli(['watch', '--dir', dir, '--settle', '0', '--max', '100ms', '--poll', '20ms', '--input-file', empty]);
    assert.deepEqual(none.json.reports, []);
    assert.equal(none.json.ended, 'max');
    for (const bad of [['--settle', '60'], ['--max', 'soon'], ['--poll', '1d']]) {
      const refused = cli(['watch', '--dir', dir, '--input-file', empty, ...bad]);
      assert.equal(refused.status, 2, bad.join(' '));
      assert.match(refused.json.error, /whole number followed by ms, s, m, or h/);
    }
    assert.equal(cli(['watch']).status, 2, 'watch needs --dir');
    assert.equal(cli(['watch', '--dir', path.join(dir, 'missing'), '--input-file', empty]).status, 1);
  } finally {
    transfer.close(dir);
    box.cleanup();
  }
});

test('the watch defaults are 60 seconds to settle and 30 minutes to the maximum', () => {
  const source = fs.readFileSync(TOOL, 'utf8');
  assert.match(source, /DEFAULT_SETTLE_MS = 60 \* 1000/);
  assert.match(source, /DEFAULT_MAX_MS = 30 \* 60 \* 1000/);
  assert.equal(transfer.parseDuration('60s', '--settle'), 60000);
  assert.equal(transfer.parseDuration('30m', '--max'), 1800000);
  assert.equal(transfer.parseDuration('0', '--settle'), 0);
});

test('E12 a repeated single-value flag is a usage error that changes nothing', () => {
  const dir = transfer.open('claude').dir;
  try {
    for (const args of [
      ['close', '--dir', dir, '--dir', dir],
      ['put', '--dir', dir, '--path', 'a.json', '--path', 'b.json', '--input-file', __filename],
      ['verify', '--dir', dir, '--path', '/x', '--sha256', 'a', '--sha256', 'b'],
    ]) {
      const result = cli(args);
      assert.equal(result.status, 2, args.join(' '));
      assert.match(result.json.error, /accepts one value/);
    }
    assert.ok(fs.existsSync(dir), 'the repeated --dir closed nothing');
    assert.deepEqual(fs.readdirSync(dir).filter(name => name.endsWith('.json')), [], 'the repeated --path wrote nothing');
  } finally {
    transfer.close(dir);
  }
});

test('E7 a retired handle is recorded beside the ledger and put from it writes nothing', () => {
  const dir = transfer.open('claude').dir;
  try {
    const retire = cli(['retire-handle', '--dir', dir, '--handle', 'ses_old_worker']);
    assert.equal(retire.status, 0, retire.stderr);
    assert.deepEqual([retire.json.handle, retire.json.already, retire.json.recorded], ['ses_old_worker', false, true]);
    assert.equal(cli(['retire-handle', '--dir', dir, '--handle', 'ses_old_worker']).json.already, true, 'recording twice changes nothing');
    assert.equal(fs.readFileSync(path.join(dir, transfer.RETIRED), 'utf8'), 'ses_old_worker\n');
    assert.equal(cli(['retire-handle', '--dir', dir, '--handle', 'bad handle']).status, 2);
    assert.equal(cli(['retire-handle', '--dir', dir]).status, 2);

    const report = path.join(dir, '..', 'retired-input.json');
    fs.writeFileSync(report, '{"status":"completed"}');
    try {
      const refused = cli(['put', '--dir', dir, '--path', 'r.json', '--input-file', report, '--harness', 'opencode'], { env: { OPENCODE_SESSION_ID: 'ses_old_worker' } });
      assert.equal(refused.status, 1);
      assert.match(refused.json.error, /retired/);
      assert.equal(fs.existsSync(path.join(dir, 'r.json')), false, 'nothing was written');

      const other = cli(['put', '--dir', dir, '--path', 'r.json', '--input-file', report, '--harness', 'opencode'], { env: { OPENCODE_SESSION_ID: 'ses_new_worker' } });
      assert.equal(other.status, 0, other.stderr);
      const unreadable = cli(['put', '--dir', dir, '--path', 'u.json', '--input-file', report, '--harness', 'opencode'], { env: { OPENCODE_SESSION_ID: '' } });
      assert.equal(unreadable.status, 0, 'E6: without a readable session the check is skipped');
    } finally {
      fs.rmSync(report, { force: true });
    }
    assert.throws(() => transfer.put(dir, `${transfer.RETIRED}`, Buffer.from('x')), /reserved name/);
  } finally {
    transfer.close(dir);
  }
});

test('E8 live reports live, retired, or gone for the caller\'s own harness session', () => {
  const dir = transfer.open('claude').dir;
  const env = session => ({ OPENCODE_SESSION_ID: session });
  try {
    assert.equal(cli(['live', '--dir', dir, '--harness', 'opencode'], { env: env('ses_a') }).json.state, 'live');
    assert.equal(cli(['live', '--dir', dir, '--harness', 'opencode'], { env: env('') }).json.state, 'live', 'an unreadable session is never refused');
    cli(['retire-handle', '--dir', dir, '--handle', 'ses_a']);
    const retired = cli(['live', '--dir', dir, '--harness', 'opencode'], { env: env('ses_a') });
    assert.equal(retired.status, 0);
    assert.equal(retired.json.state, 'retired');
    assert.equal(cli(['live', '--dir', dir, '--harness', 'opencode'], { env: env('ses_b') }).json.state, 'live');
    assert.equal(cli(['live', '--dir', dir, '--harness', 'claude'], { env: { CLAUDE_CODE_AGENT_ID: 'ses_a' } }).json.state, 'retired', 'Claude Code reads its agent ID');
  } finally {
    transfer.close(dir);
  }
  const gone = cli(['live', '--dir', dir, '--harness', 'opencode'], { env: env('ses_a') });
  assert.equal(gone.status, 0);
  assert.equal(gone.json.state, 'gone');
  assert.equal(cli(['live']).status, 2);
});

// ─── silent workers and relative report references ───────────────────────────

test('watch ends silent once neither the report directory nor a writable path changed for the window', async () => {
  const { dir } = transfer.open('claude');
  const box = sandbox();
  try {
    const target = path.join(box.project, 'src', 'a.js');
    fs.mkdirSync(path.dirname(target));
    fs.writeFileSync(target, 'a');
    age(target, 3600000);
    age(path.dirname(target), 3600000);
    let at = Date.now();
    const quiet = await transfer.watch(dir, {
      settleMs: 0, maxMs: 3 * 3600000, pollMs: 60000, silentMs: 20 * 60000, writablePaths: [path.join(box.project, 'src')],
      now: () => at, sleep: async milliseconds => { at += milliseconds; },
    });
    assert.equal(quiet.ended, 'silent');
    assert.deepEqual(quiet.reports, []);
    assert.ok(quiet.silent_for_ms >= 20 * 60000 && quiet.silent_for_ms < 21 * 60000, 'it names how long the worker was quiet');
  } finally {
    transfer.close(dir);
    box.cleanup();
  }
});

test('watch counts a changed writable path and a new draft as activity, and an old mtime is no silence at once', async () => {
  const { dir } = transfer.open('claude');
  const box = sandbox();
  try {
    const MINUTE = 60000;
    const target = path.join(box.project, 'work.txt');
    fs.writeFileSync(target, 'w');
    age(target, 7200000);
    const started = Date.now();
    let at = started;
    const writes = await transfer.watch(dir, {
      settleMs: 0, maxMs: 6 * 60 * MINUTE, pollMs: MINUTE, silentMs: 20 * MINUTE, writablePaths: [target, path.join(box.project, 'not-yet')],
      now: () => at,
      sleep: async milliseconds => {
        at += milliseconds;
        if (at < started + 60 * MINUTE) fs.utimesSync(target, new Date(at), new Date(at));
      },
    });
    assert.equal(writes.ended, 'silent');
    assert.ok(at - started >= 78 * MINUTE, 'every write inside the window postponed the silence');
    assert.ok(writes.silent_for_ms >= 20 * MINUTE && writes.silent_for_ms < 21 * MINUTE);

    at = started;
    let drafted = false;
    const draft = path.join(dir, 'step-1-red-1.draft.json');
    const drafting = await transfer.watch(dir, {
      settleMs: 0, maxMs: 6 * 60 * MINUTE, pollMs: MINUTE, silentMs: 20 * MINUTE,
      now: () => at,
      sleep: async milliseconds => {
        at += milliseconds;
        if (!drafted && at >= started + 15 * MINUTE) {
          drafted = true;
          fs.writeFileSync(draft, 'draft');
          fs.utimesSync(draft, new Date(at), new Date(at));
        }
      },
    });
    assert.equal(drafting.ended, 'silent');
    // Without the restart the window closes at minute 20; a file system that stores mtime in whole
    // seconds can move the draft's activity back by up to a second, so allow that much slack.
    assert.ok(at - started >= 35 * MINUTE - 1000, 'the draft restarted the window');

    const fresh = await transfer.watch(dir, { settleMs: 0, maxMs: 40, pollMs: 10, writablePaths: [target] });
    assert.deepEqual(fresh, { reports: [], ended: 'max' }, 'an old mtime is not silence at once: the window starts with the watch');
  } finally {
    transfer.close(dir);
    box.cleanup();
  }
});

test('watch still reports a settled report before it reports silence, and the ledger is no activity', async () => {
  const { dir } = transfer.open('claude');
  try {
    const saved = transfer.put(dir, 'completed-1.json', Buffer.from('r'), { exclusive: true });
    age(saved.path, 120000);
    const found = await transfer.watch(dir, { settleMs: 60000, maxMs: 1000, pollMs: 10, silentMs: 1 });
    assert.equal(found.ended, 'found');
    transfer.accept(dir, saved);
    let at = Date.now();
    const quiet = await transfer.watch(dir, { settleMs: 0, maxMs: 3600000, pollMs: 60000, silentMs: 20 * 60000, now: () => at, sleep: async milliseconds => { at += milliseconds; } });
    assert.equal(quiet.ended, 'silent');
  } finally {
    transfer.close(dir);
  }
});

test('watch parses the silence window and the writable paths of its input file', () => {
  assert.equal(transfer.parseSilentAfter('20'), 20 * 60000);
  assert.equal(transfer.parseSilentAfter('90s'), 90000);
  assert.equal(transfer.parseSilentAfter('2h'), 7200000);
  for (const bad of ['0', '0m', 'soon', '-5', '1.5']) assert.throws(() => transfer.parseSilentAfter(bad), /positive whole number of minutes/, bad);
  assert.match(fs.readFileSync(TOOL, 'utf8'), /DEFAULT_SILENT_MS = 20 \* 60 \* 1000/);
  const cwd = path.resolve('/project/root');
  assert.deepEqual(transfer.parseWritablePaths(Buffer.from('["a/b.js", "/abs/c"]'), cwd), [path.join(cwd, 'a', 'b.js'), path.resolve('/abs/c')]);
  assert.deepEqual(transfer.parseWritablePaths(Buffer.from('{"paths": ["x"]}'), cwd), [path.join(cwd, 'x')]);
  for (const bad of ['not json', '{"paths": "x"}', '[1]', '[""]', '{}']) assert.throws(() => transfer.parseWritablePaths(Buffer.from(bad), cwd), /array of paths/, bad);
});

test('the watch sub-command ends silent from the command line and refuses a bad silence window or input file', () => {
  const { dir } = transfer.open('claude');
  const box = sandbox();
  try {
    const input = path.join(box.base, 'paths.json');
    fs.writeFileSync(input, JSON.stringify(['file.txt']));
    fs.writeFileSync(path.join(box.project, 'file.txt'), 'x');
    age(path.join(box.project, 'file.txt'), 3600000);
    const silent = cli(['watch', '--dir', dir, '--settle', '0', '--max', '5s', '--poll', '20ms', '--silent-after', '150ms', '--input-file', input, '--cwd', box.project]);
    assert.equal(silent.status, 0, silent.stderr);
    assert.equal(silent.json.ended, 'silent');
    assert.deepEqual(silent.json.reports, []);
    assert.equal(typeof silent.json.silent_for_ms, 'number');
    const bare = cli(['watch', '--dir', dir, '--settle', '0', '--max', '100ms', '--poll', '20ms']);
    assert.equal(bare.status, 2, 'a watch without --input-file starts nothing');
    assert.match(bare.json.error, /--input-file/, 'the usage error names the missing flag');
    assert.equal(bare.json.reports, undefined);
    const empty = path.join(box.base, 'empty.json');
    fs.writeFileSync(empty, '[]');
    const none = cli(['watch', '--dir', dir, '--settle', '0', '--max', '100ms', '--poll', '20ms', '--input-file', empty]);
    assert.equal(none.status, 0, none.stderr);
    assert.equal(none.json.ended, 'max', 'an empty list is valid and the default window is twenty minutes');
    assert.equal(none.json.walk_limited, undefined);
    const missing = path.join(box.base, 'paths-missing.json');
    fs.writeFileSync(missing, JSON.stringify(['not-yet/created.txt']));
    const absent = cli(['watch', '--dir', dir, '--settle', '0', '--max', '100ms', '--poll', '20ms', '--input-file', missing, '--cwd', box.project]);
    assert.equal(absent.status, 0, 'a listed path that does not exist yet is never an error');
    assert.equal(absent.json.ended, 'max');
    assert.equal(cli(['watch', '--dir', dir, '--silent-after', '0']).status, 2);
    fs.writeFileSync(input, 'nonsense');
    assert.equal(cli(['watch', '--dir', dir, '--input-file', input]).status, 2);
    assert.equal(cli(['watch', '--dir', dir, '--input-file', path.join(box.base, 'absent.json')]).status, 2);
  } finally {
    transfer.close(dir);
    box.cleanup();
  }
});

test('watch names the listed paths whose activity walk stopped at the entry limit', async () => {
  const { dir } = transfer.open('claude');
  const box = sandbox();
  try {
    const big = path.join(box.project, 'big');
    const small = path.join(box.project, 'small');
    fs.mkdirSync(big);
    fs.mkdirSync(small);
    for (let index = 0; index < 5100; index++) fs.writeFileSync(path.join(big, `f${index}.txt`), 'x');
    fs.writeFileSync(path.join(small, 'a.txt'), 'x');
    for (const target of [big, small]) { age(target, 3600000); }
    let at = Date.now();
    const quiet = await transfer.watch(dir, {
      settleMs: 0, maxMs: 3 * 3600000, pollMs: 60000, silentMs: 20 * 60000, writablePaths: [big, small],
      now: () => at, sleep: async milliseconds => { at += milliseconds; },
    });
    assert.equal(quiet.ended, 'silent');
    assert.deepEqual(quiet.walk_limited, [big], 'only the path whose walk stopped at the limit is named');
    const narrow = await transfer.watch(dir, {
      settleMs: 0, maxMs: 3 * 3600000, pollMs: 60000, silentMs: 20 * 60000, writablePaths: [small],
      now: () => at, sleep: async milliseconds => { at += milliseconds; },
    });
    assert.equal(narrow.walk_limited, undefined, 'a narrow list reports no truncated walk');
  } finally {
    transfer.close(dir);
    box.cleanup();
  }
});

test('a log streamed into a watched scratch folder keeps the watch from ending silent until the output stops', async () => {
  const { dir } = transfer.open('claude');
  const scratch = transfer.open('claude').dir;
  try {
    const MINUTE = 60000;
    const log = path.join(scratch, 'suite.log');
    fs.writeFileSync(log, 'start');
    age(log, 3600000);
    const started = Date.now();
    let at = started;
    const result = await transfer.watch(dir, {
      settleMs: 0, maxMs: 6 * 60 * MINUTE, pollMs: MINUTE, silentMs: 20 * MINUTE, writablePaths: [scratch],
      now: () => at,
      sleep: async milliseconds => {
        at += milliseconds;
        if (at < started + 90 * MINUTE) fs.utimesSync(log, new Date(at), new Date(at));
      },
    });
    assert.equal(result.ended, 'silent', 'a command that writes nothing for a whole window still ends silent');
    assert.ok(at - started >= 108 * MINUTE, 'every line of output inside the window postponed the silence');
  } finally {
    transfer.close(dir);
    transfer.close(scratch);
  }
});

test('accept resolves a relative path against the report directory and keeps containment and hash checks', () => {
  const { dir } = transfer.open('claude');
  try {
    const saved = transfer.put(dir, 'sub/completed-1.json', Buffer.from('rel'), { exclusive: true });
    assert.equal(transfer.resolveReferencePath(dir, 'sub/completed-1.json'), saved.path);
    assert.equal(transfer.resolveReferencePath(dir, saved.path), saved.path, 'an absolute path is untouched');
    assert.deepEqual(transfer.accept(dir, { path: 'sub/completed-1.json', sha256: saved.sha256 }, { check: true }),
      { path: saved.path, sha256: saved.sha256, already: false, recorded: false });
    assert.deepEqual(transfer.accept(dir, { path: 'sub/completed-1.json', sha256: saved.sha256 }),
      { path: saved.path, sha256: saved.sha256, already: false, recorded: true });
    assert.equal(transfer.accept(dir, saved, { check: true }).already, true, 'the ledger key is the absolute path');
    assert.throws(() => transfer.accept(dir, { path: 'sub/completed-1.json', sha256: sha('wrong') }), /sha256 differs/);
    assert.throws(() => transfer.accept(dir, { path: '../escape.json', sha256: saved.sha256 }), /outside the transfer directory/);
    assert.throws(() => transfer.accept(dir, { path: transfer.LEDGER, sha256: saved.sha256 }), /outside the transfer directory/);
    const viaCli = cli(['accept', '--dir', dir, '--path', 'sub/completed-1.json', '--sha256', saved.sha256, '--check']);
    assert.equal(viaCli.status, 0, viaCli.stderr);
    assert.equal(viaCli.json.already, true);
    assert.equal(cli(['accept', '--dir', dir, '--path', '../escape.json', '--sha256', saved.sha256]).status, 1);
  } finally {
    transfer.close(dir);
  }
});

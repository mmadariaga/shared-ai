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
  try {
    const saved = transfer.put(dir, 'completed-1.json', Buffer.from('cli'), { exclusive: true });
    age(saved.path, 5000);
    const found = cli(['watch', '--dir', dir, '--settle', '1s', '--max', '2s', '--poll', '50ms']);
    assert.equal(found.status, 0, found.stderr);
    assert.equal(found.json.ok, true);
    assert.equal(found.json.command, 'watch');
    assert.deepEqual(found.json.reports, [saved]);
    const accepted = cli(['accept', '--dir', dir, '--path', saved.path, '--sha256', saved.sha256]);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.equal(accepted.json.recorded, true);
    assert.equal(cli(['accept', '--dir', dir, '--path', saved.path, '--sha256', saved.sha256, '--check']).json.already, true);
    const none = cli(['watch', '--dir', dir, '--settle', '0', '--max', '100ms', '--poll', '20ms']);
    assert.deepEqual(none.json.reports, []);
    assert.equal(none.json.ended, 'max');
    for (const bad of [['--settle', '60'], ['--max', 'soon'], ['--poll', '1d']]) {
      const refused = cli(['watch', '--dir', dir, ...bad]);
      assert.equal(refused.status, 2, bad.join(' '));
      assert.match(refused.json.error, /whole number followed by ms, s, m, or h/);
    }
    assert.equal(cli(['watch']).status, 2, 'watch needs --dir');
    assert.equal(cli(['watch', '--dir', path.join(dir, 'missing')]).status, 1);
  } finally {
    transfer.close(dir);
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

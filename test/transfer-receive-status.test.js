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

const GOOD = 'status: completed\nsummary: Step done.\nchanged_files: []\ntest_command: node --test\nnotes: ""\n';
const BROKEN = 'status: completed\nsummary: Step done.\nchanged_files: []\nbogus: 1\n';
const PROGRESS = 'event: progress\nstep_ids:\n  - "1"\nchanged_files: []\n';

function cli(args) {
  const result = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
  return { status: result.status, json: result.stdout ? JSON.parse(result.stdout) : null, stderr: result.stderr };
}

function withDir(body) {
  const { dir } = transfer.open('claude');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-receive-test-'));
  try {
    return body(dir, scratch);
  } finally {
    transfer.close(dir);
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

const terminal = { kind: 'terminal', command: 'implement' };
const ledgerLines = dir => (fs.existsSync(path.join(dir, transfer.LEDGER)) ? fs.readFileSync(path.join(dir, transfer.LEDGER), 'utf8').trim().split('\n') : []);

test('receive validates a terminal report, records it, and names the watch command of its directory', () => {
  withDir(dir => {
    const saved = transfer.put(dir, 'completed-1.yaml', Buffer.from(GOOD), { exclusive: true });
    const answer = transfer.receive(dir, saved, terminal);
    assert.equal(answer.ok, true);
    assert.equal(answer.already, false);
    assert.equal(answer.recorded, true);
    assert.equal(answer.outcome, 'accepted');
    assert.equal(answer.validation.outcome, 'accepted');
    assert.equal(answer.validation.payload.summary, 'Step done.');
    assert.match(answer.watch, new RegExp(`^node ".*transfer\\.js" watch --dir "${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" --input-file <paths-file> --cwd <project-root>$`));
    assert.deepEqual(ledgerLines(dir).map(line => JSON.parse(line)), [{ path: saved.path, sha256: saved.sha256 }], 'the report is in the ledger when the call returns');
    assert.equal(transfer.accept(dir, saved, { check: true }).already, true);
  });
});

test('E1 a reference already in the ledger answers already, validates nothing, and records nothing', () => {
  withDir(dir => {
    const saved = transfer.put(dir, 'completed-1.yaml', Buffer.from(GOOD), { exclusive: true });
    transfer.receive(dir, saved, terminal);
    const again = transfer.receive(dir, saved, terminal);
    assert.deepEqual([again.ok, again.already, again.recorded, again.outcome, again.validation], [true, true, false, 'duplicate', null]);
    assert.equal(ledgerLines(dir).length, 1);
    // A duplicate is answered from the ledger alone: it needs no readable file and no command.
    fs.unlinkSync(saved.path);
    assert.equal(transfer.receive(dir, saved, { kind: 'terminal', command: 'implement' }).already, true);
  });
});

test('E2 an invalid report is recorded and returns the validator errors, so the watch does not offer it again', async () => {
  await withDir(async (dir, scratch) => {
    const saved = transfer.put(dir, 'completed-1.yaml', Buffer.from(BROKEN), { exclusive: true });
    const answer = transfer.receive(dir, saved, terminal);
    assert.deepEqual([answer.ok, answer.recorded, answer.outcome], [false, true, 'report-invalid']);
    assert.ok(answer.validation.errors.some(error => /bogus/.test(error)), answer.validation.errors.join('; '));
    assert.equal(transfer.receive(dir, saved, terminal).already, true);
    const paths = path.join(scratch, 'paths.json');
    fs.writeFileSync(paths, '[]');
    const found = await transfer.watch(dir, { settleMs: 0, maxMs: 50, pollMs: 10, writablePaths: [] });
    assert.deepEqual(found.reports, [], 'the ledger keeps the returned report out of the watch');
  });
});

test('E2 a hash mismatch records the bytes on disk and the claimed hash, and a reference outside the directory records nothing', () => {
  withDir(dir => {
    const saved = transfer.put(dir, 'completed-1.yaml', Buffer.from(GOOD), { exclusive: true });
    const wrong = { path: saved.path, sha256: sha('something else') };
    const mismatch = transfer.receive(dir, wrong, terminal);
    assert.deepEqual([mismatch.ok, mismatch.recorded, mismatch.outcome], [false, true, 'delivery-failed']);
    assert.match(mismatch.validation.errors[0], /sha256 differs/);
    assert.equal(transfer.accept(dir, saved, { check: true }).already, true, 'the watch would offer the bytes on disk, so they are recorded');
    assert.equal(transfer.receive(dir, wrong, terminal).already, true);

    const outside = transfer.receive(dir, { path: path.join(os.tmpdir(), 'elsewhere.yaml'), sha256: sha('x') }, terminal);
    assert.deepEqual([outside.ok, outside.recorded, outside.outcome], [false, false, 'delivery-failed']);
    const missing = transfer.receive(dir, { path: path.join(dir, 'not-yet.yaml'), sha256: sha('x') }, terminal);
    assert.deepEqual([missing.ok, missing.recorded], [false, false]);
    assert.equal(transfer.receive(dir, { path: path.join(dir, 'not-yet.yaml'), sha256: sha('x') }, terminal).already, false, 'a report that does not exist yet is not a duplicate later');
    assert.equal(ledgerLines(dir).length, 2);
  });
});

test('E3 a progress report is recorded without validation and left to sai-state emit', () => {
  withDir(dir => {
    const saved = transfer.put(dir, 'progress-1.yaml', Buffer.from(PROGRESS), { exclusive: true });
    const answer = transfer.receive(dir, saved, { kind: 'progress' });
    assert.deepEqual([answer.ok, answer.recorded, answer.outcome, answer.validation], [true, true, 'recorded', null]);
    assert.equal(transfer.receive(dir, saved, { kind: 'progress' }).already, true);
    const garbage = transfer.put(dir, 'progress-2.yaml', Buffer.from('not: a progress report\n'), { exclusive: true });
    assert.equal(transfer.receive(dir, garbage, { kind: 'progress' }).outcome, 'recorded', 'the machine emit validates it, not receive');
    const wrong = transfer.receive(dir, { path: saved.path, sha256: sha('x') }, { kind: 'progress' });
    assert.deepEqual([wrong.ok, wrong.outcome], [false, 'delivery-failed']);
  });
});

test('a relative path resolves against the report directory, and the paths of the watch fill its placeholders', () => {
  withDir(dir => {
    const saved = transfer.put(dir, 'completed-1.yaml', Buffer.from(GOOD), { exclusive: true });
    const answer = transfer.receive(dir, { path: 'completed-1.yaml', sha256: saved.sha256 }, { ...terminal, pathsFile: '/tmp/paths.json', cwd: '/work/project' });
    assert.equal(answer.path, saved.path);
    assert.match(answer.watch, /--input-file "\/tmp\/paths\.json" --cwd "\/work\/project"$/);
    assert.equal(transfer.receive(dir, { path: '../escape.yaml', sha256: sha('x') }, terminal).ok, false);
  });
});

test('receive rejects a missing kind, a missing command, and a malformed hash', () => {
  withDir(dir => {
    const saved = transfer.put(dir, 'completed-1.yaml', Buffer.from(GOOD), { exclusive: true });
    assert.throws(() => transfer.receive(dir, saved, { kind: 'other' }), /--kind terminal or progress/);
    assert.throws(() => transfer.receive(dir, saved, { kind: 'terminal' }), /requires --command/);
    assert.throws(() => transfer.receive(dir, { path: saved.path, sha256: 'xyz' }, terminal), /64 lowercase hex/);
    assert.throws(() => transfer.receive(dir, saved, { kind: 'terminal', command: 'nothing' }), /--command must be one of: .*implement/);
    assert.equal(ledgerLines(dir).length, 0, 'a refused call records nothing');
  });
});

test('receive runs from the command line and exits 1 for a report that is not usable', () => {
  withDir(dir => {
    const good = transfer.put(dir, 'completed-1.yaml', Buffer.from(GOOD), { exclusive: true });
    const bad = transfer.put(dir, 'completed-2.yaml', Buffer.from(BROKEN), { exclusive: true });
    const accepted = cli(['receive', '--dir', dir, '--path', good.path, '--sha256', good.sha256, '--kind', 'terminal', '--command', 'implement']);
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.equal(accepted.json.ok, true);
    assert.equal(accepted.json.command, 'receive');
    assert.equal(accepted.json.outcome, 'accepted');
    assert.equal(cli(['receive', '--dir', dir, '--path', good.path, '--sha256', good.sha256, '--kind', 'terminal', '--command', 'implement']).json.already, true);
    const invalid = cli(['receive', '--dir', dir, '--path', bad.path, '--sha256', bad.sha256, '--kind', 'terminal', '--command', 'implement']);
    assert.equal(invalid.status, 1);
    assert.equal(invalid.json.outcome, 'report-invalid');
    assert.equal(cli(['receive', '--dir', dir, '--path', good.path, '--sha256', good.sha256, '--kind', 'terminal', '--command', 'implement', '--cwd']).status, 2);
    assert.equal(cli(['receive', '--dir', dir, '--path', good.path, '--sha256', good.sha256]).status, 2, '--kind is required');
    assert.equal(cli(['receive', '--dir', dir, '--path', good.path, '--sha256', good.sha256, '--kind', 'terminal']).status, 2, '--command is required for a terminal report');
    assert.equal(cli(['receive', '--dir', dir, '--path', good.path, '--sha256', good.sha256, '--kind', 'terminal', '--command', 'nothing']).status, 2);
  });
});

test('status reports the last activity of the report directory and the writable paths, with the role in its line', () => {
  withDir((dir, scratch) => {
    const work = path.join(scratch, 'work');
    const answer = transfer.status(dir, { writablePaths: [work], role: 'design' });
    assert.equal(answer.state, 'live');
    assert.equal(answer.last_activity, null);
    assert.equal(answer.active, false);
    assert.deepEqual(answer.unledgered, []);
    assert.match(answer.line, /^design worker: no activity recorded yet$/);

    fs.mkdirSync(work);
    const file = path.join(work, 'design.md');
    fs.writeFileSync(file, 'x');
    const t = Date.now() - 12000;
    fs.utimesSync(file, t / 1000, t / 1000);
    fs.utimesSync(work, t / 1000, t / 1000);
    const active = transfer.status(dir, { writablePaths: [work], role: 'design', cwd: scratch });
    assert.equal(active.active, true);
    assert.equal(active.last_activity.path, file);
    assert.ok(active.last_activity.age_ms >= 12000 - 1000);
    assert.match(active.line, /^design worker: active, last activity (1[1-9]|2\d)s ago in work[\\/]design\.md$/);

    // The directory itself counts: a draft is a sign of life.
    fs.writeFileSync(path.join(dir, 'completed-1.draft.yaml'), 'x');
    assert.equal(transfer.status(dir, { writablePaths: [work] }).last_activity.path, path.join(dir, 'completed-1.draft.yaml'));
  });
});

test('E7 status reports no activity since the send time, and a report the ledger lacks, which receive then processes', () => {
  withDir((dir, scratch) => {
    const saved = transfer.put(dir, 'completed-1.yaml', Buffer.from(GOOD), { exclusive: true });
    const past = Date.now() - 600000;
    fs.utimesSync(saved.path, past / 1000, past / 1000);
    const quiet = transfer.status(dir, { writablePaths: [], since: Date.now() - 60000, role: 'GREEN' });
    assert.equal(quiet.active, false);
    assert.match(quiet.line, /^GREEN worker: 1 saved report not yet received, receive it now$/, 'a saved report takes the line before activity does');
    assert.deepEqual(quiet.unledgered.map(entry => entry.path), [saved.path]);
    transfer.receive(dir, saved, terminal);

    const since = Date.now() - 60000;
    const silent = transfer.status(dir, { writablePaths: [], since, role: 'GREEN' });
    assert.deepEqual([silent.active, silent.unledgered.length], [false, 0]);
    assert.equal(silent.since, new Date(since).toISOString());
    assert.match(silent.line, /^GREEN worker: no activity since its message was sent at \d{4}-\d{2}-\d{2}T/);
    const fresh = transfer.status(dir, { writablePaths: [], since: past - 1000, role: 'GREEN' });
    assert.equal(fresh.active, true, 'activity after the send time counts');
  });
});

test('status reports a retired handle and a closed directory', () => {
  const { dir } = transfer.open('claude');
  transfer.retireHandle(dir, 'agent-0123456789');
  assert.equal(transfer.status(dir, { handle: 'agent-0123456789', role: 'spec' }).state, 'retired');
  assert.match(transfer.status(dir, { handle: 'agent-0123456789', role: 'spec' }).line, /^spec worker: retired/);
  assert.equal(transfer.status(dir, { handle: 'agent-other' }).state, 'live');
  transfer.close(dir);
  const gone = transfer.status(dir, { role: 'spec' });
  assert.deepEqual([gone.state, gone.active], ['gone', false]);
  assert.match(gone.line, /^spec worker: its report directory no longer exists/);
});

test('E9 one status call answers for one worker, so several workers take several calls with their own roles', () => {
  withDir((dir, scratch) => {
    const other = transfer.open('claude').dir;
    try {
      transfer.put(other, 'draft.draft.yaml', Buffer.from('x'));
      const lines = [['security', dir], ['accessibility', other]].map(([role, directory]) => transfer.status(directory, { role }).line);
      assert.match(lines[0], /^security worker: no activity recorded yet$/);
      assert.match(lines[1], /^accessibility worker: active, last activity \d+s ago/);
    } finally {
      transfer.close(other);
    }
  });
});

test('status runs from the command line, requires its paths file, and refuses a bad time', () => {
  withDir((dir, scratch) => {
    const paths = path.join(scratch, 'paths.json');
    fs.writeFileSync(paths, '[]');
    const answered = cli(['status', '--dir', dir, '--input-file', paths, '--role', 'plan RED', '--since', '2020-01-01T00:00:00Z']);
    assert.equal(answered.status, 0, answered.stderr);
    assert.equal(answered.json.command, 'status');
    assert.equal(answered.json.since, '2020-01-01T00:00:00.000Z');
    assert.match(answered.json.line, /^plan RED worker: /);
    assert.equal(cli(['status', '--dir', dir]).status, 2);
    assert.equal(cli(['status', '--dir', dir, '--input-file', paths, '--since', 'yesterday']).status, 2);
    fs.writeFileSync(paths, 'not json');
    assert.equal(cli(['status', '--dir', dir, '--input-file', paths]).status, 2);
  });
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const transfer = require('../sai/tools/transfer');
const { validateFile, validateText } = require('../sai/tools/worker-report-validator');

const report = { status: 'completed', summary: 'Quotes " \' $() `cmd` \\ and café\r\nsecond line',
  changed_files: ['src/example.js'], resolved_change_name: 'example' };
const tool = path.join(__dirname, '../sai/tools/worker-report-validator.js');
function fixture(t, bytes = Buffer.from(JSON.stringify(report))) {
  const { dir } = transfer.open('opencode');
  t.after(() => transfer.close(dir));
  return { dir, reference: transfer.put(dir, 'report.json', bytes), bytes };
}
function cli(dir, reference, extra = []) {
  return spawnSync(process.execPath, [tool, 'validate', '--kind', 'terminal', '--json',
    '--report-dir', dir, '--report-file', reference.path, '--report-hash', reference.sha256, ...extra],
  { encoding: 'utf8', input: 'must not be read as a report' });
}

test('private reports preserve exact bytes and expose the accepted payload without stdin', t => {
  const { dir, reference, bytes } = fixture(t);
  const result = cli(dir, reference);
  assert.equal(result.status, 0, result.stderr);
  const verdict = JSON.parse(result.stdout);
  assert.equal(Object.keys(verdict)[0], 'received_at');
  assert.equal(verdict.outcome, 'accepted');
  assert.deepEqual(verdict.payload, report);
  assert.deepEqual(fs.readFileSync(reference.path), bytes);
});

test('hash and validation share a single read even if the file changes afterward', t => {
  const { dir, reference } = fixture(t);
  let reads = 0;
  const io = Object.create(fs);
  io.readFileSync = file => {
    reads++;
    const bytes = fs.readFileSync(file);
    fs.writeFileSync(file, 'changed after read');
    return bytes;
  };
  const verdict = validateFile(dir, reference, 'terminal', { io });
  assert.equal(reads, 1);
  assert.equal(verdict.outcome, 'accepted');
  assert.deepEqual(verdict.payload, report);
});

test('YAML and nested backfill references survive file validation without report rewriting', t => {
  const bytes = Buffer.from('status: completed\r\nsummary: "café and quotes"\r\nchanged_files: []\r\nresolved_change_name: example\r\ndraft_references:\r\n  - path: /private/draft\r\n    sha256: abc\r\n    destination: openspec/changes/example/proposal.md\r\n');
  const { dir, reference } = fixture(t, bytes);
  const verdict = validateFile(dir, reference, 'terminal');
  assert.equal(verdict.outcome, 'accepted');
  assert.equal(verdict.payload.draft_references[0].sha256, 'abc');
  assert.deepEqual(fs.readFileSync(reference.path), bytes);
});

test('input and failure reports use the same private transport as completion', t => {
  for (const payload of [
    { status: 'needs_input', summary: 'Needs a choice', changed_files: [], question: 'Which?',
      options: [{ label: 'Keep it', value: 'keep' }] },
    { status: 'failed', summary: 'No change name resolved', changed_files: [] },
    { status: 'cancelled', summary: 'Cancelled', changed_files: [] },
    { ...report, summary: 'Escaped JSON preserves a NUL: \u0000' },
  ]) {
    const { dir, reference } = fixture(t, Buffer.from(JSON.stringify(payload)));
    assert.deepEqual(validateFile(dir, reference, 'terminal').payload, payload);
  }
});

test('missing, altered, foreign and symlink reports fail delivery, not report validation', t => {
  const { dir, reference } = fixture(t);
  const other = fixture(t);
  for (const ref of [
    { ...reference, path: path.join(dir, 'missing.json') },
    { ...reference, sha256: '0'.repeat(64) }, other.reference,
  ]) {
    const verdict = validateFile(dir, ref, 'terminal');
    assert.equal(verdict.outcome, 'delivery-failed');
    assert.equal(verdict.payload, undefined);
  }
  if (process.platform !== 'win32') {
    const link = path.join(dir, 'link.json');
    fs.symlinkSync(reference.path, link);
    assert.equal(validateFile(dir, { ...reference, path: link }, 'terminal').outcome, 'delivery-failed');
  }
  fs.writeFileSync(reference.path, 'changed');
  assert.equal(cli(dir, reference).status, 1);
});

test('unsupported bytes and malformed reports are rejected explicitly and retained unchanged', t => {
  for (const bytes of [Buffer.from('status: completed\nsummary: null\0byte\nchanged_files: []'),
    Buffer.from([0xff]), Buffer.from('{bad JSON'), Buffer.from('{"status":"completed"}')]) {
    const { dir, reference } = fixture(t, bytes);
    const verdict = validateFile(dir, reference, 'terminal');
    assert.equal(verdict.outcome, 'report-invalid');
    assert.equal(verdict.ok, false);
    assert.equal(verdict.payload, undefined);
    assert.deepEqual(fs.readFileSync(reference.path), bytes);
  }
});

test('unreadable report is a delivery failure and an interrupted call leaves evidence for retry', t => {
  const { dir, reference, bytes } = fixture(t);
  const io = Object.create(fs);
  io.readFileSync = () => { throw Object.assign(new Error('unreadable'), { code: 'EACCES' }); };
  assert.equal(validateFile(dir, reference, 'terminal', { io }).outcome, 'delivery-failed');
  const interrupted = spawnSync(process.execPath, ['-e', 'process.kill(process.pid, "SIGTERM")']);
  assert.notEqual(interrupted.status, 0);
  assert.deepEqual(fs.readFileSync(reference.path), bytes);
  assert.equal(validateFile(dir, reference, 'terminal').outcome, 'accepted');
});

test('report-only recovery after completed operations has no repository effects', t => {
  const { dir, reference } = fixture(t);
  const archive = path.join(dir, 'already-archived');
  const commit = 'confirmed-commit-reference';
  fs.mkdirSync(archive);
  fs.writeFileSync(path.join(archive, 'commit'), commit);
  const invalid = { ...reference, sha256: '0'.repeat(64) };
  assert.equal(validateFile(dir, invalid, 'terminal').outcome, 'delivery-failed');
  for (let attempt = 0; attempt < 3; attempt++) assert.equal(validateFile(dir, reference, 'terminal').ok, true);
  assert.equal(fs.readFileSync(path.join(archive, 'commit'), 'utf8'), commit);
  assert.ok(fs.existsSync(reference.path));
});

test('legacy stdin and pure validation retain their result shapes', () => {
  const expected = { ok: true, action: 'validate', kind: 'terminal', errors: [] };
  assert.deepEqual(validateText(JSON.stringify(report), 'terminal'), expected);
  const result = spawnSync(process.execPath, [tool, 'validate', '--kind', 'terminal', '--json'],
    { input: JSON.stringify(report), encoding: 'utf8' });
  const { received_at, ...verdict } = JSON.parse(result.stdout);
  assert.ok(received_at);
  assert.deepEqual(verdict, expected);
});

test('partial file options are usage errors, never a fallback to stdin', () => {
  const result = spawnSync(process.execPath, [tool, 'validate', '--kind', 'terminal', '--report-file', '/missing'],
    { input: JSON.stringify(report), encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /requires --report-dir/);
});

test('Direct Build contracts bind all three workers while preserving other routes and consumed effects', () => {
  const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const policy = read('sai/policies/direct-build-report-transport.md');
  for (const worker of ['explore/direct-build-worker', 'backfill/worker', 'archive/worker']) {
    assert.match(read(`sai/commands/${worker}.md`), /Fetch @sai\/policies\/direct-build-report-transport.md/);
  }
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /Fetch @sai\/policies\/direct-build-report-transport.md/);
  for (const evidence of [/Claude Code and\s+opencode/, /initial `event: ready` return is unchanged/,
    /standalone backfill and archive commands keep their existing transport/,
    /call that returns no response establishes neither/, /never resends an execute order/,
    /Stop at the existing exhausted\s+budget/, /interruption,\s+and an exhausted/]) assert.match(policy, evidence);
});

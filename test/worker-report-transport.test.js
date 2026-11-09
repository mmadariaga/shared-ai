'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const transfer = require('../sai/tools/transfer');
const { validateFile, validateText } = require('../sai/tools/worker-report-validator');
const { linkFile } = require('./helpers/links');

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

test('missing, altered, foreign and symlink reports fail delivery, not report validation', async t => {
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
  await t.test('a linked report file', st => {
    const link = path.join(dir, 'link.json');
    if (!linkFile(st, reference.path, link)) return;
    assert.equal(validateFile(dir, { ...reference, path: link }, 'terminal').outcome, 'delivery-failed');
  });
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

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const POLICY = 'sai/policies/worker-report-transport.md';

test('Direct Build contracts bind all three workers while preserving other routes and consumed effects', () => {
  const policy = read(POLICY);
  for (const worker of ['explore/direct-build-worker', 'backfill/worker', 'archive/worker']) {
    assert.match(read(`sai/commands/${worker}.md`), /Fetch `@sai\/policies\/worker-report-transport.md`/);
  }
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /Fetch `@sai\/policies\/worker-report-transport.md`/);
  for (const evidence of [/Claude Code and opencode/, /initial `event: ready` return is unchanged/,
    /standalone backfill and archive commands keep their existing transport/,
    /call that returns no response establishes neither/, /never resends an execute order/,
    /Stop at the existing exhausted budget/, /interruption, and an exhausted/]) assert.match(policy, evidence);
});

test('the old Direct Build policy is retired in the repository and in both installs', () => {
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'sai/policies/direct-build-report-transport.md')), false);
  const manifest = require('../sai/install-manifest.json');
  const entry = manifest.retirements.find(item => item.destination && item.destination.path === 'policies/direct-build-report-transport.md');
  assert.ok(entry, 'the retired path is declared');
  assert.equal(entry.destination.class, 'sai');
  assert.deepEqual([...entry.harnesses].sort(), ['claude', 'opencode']);
  assert.ok(entry.managedHashes.length > 0);
  for (const file of ['AGENTS.md', 'sai/policies/tool-resolution.md', 'sai/commands/explore/direct-build-worker.md',
    'sai/commands/explore/direct-build-coordinator.md', 'sai/commands/backfill/worker.md', 'sai/commands/archive/worker.md']) {
    assert.doesNotMatch(read(file), /direct-build-report-transport/, `${file} no longer names the old policy`);
  }
});

test('the policy defines the closed schema, the file-plus-hash return, and the invalid-report recovery', () => {
  const policy = read(POLICY);
  assert.match(policy, /status: completed\|failed\|cancelled/);
  assert.match(policy, /status: needs_input/);
  assert.match(policy, /retired `done`, `blocked`, `step-done`, `question`, `notice`, and `conflict_detected`/);
  assert.match(policy, /Return only `\{path, sha256\}`/);
  assert.match(policy, /A message that carries its result inline is an invalid report/);
  assert.match(policy, /`event: ready` handshake reply, the wake `ok`, the `warming:` line beside the reference, and every `budget-\*` helper result/);
  assert.match(policy, /`implement-run@1` for `\/sai-3-implement`/);
  assert.match(policy, /The coordinator validates every report before it reads any field/);
  assert.match(policy, /never interprets a report by reading it/);
  const invalid = policy.slice(policy.indexOf('## Invalid reports'), policy.indexOf('## Recovery and lifetime'));
  assert.match(invalid, /first invalid report goes back to the same worker with the validator's errors/);
  assert.match(invalid, /second consecutive invalid report from that worker replaces it/);
  assert.match(invalid, /Each of these counts as one attempt of the obstacle/);
  assert.match(invalid, /no new budget/);
  assert.match(policy, /Direct Build role fields[\s\S]*failure_class: blocking-contradiction/);
  assert.doesNotMatch(policy, /conflict_detected`? kind|--kind notice/);
});

test('a completed review report carries its outcome through the file transport', t => {
  const payload = { status: 'completed', summary: 'Nothing to review', changed_files: [], outcome: 'no-changes' };
  const { dir, reference } = fixture(t, Buffer.from(JSON.stringify(payload)));
  const accepted = validateFile(dir, reference, 'terminal', { command: 'review' });
  assert.equal(accepted.outcome, 'accepted');
  assert.deepEqual(accepted.payload, payload);
  const cliResult = cli(dir, reference, ['--command', 'review']);
  assert.equal(cliResult.status, 0, cliResult.stderr);
  const rejected = validateFile(dir, reference, 'terminal', { command: 'implement' });
  assert.equal(rejected.outcome, 'report-invalid');
  assert.equal(rejected.payload, undefined);
  assert.equal(cli(dir, reference).status, 1, 'an outcome with no command is not admitted');
});

test('RED, GREEN, and the Direct Build worker report through the policy in the unified schema', () => {
  const common = read('sai/commands/implement/worker-common.md');
  assert.match(common, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its author side/);
  assert.match(common, /--report-dir <path>/);
  assert.match(common, /status: completed \| needs_input \| failed \| cancelled/);
  assert.match(common, /`done` and `blocked` are retired/);
  assert.match(common, /`needs_input` report adds `question` and `options`/);
  assert.doesNotMatch(common, /status: done \| blocked/);
  for (const file of ['sai/commands/implement/red-worker.md', 'sai/commands/implement/green-worker.md']) {
    const card = read(file);
    assert.doesNotMatch(card, /Report `blocked`/, file);
    assert.match(card, /Report `needs_input`/, file);
  }
  assert.match(read('sai/commands/implement/steps/red-step.md'), /Return `completed`/);
  assert.match(read('sai/commands/implement/steps/green-step.md'), /return `completed`/);
  assert.match(read('sai/commands/explore/direct-build-worker.md'), /closed report schema/);
});

test('the implement coordinator opens the report directory, validates every report, and answers questions', () => {
  const card = read('sai/commands/implement/coordinator.md');
  assert.match(card, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its receiver side/);
  assert.match(card, /`transfer\.js`, resolved per `tool-resolution\.md`\) and emit `record` \(`report-dir`\)/);
  assert.match(card, /opens with the line `--report-dir <report directory>`/);
  assert.match(card, /validate --kind terminal --command implement --json --report-dir <report directory> --report-file <path> --report-hash <sha256>/);
  assert.match(card, /before you read any field/);
  assert.match(card, /you never interpret a report by reading it/);
  assert.match(card, /second consecutive invalid report from that worker replaces it/);
  assert.match(card, /nothing answers it and the answer would change the code, the question is force majeure/);
  assert.match(card, /as a deviation/);
  assert.match(card, /transfer\.js close --dir \{report directory\}/);
  const machine = require('../sai-state/machines/implement-run.js');
  const started = machine.transition(machine.initialState, { kind: 'start', dir: '/tmp/claude-1000/sai/implement-demo-1a2b' });
  const recorded = machine.transition(started.state, { kind: 'record', ref: 'report-dir', path: '/tmp/claude-1000/sai/sai-transfer-abc' });
  assert.equal(recorded.rejected, undefined);
  assert.deepEqual(recorded.state.report_dirs, ['/tmp/claude-1000/sai/sai-transfer-abc']);
});

test('the worker profiles grant the transfer put call and no retired kind survives in the docs', () => {
  const manifest = require('../sai/install-manifest.json');
  const { resolveProfile } = require('../bin/capabilities');
  for (const profile of ['worker-write', 'worker-execution']) {
    assert.ok(resolveProfile(manifest.capabilities, profile).shell.includes('node {sai}/tools/transfer.js put *'), profile);
  }
  assert.doesNotMatch(read('AGENTS.md'), /terminal\\\|notice\\\|progress\\\|conflict_detected/);
});

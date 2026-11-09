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
  return spawnSync(process.execPath, [tool, 'validate', '--kind', 'terminal', '--command', 'direct-build', '--json',
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
  const verdict = validateFile(dir, reference, 'terminal', { io, command: 'direct-build' });
  assert.equal(reads, 1);
  assert.equal(verdict.outcome, 'accepted');
  assert.deepEqual(verdict.payload, report);
});

test('YAML and nested backfill references survive file validation without report rewriting', t => {
  const bytes = Buffer.from('status: completed\r\nsummary: "café and quotes"\r\nchanged_files: []\r\nresolved_change_name: example\r\ndraft_references:\r\n  - path: /private/draft\r\n    sha256: abc\r\n    destination: openspec/changes/example/proposal.md\r\n');
  const { dir, reference } = fixture(t, bytes);
  const verdict = validateFile(dir, reference, 'terminal', { command: 'backfill' });
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
    assert.deepEqual(validateFile(dir, reference, 'terminal', { command: 'direct-build' }).payload, payload);
  }
});

test('missing, altered, foreign and symlink reports fail delivery, not report validation', async t => {
  const { dir, reference } = fixture(t);
  const other = fixture(t);
  for (const ref of [
    { ...reference, path: path.join(dir, 'missing.json') },
    { ...reference, sha256: '0'.repeat(64) }, other.reference,
  ]) {
    const verdict = validateFile(dir, ref, 'terminal', { command: 'direct-build' });
    assert.equal(verdict.outcome, 'delivery-failed');
    assert.equal(verdict.payload, undefined);
  }
  await t.test('a linked report file', st => {
    const link = path.join(dir, 'link.json');
    if (!linkFile(st, reference.path, link)) return;
    assert.equal(validateFile(dir, { ...reference, path: link }, 'terminal', { command: 'direct-build' }).outcome, 'delivery-failed');
  });
  fs.writeFileSync(reference.path, 'changed');
  assert.equal(cli(dir, reference).status, 1);
});

test('unsupported bytes and malformed reports are rejected explicitly and retained unchanged', t => {
  for (const bytes of [Buffer.from('status: completed\nsummary: null\0byte\nchanged_files: []'),
    Buffer.from([0xff]), Buffer.from('{bad JSON'), Buffer.from('{"status":"completed"}')]) {
    const { dir, reference } = fixture(t, bytes);
    const verdict = validateFile(dir, reference, 'terminal', { command: 'direct-build' });
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
  assert.equal(validateFile(dir, reference, 'terminal', { io, command: 'direct-build' }).outcome, 'delivery-failed');
  const interrupted = spawnSync(process.execPath, ['-e', 'process.kill(process.pid, "SIGTERM")']);
  assert.notEqual(interrupted.status, 0);
  assert.deepEqual(fs.readFileSync(reference.path), bytes);
  assert.equal(validateFile(dir, reference, 'terminal', { command: 'direct-build' }).outcome, 'accepted');
});

test('report-only recovery after completed operations has no repository effects', t => {
  const { dir, reference } = fixture(t);
  const archive = path.join(dir, 'already-archived');
  const commit = 'confirmed-commit-reference';
  fs.mkdirSync(archive);
  fs.writeFileSync(path.join(archive, 'commit'), commit);
  const invalid = { ...reference, sha256: '0'.repeat(64) };
  assert.equal(validateFile(dir, invalid, 'terminal', { command: 'direct-build' }).outcome, 'delivery-failed');
  for (let attempt = 0; attempt < 3; attempt++) assert.equal(validateFile(dir, reference, 'terminal', { command: 'direct-build' }).ok, true);
  assert.equal(fs.readFileSync(path.join(archive, 'commit'), 'utf8'), commit);
  assert.ok(fs.existsSync(reference.path));
});

test('legacy stdin and pure validation retain their result shapes', () => {
  const expected = { ok: true, action: 'validate', kind: 'terminal', errors: [] };
  assert.deepEqual(validateText(JSON.stringify(report), 'terminal', { command: 'direct-build' }), expected);
  const result = spawnSync(process.execPath, [tool, 'validate', '--kind', 'terminal', '--command', 'direct-build', '--json'],
    { input: JSON.stringify(report), encoding: 'utf8' });
  const { received_at, ...verdict } = JSON.parse(result.stdout);
  assert.ok(received_at);
  assert.deepEqual(verdict, expected);
});

test('partial file options are usage errors, never a fallback to stdin', () => {
  const result = spawnSync(process.execPath, [tool, 'validate', '--kind', 'terminal', '--command', 'direct-build', '--report-file', '/missing'],
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
    /The `--no-specs` POC keeps its existing transport/,
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
  assert.equal(cli(dir, reference).status, 1, 'an outcome the command does not admit is invalid');
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

// ─── Plan and review workers ─────────────────────────────────────────────────

test('the policy covers the plan and review workers, the progress kind, and the file-name rule', () => {
  const policy = read(POLICY);
  assert.match(policy, /the spec and design workers of the plan commands, the review worker of `\/sai-4-review`/);
  assert.match(policy, /\| `spec` \| spec \| `step_ids`, `warnings`, `notes` \|/);
  assert.match(policy, /\| `review` \| review \| `review_path`, `counts`, `recommended_audits` \|/);
  assert.match(policy, /`plan-run@1` for the plan commands, the conversation for `\/sai-4-review`, the audit cycles, `\/sai-commit`, `\/sai-archive`, `\/sai-backfill`, and Direct Build, and `merge-run@1` for `\/sai-merge`/);
  assert.match(policy, /`spec` or `design` for the plan workers; `review` for the review worker/);
  const progress = policy.slice(policy.indexOf('### Progress reports'), policy.indexOf('## Author boundary'));
  assert.match(progress, /event: progress\nstep_ids: string\[\]\nchanged_files: string\[\]/);
  assert.match(progress, /names its file with the prefix `progress-`/);
  assert.match(progress, /validated with `--kind progress`, or by the `emit --progress` reference mode below\), and any other report is validated with `--kind terminal --command <command>`/);
  assert.match(progress, /sai-state emit <id> <machine> --progress --report-dir <report-dir> --report-file <path> --report-hash <sha256>/);
  assert.match(progress, /`--input-file <report file>` and stdin stay accepted for a hand-composed payload and carry no hash check/);
});

test('a progress report travels through the file transport and is validated with the progress kind', t => {
  const payload = { event: 'progress', step_ids: ['review-intake', 'establish-diff-scope'], changed_files: [] };
  const { dir, reference } = fixture(t, Buffer.from(JSON.stringify(payload)));
  const accepted = validateFile(dir, reference, 'progress');
  assert.equal(accepted.outcome, 'accepted');
  assert.deepEqual(accepted.payload, payload);
  assert.equal(validateFile(dir, reference, 'terminal', { command: 'review' }).outcome, 'report-invalid',
    'a progress report is not a terminal report');
  const legacy = transfer.put(dir, 'legacy.json', Buffer.from(JSON.stringify({ event: 'step-done', step_id: 'establish-diff-scope' })));
  assert.equal(validateFile(dir, legacy, 'progress').outcome, 'report-invalid', 'the retired step-done is invalid');
});

test('spec and design reports are validated per command; done and blocked are invalid', t => {
  const completed = { status: 'completed', summary: 'Wrote the proposal.', changed_files: ['openspec/changes/x/proposal.md'],
    step_ids: ['spec-intake', 'research'], warnings: [], notes: '' };
  const { dir, reference } = fixture(t, Buffer.from(JSON.stringify(completed)));
  for (const command of ['spec', 'design']) {
    const verdict = validateFile(dir, reference, 'terminal', { command });
    assert.equal(verdict.outcome, 'accepted', command);
    assert.deepEqual(verdict.payload.step_ids, completed.step_ids);
  }
  for (const status of ['done', 'blocked']) {
    const stale = transfer.put(dir, `${status}.json`, Buffer.from(JSON.stringify({ ...completed, status })));
    assert.equal(validateFile(dir, stale, 'terminal', { command: 'spec' }).outcome, 'report-invalid', status);
  }
  const outcome = transfer.put(dir, 'outcome.json', Buffer.from(JSON.stringify({ ...completed, outcome: 'no-changes' })));
  assert.equal(validateFile(dir, outcome, 'terminal', { command: 'design' }).outcome, 'report-invalid',
    'spec and design admit no outcome');
});

test('the plan workers report through the policy in the unified schema', () => {
  const common = read('sai/commands/plan/worker-common.md');
  assert.match(common, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its author side/);
  assert.match(common, /opens with the line `--report-dir <path>`/);
  assert.match(common, /status: completed \| needs_input \| failed \| cancelled/);
  assert.match(common, /`done` and `blocked` are retired/);
  assert.match(common, /step_ids: string\[\]/);
  assert.match(common, /A message that carries the result inline is an invalid report/);
  assert.doesNotMatch(common, /status: done \| needs_input \| blocked/);
  for (const file of ['sai/commands/spec/worker.md', 'sai/commands/design/worker.md', 'sai/commands/design/steps/design.md',
    'sai/commands/design/steps/overview.md', 'sai/commands/design/coordinator.md']) {
    const card = read(file);
    assert.doesNotMatch(card, /`blocked`|status: done|never report `done`/, `${file} keeps no retired status`);
  }
  assert.match(read('sai/commands/spec/worker.md'), /Report `failed` when the request cannot be translated/);
  assert.match(read('sai/commands/design/worker.md'), /is `failed`, naming the artifact/);
  assert.match(read('sai/commands/design/coordinator.md'), /A `failed` report that names a spec defect/);
});

test('the plan cycle opens and records the report directory, validates every report, and reuses it on resume', () => {
  const cycle = read('sai/commands/plan/cycle.md');
  assert.match(cycle, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its receiver side/);
  assert.match(cycle, /`transfer\.js open --harness <claude\|opencode>`[^\n]*emits `record` \(`report-dir`\)/);
  assert.match(cycle, /opens with the line `--report-dir <report directory>`/);
  assert.match(cycle, /validate --kind terminal --command <spec\|design> --json --report-dir <report directory> --report-file <path> --report-hash <sha256>/);
  assert.match(cycle, /before you read any field/);
  assert.match(cycle, /you never interpret a report by reading it/);
  assert.match(cycle, /second consecutive invalid report from that worker replaces it/);
  assert.match(cycle, /Its first task message opens with the same `--report-dir` line the run recorded/);
  assert.match(cycle, /The report directory in `report_dirs` is reused/);
  assert.match(cycle, /transfer\.js close --dir \{report directory\}/);
  assert.match(cycle, /emit `\{"step_ids": \[\.\.\.\]\}` to the machine, with the ids copied from its payload/);
  for (const name of ['spec', 'design']) {
    assert.match(read(`sai/commands/${name}/coordinator.md`), /opens with the `--report-dir` line the cycle's Reports names/);
  }
  const machine = require('../sai-state/machines/plan-run.js');
  const started = machine.transition(machine.initialState, { kind: 'start', dir: '/tmp/claude-1000/sai/plan-demo-1a2b' });
  const recorded = machine.transition(started.state, { kind: 'record', ref: 'report-dir', path: '/tmp/claude-1000/sai/sai-transfer-abc' });
  assert.equal(recorded.rejected, undefined);
  assert.deepEqual(recorded.state.report_dirs, ['/tmp/claude-1000/sai/sai-transfer-abc']);
  assert.deepEqual(machine.transition(machine.initialState, { kind: 'status' }).state.report_dirs, []);
});

test('the review worker reports progress and its terminal result as files, with no-changes as an outcome', () => {
  const worker = read('sai/commands/review/worker.md');
  assert.match(worker, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its author side/);
  assert.match(worker, /opens with the line `--report-dir <path>`/);
  assert.match(worker, /event: progress\nstep_ids: string\[\]/);
  assert.match(worker, /Its file name starts with `progress-`/);
  assert.match(worker, /`\[review-intake, establish-diff-scope\]` in the first progress report and `\[resolve-review-analysis\]` in the second/);
  assert.match(worker, /status: completed\noutcome: no-changes/);
  assert.match(worker, /review_path: string\ncounts: \{critical: n, high: n, medium: n, low: n, questions: n\}\nrecommended_audits: string/);
  assert.doesNotMatch(worker, /event: step-done|status: no-changes/);
  assert.match(worker, /`no-changes` is an `outcome` of a `completed` report, never a status/);
  assert.match(read('sai/commands/review/steps/establish-diff-scope.md'), /save a `completed` report with `outcome: no-changes`/);
  assert.match(read('sai/commands/review/steps/establish-diff-scope.md'), /`step_ids: \[review-intake, establish-diff-scope\]`/);
  assert.match(read('sai/commands/review/steps/resolve-review-analysis.md'), /`step_ids: \[resolve-review-analysis\]`/);
  for (const step of ['establish-diff-scope', 'resolve-review-analysis', 'close-review-outcome']) {
    assert.doesNotMatch(read(`sai/commands/review/steps/${step}.md`), /`step-done`/, step);
  }
});

test('the review coordinator validates every report and feeds progress reports to the step machine', () => {
  const card = read('sai/commands/review/coordinator.md');
  assert.match(card, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its receiver side/);
  assert.match(card, /Open the report directory of the run with `transfer\.js open --harness <claude\|opencode>`/);
  assert.match(card, /opens with the line `--report-dir <report directory>`/);
  assert.match(card, /a name that starts with `progress-` is a progress report, which the machine emit below verifies and validates itself, so you run no `validate` call for it/);
  assert.match(card, /validate --kind terminal --command review --json --report-dir <report directory> --report-file <path> --report-hash <sha256>/);
  assert.match(card, /Before you read any field/);
  assert.match(card, /including the retired `event: step-done`, is an invalid report/);
  assert.match(card, /`sai-state emit <id> review-steps@1 --progress --report-dir <report directory> --report-file <path> --report-hash <sha256>`/);
  assert.match(card, /the first progress report carries `review-intake` and `establish-diff-scope`/);
  assert.match(card, /when the emit fails, send the next pointer from the static order/);
  assert.match(card, /- `completed` with `outcome: no-changes`: print the worker's `summary`, which is exactly `No changes detected against \{parent-branch\}\. Nothing to review\.`, write no `review\.md`, commit nothing, and end the run with `Review done\.`/);
  assert.match(card, /`needs_input` or `cancelled` report is an obstacle/);
  assert.match(card, /transfer\.js close --dir <report directory>/);
  assert.doesNotMatch(card, /status: no-changes \| failed|event: step-done\nstep_id/);
});

test('build and deep-review read the empty diff from the accepted outcome', () => {
  assert.match(read('sai/commands/build/coordinator.md'), /Segment 2 found no changes against the parent branch\*\* \(its accepted report carries `outcome: no-changes`/);
  assert.match(read('sai/commands/build/coordinator.md'), /a segment 2 whose accepted report carries `outcome: no-changes` counts as completed/);
  const deep = read('sai/commands/deep-review/coordinator.md');
  assert.match(deep, /Segment 1 found no changes against the parent branch\*\* \(its accepted report carries `outcome: no-changes`/);
  assert.match(deep, /When segment 1's accepted report carries `outcome: no-changes`, the diff is empty: run no triage, no audit, no Assessment pass, and no fix segment/);
});

test('the spec, design, and review workers and their coordinators have the report grants on both harnesses', () => {
  const manifest = require('../sai/install-manifest.json');
  const { resolveProfile } = require('../bin/capabilities');
  const agents = manifest.capabilities.assignments.agents;
  for (const worker of ['sai-1-spec-proposal-worker', 'sai-2-design-worker', 'sai-4-review-worker']) {
    const shell = resolveProfile(manifest.capabilities, agents[worker]).shell;
    assert.ok(shell.includes('node {sai}/tools/transfer.js put *'), `${worker} may save a report`);
  }
  const commands = manifest.capabilities.assignments.commands;
  for (const command of ['sai-1-spec', 'sai-2-design', 'sai-plan', 'sai-4-review', 'sai-build', 'sai-deep-review']) {
    const shell = resolveProfile(manifest.capabilities, commands[command]).shell;
    const grants = tool => shell.includes('*') || shell.includes(`node {sai}/tools/${tool}`);
    assert.ok(grants('transfer.js open *'), `${command} may open the report directory`);
    assert.ok(grants('worker-report-validator.js *'), `${command} may validate a report`);
  }
});

// ─── Audit workers ───────────────────────────────────────────────────────────

test('the audit workers report progress, questions, and results as files through the policy', () => {
  const policy = read(POLICY);
  assert.match(policy, /the audit workers of `\/sai-5-security`, `\/sai-6-performance`, and `\/sai-7-accessibility`/);
  assert.match(policy, /`security`, `performance`, or `accessibility` for the audit worker of that audit/);
  const common = read('sai/commands/audit/worker-common.md');
  assert.match(common, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its author side/);
  assert.match(common, /preceded by the line `--report-dir <path>`/);
  assert.match(common, /Its file name starts with `progress-`/);
  assert.match(common, /event: progress\nstep_ids: string\[\]\nchanged_files: \[\]/);
  assert.match(common, /status: needs_input[\s\S]*question: string\noptions: \{label: string, value: string\}\[\]/);
  assert.match(common, /status: completed\nsummary: string\nchanged_files: string\[\]\nreport_path: string/);
  assert.match(common, /A message that carries the result inline is an invalid report/);
  assert.doesNotMatch(common, /event: step-done|event: question\n/);
  for (const audit of ['security', 'performance', 'accessibility']) {
    assert.doesNotMatch(read(`sai/commands/${audit}/worker.md`), /`step-done`/, audit);
    for (const file of fs.readdirSync(path.join(__dirname, '..', 'sai/commands', audit, 'steps'))) {
      assert.doesNotMatch(read(`sai/commands/${audit}/steps/${file}`), /`step-done`/, `${audit}/steps/${file}`);
    }
  }
});

test('the audit coordinator opens a report directory per cycle, validates every report, and feeds progress to the machine', () => {
  const card = read('sai/commands/audit/coordinator.md');
  assert.match(card, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its receiver side/);
  assert.match(card, /Open the report directory of the cycle with `transfer\.js open --harness <claude\|opencode>`/);
  assert.match(card, /opens with the line `--report-dir <report directory>`/);
  assert.match(card, /a progress report, which the machine emit below verifies and validates itself, so you run no `validate` call for it/);
  assert.match(card, /validate --kind terminal --command \{audit\} --json --report-dir <report directory> --report-file <path> --report-hash <sha256>/);
  assert.match(card, /including the retired `event: step-done` and `event: question`, is an invalid report/);
  assert.match(card, /`sai-state emit <id> \{audit\}-steps@1 --progress --report-dir <report directory> --report-file <path> --report-hash <sha256>`/);
  assert.match(card, /never rewriting the payload/);
  assert.match(card, /second consecutive invalid report from that worker replaces it/);
  assert.match(card, /transfer\.js close --dir <report directory>/);
  assert.doesNotMatch(card, /emit its `step_ids` to the machine as/);
});

test('deep-review opens a report directory per audit cycle and validates and emits audit reports one at a time', () => {
  const card = read('sai/commands/deep-review/coordinator.md');
  assert.match(card, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its receiver side/);
  assert.match(card, /its steps 5 and 6 of Start/);
  assert.match(card, /Each activated audit cycle opens its own report directory/);
  assert.match(card, /You validate every audit report[^\n]*and issue every `sai-state` call and every commit one at a time, in the fixed order security, performance, accessibility/);
  assert.match(card, /`sai-state emit <id> \{audit\}-steps@1 --progress --report-dir <report directory> --report-file <path> --report-hash <sha256>`/);
  assert.match(card, /A worker `needs_input` report is answered by you/);
  assert.match(card, /a cycle recorded as `failed` keeps it/);
});

test('the audit workers and commands have the report grants on both harnesses', () => {
  const manifest = require('../sai/install-manifest.json');
  const { resolveProfile } = require('../bin/capabilities');
  const agents = manifest.capabilities.assignments.agents;
  for (const worker of ['sai-5-security-worker', 'sai-6-performance-worker', 'sai-7-accessibility-worker']) {
    const shell = resolveProfile(manifest.capabilities, agents[worker]).shell;
    assert.ok(shell.includes('node {sai}/tools/transfer.js put *'), `${worker} may save a report`);
  }
  const commands = manifest.capabilities.assignments.commands;
  for (const command of ['sai-5-security', 'sai-6-performance', 'sai-7-accessibility', 'sai-deep-review']) {
    const shell = resolveProfile(manifest.capabilities, commands[command]).shell;
    const grants = tool => shell.includes('*') || shell.includes(`node {sai}/tools/${tool}`);
    assert.ok(grants('transfer.js open *'), `${command} may open the report directory`);
    assert.ok(grants('worker-report-validator.js *'), `${command} may validate a report`);
  }
});

test('the audit progress report advances the step machine through the progress emit', t => {
  const payload = { event: 'progress', step_ids: ['resolve-security-scope', 'discover-module-map'], changed_files: [] };
  const { dir, reference } = fixture(t, Buffer.from(JSON.stringify(payload)));
  const accepted = validateFile(dir, reference, 'progress');
  assert.equal(accepted.outcome, 'accepted');
  const completed = { status: 'completed', summary: 'Wrote security.md.', changed_files: ['openspec/changes/x/security.md'],
    report_path: 'openspec/changes/x/security.md', counts: { critical: 0, high: 1, medium: 0, low: 0 } };
  for (const command of ['security', 'performance', 'accessibility']) {
    // The security audit has no informational count; the other two carry one.
    const counts = command === 'security' ? completed.counts : { ...completed.counts, informational: 0 };
    const done = transfer.put(dir, `completed-${command}.json`, Buffer.from(JSON.stringify({ ...completed, counts })));
    assert.equal(validateFile(dir, done, 'terminal', { command }).outcome, 'accepted', command);
  }
  const mismatched = transfer.put(dir, 'completed-mismatch.json', Buffer.from(JSON.stringify(completed)));
  assert.equal(validateFile(dir, mismatched, 'terminal', { command: 'performance' }).outcome, 'report-invalid', 'counts follow the audit');
  const legacy = transfer.put(dir, 'legacy-question.json', Buffer.from(JSON.stringify({ event: 'question', question: 'Which scope?' })));
  assert.equal(validateFile(dir, legacy, 'terminal', { command: 'security' }).outcome, 'report-invalid');
});

// ─── Commit, archive, backfill, and merge workers ────────────────────────────

test('the policy covers the commit, archive, backfill, and merge workers on their standalone routes', () => {
  const policy = read(POLICY);
  assert.match(policy, /the commit, archive, backfill, and merge workers of `\/sai-commit`, `\/sai-archive`, `\/sai-backfill`, and `\/sai-merge`/);
  assert.match(policy, /`commit`, `archive`, `backfill`, or `merge` for the worker of that command/);
  assert.match(policy, /\| `backfill` \| backfill \| `resolved_change_name`, `draft_references`, `corrected_specs`, `failure_class`, `unrecoverable` \|/);
  assert.match(policy, /\| `merge` \| merge \| `strategy`, `decisions`, `escalations`, `analysis`, `corrections`, `applicability`, `renames`, `reference_updates` \|/);
  assert.doesNotMatch(policy, /standalone backfill and archive commands keep their existing transport/);
});

test('the commit, archive, and backfill workers report as files and their coordinators validate before reading', () => {
  const commands = { commit: 'commit', archive: 'archive', backfill: 'backfill' };
  for (const command of Object.keys(commands)) {
    const worker = read(`sai/commands/${command}/worker.md`);
    assert.match(worker, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its author side for every report/, command);
    assert.match(worker, /--report-dir/, command);
    assert.match(worker, /a result carried inline is an\s+invalid report|message that carries the result inline is an invalid report/, command);
    assert.doesNotMatch(worker, /final message, in the shape|The coordinator reads only your final message/, command);
    const coordinator = read(`sai/commands/${command}/coordinator.md`);
    assert.match(coordinator, /Fetch `@sai\/policies\/worker-report-transport.md` and follow its receiver side/, command);
    assert.match(coordinator, new RegExp(`validate --kind terminal --command ${commands[command]} --json --report-dir`), command);
    assert.match(coordinator, /transfer\.js (open|close)|`node <tool-path> open --harness|--report-dir <report directory>/, command);
    assert.match(coordinator, /second consecutive invalid report from that worker replaces it/, command);
  }
  assert.match(read('sai/commands/commit/worker.md'), /status: needs_input\nsummary: string\nchanged_files: \[\]\nquestion: string/);
  assert.match(read('sai/commands/backfill/worker.md'), /`--report-dir <absolute path>`[\s\S]*`--transfer-dir <absolute path>`/);
  assert.match(read('sai/commands/backfill/worker.md'), /`draft_references` field/);
  assert.match(read('sai/commands/backfill/coordinator.md'), /`--report-dir <report dir>` and `--transfer-dir <transfer dir>`, in that order/);
  assert.match(read('sai/commands/archive/coordinator.md'), /`corrected_specs` field of a report you validate with `--command backfill`/);
  assert.match(read('sai/commands/archive/worker.md'), /on\severy route/);
});

test('the merge worker reports failed instead of blocked and its coordinator validates every report', () => {
  const worker = read('sai/commands/merge/worker.md');
  assert.match(worker, /return a `failed` report with the blocker and the affected path in `summary`/);
  assert.match(worker, /`blocked`, `done`, and `escalate` are outside the schema/);
  assert.doesNotMatch(worker, /`status` is `blocked`/);
  for (const step of ['strategy', 'test-correction', 'renumbering-plan']) {
    const text = read(`sai/commands/merge/steps/${step}.md`);
    assert.match(text, /status: completed \| failed/, step);
    assert.doesNotMatch(text, /status: done|\| blocked|`blocked`/, step);
  }
  const coordinator = read('sai/commands/merge/coordinator.md');
  assert.match(coordinator, /validate --kind terminal --command merge --json --report-dir/);
  assert.match(coordinator, /emit `record` \(`report-dir`\)/);
  assert.match(coordinator, /`--report-dir <report directory>`/);
  assert.doesNotMatch(coordinator, /reports\/stop-/);
  assert.match(read('sai/tools/merge.js'), /validateText\(source, 'terminal', \{ command: 'merge' \}\)/);
});

test('a blocked merge report is invalid and a failed one is accepted', t => {
  const failed = { status: 'failed', summary: 'The bundle cannot be read: src/a.js', changed_files: [] };
  const { dir, reference } = fixture(t, Buffer.from(JSON.stringify(failed)));
  assert.equal(validateFile(dir, reference, 'terminal', { command: 'merge' }).outcome, 'accepted');
  const blocked = transfer.put(dir, 'blocked.json', Buffer.from(JSON.stringify({ ...failed, status: 'blocked' })));
  assert.equal(validateFile(dir, blocked, 'terminal', { command: 'merge' }).outcome, 'report-invalid');
  const escalate = transfer.put(dir, 'escalate.json', Buffer.from(JSON.stringify({ ...failed, status: 'escalate' })));
  assert.equal(validateFile(dir, escalate, 'terminal', { command: 'merge' }).outcome, 'report-invalid');
  const commit = transfer.put(dir, 'commit.json', Buffer.from(JSON.stringify({ status: 'needs_input', summary: 'Staged files.',
    changed_files: [], question: 'Commit?', options: [{ label: 'Yes', value: 'yes' }] })));
  assert.equal(validateFile(dir, commit, 'terminal', { command: 'commit' }).outcome, 'accepted');
});

test('the commit, archive, backfill, and merge workers and commands have the report grants', () => {
  const manifest = require('../sai/install-manifest.json');
  const { resolveProfile } = require('../bin/capabilities');
  const agents = manifest.capabilities.assignments.agents;
  for (const worker of ['sai-commit-worker', 'sai-archive-worker', 'sai-backfill-worker', 'sai-merge-worker']) {
    const shell = resolveProfile(manifest.capabilities, agents[worker]).shell;
    assert.ok(shell.includes('*') || shell.includes('node {sai}/tools/transfer.js put *'), `${worker} may save a report`);
  }
  const commands = manifest.capabilities.assignments.commands;
  for (const command of ['sai-commit', 'sai-archive', 'sai-backfill', 'sai-merge']) {
    const shell = resolveProfile(manifest.capabilities, commands[command]).shell;
    const grants = tool => shell.includes('*') || shell.includes(`node {sai}/tools/${tool}`);
    assert.ok(grants('transfer.js open *'), `${command} may open the report directory`);
    assert.ok(grants('worker-report-validator.js *'), `${command} may validate a report`);
  }
});

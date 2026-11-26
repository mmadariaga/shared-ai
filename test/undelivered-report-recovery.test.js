'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const POLICY = 'sai/policies/worker-report-transport.md';

// Every coordinator that receives reports through the transport policy (E14 leaves out the POC).
const COORDINATORS = [
  'sai/commands/implement/coordinator.md',
  'sai/commands/review/coordinator.md',
  'sai/commands/audit/coordinator.md',
  'sai/commands/deep-review/coordinator.md',
  'sai/commands/plan/cycle.md',
  'sai/commands/commit/coordinator.md',
  'sai/commands/archive/coordinator.md',
  'sai/commands/backfill/coordinator.md',
  'sai/commands/merge/coordinator.md',
  'sai/commands/explore/direct-build-coordinator.md',
];

function section(text, heading) {
  const start = text.indexOf(`## ${heading}`);
  assert.ok(start >= 0, `${heading} section exists`);
  const next = text.indexOf('\n## ', start + 3);
  return text.slice(start, next < 0 ? undefined : next);
}

test('the transport policy owns the reception rules in one section', () => {
  const text = section(read(POLICY), 'Undelivered reports');
  assert.match(text, /single source of how; a coordinator points here and does not restate it/);
  assert.match(text, /on Claude Code and opencode alike, whether cache warming is on or off/);
  assert.match(text, /covers the budget agents too[\s\S]{0,80}does not cover the `--no-specs` POC/);
  assert.match(text, /\*\*Ledger\*\*: the reserved file `\.sai-accepted` in the report directory, the only memory of accepted references/);
  assert.match(text, /`receive` \(§ Receiver boundary\) records each reference it handles, in the same call that checks and validates it/);
  assert.match(text, /a reference in the ledger is not processed again/);
  assert.match(text, /run `receive`\. When it answers `already: true`, treat the reference like a wake acknowledgement: validate nothing, emit nothing, spend no attempt, send no continuation/);
  assert.match(text, /watch --dir <report-dir> --input-file <paths-file> --cwd <project-root>` in the background \(Claude Code `Bash` with `run_in_background: true`[\s\S]{0,120}opencode shell with `background: true`\)/);
  assert.doesNotMatch(text, /with its defaults/);
  assert.match(text, /`--input-file` is required: a watch without it exits 2 naming the flag and starts nothing, and the relaunch with the file spends no obstacle attempt/);
  assert.match(text, /`\[\]` is valid when the report directory is the only place the worker writes/);
  assert.match(text, /Every relaunch of a watch for the same worker task[\s\S]{0,120}passes the same file/);
  assert.match(text, /`walk_limited`/);
  assert.match(text, /whatever the warming setting/);
  assert.match(text, /no model turn runs while nothing happens/);
  assert.match(text, /process each in creation order exactly as if the worker had delivered it/);
  assert.match(text, /same invalid-report recovery with its obstacle attempt/);
  assert.match(text, /`receive` has recorded a report that fails validation, so the watch does not report it again/);
  assert.match(text, /When the watch ends with an empty list, launch it again\. Send nothing to the worker and write nothing to the user/);
  assert.match(text, /stop the watch \(Claude Code `TaskStop`, opencode removal of its shell\)/);
  assert.match(text, /A worker message that is a protocol literal is not a result: keep waiting with the watch armed/);
  assert.match(text, /\*\*Reply without a reference\.\*\* A worker message that carries no report reference and is not a protocol literal[\s\S]{0,200}"Ending this turn"[\s\S]{0,200}waiting for a `silent` end of the watch is not the recovery/);
  assert.match(text, /--settle 0s --max 1s/, 'the immediate scan reuses `watch` as a one-shot, with no new flag');
  assert.match(text, /When it finds none, the message is an invalid report[\s\S]{0,260}a second consecutive one replaces the worker, each spends one attempt, and the exhausted budget escalates with options/);
  assert.match(text, /Watch each report directory separately and attribute a report to the worker of its directory/);
  assert.match(text, /print one notice and go on without it: the run does not stop/);
  assert.match(text, /Only the watch looks for undelivered reports; a warming notification does not trigger report polling/);
  assert.match(text, /`\.draft\.` is a draft, never a report/);
});

test('every report-receiving coordinator points to the reception section and does not restate it', () => {
  for (const file of COORDINATORS) {
    const text = read(file);
    assert.match(text, /worker-report-transport\.md` § Undelivered reports/, file);
    assert.doesNotMatch(text, /transfer\.js watch|\.sai-accepted|--settle|--max 30m/, `${file} restates no mechanics`);
  }
});

test('deep-review watches each audit cycle on its own report directory', () => {
  assert.match(read('sai/commands/deep-review/coordinator.md'), /one watch per cycle on that cycle's own report directory and its own writable paths \(that audit's report and scratch folder only\): a report found there belongs to that cycle's worker/);
});

test('the wake of a worker keeps its report protocol while main-session continuity does not poll for reports', () => {
  const policy = read('sai/policies/cache-warming.md');
  assert.match(policy, /A subagent replies with the wake literal, or with the repeat of its last result/);
  assert.match(policy, /\*\*Repeat the last result\.\*\* A worker whose last real message was a result[\s\S]{0,120}has received no real message since replies to a `continue` wake with that message instead of the wake literal/);
  assert.match(policy, /the same reference and the same `warming:` line, verbatim, and nothing else/);
  assert.match(policy, /A repeat is not a new real message: it restarts no window/);
  assert.match(policy, /Once the dispatcher sends the worker a real message, the worker's wakes reply with the wake literal again; a `finished` wake replies with the wake literal, and every wake after a `dispose` replies with the stop literal/);
  assert.match(policy, /\*\*Real message\*\*: any message to or from an agent except a wake acknowledgement \(§ Wake acknowledgement\) and a wake's repeat of the last result\./, 'a repeat is not a real message, so it restarts no window');
  assert.match(policy, /A subagent wake performs no work\. Run no tool other than the re-arm, send no report, emit no stage or progress event, and write nothing\./);
  assert.match(policy, /Main-session work comes only from the current conversation and command contract/);
  assert.match(policy, /treats the repeat like a wake acknowledgement \(`@sai\/policies\/worker-report-transport\.md` § Undelivered reports\)/);
});

test('the coordinator profile grants transfer.js accept, receive, status, and watch on both harnesses', () => {
  const manifest = require('../sai/install-manifest.json');
  const { resolveProfile, translate } = require('../bin/capabilities');
  assert.ok(manifest.capabilities.profiles.coordinator.shell.includes('node {sai}/tools/transfer.js accept *'));
  assert.ok(manifest.capabilities.profiles.coordinator.shell.includes('node {sai}/tools/transfer.js watch *'));
  assert.ok(manifest.capabilities.profiles.coordinator.shell.includes('node {sai}/tools/transfer.js receive *'));
  assert.ok(manifest.capabilities.profiles.coordinator.shell.includes('node {sai}/tools/transfer.js status *'));
  const commands = manifest.capabilities.assignments.commands;
  for (const command of ['sai-1-spec', 'sai-2-design', 'sai-plan', 'sai-3-implement', 'sai-4-review', 'sai-build', 'sai-deep-review',
    'sai-5-security', 'sai-6-performance', 'sai-7-accessibility', 'sai-commit', 'sai-archive', 'sai-backfill', 'sai-merge', 'sai-explore']) {
    const shell = resolveProfile(manifest.capabilities, commands[command]).shell;
    const grants = tool => shell.includes('*') || shell.includes(`node {sai}/tools/${tool}`) || shell.includes('node {sai}/*');
    assert.ok(grants('transfer.js accept *'), `${command} may record an accepted reference`);
    assert.ok(grants('transfer.js receive *'), `${command} may receive a worker report`);
    assert.ok(grants('transfer.js status *'), `${command} may query the activity of a worker`);
    assert.ok(grants('transfer.js watch *'), `${command} may watch the report directory`);
  }
  const grants = translate(manifest.capabilities, 'coordinator', 'claude');
  const opencode = translate(manifest.capabilities, 'coordinator', 'opencode');
  for (const verb of ['accept', 'receive', 'status', 'watch']) {
    assert.ok(grants.allowedTools.includes(`Bash(node ~/.claude/sai/tools/transfer.js ${verb}:*)`), `claude ${verb}`);
    assert.ok(opencode.permissions.some(rule => rule.action === 'shell' && rule.resource === `node ~/.config/opencode/sai/tools/transfer.js ${verb} *` && rule.effect === 'allow'), `opencode ${verb}`);
  }
});

test('every report-receiving coordinator states the writable paths of its worker as a fact of its card', () => {
  for (const file of COORDINATORS) {
    assert.match(read(file), /writable paths|`--input-file`/, `${file} names the writable paths of its worker`);
  }
  for (const file of ['sai/commands/review/coordinator.md', 'sai/commands/audit/coordinator.md']) {
    assert.match(read(file), /scratch folder/, `${file} opens a scratch folder`);
    assert.match(read(file), /transfer\.js open/, file);
  }
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /`Scratch folder: <path>` line/);
});

test('the worker lifecycle policy sends long command output to the scratch folder of the brief', () => {
  const text = read('sai/policies/worker-lifecycle.md');
  assert.match(text, /A worker whose brief names a scratch folder sends the output of any command that can run long[\s\S]{0,200}to a log in that folder/);
  assert.match(text, /A worker whose brief names no scratch folder has no such duty/);
  for (const file of ['sai/commands/explore/direct-build-worker.md', 'sai/commands/plan/worker-common.md', 'sai/commands/review/worker.md', 'sai/commands/audit/worker-common.md', 'sai/commands/merge/worker.md']) {
    assert.match(read(file), /[Ss]cratch folder/, `${file} receives a scratch folder`);
  }
});

test('every report-receiving coordinator points to receive instead of the paired check, the validator call, and the separate record', () => {
  for (const file of COORDINATORS) {
    const text = read(file);
    assert.doesNotMatch(text, /record each reference you process|ignore a reference you already accepted|accept --check/, `${file} names no separate duplicate check or record`);
    assert.doesNotMatch(text, /validate --kind terminal --command [^\n]*--report-dir/, `${file} runs no separate validate call for a worker report`);
  }
  for (const file of COORDINATORS) {
    assert.match(read(file), /`receive`|receive --kind|`transfer\.js receive/, `${file} names receive`);
  }
});

test('the waiting rules live in the transport policy: roles named, status on request and on a coordinator wake, no status request to a worker', () => {
  const policy = read(POLICY).replace(/\s+/g, ' ');
  assert.match(policy, /\*\*Waiting messages\.\*\* Every message you print about a wait names the role of the worker it waits on: spec, design, plan RED, fix RED, GREEN, review, security, performance, accessibility, commit, archive, backfill, merge, or Direct Build implementer/);
  assert.match(policy, /This rule is the only statement of it; a card does not repeat it/);
  assert.match(policy, /\*\*Status\.\*\* To show whether a worker is still working, run the one-shot `node <tool-path> status --dir <report-dir> --input-file <paths-file> --cwd <project-root> --role <role>/);
  assert.match(policy, /on each of your own cache-warm wakes while you wait/);
  assert.match(policy, /several workers waited on at once take several calls in one same-turn batch and print one line each, every line naming its own role/);
  assert.match(policy, /When `unledgered` lists a report, run `receive` on it in the same turn/);
  assert.match(policy, /Never ask the worker for its status/);
  assert.match(policy, /\*\*Relaunch\.\*\* The `watch` field of every `receive` answer is the exact command that watches that report directory/);
  assert.match(policy, /At the worker's last use, launch nothing: stop the watch/);
  for (const file of COORDINATORS) {
    assert.doesNotMatch(read(file), /names the role of the worker/, `${file} does not restate the role rule`);
  }
});

test('cache-warming prints the activity line on a coordinator wake during a worker wait and keeps the literal otherwise', () => {
  const policy = read('sai/policies/cache-warming.md').replace(/\s+/g, ' ');
  assert.match(policy, /while the session waits for the result of a worker[\s\S]{0,260}run `status` for each worker it waits on as that policy's § Status says and print each activity line, which names the worker's role, as the only text of the turn in place of the literal/);
  assert.match(policy, /A wake with no worker being waited on keeps the literal, and with warming off no wake occurs, so the activity line then appears only when the user asks for it/);
  assert.match(policy, /Several workers waited on at once give one line per worker/);
});

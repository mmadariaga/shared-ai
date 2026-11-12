'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const POLICY = 'sai/policies/worker-report-transport.md';

// Every coordinator that receives reports through the transport policy (E14 leaves out the budget helpers and the POC).
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
  assert.match(text, /does not cover the `budget-\*` helpers[\s\S]{0,80}`--no-specs` POC/);
  assert.match(text, /\*\*Ledger\*\*: the reserved file `\.sai-accepted` in the report directory, the only memory of accepted references/);
  assert.match(text, /accept --dir <report-dir> --path <path> --sha256 <sha256>/);
  assert.match(text, /a reference in the ledger is not processed again/);
  assert.match(text, /`--check`[\s\S]{0,80}`already: true`, treat the reference like an `ok`: validate nothing, emit nothing, spend no attempt, send no continuation/);
  assert.match(text, /watch --dir <report-dir>` in the background \(Claude Code `Bash` with `run_in_background: true`[\s\S]{0,120}opencode shell with `background: true`\)/);
  assert.match(text, /whatever the warming setting/);
  assert.match(text, /no model turn runs while nothing happens/);
  assert.match(text, /process each in creation order exactly as if the worker had delivered it/);
  assert.match(text, /same invalid-report recovery with its obstacle attempt/);
  assert.match(text, /When the watch ends with an empty list, launch it again\. Send nothing to the worker and write nothing to the user/);
  assert.match(text, /stop the watch \(Claude Code `TaskStop`, opencode removal of its shell\)/);
  assert.match(text, /neither a reference nor `ok`[\s\S]{0,80}is not a result: keep waiting with the watch armed/);
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
  assert.match(read('sai/commands/deep-review/coordinator.md'), /one watch per cycle on that cycle's own report directory: a report found there belongs to that cycle's worker/);
});

test('the wake of a worker keeps its report protocol while main-session continuity does not poll for reports', () => {
  const policy = read('sai/policies/cache-warming.md');
  assert.match(policy, /A subagent replies with the single word `ok`, or with the repeat of its last result/);
  assert.match(policy, /\*\*Repeat the last result\.\*\* A worker whose last real message was a result[\s\S]{0,120}has received no real message since replies to a `continue` wake with that message instead of `ok`/);
  assert.match(policy, /the same reference and the same `warming:` line, verbatim, and nothing else/);
  assert.match(policy, /A repeat is not a new real message: it restarts no window/);
  assert.match(policy, /Once the dispatcher sends the worker a real message, the worker's wakes reply `ok` again; a `finished` wake replies `ok`, and so does every wake after a `dispose`/);
  assert.match(policy, /\*\*Real message\*\*: any message to or from an agent except the `ok` of a wake, the `ok` of a `dispose`, and a wake's repeat of the last result\./, 'a repeat is not a real message, so it restarts no window');
  assert.match(policy, /A subagent wake performs no work\. Run no tool other than the re-arm, send no report, emit no stage or progress event, and write nothing\./);
  assert.match(policy, /Main-session work comes only from the current conversation and command contract/);
  assert.match(policy, /treats the repeat like an `ok` \(`@sai\/policies\/worker-report-transport\.md` § Undelivered reports\)/);
});

test('the coordinator profile grants transfer.js accept and watch on both harnesses', () => {
  const manifest = require('../sai/install-manifest.json');
  const { resolveProfile, translate } = require('../bin/capabilities');
  assert.ok(manifest.capabilities.profiles.coordinator.shell.includes('node {sai}/tools/transfer.js accept *'));
  assert.ok(manifest.capabilities.profiles.coordinator.shell.includes('node {sai}/tools/transfer.js watch *'));
  const commands = manifest.capabilities.assignments.commands;
  for (const command of ['sai-1-spec', 'sai-2-design', 'sai-plan', 'sai-3-implement', 'sai-4-review', 'sai-build', 'sai-deep-review',
    'sai-5-security', 'sai-6-performance', 'sai-7-accessibility', 'sai-commit', 'sai-archive', 'sai-backfill', 'sai-merge', 'sai-explore']) {
    const shell = resolveProfile(manifest.capabilities, commands[command]).shell;
    const grants = tool => shell.includes('*') || shell.includes(`node {sai}/tools/${tool}`) || shell.includes('node {sai}/*');
    assert.ok(grants('transfer.js accept *'), `${command} may record an accepted reference`);
    assert.ok(grants('transfer.js watch *'), `${command} may watch the report directory`);
  }
  const grants = translate(manifest.capabilities, 'coordinator', 'claude');
  const opencode = translate(manifest.capabilities, 'coordinator', 'opencode');
  for (const verb of ['accept', 'watch']) {
    assert.ok(grants.allowedTools.includes(`Bash(node ~/.claude/sai/tools/transfer.js ${verb}:*)`), `claude ${verb}`);
    assert.ok(opencode.permissions.some(rule => rule.action === 'shell' && rule.resource === `node ~/.config/opencode/sai/tools/transfer.js ${verb} *` && rule.effect === 'allow'), `opencode ${verb}`);
  }
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const flat = file => read(file).replace(/\s+/g, ' ');

const POINTER = '`@sai/policies/worker-lifecycle.md` § Continuation timing';
const GATE = /completed. task notification|`completed` notification|status: completed. for|handback alone never marks|only after the worker's completion/i;

const CLAUDE_SITES = [
  'sai/orchestration/workers/bindings/claude/standalone-worker-template.md',
  'skills/claude/budget-explorer/SKILL.md',
  'skills/claude/budget-executor/SKILL.md',
  'skills/claude/budget-subagent/SKILL.md',
  'sai/commands/explore/body.md',
];

const COORDINATORS = [
  'sai/commands/implement/coordinator.md',
  'sai/commands/review/coordinator.md',
  'sai/commands/audit/coordinator.md',
  'sai/commands/plan/cycle.md',
];

test('worker-lifecycle holds the single Continuation timing section', () => {
  const text = read('sai/policies/worker-lifecycle.md');
  assert.equal(text.match(/^## Continuation timing$/gm).length, 1);
  const section = text.split('## Continuation timing')[1].split(/^## /m)[0].replace(/\s+/g, ' ');
  assert.match(section, /optimistic send/i);
  assert.match(section, /as soon as the handback arrives, without waiting for the subagent's `completed` notification/);
  assert.match(section, /`event: ready` again, or a report reference already accepted/);
  assert.match(section, /matched to the subagent by task ID, and send the same message again once/);
  assert.match(section, /already arrived by the time the rejection is read, resend at once/);
  assert.match(section, /each rejection waits only for the notification of its own subagent/);
  assert.match(section, /second rejection of the same message is an obstacle of the current step under `@sai\/policies\/obstacle-escalation\.md`/);
  assert.match(section, /helper whose message is rejected twice counts as a failed helper dispatch/);
  assert.match(section, /No timer or wake process is added/);
  assert.match(section, /stop call at a dispose point is not a continuation and never waits for a notification/);
  assert.match(section, /opencode as the main harness, and an agent routed through `@sai\/policies\/opencode-dispatch\.md`, continue a subagent only after its turn has ended/);
});

for (const site of CLAUDE_SITES) {
  test(`${site} points to Continuation timing without restating the gate`, () => {
    const text = flat(site);
    assert.ok(text.includes(POINTER), `${site} must point to the section`);
    assert.doesNotMatch(text, GATE);
  });
}

test('the Claude panel adapter sends the progress continuation in the panel-update turn', () => {
  const text = flat('sai/adapters/claude/panel-render.md');
  assert.match(text, /`TaskCreate` if needed\) plus `SendMessage` in the same assistant turn/);
  assert.doesNotMatch(text, GATE);
});

for (const coordinator of COORDINATORS) {
  test(`${coordinator} keeps the completion-notification wait for opencode only`, () => {
    const text = flat(coordinator);
    assert.match(
      text,
      /`SendMessage` to the captured agent ID on Claude Code, `subagent` with the same `agent` and the captured `sessionID` on opencode\. On Claude Code the timing of each continuation is that of `@sai\/policies\/worker-lifecycle\.md` § Continuation timing; on opencode, send it after the worker's completion notification has arrived\./,
    );
    assert.equal(text.match(/completion notification has arrived/g).length, 1);
  });
}

test('the transport Duplicate rule names the rejected-continuation exception', () => {
  const text = flat('sai/policies/worker-report-transport.md');
  assert.match(text, /a repeated reference that answers a message the coordinator sent is a rejected continuation, handled under `@sai\/policies\/worker-lifecycle\.md` § Continuation timing, not a duplicate/);
});

test('opencode dispatch sources keep their continue-after-turn-end rule', () => {
  assert.match(flat('sai/orchestration/workers/bindings/opencode/standalone-worker-template.md'), /only after the worker's completion notification has arrived/);
  for (const name of ['explorer', 'executor', 'subagent']) {
    assert.doesNotMatch(read(`skills/opencode/budget-${name}/SKILL.md`), /Continuation timing/);
  }
  assert.doesNotMatch(read('sai/policies/opencode-dispatch.md'), /Continuation timing/);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const POLICY = 'sai/policies/executor-agent.md';
const SKILLS = [
  'skills/claude/budget-executor/SKILL.md',
  'skills/opencode/budget-executor/SKILL.md',
];

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function section(text, heading) {
  const start = text.indexOf(`## ${heading}`);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const next = text.indexOf('\n## ', start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

function dispatcherLine(text) {
  const spawn = section(text, 'Spawn prompt');
  const lines = spawn.split('\n').filter((line) => /obstacle-escalation\.md/.test(line));
  assert.equal(lines.length, 1, 'Spawn prompt carries exactly one dispatcher line');
  return lines[0];
}

test('executor policy states the single final report rule', () => {
  const policy = read(POLICY);
  assert.doesNotMatch(policy, /## Long-running commands/);
  const long = section(policy, 'Choosing the command');
  assert.match(long, /longest timeout the active harness's shell allows/);
  assert.match(long, /600000 ms/);
  assert.match(long, /in the background/);
  assert.match(long, /Never report while a requested command is still running/);
  assert.match(long, /Failed with that reason and the path of its output log/);
  const report = section(policy, 'Report');
  assert.match(report, /One report per task message/);
  assert.match(report, /`pending`, `running`, or a promise of later results is never an entry/);
});

test('executor policy keeps its existing rules', () => {
  const policy = read(POLICY);
  assert.match(policy, /run it verbatim/);
  assert.match(policy, /narrowest command/);
  assert.match(policy, /no retry, workaround, or file edit/);
  assert.match(policy, /Keep the report low-output/);
  assert.match(policy, /`warming: false`/);
});

test('executor policy never tells the executor to resend a delivered result', () => {
  assert.doesNotMatch(read(POLICY), /SendMessage/);
});

test('both budget-executor skills carry the same dispatcher line', () => {
  const lines = SKILLS.map((file) => dispatcherLine(read(file)));
  assert.match(lines[0], /obstacle/);
  assert.match(lines[0], /do not wait for a later message from that executor/);
  assert.equal(lines[0], lines[1]);
});

test('dispatching cards stay free of the executor wait rule', () => {
  for (const file of [
    'sai/commands/explore/direct-build-coordinator.md',
    'sai/commands/implement/coordinator.md',
    'sai/commands/plan/cycle.md',
  ]) {
    assert.doesNotMatch(read(file), /do not wait for a later message from that executor/);
  }
});

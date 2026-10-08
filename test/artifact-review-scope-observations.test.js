'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const CONTRACT = 'sai/policies/artifact-review-contract.md';
const POINTER = /artifact-review-contract\.md`? § Scope observations/;

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function section(source, heading) {
  const start = source.indexOf(`\n## ${heading}\n`);
  assert.notEqual(start, -1, `## ${heading} should exist`);
  const next = source.indexOf('\n## ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test('the review contract defines the scope observation and the approved scope of each phase', () => {
  const scope = section(read(CONTRACT), 'Scope observations');

  assert.match(scope, /\*\*approved scope\*\*/);
  assert.match(scope, /`proposal\.md` and `specs\/\*\*`, what the `Ready to Propose` block asks for/);
  assert.match(scope, /`design\.md`, `tasks\.md`, and `interfaces\.md`, what the approved `proposal\.md` and `specs\/\*\*` ask for/);
  assert.match(scope, /\*\*scope observation\*\* is a true observation whose fix requires behavior the approved scope does not ask for/);
});

test('the review contract keeps omissions, contradictions, and added behavior as findings', () => {
  const scope = section(read(CONTRACT), 'Scope observations');

  assert.match(scope, /omits or contradicts something the approved scope asks for, or adds behavior the approved scope does not ask for: a finding/);
});

test('a scope observation carries no severity or identifier and stays out of the findings block and tally', () => {
  const scope = section(read(CONTRACT), 'Scope observations');

  assert.match(scope, /no severity and no identifier/);
  assert.match(scope, /outside the findings block and outside the `Summary:` counts/);
  assert.match(scope, /extends no review round, hands the worker nothing to correct, and raises no user question/);
});

test('the review contract pins the report line form and omits the section when empty', () => {
  const scope = section(read(CONTRACT), 'Scope observations');

  assert.match(scope, /^- <observation> — consequence: <[^>]+>$/m);
  assert.match(scope, /label `Scope observations`, one line each/);
  assert.match(scope, /no such section when there is none/);
});

test('the High severity measures incompleteness against the approved scope', () => {
  const severity = section(read(CONTRACT), 'Severity');

  assert.match(severity, /"Incomplete" is measured against the approved scope \(§ Scope observations\)/);
});

test('the severity vocabulary, finding shape, identifier scheme, and tally form are unchanged', () => {
  const contract = read(CONTRACT);

  assert.match(contract, /closed set `High`, `Medium`, or `Low`/);
  assert.match(contract, /Every finding carries exactly five fields, in this order/);
  assert.match(contract, /`Summary: High=<count> Medium=<count> Low=<count>`/);
  assert.match(section(contract, 'Identifier scheme'), /severity's initial \(`H`, `M`, or `L`\)/);
});

test('every explore review surface points to the contract section without restating the definition', () => {
  for (const file of [
    'sai/commands/explore/steps/pipeline-plan-unattended.md',
    'sai/commands/explore/steps/review-loop.md',
    'sai/commands/explore/steps/pipeline-direct-build.md',
  ]) {
    const source = read(file);

    assert.match(source, POINTER, `${file} should point to § Scope observations`);
    assert.doesNotMatch(source, /whose fix requires behavior/, `${file} should not restate the definition`);
    assert.match(source, /(?:no such (?:section|list)|Omit this record) when there is none/,
      `${file} should omit the report section when it is empty`);
  }
});

test('the Plan (unattended) final report carries review and design-worker scope observations', () => {
  const plan = read('sai/commands/explore/steps/pipeline-plan-unattended.md');

  assert.match(plan, /every scope observation the design worker's terminal `summary` names/);
  assert.match(plan, /At every ending of the run, print them under `Scope observations`/);
});

test('the design step classifies a spec gap before asking and records a scope observation as a non-goal', () => {
  const handling = section(read('sai/commands/design/steps/design.md'), 'Spec-problem handling during design');

  assert.match(handling, /Fetch @sai\/policies\/artifact-review-contract\.md and apply its § Scope observations/);
  assert.match(handling, /non-goal of the form "out of scope: X — revisit when Y"/);
  assert.match(handling, /with no question/);
  assert.match(handling, /every run, supervised or not/);
  assert.ok(handling.indexOf('§ Scope observations') < handling.indexOf('**Clarity present**'),
    'classification should precede the clarity path');
  assert.match(handling, /\*\*Clarity present\*\*/);
  assert.match(handling, /\*\*Clarity absent\*\*/);
});

test('the design result union gains no scope observation field', () => {
  const phaseContract = read('sai/commands/design/phase-contract.md');

  assert.doesNotMatch(phaseContract, /scope observation/i);
});

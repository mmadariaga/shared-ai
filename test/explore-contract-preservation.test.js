'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const stepsDir = path.join(__dirname, '..', 'sai', 'commands', 'explore', 'steps');
const repoRoot = path.join(__dirname, '..');
const ideaMachine = require('../sai-state/machines/explore-idea.js');

function source(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function commonSection(heading, nextHeading) {
  const common = source('sai/commands/explore/steps/common.md');
  const start = common.indexOf(`**${heading}`);
  const end = common.indexOf(`**${nextHeading}`, start + 1);
  assert.ok(start >= 0 && end > start, `Missing section boundaries: ${heading}`);
  return common.slice(start, end);
}

function comparison() {
  return commonSection('Approach comparison (', 'POC trigger (');
}

test('approach comparison: existing maturity controls applicability, not an option quota (E1–E2, I1)', () => {
  const contract = comparison();
  const discovery = commonSection('Explore change stage (', 'Approach comparison (');
  assert.match(discovery, /Once the idea is solid, apply \*\*Approach comparison\*\* before asking directly whether to move to `Review edge cases`/);
  assert.match(contract, /existing idea-maturity point — when Explore would offer advancement/);
  assert.match(contract, /multiple defensible approaches have meaningful trade-offs, compare them before offering edge-case review/);
  assert.match(contract, /only one is defensible, skip comparison; if none is viable, continue investigating/);
  assert.match(contract, /two or three approaches without inventing options to fill a quota or excluding a clearly superior option/);
});

test('approach comparison: unknown priorities precede the recommendation, which precedes alternatives (E2–E3)', () => {
  const contract = comparison();
  assert.match(contract, /unstated user priority could change the recommendation, ask about that priority before recommending/);
  assert.match(contract, /Present the current recommendation and its grounded rationale first, then alternatives and their meaningful trade-offs/);
});

test('approach comparison: pending substantive questions suppress navigation and resolution restores closure (E4, I2)', () => {
  const closure = commonSection('Pre-crystallization closure:', 'Emission gate (');
  const contract = comparison();
  assert.match(closure, /Apply \*\*Approach comparison\*\* below before offering advancement at idea maturity and while comparison is pending; otherwise use this usual closure/);
  assert.match(contract, /Before and during comparison, omit `next-step` and advancement offers; end with the pending substantive question about priorities, selection, or unresolved implications/);
  assert.match(contract, /pending until the user chooses an approach and no substantive questions about that choice remain/);
  assert.match(contract, /Choosing resolves comparison only, not stage advancement; then restore the usual closure and maturity offer/);
  assert.match(contract, /Unsolicited advancement signals retain \*\*Staged progression advancement\*\* recognition unchanged and never imply acceptance of a recommendation/);
  assert.match(contract, /adds no progression gate or advancement exception/);
});

test('approach comparison: fixed choices, refinements, and material-change precedence remain distinct (E5–E6)', () => {
  const contract = comparison();
  const reset = commonSection('Material change.', 'Post-POC return exception');
  assert.match(contract, /Keep a resolved comparison closed, and respect an approach the user has already fixed, unless new information affects viability or justifies reconsideration/);
  assert.match(contract, /refinements of the same idea, explain only what changes and why/);
  assert.match(contract, /\*\*Material change\*\* uses the existing reset and reassesses approaches for the new idea/);
  assert.match(reset, /Material-change detection runs before selector-response classification/);
  assert.match(reset, /reset wins: clear the pending maturity or later selector response, staged progression, pending crystallization request, and both agreed lists/);
  assert.match(reset, /do not emit an edge-case prompt, later selector, crystallization, or advancement automatically/);
});

test('approach comparison: conversation-only decisions reuse handoff fields without new machinery (E7, I3–I4)', () => {
  const contract = comparison();
  const format = source('sai/policies/ready-to-propose-format.md');
  assert.match(contract, /Keep the recommendation, alternatives, pending questions, and chosen approach only in conversation/);
  assert.match(contract, /chosen approach and its rationale into `Decisions & Rationale`, rejected alternatives into `Alternatives Considered`, and accepted trade-offs into `Trade-offs Accepted`, preserving the existing block format/);
  for (const field of ['Decisions & Rationale', 'Alternatives Considered', 'Trade-offs Accepted']) {
    assert.ok(format.includes(`**${field}**`), `Existing format must own ${field}`);
  }
  assert.match(contract, /uses `explore-idea@1` unchanged: no new stage, persistent state, event, panel entry, or instruction file/);
  assert.match(contract, /replaces no technical experiment and authorizes no implementation or route/);
  assert.match(source('sai/commands/explore/steps/common.md'), /Exploration is read-only/);
});

test('approach comparison: both harness entry paths load the same discovery instructions (I5)', () => {
  for (const harness of ['claude', 'opencode']) {
    assert.ok(source(`commands/${harness}/sai-explore.md`).includes(`Fetch @sai/adapters/${harness}/boot.md`));
    assert.ok(source(`sai/adapters/${harness}/boot.md`).includes('@sai/commands/explore/body.md'));
  }
  assert.match(source('sai/commands/explore/body.md'), /Fetch @sai\/commands\/explore\/instructions\.md/);
  assert.match(source('sai/commands/explore/instructions.md'), /Fetch @sai\/commands\/explore\/steps\/common\.md/);
  assert.equal(ideaMachine.project(ideaMachine.initialState).next.follow, 'sai/commands/explore/steps/common.md');
});

test('approach comparison: ordinary advancement adds no comparison state or acceptance (E4, E7, I3)', () => {
  const initial = ideaMachine.initialState;
  const discussion = ideaMachine.transition(initial, {});
  assert.deepEqual(discussion.state, initial);
  assert.equal(discussion.rejected, 'READINESS_IS_NOT_INTENT');
  const advanced = ideaMachine.transition(initial, { intent: 'next-step' });
  assert.equal(advanced.state.stage, 'review-edge-cases');
  assert.equal(advanced.next.follow, 'sai/commands/explore/steps/review-edge-cases.md');
  assert.deepEqual(advanced.state, { ...initial, stage: 'review-edge-cases' });
  assert.deepEqual(ideaMachine.STAGES, ['explore-change', 'poc-lane', 'review-edge-cases', 'implementation-details', 'crystallize']);
  // Choice is conversation-only: the coordinator emits no selection event.
  assert.match(comparison(), /Choosing resolves comparison only, not stage advancement/);
});

test('contract preservation: all reachable step files exist and are mentioned', () => {
  const stepsFiles = fs.readdirSync(stepsDir)
    .filter(file => file.endsWith('.md'))
    .sort();

  // E3: All fifteen files should exist, including the follow-loaded stage, slice, POC lane, and route selector steps
  assert.equal(stepsFiles.length, 15,
    `Expected 15 step files, found ${stepsFiles.length}: ${stepsFiles.join(', ')}`);

  // Verify the specific expected files exist
  const expectedFiles = [
    'artifact-review-language-gate.md',
    'common.md',
    'crystallization-language-gates.md',
    'crystallization-protocol.md',
    'idea-list.md',
    'implementation-details.md',
    'pipeline-direct-build.md',
    'pipeline-plan-unattended.md',
    'pipeline-selector.md',
    'poc-lane.md',
    'review-edge-cases.md',
    'review-loop.md',
    'route-selector.md',
    'slice.md',
    'slicing-assessment.md'
  ];

  for (const expectedFile of expectedFiles) {
    const exists = stepsFiles.includes(expectedFile);
    assert.ok(exists, `Expected step file not found: ${expectedFile}`);
  }
});

test('contract preservation: route names stay English while route guidance is localized', () => {
  const selector = fs.readFileSync(path.join(stepsDir, 'route-selector.md'), 'utf8');
  const languageGate = fs.readFileSync(
    path.join(stepsDir, 'crystallization-language-gates.md'),
    'utf8',
  );

  assert.match(selector, /\*\*Plan - Unattended\*\*/);
  assert.match(selector, /\*\*Direct Build - Unattended\*\*/);
  assert.match(selector, /\*\*Manual\*\*/);
  assert.match(selector, /The route explanation renders in the user's language[\s\S]{0,180}fixed route names remain exactly `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
  assert.match(languageGate, /post-block route guide, later-turn clarification, and post-Manual handoff prose follow the selected crystallization language[\s\S]{0,220}route names remain the fixed English literals `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
});

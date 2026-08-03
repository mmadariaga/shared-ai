'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const exploreSources = [
  'sai/instructions/explore.md',
  'sai/commands/sai-explore.md',
  'commands/claude/sai-explore.md',
  'commands/opencode/sai-explore.md',
  'commands/copilot/sai-explore.prompt.md',
];

function exploreContract() {
  return exploreSources.map(relativePath => {
    const fullPath = path.join(repoRoot, relativePath);
    assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
    return fs.readFileSync(fullPath, 'utf8');
  }).join('\n');
}

test('supervision recognizes start-pipeline only from explicit user intent', () => {
  const source = exploreContract();

  assert.match(source, /start-pipeline/);
  assert.match(source, /bare|trivial|dominant[- ]intent/i);
  assert.match(source, /never.*auto[- ]start|not.*auto[- ]start/i);
  assert.match(source, /crystallization recommendation|crystallization.*recommendation/i);
});

test('supervision tracks ordered unique changes and dispatches only eligible work', () => {
  const source = exploreContract();

  for (const term of [
    /tracked_changes/,
    /completed_changes/,
    /active_change/,
    /ordered unique|duplicate[- ]free|first[- ]emission order/i,
    /empty|completed.*set|already completed/i,
    /Cancel/,
    /one remaining|single remaining|without a picker/i,
    /failed|cancelled.*retry|retryable/i,
    /active.*reject|duplicate starts/i,
  ]) assert.match(source, term);
});

test('supervised spec dispatch preserves the selected block and exact user input', () => {
  const source = exploreContract();

  assert.match(source, /SpecWorkerRequest/);
  assert.match(source, /crystallized_block/);
  assert.match(source, /selected change.*complete.*Ready to Propose|complete.*emitted Ready to Propose/i);
  assert.match(source, /only.*selected.*block|receives only.*block/i);
  assert.match(source, /needs_input/);
  assert.match(source, /ordered option|options.*order|order.*option/i);
  assert.match(source, /escalated exactly|exactly.*escalat/i);
  assert.match(source, /same worker/);
  assert.match(source, /only.*user.*answer|user's answer/i);
});

test('independent review is fresh, input-scoped, and returns only the declared outcomes', () => {
  const source = exploreContract();

  assert.match(source, /IndependentReviewResult/);
  assert.match(source, /review_complete/);
  assert.match(source, /review_failed/);
  assert.match(source, /review_cancelled/);
  assert.match(source, /exactly one fresh reviewer|one fresh reviewer/i);
  assert.match(source, /crystallized block.*proposal\.md.*specs|proposal\.md.*specs.*crystallized block/i);
  assert.match(source, /only.*crystallized.*proposal|receives only.*proposal/i);
  assert.match(source, /structured findings|IndependentReviewFinding/);
  assert.match(source, /only.*three|only.*declared outcomes|returns only/i);
});

test('review findings require complete correction data and preserve worker ownership', () => {
  const source = exploreContract();

  assert.match(source, /IndependentReviewFinding/);
  for (const field of [
    'identifier',
    'severity',
    'artifact_location',
    'issue_statement',
    'recommended_correction',
  ]) assert.match(source, new RegExp(`\\b${field}\\b`));
  assert.match(source, /accepted edits.*worker|worker[- ]owned.*edit/i);
  assert.match(source, /discarded findings.*specific reasons|specific reasons.*discard/i);
});

test('explore remains read-only and closes with the exact supervised completion contract', () => {
  const source = exploreContract();

  assert.match(source, /Explore.*no direct write|no direct write/i);
  assert.match(source, /owned change directory|limited to.*change directory/i);
  assert.match(source, /review-loop/);
  assert.match(source, /start-pipeline/);
  assert.match(source, /user[- ]triggered|user triggered/i);
  for (const harness of ['Claude Code', 'opencode', 'Copilot']) {
    assert.match(source, new RegExp(harness.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(
    source,
    /Supervised sai-1 done in openspec\/changes\/\{name\}\/\. Independent review and artifact feedback are complete; sai-2 was not run\./
  );
  assert.match(
    source,
    /Supervised sai-1 done in openspec\/changes\/\{name\}\/\. Independent review did not complete; artifact feedback is complete; sai-2 was not run\./
  );
  assert.match(source, /Ready to Propose/);
});

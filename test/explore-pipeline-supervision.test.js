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

function spec(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
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

test('machine feedback continues each actionable finding to the same spec worker', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/instructions/explore.md'), 'utf8');
  const policy = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /MachineFeedbackAdapter/);
  assert.match(source, /sai\/policies\/artifact-feedback-gate\.md/);
  assert.match(source, /needs_input/);
  assert.match(source, /same spec[- ]proposal worker|same.*spec worker/i);

  assert.match(policy, /IndependentReviewFinding\[\]/);
  assert.match(policy, /For each finding.*one same-worker continuation/i);
  assert.match(policy, /per-item legitimacy rules/i);
  assert.match(policy, /artifact-only scope/i);
  assert.match(policy, /decision-summary recomputation/i);
  assert.match(policy, /Accepted changes remain worker-owned.*proposal\.md.*specs/si);
  assert.match(policy, /specific discard reporting|Every discarded finding.*specific reason/i);
});

test('machine feedback cannot enter or advance the user gate or proceed branch', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /emits neither the picker nor the empty-turn prompt/i);
  assert.match(source, /does not consume a user feedback turn/i);
  assert.match(source, /does not increment.*iteration counter/i);
  assert.match(source, /does not execute.*proceed-label.*next-action/i);
});

test('iteration zero offers feedback after the supervised review loop settles', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'), 'utf8');

  assert.match(source, /empty findings array is a no-op/i);
  assert.match(source, /Defer the ordinary user-facing gate while another review pass is required/i);
  assert.match(source, /Present that gate for the first time, unchanged at iteration 0, only after the review loop converges, exhausts its three-pass cap, or is interrupted by `review_failed` or `review_cancelled`\./i);
  assert.match(source, /first ordered labels remain.*Give feedback \(Recommended\).*proceed-label/i);
  assert.match(source, /iteration 0/);
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

test('Claude Code explore adapter permits worker supervision without direct writes', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'commands/claude/sai-explore.md'), 'utf8');

  const allowedToolsLine = source.match(/^allowed-tools:\s*(.+)$/im);
  assert.ok(allowedToolsLine, 'allowed-tools frontmatter should exist');
  const allowedTools = allowedToolsLine[1].split(',').map(tool => tool.trim());

  assert.ok(allowedTools.includes('Agent'));
  assert.ok(allowedTools.includes('SendMessage'));
  assert.ok(allowedTools.includes('Bash(openspec:*)'));
  assert.ok(allowedTools.includes('Bash(git:*)'));
  assert.equal(allowedTools.includes('Edit'), false);
  assert.equal(allowedTools.includes('Write'), false);
  assert.equal(allowedTools.includes('Bash'), false);
});

test('opencode explore adapter enables native task dispatch with the existing spec worker only', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'commands/opencode/sai-explore.md'), 'utf8');

  assert.match(source, /Fetch @skills\/sai-1-spec-proposal-worker\/SKILL\.md/);
  assert.doesNotMatch(source, /reviewer[- ](?:binding|skill|agent)|independent[- ]review.*(?:binding|skill|agent)/i);
});

test('Copilot explore adapter remains question/read/search-only and reports unavailable supervision', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'commands/copilot/sai-explore.prompt.md'), 'utf8');
  const instructions = fs.readFileSync(path.join(repoRoot, 'sai/instructions/explore.md'), 'utf8');

  assert.match(source, /tools:/i);
  for (const tool of ['vscode/askQuestions', 'read', 'search', 'web', 'todo']) {
    assert.match(source, new RegExp(tool.replace('/', '\\/'), 'i'));
  }
  assert.match(instructions, /start-pipeline/);
  assert.match(instructions, /unavailable|supervision unavailable/i);
  assert.doesNotMatch(source, /reviewer|dispatch|write artifact|artifact write/i);
});

test('install manifest projects shared explore assets and routed spec assets only to routed harnesses', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/install-manifest.json'), 'utf8');

  assert.match(source, /Claude Code|claude/i);
  assert.match(source, /opencode/i);
  assert.match(source, /Copilot|copilot/i);
  assert.match(source, /sai-1-spec-proposal-worker/);
  assert.match(source, /shared.*instruction|instruction.*shared|policies/i);
  assert.doesNotMatch(source, /reviewer.*lifecycle|independent.*reviewer.*projection/i);
});

test('direct spec and design wrappers retain their existing terminal contracts', () => {
  const source = [
    'commands/claude/sai-1-spec.md',
    'commands/opencode/sai-1-spec.md',
    'commands/copilot/sai-1-spec.prompt.md',
    'commands/claude/sai-2-design.md',
    'commands/opencode/sai-2-design.md',
    'commands/copilot/sai-2-design.prompt.md',
  ].map(relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')).join('\n');

  assert.doesNotMatch(source, /start-pipeline.*adapter|explore.*adapter/i);
  assert.doesNotMatch(source, /independent[- ]reviewer|reviewer[- ]binding/i);
});

test('Step 1 continues every completed-pass finding to the same worker', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /For every completed review pass in the bounded convergence loop/i);
  assert.match(feedbackGate, /For each finding in that pass, in array order, perform one same-worker continuation/i);
  assert.match(feedbackGate, /Complete all findings for the current pass before supervision evaluates whether another fresh review pass is required/i);
});

test('Step 1 preserves artifact-only worker ownership and specific discard reasons', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );
  const supervision = fs.readFileSync(path.join(repoRoot, 'sai/instructions/explore.md'), 'utf8');

  assert.match(feedbackGate, /Accepted changes remain worker-owned and may be written only by that worker to `proposal\.md` or `specs\/\*\*` in the selected change directory/i);
  assert.match(feedbackGate, /Report every \*\*discarded\*\* item individually[\s\S]{0,240}specific reason/i);
  assert.match(supervision, /The spec worker is the only delegated writer: its write scope is limited to `proposal\.md`, `specs\/\*\*`, and permitted metadata in its selected change directory/i);
  assert.match(supervision, /Explore never writes directly/i);
});

test('Step 1 defers the ordinary gate until review convergence, cap, or interruption', () => {
  const feedbackGate = fs.readFileSync(
    path.join(repoRoot, 'sai/policies/artifact-feedback-gate.md'),
    'utf8'
  );

  assert.match(feedbackGate, /Defer the ordinary user-facing gate while another review pass is required/i);
  assert.match(feedbackGate, /Present that gate for the first time, unchanged at iteration 0, only after the review loop converges, exhausts its three-pass cap, or is interrupted by `review_failed` or `review_cancelled`\./i);
  assert.match(feedbackGate, /Its first ordered labels remain `Give feedback \(Recommended\)` followed by `proceed-label`/i);
});

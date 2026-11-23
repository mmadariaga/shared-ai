'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readExploreContract() {
  const exploreSources = [
    'sai/commands/explore/instructions.md',
    'sai/commands/explore/steps/common.md',
    'sai/commands/explore/steps/review-edge-cases.md',
    'sai/commands/explore/steps/implementation-details.md',
    'sai/commands/explore/steps/artifact-review-language-gate.md',
    'sai/commands/explore/steps/slicing-assessment.md',
    'sai/commands/explore/steps/crystallization-protocol.md',
    'sai/commands/explore/steps/crystallization-language-gates.md',
    'sai/commands/explore/steps/review-loop.md',
    'sai/commands/explore/steps/pipeline-selector.md',
    'sai/commands/explore/steps/pipeline-plan-unattended.md',
    'sai/commands/explore/steps/pipeline-direct-build.md',
    'sai/commands/explore/direct-build-coordinator.md',
    'sai/commands/explore/steps/idea-list.md',
  ];
  return exploreSources.map(relativePath => read(relativePath)).join('\n');
}

test('the old pre-flight-before-materialization order reproduces the missing-directory failure', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sai-direct-build-'));
  const changeDir = path.join(root, 'openspec', 'changes', 'clarify-apply-coordinator-contract');

  assert.equal(fs.existsSync(changeDir), false);
  assert.throws(
    () => {
      if (!fs.existsSync(changeDir)) throw new Error('archive pre-flight requires the change directory');
    },
    /requires the change directory/
  );
});

test('backfill execution completes writes before archive preparation and archive execution', () => {
  const backfill = read('sai/commands/backfill/worker.md');
  const archive = read('sai/commands/archive/worker.md');
  const explore = readExploreContract();

  const backfillPrepare = backfill.indexOf('--direct-build-prepare');
  const backfillExecute = backfill.indexOf('--direct-build-execute');
  assert.ok(backfillPrepare >= 0 && backfillPrepare < backfillExecute,
    'backfill preparation must precede its explicit execution continuation');
  // The archive plan is a tool run: the archive worker has no prepare stretch, only the execute order.
  assert.equal(archive.includes('--direct-build-prepare'), false, 'the archive worker has no prepare stretch');
  assert.ok(archive.indexOf('--direct-build-execute') >= 0);
  assert.ok(explore.indexOf('archive-plan.js') >= 0 && explore.indexOf('archive-plan.js') < explore.indexOf('8. **Archive execution and pre-authorized commit**'),
    'the plan tool runs before the archive execution step');
  assert.match(backfill, /openspec\/changes\/\{name\}\/\.openspec\.yaml/);
  assert.match(backfill, /openspec\/changes\/\{name\}\/proposal\.md/);
  assert.match(backfill, /openspec\/changes\/\{name\}\/specs\/\{capability\}\/spec\.md/);
  assertInOrder(archive, [
    '0. **Retirement declaration**',
    '1. **CLI archive** — `openspec archive <name> --yes --json`',
    '2. **Staging** — classify every approved path before staging any',
    '3. **Commit**',
  ]);
  assert.match(archive, /author the message from the staged state under the commit rules/);

  assert.match(explore, /6\. \*\*Backfill execution\*\*/);
  assert.match(explore, /7\. \*\*Archive preparation\*\*[\s\S]*?read-only pre-flight/);
  assert.match(explore, /8\. \*\*Archive execution and pre-authorized commit\*\*[\s\S]*?SAME `sai-archive-worker`/);
  assert.match(explore, /7\. \*\*Archive preparation\*\*[\s\S]*?no archive worker and no archive window/);
});

function executionStep(archive, start, end) {
  const execution = archive.slice(archive.indexOf('## Direct Build (unattended) execute continuation'));
  const from = execution.indexOf(start);
  const to = end ? execution.indexOf(end, from) : execution.length;
  assert.ok(from >= 0 && to > from, `${start} should precede ${end}`);
  return execution.slice(from, to);
}

function assertInOrder(text, fragments) {
  let cursor = -1;
  for (const fragment of fragments) {
    const next = text.indexOf(fragment, cursor + 1);
    assert.notEqual(next, -1, `expected ${fragment} after the previous fragment`);
    cursor = next;
  }
}

test('direct-build archive staging omits ignored untracked paths but stages mixed eligible paths', () => {
  const staging = executionStep(read('sai/commands/archive/worker.md'), '2. **Staging**', '3. **Commit**');

  assert.match(staging, /`git ls-files --error-unmatch -- <path>` succeeds, untracked on its exit 1,\s+and any other error is terminal/);
  assert.match(staging, /For an untracked path, run\s+`git check-ignore --quiet -- <path>`/);
  assert.match(staging, /exit 0 means ignored, so omit it and\s+append `\[sai-archive\] warning: omitted ignored untracked path: <path>` to\s+the summary/);
  assert.match(staging, /exit 1 means eligible; anything else is terminal/);
  assert.match(staging, /stage\s+every eligible path with the exact allowlist, deletion-aware/);
  assert.match(staging, /never with\s+`-A`, `\.`, or `-f`/);
});

test('direct-build archive execution keeps the empty-index no-commit result when all paths are ignored', () => {
  const commit = executionStep(read('sai/commands/archive/worker.md'), '3. **Commit**', 'The summary names every retired capability');

  assert.match(commit, /`git diff --cached --quiet`/);
  assert.match(commit, /When the index is empty \(every\s+approved path was ignored\), report\s+`\[sai-archive\] no commit: staging left the index empty` and create nothing/);
  assert.match(commit, /Never amend, push, or ask for a second commit/);
});

const COORDINATOR = 'sai/commands/explore/direct-build-coordinator.md';

function coordinatorSteps() {
  const card = read(COORDINATOR);
  const step7 = card.indexOf('7. **Archive preparation**');
  const step7b = card.indexOf('7b. **Prepare-time coverage check**');
  const step8 = card.indexOf('8. **Archive execution and pre-authorized commit**');
  assert.ok(step7 >= 0 && step7 < step7b && step7b < step8, 'Step 7, 7b, and Step 8 must appear in order');
  return {
    prepare: card.slice(step7, step7b),
    coverage: card.slice(step7b, step8),
    execute: card.slice(step8, card.indexOf('**Execute orders.**', step8)),
  };
}

test('the Step 7 plan call carries the implementer path set, and the Step 8 order repeats it under a marker after the plan fingerprint', () => {
  const { prepare, execute } = coordinatorSteps();

  assertInOrder(prepare, ['plan <change-name> --json --cwd <project-root> --implementer-paths-file <path>', 'archive-plan.js']);
  assert.match(prepare, /first-seen changed-path union of Step 1, deletions included/);
  assert.match(prepare, /one repository-relative path per line/);
  assert.match(prepare, /missing from run state[\s\S]*?stops the route before the tool runs[\s\S]*?never rebuild it from the git index/);
  assert.match(prepare, /--drafts-dir <transfer directory>/);
  assertInOrder(execute, ['--direct-build-execute', "the plan's `plan_fingerprint`", '--implementer-paths']);
});

test('the prepare-time coverage check runs before any execute order and returns gaps to the archive worker', () => {
  const { coverage, execute } = coordinatorSteps();

  assert.match(coverage, /before any execute order/);
  assert.match(coverage, /`verify` check of `@sai\/policies\/slice-path-scope\.md` § Commit coverage with `slice_snapshot`[\s\S]*?plan's `covering_paths` as the covering list/);
  assert.match(coverage, /non-empty `uncovered` sends no execute order/);
  assert.match(coverage, /a gap in the plan is not patched by hand[\s\S]*?compute the plan again/);
  assert.match(coverage, /one `step-7` attempt/);
  assert.match(coverage, /escalates under `@sai\/policies\/obstacle-escalation\.md`/);

  assert.match(execute, /compute the plan again with the same inputs right before the order/);
  assert.match(execute, /the new plan repeats the Step 7b check/);
  assert.match(execute, /rejects the order when its fingerprint differs from the order's/);
  assert.match(execute, /stops the route before this continuation/);
});

test('slice path scope sends a prepared-plan gap back to the plan owner instead of extending the order', () => {
  const policy = read('sai/policies/slice-path-scope.md');
  const coverage = policy.slice(policy.indexOf('## Commit coverage'), policy.indexOf('## Foreign changes'));

  assert.match(coverage, /add\s+those paths to its owned paths and verify again/);
  assert.match(coverage, /An order bound to a prepared plan is not extended/);
  assert.match(coverage, /send the gap back to the plan's owner for\s+a corrected plan and send no order/);
  assert.match(coverage, /applies to an order that no prepared plan binds/);
});

test('the archive worker re-runs the plan from the implementer paths of its order and stages the plan\'s owned paths', () => {
  const archive = read('sai/commands/archive/worker.md');

  assert.match(archive, /`--implementer-paths` section carries one repository-relative path per line/);
  assert.match(archive, /one `--implementer-path <path>` per path of the section/);
  assert.match(archive, /valid only when that plan\s+is not a refusal and its `plan_fingerprint` equals the order's/);
  assert.match(archive, /the approved\s+paths are the plan's `owned_staging_paths`/);
  assert.match(archive, /A path\s+the plan lists in `already_staged_deletions` is already staged: never add it\s+again, and it stays in the commit/);
  assert.match(archive, /with the owned staging paths and the already\s+staged deletions as the owned paths/);
  assert.match(archive, /Every other staged entry|foreign entries under\s+`foreign-index-preservation\.md`/);
});

const RETIREMENT_SOURCE = 'sai/commands/archive/retirement-declaration.md';

// The retirement declaration is single-sourced: the definition, the write, and the disclosure live in
// retirement-declaration.md; the detection and the preconditions run in archive-plan.js; the other archive
// cards point to them.
const RETIREMENT_DECLARATION_RULES = [
  ['an explicit retire_capabilities: false is an author veto', [
    [/\*\*Author veto\*\*/, 'names the author veto'],
    [/present with the\s+parsed value `false`/, 'judges the veto on the parsed value `false`'],
    [/archive_spec_validation_failed/, 'states why the veto cannot be skipped'],
  ]],
  ['a non-boolean retire_capabilities refuses the declaration', [
    [/\*\*Unhonoured value\*\*/, 'names the unhonoured value'],
    [/parsed value that is not a boolean/, 'defines an unhonoured value'],
    [/never guesses which boolean/, 'never guesses which boolean it meant'],
  ]],
  ['unaccounted content refuses the declaration', [
    [/\*\*Unaccounted content\*\*/, 'names unaccounted content'],
    [/has a `##`\s+section other than `## Purpose`/, 'defines unaccounted content'],
  ]],
  ['the declaration requires existing, parseable, schema-carrying metadata', [
    [/has no `schema:` key/, 'requires the schema key'],
    [/never creates `\.openspec\.yaml`/, 'never creates .openspec.yaml'],
    [/never authors `schema:`/, 'never authors a schema value'],
  ]],
  ['the write judges the parsed YAML value and verifies itself', [
    [/Act on the plan's `retirement\.declaration`, never on the line's text/, 'acts on the plan, not on the text'],
    [/replace-in-place/, 'specifies replace-in-place'],
    [/never a\s+second entry/, 'forbids a second entry'],
    [/Re-parse the file/, 're-parses the file after writing'],
    [/The write is not reverted/, 'keeps the written key'],
    [/git checkout HEAD -- openspec\/changes\/<name>\/\.openspec\.yaml/, 'names the restore command'],
    [/or\s+by hand otherwise/, 'covers an untracked file'],
  ]],
  ['a blocked capability refuses the whole declaration', [
    [/\*\*All or nothing\*\*/, 'states the all-or-nothing rule'],
  ]],
  ['every refusal is a stop, not a question', [
    [/A refusal is a stop, never a\s+question/, 'states that a refusal is a stop'],
    [/write nothing, run no CLI\s+archive/, 'writes nothing on a refusal'],
  ]],
];

// The way forward of each refusal is printed by the tool.
const RETIREMENT_TOOL_RULES = [
  [/remove the \\?`retire_capabilities: false\\?` entry, or reshape the delta so it does not empty the capability/, 'states both ways forward of the veto'],
  [/archive never guesses which boolean it meant/, 'never guesses which boolean it meant'],
  [/set it to \\?`true\\?` to declare, to \\?`false\\?` to veto, or remove it/, 'states the three ways forward'],
  [/move that content out of the spec, then rerun archive/, 'states the way forward of unaccounted content'],
  [/has no \\?`schema:\\?` key, and archive never authors it/, 'never authors a schema value'],
  [/is missing, and archive never creates it/, 'never creates .openspec.yaml'],
];

test('the retirement declaration single source states every rule', () => {
  const source = read(RETIREMENT_SOURCE);
  for (const [rule, clauses] of RETIREMENT_DECLARATION_RULES) {
    for (const [pattern, what] of clauses) {
      assert.match(source, pattern, `${RETIREMENT_SOURCE} must state that ${rule}: it ${what}`);
    }
  }
  assert.match(source, /does not block the archive/);
  assert.match(source, /The CLI is the only\s+component that deletes anything under `openspec\/specs\/\*\*`/);
  assert.match(source, /The retirement adds no question, gate, or per-route branch/);
  assert.match(source, /`sai\/tools\/archive-plan\.js` is their single source/);
  const tool = read('sai/tools/archive-plan.js');
  for (const [pattern, what] of RETIREMENT_TOOL_RULES) assert.match(tool, pattern, `archive-plan.js ${what}`);
});

test('archive cards point to the retirement declaration instead of restating it', () => {
  for (const card of ['sai/commands/archive/worker.md', 'sai/commands/archive/coordinator.md']) {
    assert.match(read(card), /Fetch `@sai\/commands\/archive\/retirement-declaration\.md`/, `${card} must fetch the single source`);
  }
  assert.match(read('sai/commands/archive/instructions.md'), /@sai\/commands\/archive\/retirement-declaration\.md/);
  assert.match(read('sai/commands/archive/archive-commit-gate.instructions.md'), /retirement-declaration\.md` § Disclosure/);
  for (const card of [
    'sai/commands/archive/worker.md',
    'sai/commands/archive/coordinator.md',
    'sai/commands/archive/instructions.md',
    'sai/commands/archive/archive-commit-gate.instructions.md',
  ]) {
    const text = read(card);
    assert.doesNotMatch(text, /archive_spec_validation_failed|replace-in-place|Unhonoured value/,
      `${card} must not restate retirement rules`);
  }
});

test('the retirement declaration is a named member of the direct-build closed order', () => {
  const worker = read('sai/commands/archive/worker.md');
  const coordinator = read('sai/commands/archive/coordinator.md');

  assert.match(worker, /holds only these lines, in this order/);
  assert.match(worker, /only when the plan's `retirement\.declaration` is\s+`write`/);
  assert.match(worker, /holds the destination, the owned staging paths, the\s+already staged deletions, the omitted ignored paths, the retirement declaration/);
  assert.match(coordinator, /The retirement declaration is a named member of the plan the order binds/);
});

test('the direct-build backfill execution and archive preparation blocks appear exactly once', () => {
  const explore = readExploreContract();
  assert.equal((explore.match(/\*\*Backfill execution\*\*/g) || []).length, 1);
  assert.equal((explore.match(/\*\*Archive preparation\*\*/g) || []).length, 1);
  assert.equal((explore.match(/\*\*Archive execution and pre-authorized commit\*\*/g) || []).length, 1);
});

test('Claude Code and opencode retain the same implementer projection without a hands worker', () => {
  const matrix = read('bin/worker-matrix.js');
  const manifest = read('sai/install-manifest.json');
  const parsedManifest = JSON.parse(manifest);
  const backfill = require('../bin/worker-matrix').defineWorkerMatrix(parsedManifest['worker-matrix'].entries, parsedManifest.capabilities).entries
    .find(entry => entry.workerName === 'sai-backfill-worker');

  assert.match(matrix, /phase: 'direct-build'[\s\S]{0,220}workerContract: 'sai\/commands\/explore\/direct-build-worker\.md'/);
  assert.match(manifest, /direct-build/);
  assert.match(backfill.claudeAgent.tools, /\bWrite\b/,
    'Claude backfill agent tools must include Write');
  assert.doesNotMatch(matrix, /direct-build-hands/);
  assert.doesNotMatch(manifest, /direct-build-hands/);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/explore/direct-build-hands-worker.md')), false);
});

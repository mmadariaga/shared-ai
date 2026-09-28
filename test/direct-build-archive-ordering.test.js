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
  const archivePrepare = archive.indexOf('--direct-build-prepare');
  const archiveExecute = archive.indexOf('--direct-build-execute');
  assert.ok(backfillPrepare >= 0 && backfillPrepare < backfillExecute,
    'backfill preparation must precede its explicit execution continuation');
  assert.ok(archivePrepare >= 0 && archivePrepare < archiveExecute,
    'archive preparation must precede its explicit execution continuation');
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

const RETIREMENT_SOURCE = 'sai/commands/archive/retirement-declaration.md';

// The retirement declaration is single-sourced: every rule lives in
// retirement-declaration.md, and the other archive cards point to it.
const RETIREMENT_DECLARATION_RULES = [
  ['an explicit retire_capabilities: false is an author veto', [
    [/\*\*Author veto\*\*/, 'names the author veto'],
    [/present with the parsed value\s+`false`/, 'judges the veto on the parsed value `false`'],
    [/reshape the delta so it does not empty the\s+capability/, 'states both ways forward'],
    [/archive_spec_validation_failed/, 'states why the veto cannot be skipped'],
  ]],
  ['a non-boolean retire_capabilities refuses the declaration', [
    [/\*\*Unhonoured value\*\*/, 'names the unhonoured value'],
    [/parsed value\s+that is not a boolean/, 'defines an unhonoured value'],
    [/never guesses which boolean/, 'never guesses which boolean it meant'],
    [/`false` to veto, or remove it/, 'states the three ways forward'],
  ]],
  ['unaccounted content refuses the declaration', [
    [/\*\*Unaccounted content\*\*/, 'names unaccounted content'],
    [/has a `##`\s+section other than `## Purpose`/, 'defines unaccounted content'],
    [/move that content out of the spec/, 'states the way forward'],
  ]],
  ['the declaration requires existing, parseable, schema-carrying metadata', [
    [/has no `schema:` key/, 'requires the schema key'],
    [/never creates `\.openspec\.yaml`/, 'never creates .openspec.yaml'],
    [/never authors `schema:`/, 'never authors a schema value'],
  ]],
  ['the write judges the parsed YAML value and verifies itself', [
    [/Judge on the parsed YAML value, never on the line's text/, 'judges on the parsed value'],
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
    [/A refusal is a stop,\s+never a question/, 'states that a refusal is a stop'],
    [/write nothing, run no CLI\s+archive/, 'writes nothing on a refusal'],
  ]],
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
});

test('archive cards point to the retirement declaration instead of restating it', () => {
  for (const card of ['sai/commands/archive/worker.md', 'sai/commands/archive/coordinator.md']) {
    assert.match(read(card), /Fetch @sai\/commands\/archive\/retirement-declaration\.md/, `${card} must fetch the single source`);
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

  assert.match(worker, /may contain only the resolved change name, the retirement declaration with the\s+capabilities it retires/);
  assert.match(worker, /An order carrying\s+the retirement declaration is therefore not an altered order/);
  assert.match(coordinator, /the\s+retirement declaration as a named member of the order/);
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
  const backfill = parsedManifest['worker-matrix'].entries
    .find(entry => entry.workerName === 'sai-backfill-worker');

  assert.match(matrix, /phase: 'direct-build'[\s\S]{0,220}workerContract: 'sai\/commands\/explore\/direct-build-worker\.md'/);
  assert.match(manifest, /direct-build/);
  assert.match(backfill.claudeAgent.tools, /\bWrite\b/,
    'Claude backfill agent tools must include Write');
  assert.doesNotMatch(matrix, /direct-build-hands/);
  assert.doesNotMatch(manifest, /direct-build-hands/);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/explore/direct-build-hands-worker.md')), false);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(absolutePath), true, `${relativePath} should exist`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function section(text, startHeading, endHeading) {
  const start = text.indexOf(startHeading);
  assert.notEqual(start, -1, `${startHeading} should exist`);
  const end = endHeading ? text.indexOf(endHeading, start) : -1;
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

test('merge provenance is defined once in the worker instructions and consumed by pointer', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const coordinator = read('sai/commands/merge/coordinator.md');
  const worker = read('sai/commands/merge/worker.md');
  const provenance = section(instructions, '#### Merge provenance', '### Step 5:');

  for (const token of ['target_sha', 'source_ref', 'source_sha', 'merge_base', 'target_rules', 'source_rules']) {
    assert.match(provenance, new RegExp(token));
  }
  assert.match(provenance, /source_sha.*git rev-parse --verify <source_ref>\^\{commit\}/);
  assert.match(provenance, /git diff --name-status --diff-filter=A --find-renames --find-copies --find-copies-harder/);
  assert.match(provenance, /Renames and\s+copies are not introductions/);
  assert.match(provenance, /docs\/adr\/0000-INDEX\.md/);
  assert.match(provenance, /never\s+recompute\s+them from\s+post-launch `HEAD`/);
  assert.match(provenance, /before the squash commit/);

  assert.match(coordinator, /capture\s+the merge provenance exactly as\s+`@sai\/commands\/merge\/instructions\.md`\s+§ Merge provenance/);
  assert.doesNotMatch(coordinator, /--find-copies-harder/, 'the coordinator points at the definition instead of restating it');
  assert.match(worker, /§ Merge provenance/);
});

test('merge collision pass is incremental, family-aware, and runs on the final integration state', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const collisionStep = section(instructions, '### Step 9:', '### Step 10:');

  assert.match(collisionStep, /\*\*final integration state\*\*/);
  assert.match(collisionStep, /An in-progress rebase skips it until the rebase finishes/);
  assert.match(collisionStep, /its frontier is the source-introduced records/);
  assert.match(collisionStep, /`not-applicable`: skip the pass entirely/);
  assert.match(collisionStep, /`\(family, numeric prefix\)`: `adr:0010` and\s+`ddr:0010` differ/);
  assert.match(collisionStep, /Groups whose key is not in the frontier stay\s+untouched, even when they already collide/);
  assert.match(collisionStep, /`NNNN-\*\.md` or\s+`NNNN\[a-z\]\+-\*\.md`/);
  assert.match(collisionStep, /excluding the two index\s+paths/);
  assert.match(collisionStep, /but only for\s+the old identifiers of renamed records/);
  assert.match(collisionStep, /`no-collision`[\s\S]{0,80}`repair-required`[\s\S]{0,120}`escalation-required`/);
  assert.match(collisionStep, /claims no repository-wide scan/);
});

test('merge collision dating uses captured refs, path following, and the method-aware stage mapping', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const collisionStep = section(instructions, '### Step 9:', '### Step 10:');

  assert.match(collisionStep, /from the captured refs, never from `HEAD` history/);
  assert.match(collisionStep, /git log --follow --find-renames --name-status --format=/);
  assert.match(collisionStep, /take the earliest `A` event, following `R\*` entries back to the original\s+path/);
  assert.match(collisionStep, /git ls-files --unmerged --stage -- docs\/adr\/ docs\/ddr\//);
  assert.match(collisionStep, /through \[Sides\]\(#sides\) \(stage 1 anchors to `merge_base`\)/);
  assert.match(collisionStep, /\(introduction_timestamp, introduction_commit, family, numeric prefix, final_path\)/);
  assert.match(collisionStep, /reassign the whole group as one plan/);
  assert.match(collisionStep, /oldest `a`, next `b`/);
  assert.match(collisionStep, /introduction anchor: source_sha\|target_sha\|merge_base/);
});

test('merge collision repair data flows from the worker plan to coordinator execution and presentation', () => {
  const coordinator = read('sai/commands/merge/coordinator.md');
  const presentation = read('sai/commands/merge/presentation.md');

  assert.match(coordinator, /first record its worker data in the\s+seam's `adr_ddr_renames`/);
  assert.match(coordinator, /never rename onto a path\s+another final-state record occupies/);
  assert.match(coordinator, /Apply\s+only replacements the worker supplied/);
  for (const field of ['introduction_anchor', 'introduction_timestamp', 'old_h1', 'new_index_label', 'source_introduced_adr_ddr_records']) {
    assert.match(presentation, new RegExp(field));
  }
  assert.match(presentation, /Groups outside the source frontier\s+never render/);
  assert.match(presentation, /never rereads an artifact to fill a missing field/);
});

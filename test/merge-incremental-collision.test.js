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

test('merge collision repair is scoped to source-introduced records and final keys', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const coordinator = read('sai/commands/merge/coordinator.md');
  const worker = read('sai/commands/merge/worker.md');
  const presentation = read('sai/commands/merge/presentation.md');
  const collisionStep = instructions.slice(instructions.indexOf('### Step 7:'));

  for (const contract of [instructions, coordinator, worker, presentation]) {
    assert.match(contract, /target_sha/);
    assert.match(contract, /source_sha/);
    assert.match(contract, /merge_base/);
  }

  assert.match(instructions, /git diff --name-status --diff-filter=A/);
  assert.match(instructions, /--find-renames/);
  assert.match(instructions, /--find-copies/);
  assert.match(instructions, /--find-copies-harder/);
  assert.match(collisionStep, /only an exact `A` path/i);
  assert.match(collisionStep, /source-side rename or copy[\s\S]{0,40}not an introduction/i);
  assert.match(collisionStep, /present in the final merge state/i);
  assert.match(collisionStep, /\(family, numeric prefix\)/);
  assert.match(collisionStep, /adr:0010.*ddr:0010.*different keys/s);
  assert.match(collisionStep, /only\s+candidate keys.*final merge state/is);
  assert.match(collisionStep, /unrelated\s+historical[\s\S]{0,30}multi-file collisions/i);
  assert.match(collisionStep, /limit the search and replacement set to identifiers belonging to\s+the affected groups/is);
  assert.match(collisionStep, /skip this collision pass\s+completely/i);
  assert.doesNotMatch(collisionStep, /runs \*\*after every merge\*\*/i);

  assert.match(coordinator, /capture the merge provenance before any\s+merge mutation/i);
  assert.match(coordinator, /forward them unchanged[\s\S]{0,40}post-merge outcome/i);
  assert.match(worker, /frontier/i);
  assert.match(worker, /final\s+merge\s+state/i);
  assert.match(worker, /do not search or repair\s+unrelated historical identifiers/i);
  assert.match(presentation, /source_introduced_adr_ddr_records/);
  assert.match(presentation, /unrelated historical groups never become/i);
});

test('merge collision lookup includes repaired records and excludes canonical indexes', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const coordinator = read('sai/commands/merge/coordinator.md');
  const worker = read('sai/commands/merge/worker.md');
  const collisionStep = instructions.slice(instructions.indexOf('### Step 7:'));

  assert.match(collisionStep, /NNNN-\*\.md.*NNNN\[a-z\]\+-\*\.md/s);
  assert.match(collisionStep, /existing bare and suffixed records/i);
  assert.match(collisionStep, /0000-INDEX\.md[\s\S]{0,120}never a decision record/i);
  assert.match(collisionStep, /reserve collision-free family-aware identifiers/i);
  assert.match(coordinator, /target is occupied by another final-state record/i);
  assert.match(worker, /Final-state lookup includes both bare and existing\s+suffixed record names/i);
  assert.match(worker, /0000-INDEX\.md/);
});

test('merge collision ordering preserves provenance across refs, repairs, and unresolved index stages', () => {
  const instructions = read('sai/commands/merge/instructions.md');
  const coordinator = read('sai/commands/merge/coordinator.md');
  const worker = read('sai/commands/merge/worker.md');
  const presentation = read('sai/commands/merge/presentation.md');
  const collisionStep = instructions.slice(instructions.indexOf('### Step 7:'));

  assert.match(collisionStep, /captured pre-merge refs[\s\S]{0,180}default `HEAD` history/i);
  assert.match(collisionStep, /source_sha[\s\S]{0,100}original path[\s\S]{0,100}target_sha/i);
  assert.match(collisionStep, /git log --follow --find-renames --name-status --format=/);
  assert.match(collisionStep, /earliest added/);
  assert.match(collisionStep, /not the most[\s\S]{0,40}rename or suffix-repair commit/i);
  assert.match(collisionStep, /git ls-files --unmerged --stage/);
  assert.match(collisionStep, /stage 2.*target_sha.*stage 3.*source_sha.*stage 1.*merge_base/is);
  assert.match(collisionStep, /introduction_anchor/);
  assert.match(collisionStep, /introduction_timestamp/);
  assert.match(collisionStep, /introduction_commit.*family.*numeric prefix.*final_path/is);
  assert.match(collisionStep, /commit hash and final path break equal-timestamp ties/i);
  assert.match(worker, /captured[\s\S]{0,40}source_sha.*target_sha.*merge_base.*path-following/is);
  assert.match(coordinator, /introduction anchor\/path\/commit\/timestamp/i);
  assert.match(presentation, /introduction_anchor/);
  assert.match(presentation, /introduction_timestamp/);
});

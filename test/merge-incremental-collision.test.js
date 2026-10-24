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
  const end = endHeading ? text.indexOf(endHeading, start + startHeading.length) : -1;
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

test('merge provenance is read from the captured file and its definition lives once, in the common step reading', () => {
  const common = read('sai/commands/merge/steps/common.md');
  const coordinator = read('sai/commands/merge/coordinator.md');
  const provenance = section(common, '## Provenance', '## Commit intent');

  for (const token of ['target_sha', 'source_ref', 'source_sha', 'merge_base', 'target_rules', 'source_rules', 'upstream']) {
    assert.match(provenance, new RegExp(token));
  }
  assert.match(provenance, /never recompute its values from the current `HEAD`/);
  assert.doesNotMatch(coordinator, /--find-copies-harder/, 'the coordinator captures through the tool instead of restating the definition');
  assert.match(coordinator, /Run `merge\.js provenance` for the method/);
  assert.match(coordinator, /keep its receipt as `provenance\.json` in the run directory/);
  for (const step of ['strategy', 'apply', 'test-correction', 'renumbering-plan']) {
    assert.match(read(`sai/commands/merge/steps/${step}.md`), /Fetch @sai\/commands\/merge\/steps\/common\.md/, step);
  }
});

test('merge collision pass is incremental, family-aware, and runs on the final integration state', () => {
  const plan = read('sai/commands/merge/steps/renumbering-plan.md');

  assert.match(plan, /on the final integrated tree/);
  assert.match(plan, /The plan is read-only: the coordinator applies it/);
  assert.match(plan, /`not-applicable`/);
  assert.match(plan, /`\(family, numeric prefix\)`[^.]*`adr:0010` and `ddr:0010` differ/);
  assert.match(plan, /Groups outside that frontier stay untouched even when they already collide/);
  assert.match(plan, /`NNNN-\*\.md` and\s+`NNNN\[a-z\]\+-\*\.md`/);
  assert.match(plan, /excluding the two index\s+files/);
  assert.match(plan, /for the old identifiers of renamed records only/);
  assert.match(plan, /applicability: not-applicable \| no-collision \| repair-required \| escalation-required/);
  assert.match(plan, /claims no repository-wide scan/);
  const coordinator = read('sai/commands/merge/coordinator.md');
  assert.match(coordinator, /`merge\.js collision --record <run>\/collision-\{k\}\.json` with the provenance on standard input/);
  assert.match(coordinator, /`needs-judgment` is a judgment point/);
});

test('merge collision dating uses captured refs, path following, and the method-aware stage mapping', () => {
  const plan = read('sai/commands/merge/steps/renumbering-plan.md');

  assert.match(plan, /from the captured refs, never from `HEAD` history/);
  assert.match(plan, /git log --follow --find-renames --name-status --format=/);
  assert.match(plan, /take the earliest `A` event, following renames back/);
  assert.match(plan, /git ls-files --unmerged --stage -- docs\/adr\/ docs\/ddr\//);
  assert.match(plan, /through the Sides mapping \(stage 1 anchors to `merge_base`\)/);
  assert.match(plan, /\(introduction_timestamp, introduction_commit, family, numeric prefix, final_path\)/);
  assert.match(plan, /reassign the whole group as one plan/);
  assert.match(plan, /oldest `a`, then `b`/);
  assert.match(plan, /introduction_anchor: source_sha\|target_sha\|merge_base/);
});

test('merge collision repair data flows from the worker plan to coordinator execution', () => {
  const plan = read('sai/commands/merge/steps/renumbering-plan.md');
  const coordinator = read('sai/commands/merge/coordinator.md');

  for (const field of ['introduction_anchor', 'introduction_timestamp', 'old_h1', 'new_h1', 'old_index_label', 'new_index_label']) {
    assert.match(plan, new RegExp(field));
    if (/h1|label/.test(field)) assert.match(coordinator, new RegExp(field));
  }
  assert.match(coordinator, /apply exactly the replacements the worker listed/);
  assert.match(coordinator, /never rename onto a path another final record holds/);
  assert.match(coordinator, /Orphan, ambiguous, and delete\/modify escalations are reported and never modified/);
  assert.match(plan, /are escalations: list them with their candidates, and change nothing for them/);
});

test('collision repair finalizes automatically only after the final integration state', () => {
  const coordinator = read('sai/commands/merge/coordinator.md');
  const final = section(coordinator, '## Final', '## Commit messages');

  assert.ok(final.indexOf('**Verify.**') < final.indexOf('**Collision.**'));
  assert.ok(final.indexOf('**Collision.**') < final.indexOf('**Finalize.**'));
  assert.match(final, /A finished rebase has nothing to commit unless a correction or a repair is staged; each is its own local commit/);
  assert.match(final, /a finished rebase with nothing staged creates no extra commit/);
  assert.match(final, /Stage only content the run owns, and stop if unrelated staged content would enter the commit/);
  assert.doesNotMatch(final, /needs_input|yes \(Recommended\)|On `no`/);
});

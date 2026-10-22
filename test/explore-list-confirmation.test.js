'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest.js');

const repoRoot = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(repoRoot, 'sai/commands/explore', file), 'utf8');
const writing = read('list-writing.md');
const common = read('steps/common.md');
const lists = common.slice(common.indexOf('**List stages ('), common.indexOf('**Rationale ownership'));

test('E/I confirmation presentation has one owner with the complete advancement notice', () => {
  assert.match(writing, /Display the complete current list with its current `E`\/`I` identifiers/);
  assert.match(writing, /one plain conversational question/);
  assert.match(writing, /bare `next-step` confirms this displayed list as written and advances to the next stage in the same turn/);
  assert.match(writing, /confirmation as written or additions, removals, or changes/);
  for (const file of ['steps/review-edge-cases.md', 'steps/implementation-details.md']) {
    const stage = read(file);
    assert.match(stage, /\*\*Display and question\*\* in `list-writing.md`/);
    assert.doesNotMatch(stage, /ask(?:ing)? whether the (?:complete )?list accurately captures/);
  }
  assert.doesNotMatch(lists, /The question names `next-step`/);
});

test('E1/E2/E5: missing notice and semantic changes require fresh presentation before either agreement event', () => {
  assert.match(lists, /before recording agreement/);
  assert.match(lists, /latest complete displayed list[\s\S]*incorporates every semantic change agreed since its presentation and included the complete notice/);
  assert.match(lists, /both explicit agreement and `next-step`/);
  assert.match(lists, /notice was missing or an intermediate discussion changed an item's meaning/);
  assert.match(lists, /shared review, display, and question sequence[\s\S]*wait for another confirmation/);
  assert.match(lists, /neither confirms nor advances/);
  assert.match(lists, /latest complete displayed list, never an earlier version/);
  assert.match(lists, /For user-confirmed lists, emit these events only after the presentation-currency check passes/);
});

test('M1: automatic empty-E recording needs no presentation notice; user-confirmed lists still do', () => {
  assert.match(lists, /For user-confirmed lists, check in conversation context/);
  assert.match(lists, /automatic empty-E recording below is exempt from this check and requires no confirmation notice/);
  assert.match(lists, /every non-empty list and an I list containing `- None` remain subject to it/);
  assert.match(lists, /emit exactly `- None` and record the empty list as agreed/);
  assert.doesNotMatch(lists, /A same-turn revision plus advancement likewise takes revision precedence/);
});

test('E3/E4/E6: revision precedence, unchanged discussion, event order and empty-list exceptions survive', () => {
  assert.match(common, /same-turn revision paired with `next-step` is a revision, not navigation: it updates and renumbers, stays open, re-asks, and does not advance/);
  assert.match(lists, /discussion that changes no item's meaning leaves the presentation current and requires no redisplay or extra confirmation/);
  assert.match(lists, /first the event that records the agreed list, which leaves the stage unchanged, then the advancement event/);
  assert.match(lists, /emit exactly `- None` and record the empty list as agreed/);
  assert.match(lists, /`Implementation details` stage never closes on its own[\s\S]*waits for the user's confirmation/);
  assert.match(lists, /conversation-only: use `explore-idea@1` unchanged, with no new storage fields/);
  assert.doesNotMatch(common, /always confirmation/);
});

test('Claude Code and opencode project the same shared confirmation contracts', () => {
  const manifest = loadInstallManifest(repoRoot);
  const destinationRoot = Object.fromEntries(['root', 'sai', 'commands', 'agents', 'skills', 'config'].map(key => [key, path.join(repoRoot, '.tmp', 'confirmation-projection', key)]));
  for (const harness of ['claude', 'opencode']) {
    const projections = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    for (const file of ['list-writing.md', 'steps/common.md', 'steps/review-edge-cases.md', 'steps/implementation-details.md']) {
      const sourcePath = path.join(repoRoot, 'sai/commands/explore', file);
      const projection = projections.find(item => item.sourcePath === sourcePath);
      assert.ok(projection, `${harness} installs ${file}`);
      assert.equal(fs.readFileSync(projection.sourcePath, 'utf8'), read(file));
    }
  }
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadInstallManifest, expandInstallManifest } = require('../bin/install-manifest');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const policyPath = 'sai/policies/implementation-closing-report.md';
const policy = () => read(policyPath);

test('shared authority defines three required statuses using existing completion conditions', () => {
  const text = policy();
  assert.deepEqual([...text.matchAll(/`(Status: [^`]+)`/g)].map(match => match[1]), [
    'Status: completed successfully.', 'Status: completed with warnings.', 'Status: stopped.',
  ]);
  assert.match(text, /existing route completion conditions/);
  assert.match(text, /pending human checks or omitted checks/);
  assert.match(text, /failure, cancellation, or interruption/);
  assert.match(text, /required literals[\s\S]*existing preservation[\s\S]*precede Terminology/);
  assert.match(read('sai/policies/public-chat.md'), /If a required literal must appear before the section, preserve it exactly/);
});

test('common order preserves complete human review before navigation and diagnostics', () => {
  const text = policy();
  const labels = ['1. **Status.**', '2. **Terminology**', '3. **What you need to know.**',
    '4. **Terminal functional review — pending human review**', '5. **Next step.**', '6. **Execution details**'];
  let previous = -1;
  for (const label of labels) {
    const index = text.indexOf(label);
    assert.ok(index > previous, label);
    previous = index;
  }
  assert.match(text, /every pending `fail` or[\s\S]*`unverifiable` check, its reason, and the recommendation/);
  assert.match(text, /A count is not a replacement/);
  assert.match(text, /review never ran/);
  assert.match(text, /what was not checked and why/);
  assert.match(text, /pre-existing failures and incidents affecting the outcome/);
  assert.match(text, /stops before Execution details[\s\S]*every pending human check and[\s\S]*reason/);
});

test('the full Direct Build route consults the authority and no apply-only part remains in it', () => {
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /Fetch @sai\/policies\/implementation-closing-report\.md/);
  const text = policy();
  assert.doesNotMatch(text, /apply-step\.js/);
  assert.doesNotMatch(text, /learnings-promotion/);
  assert.doesNotMatch(text, /would_pass/);
});

test('authorization visibility and declined-commit consequences remain at their decision points', () => {
  const text = policy();
  assert.match(text, /pre-authorization[\s\S]*included\/excluded files[\s\S]*authorization question/);
  assert.match(text, /original reports verbatim rather than rebuilding/);
  assert.match(text, /reporting[\s\S]*authorizes no rollback or new operation/);
  assert.match(text, /no new persisted reporting state[\s\S]*no verification run solely/);
});

test('full Direct Build retains diagnostics and excludes the POC', () => {
  const direct = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(direct, /full `direct-build-unattended` route's completed or stopped terminal close only/);
  assert.match(direct, /`--no-specs` POC keeps its own closing behavior/);
  assert.match(direct, /archive destination.*local commit reference.*Nothing was pushed/);
  assert.match(direct, /If archiving or the commit did not complete[\s\S]*use the stopped status/);
  assert.match(direct, /pre-existing failures classified at `base_sha`/);
  assert.match(direct, /every test file the implementer touched in a gate round/);
  assert.match(direct, /Name the violated rule/);
  assert.match(direct, /options of `@sai\/policies\/obstacle-escalation\.md` follow after `Execution details` as a separate question/);
  assert.doesNotMatch(direct, /exactly these four labeled sections/);
});

test('both harness projections automatically include the shared authority', () => {
  const manifest = loadInstallManifest(root);
  for (const harness of ['claude', 'opencode']) {
    const destinationRoot = Object.fromEntries(['root', 'commands', 'skills', 'sai', 'agents', 'config']
      .map(kind => [kind, path.join('/tmp/opencode', 'closing-projection', harness, kind)]));
    const projections = expandInstallManifest(manifest, { harness, repoRoot: root, destinationRoot });
    assert.ok(projections.some(entry => entry.sourcePath === path.join(root, policyPath)), harness);
  }
});

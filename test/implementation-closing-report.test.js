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

test('all full routes consult the authority for success and stops with unchanged Apply navigation', () => {
  for (const file of ['sai/commands/apply/coordinator.md', 'sai/commands/meta-build/coordinator.md',
    'sai/commands/explore/steps/pipeline-direct-build.md', 'sai/commands/apply/steps/terminal-lifecycle.md']) {
    assert.match(read(file), /Fetch @sai\/policies\/implementation-closing-report\.md/);
  }
  const literal = 'Implementation applied. In a new chat when ready, run `/sai-5-review {name}` for a general review, or `/sai-review {name}` to add specialized audits based on the initial assessment performed by `/sai-5-review`.';
  for (const file of ['sai/commands/apply/invocation.md', 'sai/commands/meta-build/coordinator.md']) {
    const text = read(file);
    assert.ok(text.includes(literal));
    assert.match(text, /Next step/);
    assert.match(text, /Execution details.*last/);
  }
  assert.match(read('sai/commands/apply/coordinator.md'), /incomplete run[\s\S]*no completion literal/);
  assert.match(read('sai/commands/apply/coordinator.md'), /pending question is a pause/);
  assert.match(read('sai/commands/meta-build/coordinator.md'), /stopped closing report/);
  assert.match(read('sai/commands/apply/steps/terminal-lifecycle.md'), /shared stopped closing report[\s\S]*§§ 1–5 do not run/);
});

test('suite failures have a direct stopped-report print path without terminal work or success navigation', () => {
  const terminal = read('sai/commands/apply/steps/terminal-lifecycle.md');
  const gate = terminal.split('## 0. Terminal suite gate')[1].split('## 1. Terminal functional review')[0];
  assert.match(gate, /lacks the command, the command cannot run, or the suite fails/);
  assert.match(gate, /print the shared stopped closing report directly in § 0, independently of § 5/);
  assert.match(gate, /without invoking successful `terminal_navigation`/);
  assert.match(gate, /What you need to know and Next step/);
  assert.match(gate, /Execution details last/);
  assert.match(gate, /supervisor to print its single invocation-wide stopped report/);
  assert.match(gate, /Omit the pending human-review block: no functional review ran/);
  assert.match(gate, /no functional review, final sweep, learnings promotion, or terminal documentation commit/);
  assert.match(gate, /marks no terminal entry, and prints no completion literal or successful transition/);
});

test('permitted legacy suite omission reaches both summary and diagnostics as a warning', () => {
  const terminal = read('sai/commands/apply/steps/terminal-lifecycle.md');
  const gate = terminal.split('## 0. Terminal suite gate')[1].split('## 1. Terminal functional review')[0];
  assert.match(gate, /print exactly `> Terminal suite gate: skipped — plan has no full-suite command` and continue to § 1/);
  assert.match(gate, /Carry this known skipped-gate result into the closing What you need to know and Execution details/);
  assert.match(gate, /omitted full-suite check with the reason `plan has no full-suite command`/);
  assert.match(gate, /otherwise completed run as completed with warnings/);
  assert.match(gate, /permitted skip still continues through §§ 1–5 and is not successful verification/);
});

test('Build failure closing preserves banner count according to implement activation', () => {
  const build = read('sai/commands/meta-build/coordinator.md');
  const failure = build.split('## Phase-1 failure blocks apply')[1].split('## Re-entry')[0];
  assert.match(failure, /without printing any FAST-TRACK banner beyond the single activation banner when implement activated/);
  assert.match(failure, /In What you need to know[\s\S]*failure, cancellation, or interruption/);
  assert.match(failure, /when an interruption closes the invocation/);
  assert.match(failure, /changes neither segment routing nor banner ownership/);
});

test('Apply closing explicitly collects affected files and declined or no-op commit decisions', () => {
  const closing = read('sai/commands/apply/steps/terminal-lifecycle.md').split('## 5. Print and stop')[1];
  assert.match(closing, /Execution details[\s\S]*affected files, declined\/no-op commit decisions/);
  assert.match(closing, /shared policy as sole format authority/);
  assert.match(closing, /Keep their pre-authorization disclosures where they are/);
});

test('authorization visibility and declined-commit consequences remain at their decision points', () => {
  const text = policy();
  assert.match(text, /pre-authorization[\s\S]*included\/excluded files[\s\S]*authorization question/);
  assert.match(text, /original reports verbatim rather than rebuilding/);
  assert.match(text, /reporting[\s\S]*authorizes no rollback or new operation/);
  assert.match(text, /no new persisted reporting state[\s\S]*no verification run solely/);
  const runner = read('sai/commands/apply/runner.md');
  assert.match(runner, /print `report_text`, then step 3's question, then `close`/);
  assert.match(runner, /All reports and authorization disclosures below still print at their original decision point/);
  assert.match(runner, /On `no`, run `close --mark-only`/);
  const terminal = read('sai/commands/apply/steps/terminal-lifecycle.md');
  assert.match(terminal, /Will be committed.*Will NOT be committed/);
  assert.match(terminal, /On `no`, leave the files in the working tree/);
});

test('full Direct Build retains diagnostics and excludes the POC', () => {
  const direct = read('sai/commands/explore/steps/pipeline-direct-build.md');
  assert.match(direct, /full `direct-build-unattended` route's completed or stopped terminal close only/);
  assert.match(direct, /`--no-specs` POC keeps its own closing behavior/);
  assert.match(direct, /archive destination.*local commit reference.*Nothing was pushed/);
  assert.match(direct, /If archiving or the commit did not complete[\s\S]*use the stopped status/);
  assert.match(direct, /pre-existing failures classified at `base_sha`/);
  assert.match(direct, /every test file the implementer touched in a gate round/);
  assert.match(direct, /Name the violated rule/);
  assert.match(direct, /stop options.*follow after `Execution details` as a separate question/);
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

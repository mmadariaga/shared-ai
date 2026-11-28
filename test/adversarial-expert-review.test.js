'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const manifest = require('../sai/install-manifest.json');
const { EXPERT_REVIEW_ROLES } = require('../bin/worker-matrix.js');
const validator = require('../sai/tools/worker-report-validator.js');

const CARD = 'sai/commands/adversarial-expert-review/worker.md';
const POLICY = 'sai/policies/adversarial-expert-review.md';
const WORKER = 'sai-adversarial-expert-review-worker';

test('the matrix pins one expert review role after the plan roles, on the request expert tier', () => {
  assert.deepEqual(EXPERT_REVIEW_ROLES.map(role => [role.phase, role.workerName, role.bindingStem, role.tier]), [
    ['expert-review', WORKER, 'adversarial-expert-review', 'expert'],
  ]);
  const entries = manifest['worker-matrix'].entries;
  assert.deepEqual(entries.map(entry => entry.phase), [
    'spec', 'design', 'security', 'performance', 'accessibility', 'commit', 'archive', 'backfill', 'merge',
    'direct-build', 'red', 'green', 'review', 'design-red', 'expert-review',
  ]);
  const entry = entries.find(candidate => candidate.workerName === WORKER);
  assert.ok(entry, 'the manifest should declare the expert review worker');
  assert.equal(entry.workerContract, CARD);
  assert.equal(entry.bindingStem, 'adversarial-expert-review');
  assert.equal(entry.claudeAgent.model, 'opus');
  assert.equal(entry.claudeAgent.effort, 'high');
  assert.equal(entry.opencodeAgent.model, 'opencode-go/gpt-5.6-luna');
  assert.equal(entry.opencodeAgent.variant, 'max');
});

test('the expert reviewer holds read, edit, write, and shell access with no delegation', () => {
  assert.equal(manifest.capabilities.assignments.agents[WORKER], 'worker-expert');
  assert.deepEqual(manifest.capabilities.profiles['worker-expert'], { extends: 'worker-write' });
  const resolved = {};
  const walk = name => {
    const profile = manifest.capabilities.profiles[name];
    if (profile.extends) walk(profile.extends);
    for (const [key, value] of Object.entries(profile)) {
      if (key !== 'extends') resolved[key] = value;
    }
  };
  walk('worker-expert');
  assert.equal(resolved.read, true);
  assert.equal(resolved.write, true);
  assert.ok(resolved.shell.includes('*'));
  assert.equal(Object.hasOwn(resolved, 'delegate'), false, 'the reviewer dispatches no subagent');
  for (const command of ['sai-explore', 'sai-plan', 'sai-build']) {
    const profile = manifest.capabilities.profiles[manifest.capabilities.assignments.commands[command]];
    assert.ok(profile.delegate.includes(WORKER), `${command} should be able to dispatch the reviewer`);
  }
  for (const command of ['sai-1-spec', 'sai-2-design', 'sai-3-implement', 'sai-4-review', 'sai-deep-review', 'sai-merge', 'sai-commit', 'sai-archive']) {
    const profile = manifest.capabilities.profiles[manifest.capabilities.assignments.commands[command]];
    assert.equal((profile.delegate || []).includes(WORKER), false, `${command} should not dispatch the reviewer`);
  }
});

test('the expert review worker card loads the shared worker protocol and closes with its own report', () => {
  const card = read(CARD);
  assert.match(card, /Fetch `@sai\/commands\/implement\/worker-common\.md`/);
  assert.match(card, /no step pointer arrives/);
  assert.match(card, /`--report-dir <path>`/);
  assert.match(card, /`Mode:` `document` or `mutations`/);
  assert.match(card, /@sai\/policies\/artifact-review-contract\.md/);
  assert.match(card, /scope observation/);
  assert.match(card, /`writing-for-agents`/);
  assert.match(card, /`node <tool-path> check --document-file <corrected file> --slice`/);
  assert.doesNotMatch(card, /emit --progress|event: progress/, 'the reviewer emits no progress report');
  assert.match(card, /status: completed\nsummary: string\nchanged_files: string\[\]\nfindings:/);
  assert.match(card, /corrected_documents: \{path: string, sha256: string, change_name: string\}\[\]/);
  assert.match(card, /Run no git command that changes the repository/);
  assert.match(card, /Dispatch no subagent/);
  assert.equal(fs.existsSync(path.join(repoRoot, 'sai/commands/adversarial-expert-review/coordinator.md')), false,
    'the reviewer has no coordinator of its own');
});

test('the shared policy owns the answer, the two questions, the cycle, keep-or-revert, and the closing lines', () => {
  const policy = read(POLICY);
  for (const fragment of [
    /The `--expert-review \[no\|auto\|ask\]` argument/,
    /`Cannot start \{command\}: --expert-review takes no, auto or ask\.`/,
    /`No` \(`no`\), `Yes, decide the corrections` \(`auto`\), and `Yes, ask me before keeping them` \(`ask`\)/,
    /`Keep the recommended corrections` \(`recommended`\)/,
    /`Keep all corrections` \(`keep-all`\)/,
    /`Discard all corrections` \(`discard-all`\)/,
    /restore <before-snapshot> <the group's paths>/,
    /review-delta\.js/,
    /Fetch `@sai\/orchestration\/workers\/bindings\/adversarial-expert-review-worker\.md`/,
    /A missing, invalid, or failed report costs one line in the closing report[\s\S]{0,400}revert every path of the worker's delta from the before-snapshot with `review-delta\.js restore`/,
    /verify the corrected copy against the `sha256` its `corrected_documents` entry reports/,
  ]) assert.match(policy, fragment);
  for (const line of ['Kept:', 'Discarded:', 'Reported without correction:', 'Expert review: no findings.']) {
    assert.match(policy, new RegExp(line.replace('.', '\\.')), `the closing report should carry ${line}`);
  }
  assert.match(policy, /Findings stay out of the repository/);
});

test('a failed worker report and an unverified document copy never leave a correction behind', () => {
  const policy = read(POLICY);
  const checkpoint = policy.slice(policy.indexOf('## The checkpoint'), policy.indexOf('## The findings'));
  assert.match(checkpoint, /Document mode reverts nothing, because the worker wrote only the report directory/);
  assert.match(checkpoint, /A copy that does not match its hash, or that fails the check, is discarded and its stored document stays \(E7\); the finding counts as discarded in the closing report/);
  const design = read('sai/commands/design/coordinator.md');
  assert.match(design, /created through the installed binding that policy § The checkpoint names/);
  assert.doesNotMatch(design, /Fetch\?? `@sai\/orchestration\/workers\/bindings\/adversarial-expert-review-worker\.md`/,
    'the binding is single-sourced in the policy');
});

test('each checkpoint sits where its command can keep or revert before settling', () => {
  const plan = read('sai/commands/plan/coordinator.md');
  assert.match(plan, /## Expert review answer/);
  assert.match(plan, /`--expert-review \[no\|auto\|ask\]`/);
  assert.match(plan, /handing it the valid research pointers of the cycle's Research hand-over for its brief and its own `--expert-review <no\|auto\|ask>` argument/);

  const design = read('sai/commands/design/coordinator.md');
  assert.match(design, /Take `--expert-review <no\|auto\|ask>` out too/);
  const checkpoint = design.slice(design.indexOf('**Expert review checkpoint.**'), design.indexOf('**Commit paths.**'));
  assert.match(checkpoint, /after the last review round and before the commits/);
  assert.match(checkpoint, /the product as this segment's commit paths of the two commits below/);
  assert.match(checkpoint, /red-by-assertion acceptance/);
  assert.match(checkpoint, /expert_review_checkpoint/);

  const build = read('sai/commands/build/coordinator.md');
  assert.match(build, /--expert-review takes no, auto or ask\./);
  assert.match(build, /## Expert review answer/);
  const buildCheckpoint = build.slice(build.indexOf('## Expert review checkpoint'), build.indexOf('## Close'));
  assert.match(buildCheckpoint, /after the last implementation segment that ran completed/);
  assert.match(buildCheckpoint, /test files excluded/);
  assert.match(buildCheckpoint, /test-select\.js/);
  assert.match(buildCheckpoint, /one local commit/);
  assert.match(buildCheckpoint, /inherent-risk block/);
  assert.ok(build.indexOf('## Expert review checkpoint') < build.indexOf('## Close'),
    'the build checkpoint runs before the close steps');
  assert.match(build, /`--expert-review no` always/);

  const implement = read('sai/commands/implement/coordinator.md');
  assert.match(implement, /Take `--expert-review <value>` out too and ignore it/);

  const selector = read('sai/commands/explore/steps/route-selector.md');
  const exploreCheckpoint = selector.slice(selector.indexOf('\n## Expert review checkpoint\n'), selector.indexOf('\n## Optional pre-route actions\n'));
  assert.match(exploreCheckpoint, /right after every document is printed and before round 1/);
  assert.match(exploreCheckpoint, /explore-slice@1 --amend <change-name>/);
  assert.match(exploreCheckpoint, /A corrected copy that fails the check is discarded/);
  assert.ok(selector.indexOf('\n## Expert review checkpoint\n') < selector.indexOf('\n## Optional pre-route actions\n'),
    'explore reviews the documents before its backlog and branch rounds');

  const pipeline = read('sai/commands/explore/steps/pipeline-plan-unattended.md');
  assert.match(pipeline, /--expert-review no/);
});

test('the validator accepts the expert review report shape and rejects an unknown severity', () => {
  assert.ok(Object.hasOwn(validator.COMMAND_FIELDS, 'adversarial-expert-review'));
  assert.deepEqual(Object.keys(validator.COMMAND_FIELDS['adversarial-expert-review']).sort(), ['corrected_documents', 'findings']);
  assert.deepEqual(validator.COMMAND_OUTCOMES['adversarial-expert-review'], []);
  const verdict = payload => validator.validateText(JSON.stringify(payload), 'terminal', { command: 'adversarial-expert-review' });
  const base = { status: 'completed', summary: 'ok', changed_files: [], findings: [] };
  assert.equal(verdict(base).ok, true);
  assert.equal(verdict({ ...base, findings: [{ identifier: 'H1', severity: 'Critical', location: 'a', issue: 'b', correction: 'c' }] }).ok, false);
  assert.equal(verdict({ ...base, findings: [{ identifier: 'H1', severity: 'High', location: 'a', issue: 'b', correction: 'c', paths: ['src/a.js'] }] }).ok, true);
  assert.equal(verdict({ ...base, corrected_documents: [{ path: '/tmp/copy.md', sha256: 'a'.repeat(64), change_name: 'x' }] }).ok, true);
  assert.equal(verdict({ status: 'failed', summary: 'x', changed_files: [] }).ok, true);
});

test('the project setting answers before each question, and Direct Build runs the checkpoint at step-2c', () => {
  const policy = read(POLICY);
  assert.match(policy, /`expertReview\.plan` for `\/sai-plan`, `expertReview\.build` for `\/sai-build` and `\/sai-direct-build`/);
  assert.match(policy, /It reads `expertReview\.explore` before its per-set question/);
  assert.match(policy, /only `auto` runs the checkpoint/);
  assert.match(policy, /## Direct Build/);
  assert.match(policy, /`step-2c`, after the suite gate of Step 2b and before the backfill of Step 3/);

  assert.match(read('sai/commands/plan/coordinator.md'), /the `expertReview\.plan` setting/);
  assert.match(read('sai/commands/build/coordinator.md'), /the `expertReview\.build` setting/);
  const selector = read('sai/commands/explore/steps/route-selector.md');
  assert.match(selector, /expertReview\.explore/);
  assert.match(selector, /`auto` runs it and decides each finding without asking/);
  const pipeline = read('sai/commands/explore/steps/pipeline-plan-unattended.md');
  assert.match(pipeline, /pass `--expert-review auto` only when the value is `auto`/);
  assert.match(pipeline, /`ask`, `no`, or an absent key it passes `--expert-review no`/);

  const direct = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(direct, /2c\. \*\*Expert review\*\*/);
  assert.match(direct, /only when the resolved answer is `auto`/);
  assert.match(direct, /`expert_review_checkpoint`/);
  assert.match(direct, /verified after[\s\S]{0,260}Step 2c/);
  assert.match(direct, /`backfill` after Step 2c is handled/);

  const command = read('sai/commands/direct-build/coordinator.md');
  assert.match(command, /Cannot start \/sai-direct-build: --expert-review takes no, auto or ask\./);
  assert.match(command, /wins over the `expertReview\.build` setting/);
  assert.match(read('docs/project-settings.md'), /### Expert review/);
  assert.match(read('docs/project-settings.md'), /Expert review\*\*: opens a submenu with `Explore`, `Plan`, and `Build`/);
});

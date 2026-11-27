'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { translate } = require('../bin/capabilities');
const { capabilities } = require('../sai/install-manifest.json');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const build = read('sai/commands/build/coordinator.md');
const publication = read('sai/commands/build/publication.md');

test('the build start resolves the publication answer in the plan order and asks once', () => {
  assert.match(build, /## Start/);
  assert.match(build, /--publish <answer>/);
  assert.match(build, /Cannot start \/sai-build: --publish takes yes or no\./);
  const order = ['1. The `--publish yes|no` argument.', '2. The answer recorded in the run state', '3. The `pr.publishAfterRun` setting', '4. The question below.'].map(line => build.indexOf(line));
  assert.ok(order.every(index => index > 0) && order.every((index, i) => i === 0 || index > order[i - 1]), 'the four sources follow the /sai-plan order');
  assert.match(build, /emit `status` to `implement-run@1`, and read the `publication` field of its `run` view/);
  assert.match(build, /An explicit `--publish` value wins over the recorded answer and replaces it/);
  assert.match(build, /after that segment's Start step 4 has accepted the change/);
  assert.match(build, /before its step 5 opens the run, so no worker exists yet/);
  assert.match(build, /AskUserQuestion.*question|`question`/);
  assert.match(build, /Branch \{branch\}, remote \{remote\}/);
  assert.match(build, /Options: `Publish ready request`, `Do not publish`/);
  assert.match(build, /A run that fails, is stopped, or ends on an unanswered escalation publishes nothing, whatever the answer/);
  assert.match(build, /A detached HEAD has no branch to name: ask nothing, record no answer/);
});

test('the answer is recorded after segment 1 opens its run and again after segment 3 opens its new run', () => {
  assert.match(build, /--set kind=publication --set value=<yes\|no>/);
  assert.match(build, /right after segment 1's Start step 5 has opened its run or taken up an interrupted one/);
  assert.match(build, /again right after segment 3's Start step 5 has opened its new run, before its first step/);
  assert.match(build, /a completed implement run starts fresh under the same key and drops the answer/);
  assert.match(build, /A build whose segment 3 does not run publishes with the answer of segment 1/);
  assert.match(build, /Right after its Start step 5 has opened its new run, record the publication answer again/);
  assert.match(build, /A resumed run takes the answer from the run state again, and asks only when none was recorded/);
});

test('the build publishes once, after the telemetry commit, and a failed publication never changes the outcome', () => {
  assert.ok(build.indexOf('**Telemetry.**') < build.indexOf('**Publication.**') && build.indexOf('**Publication.**') < build.indexOf('After the last segment that ran ends, print the report'));
  assert.match(build, /Fetch `@sai\/commands\/build\/publication\.md`/);
  assert.match(build, /the build publishes once, here, never between segments/);
  assert.match(build, /the build stays completed, any confirmed push stays, and nothing is retried with force/);
  assert.match(build, /that the request stays a draft and why/);
  assert.match(build, /End with exactly `Build done\.`/);
});

test('the build publication card is unattended, skips the plan-commit step, and publishes the request state its caller hands it, ready by default', () => {
  assert.doesNotMatch(publication, /AskUserQuestion|plan-commit --unattended|plan-query|Commit listed/);
  assert.match(publication, /asks the user nothing, and never stops the run/);
  assert.match(publication, /never creates a commit/);
  assert.match(publication, /`push --unattended`/);
  assert.match(publication, /`publish --unattended`/);
  assert.match(publication, /explicit `publish_pr_as_draft` value: the one the caller hands over, or `false` when it hands none/);
  assert.match(publication, /`publish --unattended` with `publish_pr_as_draft` and the receipt/);
  assert.doesNotMatch(publication, /ready:true|draft:true/);
  assert.match(publication, /no force push, no automatic retry/i);
  assert.match(publication, /the request stays a draft: the push and the content update stand/);
  assert.match(publication, /The build still counts as completed/);
  // E13: a ready request tells its reviewer which findings the run left pending or excluded.
  assert.match(publication, /gains a `## Pending findings` section/);
  assert.match(publication, /under \*\*Pending\*\*/);
  assert.match(publication, /under \*\*Excluded\*\* for those whose heading in `review\.md` carries ` \(EXCLUDED: …\)`/);
  assert.match(publication, /With neither, the description has no such section/);
  assert.match(build, /follow it with the change name and the findings that stay unresolved/);
  assert.equal(fs.existsSync(path.join(root, 'sai/commands/plan/publication.md')), true);
  const plan = read('sai/commands/plan/publication.md');
  assert.match(plan, /never marks a request ready/);
  assert.doesNotMatch(plan, /ready:true|draft:true/);
  assert.match(plan, /explicit `publish_pr_as_draft: true` request/);
  assert.match(plan, /`publish --unattended` with `publish_pr_as_draft: true` and the receipt/);
});

test('a direct /sai-3-implement run and /sai-deep-review ask, record, and publish nothing', () => {
  for (const file of ['sai/commands/implement/coordinator.md', 'sai/commands/deep-review/coordinator.md', 'sai/commands/review/coordinator.md']) {
    // The implement card only names the recorded answer to say that /sai-build keeps its session open.
    const text = read(file).replace(/the session of key `implement-\{name\}` holds the build's recorded publication answer/, '');
    assert.doesNotMatch(text, /publication|publishAfterRun|--publish/i, `${file} carries no publication step`);
  }
});

test('the Claude Code wrapper names --publish and the opencode wrapper keeps its form, with the same card on both', () => {
  assert.match(read('commands/claude/sai-build.md'), /^argument-hint: "\[change-name\] \[--publish yes\|no\] \[--parent-branch <branch>\]"$/m);
  assert.doesNotMatch(read('commands/opencode/sai-build.md'), /^argument-hint:/m);
  for (const wrapper of ['commands/claude/sai-build.md', 'commands/opencode/sai-build.md']) {
    assert.match(read(wrapper), /Fetch `@sai\/commands\/build\/coordinator\.md` and follow it exactly/);
  }
});

test('both harnesses give the build command the to-pr skill and the shell to publish', () => {
  for (const harness of ['claude', 'opencode']) {
    const compiled = translate(capabilities, 'build-command', harness);
    assert.ok(compiled.profile.skills.includes('to-pr'), `${harness} build-command loads to-pr`);
    assert.ok(compiled.profile.shell.includes('*'), `${harness} build-command runs to-pr.js and project-settings.js`);
    assert.equal(compiled.profile.question, true, `${harness} build-command can ask the start question`);
  }
});

test('the build publication is documented for the command, the setting, the skill, and the repository index', () => {
  assert.match(read('docs/commands/sai-build.md'), /--publish yes\|no/);
  assert.match(read('docs/commands/sai-build.md'), /marked ready for review/);
  assert.match(read('docs/project-settings.md'), /`\/sai-plan` and `\/sai-build` publication question/);
  assert.match(read('skills/universal/to-pr/SKILL.md'), /sai\/commands\/build\/publication\.md/);
  assert.match(read('README.md'), /--publish yes\|no/);
  assert.match(read('AGENTS.md'), /sai\/commands\/build\/publication\.md/);
});

test('the implement run state stays open across the build segments so the recorded answer survives a resumed build', () => {
  const implement = read('sai/commands/implement/coordinator.md');
  assert.match(implement, /then `reset` both step machines and `close` the `sai-state` session\. Inside `\/sai-build` skip the session `close` only/);
  assert.match(implement, /it stays open across the segments and `\/sai-build` closes it at its own Close/);
  assert.match(build, /the implement coordinator's Close step 7 skips its session `close` inside this command/);
  assert.match(build, /a build interrupted in segment 2, in the Assessment pass, or after segment 3 would ask again/);
  assert.match(build, /\*\*Session\.\*\* When the run completed \(the publication step included, whatever its outcome\), `close` the `sai-state` session of key `implement-\{name\}`/);
  assert.ok(build.indexOf('**Publication.**') < build.indexOf('**Session.**') && build.indexOf('**Session.**') < build.indexOf('After the last segment that ran ends, print the report'));
  assert.match(build, /A run that fails, is stopped, or ends blocked leaves it open, so a rerun finds the recorded answer/);
  // The direct command and /sai-deep-review keep closing the session in every outcome.
  assert.doesNotMatch(read('sai/commands/deep-review/coordinator.md'), /skip the session `close`/);
  assert.match(implement, /`emit` `close`|Emit `close` with the outcome/);
});

test('the machine keeps the answer through the close event that ends a segment and drops it only on the next start', () => {
  const machine = require('../sai-state/machines/implement-run.js');
  const started = machine.transition(machine.initialState, { kind: 'start', dir: '/tmp/implement-demo-1' });
  const answered = machine.transition(started.state, { kind: 'publication', value: 'yes' });
  const closed = machine.transition(answered.state, { kind: 'close', outcome: 'completed' });
  assert.equal(machine.project(closed.state).run.publication, 'yes', 'a build resumed after segment 1 completed still reads the answer');
  assert.equal(machine.transition(closed.state, { kind: 'start', dir: '/tmp/implement-demo-2' }).run.publication, '');
});

test('a Direct Build slice hands the request state to the publication card from the branch strategy and the pending slices', () => {
  const coordinator = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(coordinator, /`publish_pr_as_draft: true` when the `branch_strategy` of the same `run` view is `shared` or `none` and its `pending` list holds a slice other than this one/);
  assert.match(coordinator, /`per-slice`, no recorded strategy, a single-slice set, or no other pending slice\) it is `publish_pr_as_draft: false`/);
  assert.match(coordinator, /whatever route it takes later/);
  assert.match(coordinator, /number of slices still pending/);
  const selector = read('sai/commands/explore/steps/route-selector.md');
  assert.match(selector, /## Branch strategy record/);
  assert.match(selector, /--set intent=branch-strategy --set value=<shared\|per-slice\|none>/);
  assert.match(selector, /BRANCH_STRATEGY_ALREADY_RECORDED/);
  assert.match(selector, /record the set's branch strategy when it is final/);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { expandInstallManifest, loadInstallManifest } = require('../bin/install-manifest');
const { materializeWorkerMatrix } = require('../bin/worker-matrix');

const repoRoot = path.join(__dirname, '..');
const exists = relativePath => fs.existsSync(path.join(repoRoot, relativePath));

function read(relativePath) {
  assert.equal(exists(relativePath), true, `${relativePath} should exist`);
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function section(text, startHeading, endHeading) {
  const start = text.indexOf(startHeading);
  assert.notEqual(start, -1, `${startHeading} should exist`);
  const end = endHeading ? text.indexOf(endHeading, start + startHeading.length) : -1;
  return end === -1 ? text.slice(start) : text.slice(start, end);
}

const fetches = text => text.split('\n').filter(line => line.startsWith('Fetch @')).map(line => line.replace(/ and .*$/, '').trim());
const coordinator = () => read('sai/commands/merge/coordinator.md');
const STEPS = ['strategy', 'apply', 'test-correction', 'renumbering-plan'];

test('the coordinator is one goal-driven card that loads only the six policies and no budget binding', () => {
  const card = coordinator();
  assert.deepEqual(fetches(card).slice(0, 6), [
    'Fetch @sai/policies/public-chat.md',
    'Fetch @sai/policies/remember.md',
    'Fetch @skills/safe-operations/SKILL.md',
    'Fetch @sai/policies/tool-resolution.md',
    'Fetch @sai/policies/obstacle-escalation.md',
    'Fetch @sai/policies/incremental-review.md',
  ]);
  for (const forbidden of ['command-runner', 'worker-core', 'bounded-recovery', 'stop-options', 'unattended-runtime-recovery',
    'no-commit-guard', 'command-execution', 'commit-rules', 'budget-explorer', 'budget-executor', 'budget-subagent']) {
    assert.doesNotMatch(card, new RegExp(`Fetch @[^\\n]*${forbidden}`), `the coordinator must not load ${forbidden}`);
  }
  assert.match(card, /the only subagent of this run is the merge worker/);
  for (const heading of ['## Goal', '## Start', '## A conflict stop', '## Final', '## Obstacles', '## Run state', '## Resuming', '## Close']) {
    assert.ok(card.includes(heading), heading);
  }
  assert.ok(card.length < 24000, 'the coordinator stays a short goal-driven card');
});

test('the wrappers load the harness fetch skill and the coordinator directly, with no boot adapter or bootstrap', () => {
  const claude = read('commands/claude/sai-merge.md');
  const opencode = read('commands/opencode/sai-merge.md');
  for (const wrapper of [claude, opencode]) {
    assert.match(wrapper, /Fetch @sai\/commands\/merge\/coordinator\.md and follow it exactly, forwarding the InvocationEnvelope block below\./);
    assert.doesNotMatch(wrapper, /adapters\/|command-bootstrap/);
    assert.match(wrapper, /command_name: merge\n {2}arguments_value: \$ARGUMENTS/);
    assert.match(wrapper, /\[<branch>\] \[--rebase\|--squash\]/);
    assert.doesNotMatch(wrapper, /fast-track applies/i);
  }
  assert.match(claude, /argument-hint: "\[<branch>\] \[optional: --rebase \| --squash\]"/);
  assert.match(claude, /^Fetch @skills\/fetch\/SKILL\.md$/m);
  assert.match(opencode, /^Fetch @~\/\.config\/opencode\/skills\/fetch\/SKILL\.md before you continue\.$/m);
});

test('arguments: the branch is optional, --squash wins, and --fast-track is accepted and ignored without a banner', () => {
  const card = coordinator();
  const start = section(card, '## Start', '## A conflict stop');
  assert.match(card, /`\[<branch>\] \[--rebase\|--squash\]`/);
  assert.match(card, /`--squash` wins when both are given/);
  assert.match(start, /Accept and ignore `--fast-track`, with no banner/);
  assert.match(start, /Without a branch in the arguments, ask which branch to integrate through the native picker/);
  assert.match(start, /Fetch nothing/);
  assert.doesNotMatch(card, /FAST-TRACK MODE ACTIVE|fast_track_active/);
  assert.doesNotMatch(card, /working language|Which language|language selection/i, 'the language question retired: the report uses the chat language');
  assert.doesNotMatch(card, /Which integration method|Continue anyway\?|apply-strategy|decline-strategy|revise-strategy/);
  assert.match(card, /You write in the language of the chat/);
});

test('start: the method question joins the branch question, and autostash is asked right after it, before the baseline', () => {
  const start = section(coordinator(), '## Start', '## A conflict stop');
  assert.match(start, /Without `--rebase` or `--squash`, ask the method in the same call: merge, rebase, or squash/);
  assert.match(start, /When the native picker is unavailable the method is a merge and the run goes on/);
  assert.match(start, /Cancelling either question ends the run with nothing launched and nothing written/);
  assert.match(start, /the method comes from the store and nothing is asked/);
  assert.ok(start.indexOf('ask the method') < start.indexOf('Fix the test command once'));
  assert.ok(start.indexOf('ask the method') < start.indexOf('5. Autostash'));
  assert.ok(start.indexOf('5. Autostash') < start.indexOf('6. Open the run state'));
  assert.ok(start.indexOf('5. Autostash') < start.indexOf('Run `merge.js provenance`'));
  assert.ok(start.indexOf('5. Autostash') < start.indexOf('Take the baseline'));
  assert.match(start, /On no, or with no picker, end the run with the cause, before the first mutation: no suite has run and nothing is launched/);
  assert.match(start, /Untracked files never trigger the question, and a merge keeps its behavior/);
  assert.match(start, /Never change `git config`/);
  assert.match(start, /rebase command line carries `--autostash`/);
  assert.match(coordinator(), /name the stash entry that stays[\s\S]+`git stash pop`/);
});

test('E7: the run directory exists before provenance.json is saved, and a resumed run asks nothing', () => {
  const start = section(coordinator(), '## Start', '## A conflict stop');
  assert.ok(start.indexOf('temp-root.js mkdtemp') < start.indexOf('Run `merge.js provenance`'));
  assert.ok(start.indexOf('emit `start` with its `dir`') < start.indexOf('Run `merge.js provenance`'));
  assert.match(start, /as `stash-base\.txt` in the run directory/);
  assert.ok(start.indexOf('Run `merge.js provenance`') < start.indexOf('Take the baseline'));
  assert.match(start, /follow Resuming and skip the rest of Start: the method comes from the store and nothing is asked/);
});

test('E9: the docs, both wrappers, and AGENTS.md describe the command as asking only at start and on escalation', () => {
  const texts = {
    docs: read('docs/commands/sai-merge.md'),
    claude: read('commands/claude/sai-merge.md'),
    opencode: read('commands/opencode/sai-merge.md'),
    onDemand: read('docs/on-demand-commands.md').split('\n').filter(line => line.includes('`/sai-merge`')).join('\n'),
    agents: section(read('AGENTS.md'), '### Merge coordinator and worker', '### Merge efficiency'),
    card: section(coordinator(), '## Goal', '**Terms.**'),
  };
  for (const [name, text] of Object.entries(texts)) {
    assert.doesNotMatch(text, /no human in the loop/, `${name} must not claim no human interaction`);
    assert.match(text, /autostash/i, `${name} names the autostash question`);
  }
  for (const name of ['docs', 'onDemand', 'agents', 'card']) {
    assert.match(texts[name], /only at the start/, `${name} says the command asks only at the start`);
    assert.match(texts[name], /on escalation/, `${name} says the command asks on escalation`);
  }
  for (const wrapper of ['claude', 'opencode']) {
    assert.match(texts[wrapper], /asks only at start \(branch, method, autostash\) and on escalation/);
  }
  assert.doesNotMatch(texts.agents, /the method, language, dirty-tree, and strategy questions/);
});

test('E1: a launch with no conflict creates no worker and goes straight to verification and the collision check', () => {
  const card = coordinator();
  assert.match(card, /A clean launch has no stop and no worker: it goes straight to Final\./);
  assert.match(card, /Create the worker when none exists/);
  assert.match(section(card, '## Final', '## Commit messages'), /\*\*Verify\.\*\*[\s\S]+\*\*Collision\.\*\*[\s\S]+\*\*Finalize\.\*\*/);
});

test('E2, E3: the baseline is taken once at HEAD before the launch, and verification compares only new failures', () => {
  const card = coordinator();
  const start = section(card, '## Start', '## A conflict stop');
  assert.ok(start.indexOf('Fix the test command once') < start.indexOf('Take the baseline'));
  assert.ok(start.indexOf('Take the baseline') < start.indexOf('10. Launch.'));
  assert.match(card, /`merge\.js verify --baseline --record <run>\/baseline\.json`/);
  assert.match(card, /`merge\.js verify --baseline-record <run>\/baseline\.json --baseline-hash <hash>/);
  assert.match(card, /A \*\*new failure\*\* is a test that passes in the baseline and fails after the resolution on two consecutive runs: it is the only failure that blocks/);
  assert.match(card, /A \*\*pre-existing failure\*\* already fails in the baseline: it is reported and never blocks/);
  assert.match(card, /`preexisting`, `flaky`, and `not-comparable` are reported and never block/);
  assert.match(card, /A `new` failure is the obstacle `new-failure`/);
  assert.match(card, /With no command, or several ambiguous ones, the baseline and the verification are unavailable: the run goes on and the report says so/);
  assert.doesNotMatch(card, /three rounds|round 1 or 2|cap-exhausted|failed-no-correction/, 'the three-round verification budget retired');
});

test('E4: a rebase runs the suite once on the final tree and corrects a new failure in one additional local commit', () => {
  const final = section(coordinator(), '## Final', '## Commit messages');
  assert.match(final, /The suite runs once, on the final tree: after the resolution is staged for a merge, and after the last stop for a rebase, never per stop/);
  assert.match(final, /the corrections go in one additional local commit on top of the rebased branch, made when verification shows no new failure/);
  assert.match(final, /On a merge the corrections join the merge commit/);
  assert.match(coordinator(), /another unmerged stop starts a new stop with the same worker/);
  assert.match(coordinator(), /Name each obstacle `stop-\{n\}`, `new-failure`, or `collision`/);
});

test('E5, E10: commit intent that cannot decide escalates through the picker with written options, and abort is only explicit', () => {
  const card = coordinator();
  const escalation = section(card, '3. **Escalation.**', '4. **Apply.**');
  assert.match(escalation, /Escalate at once, without spending an attempt/);
  assert.match(escalation, /native picker with options you write/);
  assert.match(escalation, /leaving the operation in progress without finalizing/);
  assert.match(escalation, /`git merge --abort` or `git rebase --abort`/);
  assert.match(escalation, /The run aborts only when the user chose that/);
  assert.match(read('sai/commands/merge/steps/strategy.md'), /When commit intent cannot decide between two sides[\s\S]+do not pick/);
  assert.match(read('sai/commands/merge/steps/strategy.md'), /A file that admits only a whole-side choice takes the side its commit intent favors/);
  assert.match(card, /run `git checkout --ours` or `--theirs` on that path/);
  assert.match(card, /A dismissed question closes the run `escalated`, with the merge or rebase left in progress/);
});

test('E6, E7: a dirty tree proceeds when git allows it, staged unrelated content stops it, and a foreign operation is never touched', () => {
  const start = section(coordinator(), '## Start', '## A conflict stop');
  assert.match(start, /Staged content before the launch would enter the commit: when any `dirty` entry of the preflight is staged, end the run naming those paths/);
  assert.match(start, /Unstaged changes do not stop the run; git decides whether the launch can go on/);
  assert.match(start, /A launch that git refuses ends the run with git's message and the exact state/);
  assert.match(start, /rebase\.autoStash/);
  assert.match(start, /A run of this command resumes only when the invocation names the same branch/);
  assert.match(start, /touch nothing, and end the run/);
  assert.match(section(coordinator(), '## Resuming', '## Close'), /find the run that owns it|the git state wins|The git state wins/);
});

test('E8: an interrupted run resumes from the store and the git state, and a replacement worker gets a hand-over file', () => {
  const card = coordinator();
  const resume = section(card, '## Resuming', '## Close');
  assert.match(resume, /Emit `status` first/);
  assert.match(resume, /The git state wins over the store/);
  assert.match(resume, /Without the store, rebuild from the git state and the run directory/);
  assert.match(resume, /give it a hand-over file/);
  assert.match(card, /A `running` or `escalated` stage whose git state shows no merge or rebase in progress is a run that ended outside this command/);
  assert.match(card, /gets `handover-\{k\}\.md`, which you write in the run directory/);
  assert.match(read('sai/policies/obstacle-escalation.md'), /Never forward the old worker's history/);
  assert.doesNotMatch(card, /replacement_reconstruction_fields|--reconstruct/);
});

test('E9: a missing branch is asked, a missing ref stops with the cause, and an integrated branch closes with no changes', () => {
  const start = section(coordinator(), '## Start', '## A conflict stop');
  assert.match(start, /A failure ends the run with the cause and nothing launched\. When `source_sha` is already an ancestor of `HEAD`, close with no changes and say so/);
  assert.match(start, /An argument starting with `origin\/` names `refs\/remotes\/origin\/<rest>`; every other name is `refs\/heads\/<name>`/);
});

test('E11: review findings still open after the third round are pending and do not stop the run', () => {
  const review = section(coordinator(), '5. **Review.**', '6. **Stage.**');
  assert.match(review, /at most 3 fix rounds under `incremental-review\.md`/);
  assert.match(review, /fidelity to the commit intent of both sides, any change outside the conflict regions, and leftover conflict markers/);
  assert.match(review, /Findings still open after round 3 are pending: write them to `findings\.md`[\s\S]+and go on/);
  assert.match(review, /`review-delta\.js snapshot`/);
  assert.match(coordinator(), /the findings still pending after round 3/);
  assert.match(coordinator(), /6\. \*\*Stage\.\*\* `git add` the resolved paths\. Run no `git diff --cached --check`/);
});

test('E12, E13, E17, E18: collision repair, local pre-authorized commits, squash method, and the restore command', () => {
  const card = coordinator();
  assert.match(card, /the merge commit, the squash commit, each `git rebase --continue`, the correction commit of the final tree, and the repair commit/);
  assert.match(card, /Never push, amend, force, bypass a hook, drop or pop a stash, or abort an operation unless the user chose it/);
  assert.match(card, /`upstream\.force_push_needed` of the provenance\), say that the next push needs a force push/);
  assert.match(card, /name the `HEAD` recorded before the launch and the command that restores the branch to it \(`git reset --hard <sha>`\)/);
  assert.match(card, /A squash, when `merge_base` differs from `target_sha`, runs `git reset --soft <merge_base>` and one `git commit`/);
  assert.match(card, /`--squash` first turns the current branch's own commits since the merge base into one local commit and then rebases it/);
  assert.match(card, /The range is `merge_base\.\.source_sha` for a merge and `merge_base\.\.HEAD` \(taken before the soft reset\) for a squash/);
  assert.match(card, /one literal `- <first line>` per output line, none dropped, none reworded/);
  assert.doesNotMatch(card, /git push(?! )/);
  assert.match(card, /nothing is pushed/);
});

test('the worker contract: one standalone worker, steps by pointer, writes only through merge.js write, no git mutation', () => {
  const worker = read('sai/commands/merge/worker.md');
  const card = coordinator();
  assert.match(worker, /Return exactly this and end the turn:\n\n```yaml\nevent: ready\nchanged_files: \[\]\n```/);
  assert.match(worker, /`Active step: <id> — follow <path>`/);
  assert.match(worker, /Your writes to the repository are resolved text handed to `merge\.js write`/);
  assert.match(worker, /Run only read-only git commands \(`status`, `rev-parse`, `branch`, `diff`, `show`, `log`, `ls-files`, `merge-base`, `cat-file`\)/);
  assert.match(worker, /never rename a file/);
  assert.match(worker, /Dispatch no subagent/);
  assert.match(worker, /return only that path as your final message/);
  assert.doesNotMatch(worker, /sai-state|merge-run@1|emit /, 'a worker card names no machine and no store command');
  for (const step of STEPS) {
    assert.ok(exists(`sai/commands/merge/steps/${step}.md`), step);
    assert.ok(card.includes(`sai/commands/merge/steps/${step}.md`), `the coordinator names the ${step} step by pointer`);
  }
  assert.match(card, /Active step: strategy — follow sai\/commands\/merge\/steps\/strategy\.md/);
  assert.match(card, /Fetch @sai\/orchestration\/workers\/bindings\/merge-worker\.md and use it\./);
  assert.match(read('sai/commands/merge/steps/apply.md'), /Edit an affected file only through this call/);
});

test('E15: the retired cards, entry points, and shared surfaces other commands use', () => {
  for (const retired of ['lifecycle', 'presentation', 'coordinator-stages', 'instructions', 'command-bootstrap']) {
    assert.equal(exists(`sai/commands/merge/${retired}.md`), false, `${retired}.md retires`);
  }
  for (const kept of ['coordinator', 'worker', 'mechanics']) assert.ok(exists(`sai/commands/merge/${kept}.md`), kept);
  assert.match(read('sai/commands/merge/mechanics.md'), /^# Merge mechanical evidence/);
  for (const shared of ['sai/policies/no-commit-guard.md', 'sai/tools/transfer.js']) assert.ok(exists(shared), `${shared} stays`);
  const todo = read('sai/policies/todo-structure.md');
  assert.doesNotMatch(todo, /Merge adaptive TODO|sai-merge-todo/);
  assert.doesNotMatch(read('sai/adapters/claude/panel-render.md') + read('sai/adapters/opencode/panel-render.md'), /sai-merge/);
  assert.doesNotMatch(read('sai/policies/command-execution.md'), /merge/);
  for (const file of ['sai/commands/merge/coordinator.md', 'sai/commands/merge/worker.md', 'sai/commands/merge/mechanics.md']) {
    assert.doesNotMatch(read(file), /presentation seam|render_gate|render_terminal|lifecycle seam|validate_transition/, file);
  }
  const manifest = JSON.parse(read('sai/install-manifest.json'));
  const retired = manifest.retirements.filter(entry => /^retired-merge-goal-driven-/.test(entry.id));
  assert.deepEqual(retired.map(entry => entry.destination.path).sort(), [
    'commands/merge/command-bootstrap.md', 'commands/merge/coordinator-stages.md', 'commands/merge/instructions.md',
    'commands/merge/lifecycle.md', 'commands/merge/presentation.md',
  ]);
  for (const entry of retired) {
    assert.ok(entry.managedHashes.length > 0 && entry.managedHashes.every(value => /^[0-9a-f]{64}$/.test(value)), entry.id);
    assert.deepEqual(entry.harnesses, ['claude', 'opencode']);
    assert.equal(entry.destination.class, 'sai');
  }
  assert.doesNotMatch(JSON.stringify(manifest.capabilities.profiles['merge-command']), /transfer\.js/);
});

test('E14: fast-track no longer lists /sai-merge, and the guard policy drops merge\'s language-question example', () => {
  assert.doesNotMatch(read('sai/policies/fast-track-flag.md'), /sai-merge/);
  const guard = read('sai/policies/no-commit-guard.md');
  assert.doesNotMatch(guard, /conflict_detected|language question/);
  assert.match(guard, /1\. \*\*Human turn\*\* — a `needs_input` result \(closed or open\), a nonterminal\n {3}extension whose handler hands the turn to the user, or a user interruption\n {3}that is later resumed\./);
  assert.match(guard, /## Window pairing/);
  assert.match(guard, /a merge launch, checkout, `git mv`, or staging/);
  for (const doc of ['docs/on-demand-commands.md', 'docs/sequential-pipeline.md']) {
    const text = read(doc);
    assert.doesNotMatch(text, /\| `\/sai-merge` \| Pins the method/, doc);
    assert.match(text, /two commands accept a `--fast-track` argument/, doc);
  }
});

test('E16: Claude Code and opencode render the same standalone merge binding from the worker matrix', () => {
  const manifest = loadInstallManifest(repoRoot);
  const { defineWorkerMatrix } = require('../bin/worker-matrix');
  const entries = manifest['worker-matrix'].entries;
  const matrix = defineWorkerMatrix(entries, manifest.capabilities);
  const templates = Object.fromEntries(Object.entries(manifest['worker-matrix'].templates).map(([name, file]) => [name, read(file)]));
  const rendered = materializeWorkerMatrix(matrix, templates).filter(item => item.kind === 'binding' && item.phase === 'merge');
  assert.deepEqual(rendered.map(item => [item.harness, item.templateName]), [['claude', 'claudeStandaloneBinding'], ['opencode', 'opencodeStandaloneBinding']]);
  for (const item of rendered) {
    assert.equal(item.destinationName, 'merge-worker.md');
    assert.match(item.text, /Fetch @sai\/commands\/merge\/worker\.md and follow it exactly\./);
    assert.match(item.text, /Return event: ready now; await task disclosure in the same-worker continuation\./);
  }
  for (const harness of ['claude', 'opencode']) {
    const root = path.join(require('node:os').tmpdir(), `sai-merge-goal-${harness}`);
    const destinationRoot = Object.fromEntries(['commands', 'sai', 'skills', 'agents', 'config', 'root'].map(name => [name, path.join(root, name)]));
    const expanded = expandInstallManifest(manifest, { harness, repoRoot, destinationRoot });
    assert.ok(expanded.some(item => item.destinationPath === path.join(destinationRoot.sai, 'orchestration/workers/bindings/merge-worker.md')
      || item.destinationPath.endsWith('merge-worker.md')), `${harness} installs the merge worker binding`);
  }
});

test('the run state, review, and report: merge-run@1, review-delta, and the goal-defined closing report', () => {
  const card = coordinator();
  assert.match(card, /The `merge-run@1` machine in `sai-state` is your memory outside the conversation/);
  assert.match(card, /key `merge-\{branch\}`/);
  assert.match(card, /`temp-root\.js mkdtemp --harness <claude\|opencode> --prefix merge-`/);
  assert.match(card, /Remove the run directory with `temp-root\.js remove --harness <claude\|opencode> --dir <run directory>` only when the run completed/);
  assert.match(card, /A stopped, escalated, or unanswered run keeps it/);
  assert.match(card, /A run that finalized the integration ends with exactly `Merge done\.`/);
  const close = section(card, '## Close', null);
  for (const fact of ['the method, the target and source branches', 'the conflicts resolved per stop', 'the verification against the baseline',
    'the findings still pending after round 3', 'the collision repairs and reported escalations', 'the assumptions and the escalations']) {
    assert.ok(close.includes(fact), fact);
  }
  assert.doesNotMatch(card, /\| .* \| .* \|\n\| --- /, 'a goal-driven contract carries no case tables');
});

test('the docs and the ADR record that merge leaves the shared orchestration and the presentation seam retires', () => {
  const adr = read('docs/adr/0201-merge-leaves-the-shared-orchestration.md');
  assert.match(adr, /<!-- adr-index: supersedes 0175a;/);
  assert.match(adr, /presentation seam of ADR 0175a retires/);
  assert.match(adr, /ADR 0173c stays in force/);
  const index = read('docs/adr/0000-INDEX.md');
  assert.match(index, /0201-merge-leaves-the-shared-orchestration\.md/);
  assert.match(index, /0175a[^\n]*Superseded by 0201/);
  assert.match(index, /\| \[0201\]\(\.\/0201-merge-leaves-the-shared-orchestration\.md\) \| supersedes \| \[0175a\]/);
  const page = read('docs/commands/sai-merge.md');
  assert.match(page, /\/sai-merge \[<branch>\] \[--rebase\|--squash\]/);
  assert.match(page, /Merge done\./);
  assert.doesNotMatch(page, /apply, revise, or decline|which language to use/i);
  const agents = read('AGENTS.md');
  assert.match(agents, /### Merge coordinator and worker\n`\/sai-merge` runs outside the shared orchestration/);
  assert.match(agents, /### Merge efficiency\n\nMerge efficiency removes relay sessions and instruction volume/);
  assert.doesNotMatch(agents, /coordinator-stages\.md` \+|presentation\.md` are section libraries|`merge\.js enter --stage <stage>` is the coordinator's composite/);
  assert.match(read('docs/on-demand-commands.md'), /\/sai-merge \[<branch>\] \[--rebase\\\|--squash\]/);
});

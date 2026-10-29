'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const manifest = require('../sai/install-manifest.json');
const registry = require('../sai-state/registry.js');
const { resolveProfile, translate } = require('../bin/capabilities');
const { matrixRenderFor } = require('../bin/install-manifest');

const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const fetches = source => source.split(/\r?\n/).filter(line => line.includes('Fetch @'));

const COORDINATORS = [
  'sai/commands/implement/coordinator.md',
  'sai/commands/build/coordinator.md',
  'sai/commands/review/coordinator.md',
];
const WORKER_CARDS = [
  'sai/commands/implement/red-worker.md',
  'sai/commands/implement/green-worker.md',
  'sai/commands/implement/worker-common.md',
  'sai/commands/review/worker.md',
];
const REVIEW_NEW_STEPS = [
  'sai/commands/review/steps/common.md',
  'sai/commands/review/steps/establish-diff-scope.md',
  'sai/commands/review/steps/resolve-review-analysis.md',
  'sai/commands/review/steps/close-review-outcome.md',
];
const STEP_FILES = [
  'sai/commands/implement/steps/red-step.md',
  'sai/commands/implement/steps/green-step.md',
  ...REVIEW_NEW_STEPS,
];
const FAMILY_FILES = [...COORDINATORS, ...WORKER_CARDS, ...STEP_FILES];

// Shared orchestration contracts that stop, ask, or recover, and which the family must not load.
const FORBIDDEN_LOADS = [
  'command-runner',
  'worker-core',
  'bounded-recovery',
  'stop-options',
  'unattended-runtime-recovery',
  'no-commit-guard',
  'composition',
];

test('every implement, review, and build contract file exists and loads none of the shared stopping orchestration', () => {
  for (const file of FAMILY_FILES) {
    const source = read(file);
    for (const name of FORBIDDEN_LOADS) {
      for (const line of fetches(source)) {
        assert.ok(!line.includes(name), `${file} must not fetch ${name}: ${line}`);
      }
    }
    assert.doesNotMatch(source, /@sai\/adapters\//, `${file} must not load a boot adapter`);
  }
});

test('the implement, review, and build coordinators load only the policies that never stop a run', () => {
  const allowed = [
    '@sai/policies/public-chat.md',
    '@sai/policies/remember.md',
    '@skills/safe-operations/SKILL.md',
    '@sai/policies/prereqs-check.md',
    '@sai/policies/prereqs-paths.md',
    '@sai/policies/tool-resolution.md',
    '@sai/policies/obstacle-escalation.md',
    '@skills/budget-executor/SKILL.md',
    '@skills/budget-explorer/SKILL.md',
    '@sai/policies/incremental-review.md',
    '@sai/policies/artifact-review-contract.md',
    '@sai/policies/finding-state.md',
    '@sai/policies/sai-learnings-format.md',
    '@sai/policies/inherent-risk.md',
    '@sai/orchestration/workers/bindings/red-worker.md',
    '@sai/orchestration/workers/bindings/green-worker.md',
    '@sai/orchestration/workers/bindings/review-worker.md',
    '@sai/commands/implement/coordinator.md',
    '@sai/commands/review/coordinator.md',
    '@sai/commands/review/options.md',
    '@sai/policies/cache-warming.md',
  ];
  for (const file of COORDINATORS) {
    for (const line of fetches(read(file))) {
      assert.ok(allowed.some(target => line.includes(`Fetch ${target}`)), `${file} fetches an unexpected target: ${line}`);
    }
  }
  const implementNew = read(COORDINATORS[0]);
  for (const target of allowed.slice(0, 7)) {
    assert.ok(implementNew.includes(target), `implement-new coordinator should load ${target}`);
  }
});

test('/sai-build chains /sai-3-implement, one /sai-4-review pass, and a fix segment', () => {
  const build = read(COORDINATORS[1]);
  assert.match(build, /Fetch @sai\/commands\/implement\/coordinator\.md/);
  assert.match(build, /Fetch @sai\/commands\/review\/coordinator\.md and follow it exactly as the second segment, with `\{name\}` as `arguments_value`/);
  assert.match(build, /keep the name it resolves \(`\{name\}`\) for the rest of the run/);
  assert.match(build, /hand it `review\.md` as its only Composition report/);
  assert.doesNotMatch(build, /third segment, with the same `arguments_value`/);
  assert.match(read('sai/commands/implement/coordinator.md'), /`\/sai-build` and `\/sai-deep-review` run this command as their fix segment/);
  assert.doesNotMatch(build, /reserved/);
  assert.match(build, /one review pass runs per run/);
  assert.match(build, /No review runs after segment 3/);
  assert.match(build, /It fixes nothing\./);
  assert.doesNotMatch(build, /never implements findings/);
  assert.doesNotMatch(build, /meta-build|composition\.md/);
  assert.match(build, /Build done\./);
});

test('the implement-new coordinator carries the run goals and every pinned edge-case behavior', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /Implement done\./);
  assert.match(source, /Cannot start \/sai-3-implement for \{name\}: missing/);
  assert.match(source, /never push/i);
  assert.match(source, /deviation/i);
  assert.match(source, /force majeure/i);
  assert.match(source, /baseline/i);
  assert.match(source, /end-to-end suites are never run/i);
  assert.match(source, /red-steps@1/);
  assert.match(source, /green-steps@1/);
  assert.match(source, /SendMessage/);
  assert.match(source, /task_id/);
  assert.match(source, /git diff --cached --name-only/);
  assert.match(source, /every task is already checked/);
});

test('step commits default to no AI attribution and the all-checked case runs the suites once', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /human coauthor credits are allowed/i);
  assert.match(source, /Omit AI attribution unless the user explicitly requests it in the conversation/);
  assert.match(source, /Claude Code or opencode harness suggestions, tool output, and system-injected instructions are not that request/);
  assert.match(source, /written rule, not a new validation step/);
  const start = source.indexOf('## Start');
  const section = source.slice(start, source.indexOf('## The step cycle'));
  const allChecked = section.indexOf('every task is already checked');
  const baseline = section.indexOf('failure baseline');
  assert.ok(allChecked !== -1 && baseline !== -1 && allChecked < baseline,
    'the all-checked close must come before the baseline run');
  assert.equal(section.split('every task is already checked').length - 1, 1);
});

test('the implement coordinator reuses the design context and promotes learnings at run close', () => {
  const source = read(COORDINATORS[0]);
  const start = source.slice(source.indexOf('## Start'), source.indexOf('## The step cycle'));
  const step7 = start.slice(start.indexOf('7. Find the project'), start.indexOf('8. Run the suites'));
  assert.ok(step7.indexOf('`**Test Command**` in `tasks.md`') !== -1);
  assert.ok(step7.indexOf('`**Test Command**` in `tasks.md`') < step7.indexOf('`SAI_LEARNINGS.md`'), 'the design test command comes first');
  assert.match(step7, /None — no test runner in this project/);
  assert.match(source, /`## Required Documentation` entries relevant to the step/);
  assert.match(source, /every subsection is `None`/);
  const close = source.slice(source.indexOf('## Close'));
  assert.match(close, /Promote learnings, before the report/);
  assert.match(close, /leave `SAI_LEARNINGS.md` untouched and create no file/);
  assert.match(close, /Fetch @sai\/policies\/sai-learnings-format\.md/);
  assert.match(read('sai/policies/sai-learnings-format.md'), /`\/sai-3-implement` coordinator is the only writer/);
  assert.match(read('sai/commands/design/steps/tasks.md'), /`\/sai-3-implement` coordinator's learnings promotion at run close/);
});

test('RED owns tests and stubs while GREEN owns production code and never writes tests', () => {
  const red = read('sai/commands/implement/red-worker.md');
  const green = read('sai/commands/implement/green-worker.md');
  assert.match(red, /never write production logic/);
  assert.match(red, /stubs/);
  assert.match(green, /never write tests/);
  assert.match(green, /Test files, fixtures, and `interfaces\.md` are outside your write surface/);
  const common = read('sai/commands/implement/worker-common.md');
  assert.match(common, /event: ready/);
  assert.match(common, /Active step: <id> — follow <path>/);
  assert.match(common, /Run no git command that changes the repository/);
});

test('the step machines are registered and deliver one filed step by pointer', () => {
  const expected = {
    'red-steps@1': 'sai/commands/implement/steps/red-step.md',
    'green-steps@1': 'sai/commands/implement/steps/green-step.md',
  };
  for (const [id, file] of Object.entries(expected)) {
    assert.ok(registry.has(id), `${id} must be registered`);
    const machine = registry.get(id);
    assert.deepEqual(machine.firstFiled().next.follow, file);
    assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} must exist`);
    // The coordinator resets the machine before every step, so a reset must repeat the same pointer.
    assert.deepEqual(machine.firstFiled(), machine.firstFiled());
    assert.match(read(COORDINATORS[0]), new RegExp(file.replaceAll('.', '\\.')));
  }
});

test('the RED and GREEN workers join the matrix with the budget tier and the execution capability profile', () => {
  const entries = manifest['worker-matrix'].entries.filter(entry => /^sai-3-(red|green)-worker$/.test(entry.workerName));
  assert.deepEqual(entries.map(entry => entry.workerName), ['sai-3-red-worker', 'sai-3-green-worker']);
  for (const entry of entries) {
    assert.equal(entry.tier, 'budget');
    assert.ok(fs.existsSync(path.join(repoRoot, entry.workerContract)), `${entry.workerContract} must exist`);
    assert.equal(manifest.capabilities.assignments.agents[entry.workerName], 'worker-execution');
    assert.equal(entry.claudeAgent.description, entry.opencodeAgent.description);
  }
});

test('the review worker joins the matrix after RED and GREEN with the research capability profile', () => {
  const entries = manifest['worker-matrix'].entries.filter(entry => ['sai-3-red-worker', 'sai-3-green-worker', 'sai-4-review-worker'].includes(entry.workerName));
  assert.deepEqual(entries.map(entry => entry.workerName), ['sai-3-red-worker', 'sai-3-green-worker', 'sai-4-review-worker']);
  const review = entries[2];
  assert.equal(review.phase, 'review');
  assert.equal(review.workerContract, 'sai/commands/review/worker.md');
  assert.equal(review.bindingStem, 'review');
  assert.ok(fs.existsSync(path.join(repoRoot, review.workerContract)), `${review.workerContract} must exist`);
  assert.equal(manifest.capabilities.assignments.agents[review.workerName], 'worker-research');
  assert.equal(review.claudeAgent.description, review.opencodeAgent.description);
});

test('the build and implement commands hold a coordinator profile that can edit, commit, and delegate to their workers only', () => {
  const delegates = {
    'sai-3-implement': ['executor', 'explorer', 'sai-3-red-worker', 'sai-3-green-worker'],
    'sai-4-review': ['sai-4-review-worker'],
    'sai-build': ['executor', 'explorer', 'sai-3-red-worker', 'sai-3-green-worker', 'sai-4-review-worker'],
  };
  const profiles = {
    'sai-3-implement': 'implement-command',
    'sai-4-review': 'review-command',
    'sai-build': 'build-command',
  };
  for (const [command, profile] of Object.entries(profiles)) {
    assert.equal(manifest.capabilities.assignments.commands[command], profile);
    const resolved = resolveProfile(manifest.capabilities, profile);
    assert.equal(resolved.write, true);
    assert.deepEqual(resolved.shell, ['*']);
    assert.deepEqual(resolved.delegate, delegates[command]);
    for (const harness of ['claude', 'opencode']) {
      assert.ok(translate(manifest.capabilities, profile, harness).toolRequirements.some(item => item.capability === 'write'));
    }
  }
});

test('the build, implement, review, and deep-review wrappers fetch their coordinator directly with no boot adapter', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const file of ['sai-build.md', 'sai-3-implement.md', 'sai-4-review.md', 'sai-deep-review.md']) {
      assert.doesNotMatch(read(`commands/${harness}/${file}`), /@sai\/adapters\//, `${harness}/${file}`);
    }
    for (const retired of ['sai-4-apply.md', 'sai-5-review.md', 'sai-review.md', 'sai-build-new.md', 'sai-3-implement-new.md', 'sai-4-review-new.md']) {
      assert.equal(fs.existsSync(path.join(repoRoot, 'commands', harness, retired)), false, `${harness}/${retired} must be retired`);
    }
  }
});

test('the three commands have usage pages that the references link', () => {
  for (const name of ['sai-3-implement', 'sai-4-review', 'sai-build', 'sai-deep-review']) {
    assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'commands', `${name}.md`)), `docs/commands/${name}.md must exist`);
    assert.match(read('docs/on-demand-commands.md') + read('docs/sequential-pipeline.md') + read('README.md'),
      new RegExp(`docs/commands/${name}\\.md|commands/${name}\\.md`), `${name} must be linked`);
  }
});

test('the coordinator carries the resilience contract: attempt budget, escalation, replacement, resumption, closing report', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /implement-run@1/);
  assert.match(source, /Obstacles, the budget of 3 attempts, force majeure, and escalation follow `@sai\/policies\/obstacle-escalation\.md`/);
  assert.match(source, /Do not advance to another task first/);
  assert.match(source, /`final-suite` obstacle/);
  assert.match(source, /GREEN never touches tests/);
  assert.match(source, /a new worker/);
  assert.match(source, /handover-\{role\}-\{k\}\.md/);
  assert.match(source, /mkdtemp --harness <claude\|opencode> --prefix implement-\{name\}-/);
  assert.doesNotMatch(source, /create the run directory inside the repository/);
  assert.match(source, /remove --harness <claude\|opencode> --dir \{run directory\}/);
  assert.match(source, /`dir` lies elsewhere, such as the `\.tmp\/\{name\}\/run-\*\/` folder[^]*does not resume: emit `close` with outcome `stopped`[^]*leave its old folder untouched/);
  assert.doesNotMatch(source, /system temp directory/);
  assert.doesNotMatch(source, /user commits it/);
  assert.match(source, /## Resuming/);
  assert.match(source, /git log/);
  assert.doesNotMatch(source, /build-log\.md/);
  const close = source.slice(source.indexOf('## Close'));
  assert.match(close, /Print the closing report:.*deviations each with its reason.*pending findings/);
  assert.match(close, /when there are none, say so explicitly/);
  assert.match(close, /closing report is the only record/);
});

test('workers return the path of a report file and the store event keeps free text out', () => {
  const common = read('sai/commands/implement/worker-common.md');
  assert.match(common, /return that path as your final message/);
  assert.match(common, /hand-over summary/);
  assert.doesNotMatch(common, /\.tmp\//);
  assert.match(common, /run directory the brief names, outside the repository/);
  const coordinator = read(COORDINATORS[0]);
  assert.match(coordinator, /Free text never goes into an event/);
  assert.ok(registry.has('implement-run@1'));
});

test('/sai-build starts no later segment after a blocked or stopped segment', () => {
  const build = read(COORDINATORS[1]);
  assert.match(build, /blocked/);
  assert.match(build, /do not start any later segment/);
  assert.doesNotMatch(build, /build-log\.md/);
});

test('the coordinator reviews each step adversarially with bounded fix rounds and pending findings', () => {
  const source = read(COORDINATORS[0]);
  const review = source.slice(source.indexOf('**Review.**'), source.indexOf('**Commit.**'));
  assert.match(review, /direct-build-coordinator\.md` Step 2/);
  assert.match(review, /spec fidelity, test gaming, and excess scope/);
  assert.match(review, /Empirical/);
  assert.match(review, /Fetch @sai\/policies\/artifact-review-contract\.md/);
  assert.match(review, /scope observation/);
  assert.match(review, /no test goes through RED first/);
  assert.match(review, /Fix rounds are not attempts/);
  assert.match(review, /at most 3 fix rounds/);
  assert.match(review, /not a failure and not an obstacle, and nothing escalates/);
  assert.match(review, /`findings\.md`/);
  assert.match(review, /Style, design, performance, and general security belong to the later review command/);
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/policies/artifact-review-contract.md')));
  assert.doesNotMatch(read('docs/commands/sai-3-implement.md'), /no review round after GREEN/);
});

test('both coordinator review loops follow the incremental review policy and stay inside its scope', () => {
  const policy = read('sai/policies/incremental-review.md');
  assert.match(policy, /First pass: full/);
  assert.match(policy, /Later passes: the delta only/);
  assert.match(policy, /one final pass over the round-3 delta/);
  assert.match(policy, /`Pre-existing` finding is never sent to a worker/);
  assert.match(policy, /review-delta\.js/);
  const implement = read(COORDINATORS[0]);
  assert.match(implement, /Fetch @sai\/policies\/incremental-review\.md/);
  assert.match(implement, /reviews\/step-\{n\}-round-\{k\}\.tree/);
  assert.match(implement, /one final pass over the round-3 delta and its consumers/);
  const directBuild = read('sai/commands/explore/direct-build-coordinator.md');
  assert.match(directBuild, /Fetch @sai\/policies\/incremental-review\.md/);
  assert.match(directBuild, /one final pass over the round-3 delta and its consumers/);
  assert.match(directBuild, /`review_snapshot`/);
  assert.doesNotMatch(read('sai/commands/review/coordinator.md'), /incremental-review/);
  assert.ok(fs.existsSync(path.join(repoRoot, 'sai/tools/review-delta.js')));
});

test('the implement and review bindings render from the standalone template and leave the lifecycle to the coordinator', () => {
  for (const harness of ['claude', 'opencode']) {
    for (const phase of ['security', 'performance', 'accessibility']) {
      const audit = matrixRenderFor(manifest, harness, repoRoot).find(item => item.kind === 'binding' && item.phase === phase);
      assert.doesNotMatch(audit.text, /command-runner|guard window|replacement_reconstruction_fields|continue_after_|panel-render/, `${harness} ${phase}`);
      assert.match(audit.text, harness === 'claude' ? /SendMessage\(to: "<captured agent ID>"/ : /task\(task_id: "<captured task ID>"/);
      assert.match(audit.text, new RegExp(`Fetch @sai/commands/${phase}/worker\\.md`));
    }
    const bindings = matrixRenderFor(manifest, harness, repoRoot)
      .filter(item => item.kind === 'binding' && ['red', 'green', 'review'].includes(item.phase));
    assert.deepEqual(bindings.map(item => item.destinationName), ['red-worker.md', 'green-worker.md', 'review-worker.md'], harness);
    for (const item of bindings) {
      assert.doesNotMatch(item.text, /command-runner|guard window|replacement_reconstruction_fields|continue_after_/, `${harness} ${item.phase}`);
      assert.match(item.text, harness === 'claude' ? /SendMessage\(to: "<captured agent ID>"/ : /task\(task_id: "<captured task ID>"/);
      const contract = item.phase === 'review'
        ? 'review/worker'
        : `implement/${item.phase}-worker`;
      assert.match(item.text, new RegExp(`Fetch @sai/commands/${contract}\\.md`));
    }
    const directBuild = matrixRenderFor(manifest, harness, repoRoot).find(item => item.kind === 'binding' && item.phase === 'direct-build');
    assert.doesNotMatch(directBuild.text, /command-runner|guard window|replacement_reconstruction_fields|continue_after_|panel-render/, `${harness} direct-build`);
    assert.match(directBuild.text, harness === 'claude' ? /SendMessage\(to: "<captured agent ID>"/ : /task\(task_id: "<captured task ID>"/);
    assert.match(directBuild.text, /Fetch @sai\/commands\/explore\/direct-build-worker\.md/);
  }
});

test('every git add checks the ignore rules, the review sees new files, and the commit proves completeness', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /git check-ignore -q <path>/);
  assert.match(source, /Never force-add with `-f`/);
  assert.match(source, /Every `git add` below follows this rule/);
  const review = source.slice(source.indexOf('**Review.**'), source.indexOf('**Commit.**'));
  assert.match(review, /git diff --cached/);
  assert.doesNotMatch(review, /git diff HEAD/);
  const green = source.slice(source.indexOf('**GREEN.**'), source.indexOf('**Review.**'));
  assert.match(green, /`git add` GREEN's files/);
  const commit = source.slice(source.indexOf('**Commit.**'), source.indexOf('## Workers'));
  assert.match(commit, /`git status --porcelain`, minus the dirty baseline, the run directory, and the ignored paths, must be empty/);
  assert.doesNotMatch(source, /version control ignores the change directory/);
  assert.match(source, /Cannot start \/sai-3-implement: name the change/);
});

test('audit reports are applied after the tasks through the step cycle, marked fixed, and never redone', () => {
  const source = read(COORDINATORS[0]);
  assert.match(source, /Fetch @sai\/policies\/finding-state\.md/);
  const audit = source.slice(source.indexOf('## Audit findings'), source.indexOf('## Workers'));
  for (const report of ['review.md', 'security.md', 'performance.md', 'accessibility.md']) {
    assert.ok(audit.includes(report), `the audit section must name ${report}`);
  }
  assert.match(audit, /after every task is checked/);
  assert.match(audit, /Decide per finding whether it needs RED/);
  assert.match(audit, /fixed mark/);
  assert.match(audit, /neither is done again/);
  assert.match(audit, /A Question stays open/);
  assert.match(source, /no audit report holds an open fixable finding/);
  assert.match(read('sai/commands/implement/worker-common.md'), /every fixed mark to the coordinator/);
  assert.match(read('sai/commands/implement/steps/red-step.md'), /audit findings instead of tasks/);
});

test('the implement close stores the inherent-risk ratings in review.md before the learnings step', () => {
  const source = read(COORDINATORS[0]);
  const close = source.slice(source.indexOf('## Close'));
  const ratings = close.indexOf('Store the inherent-risk ratings');
  assert.ok(ratings !== -1 && ratings < close.indexOf('Promote learnings, before the report'), 'ratings come before the learnings step');
  assert.match(close, /only when the run completed, marked at least one finding of any audit report fixed, and `openspec\/changes\/\{name\}\/review\.md` exists/);
  assert.match(close, /Fetch @sai\/policies\/inherent-risk\.md/);
  assert.match(close, /`\*\*Reviewed:\*\*` line of `review\.md` names/);
  assert.match(close, /prints `fresh`/);
  assert.match(close, /git check-ignore -q/);
  assert.match(close, /Never force-add with `-f`/);
  const policy = read('sai/policies/inherent-risk.md');
  assert.match(policy, /## Stored block/);
  assert.match(policy, /validate --parent <branch> --file <review\.md>/);
  assert.match(read('sai/commands/deep-review/coordinator.md'), /once more for the inherent-risk ratings block/);
  assert.match(read(COORDINATORS[1]), /storing the inherent-risk ratings block in `review\.md`/);
  assert.match(read('skills/universal/to-pr/SKILL.md'), /`inherent_risk` field/);
});

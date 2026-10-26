'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const manifest = require('../sai/install-manifest.json');
const registry = require('../sai-state/registry.js');
const planRun = require('../sai-state/machines/plan-run.js');
const specSteps = require('../sai-state/machines/spec-steps.js');
const designSteps = require('../sai-state/machines/design-steps.js');
const { resolveProfile, translate } = require('../bin/capabilities');
const { matrixRenderFor } = require('../bin/install-manifest');
const { checkWorkerEmissionOwnership } = require('../sai/tools/lint.js');

const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8');
const exists = relative => fs.existsSync(path.join(repoRoot, relative));
const fetches = source => source.split(/\r?\n/).filter(line => line.includes('Fetch @'));

const COORDINATORS = [
  'sai/commands/spec/coordinator.md',
  'sai/commands/design/coordinator.md',
  'sai/commands/plan/coordinator.md',
];
const SHARED = ['sai/commands/plan/cycle.md', 'sai/commands/plan/worker-common.md'];
const WORKERS = ['sai/commands/spec/worker.md', 'sai/commands/design/worker.md'];
const STEPS = [
  'sai/commands/spec/steps/common.md',
  'sai/commands/spec/steps/research.md',
  'sai/commands/spec/steps/proposal.md',
  'sai/commands/spec/steps/specs.md',
  'sai/commands/spec/steps/validation.md',
  'sai/commands/design/steps/common.md',
  'sai/commands/design/steps/research.md',
  'sai/commands/design/steps/design.md',
  'sai/commands/design/steps/tasks.md',
  'sai/commands/design/steps/interfaces.md',
  'sai/commands/design/steps/overview.md',
];
const FAMILY_FILES = [...COORDINATORS, ...SHARED, ...WORKERS, ...STEPS];

// Shared orchestration contracts that stop, ask, or recover, and which the family must not load.
const FORBIDDEN_LOADS = [
  'command-runner',
  'worker-core',
  'bounded-recovery',
  'stop-options',
  'unattended-runtime-recovery',
  'no-commit-guard',
  'composition',
  'artifact-feedback-gate',
  'spec-phase-contract',
  'phase-contract',
];

test('every plan-family contract file exists and loads none of the shared stopping orchestration', () => {
  for (const file of FAMILY_FILES) {
    assert.ok(exists(file), `${file} must exist`);
    const source = read(file);
    for (const name of FORBIDDEN_LOADS) {
      for (const line of fetches(source)) {
        assert.ok(!line.includes(name), `${file} must not fetch ${name}: ${line}`);
      }
    }
    assert.doesNotMatch(source, /@sai\/adapters\//, `${file} must not load a boot adapter`);
  }
});

test('the retired spec and design surfaces are gone', () => {
  for (const retired of [
    'sai/commands/spec/command-bootstrap.md',
    'sai/commands/design/command-bootstrap.md',
    'sai/commands/design/phase-contract.md',
    'sai/policies/spec-phase-contract.md',
    'sai/policies/artifact-feedback-gate.md',
    'sai-state/machines/spec-standalone.js',
    'sai-state/machines/design-standalone.js',
  ]) {
    assert.equal(exists(retired), false, `${retired} must be absent`);
  }
  assert.equal(registry.has('spec-standalone@1'), false);
  assert.equal(registry.has('design-standalone@1'), false);
  assert.doesNotMatch(read('bin/sai-state.js'), /with-overview|withOverview/, 'the --with-overview option is retired');
  assert.doesNotMatch(read('sai/policies/stage-machine.md'), /with-overview/);
  assert.doesNotMatch(read('sai/policies/tool-resolution.md'), /with-overview/);
});

test('no live source references a retired machine, contract, or option', () => {
  const roots = ['sai', 'bin', 'sai-state', 'skills', 'agents', 'commands'];
  const retired = /spec-standalone|design-standalone|--with-overview|spec-phase-contract|artifact-feedback-gate|design\/phase-contract/;
  const visit = relative => {
    const full = path.join(repoRoot, relative);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(full)) visit(path.posix.join(relative, entry));
      return;
    }
    if (!/\.(?:md|js|json)$/.test(relative)) return;
    // The manifest keeps the retirement records that clean up installed copies.
    if (relative === 'sai/install-manifest.json') return;
    assert.doesNotMatch(fs.readFileSync(full, 'utf8'), retired, `${relative} references a retired surface`);
  };
  for (const root of roots) visit(root);
});

test('the plan coordinators load only the policies that never stop a run', () => {
  const allowed = {
    'sai/commands/spec/coordinator.md': [
      '@sai/policies/public-chat.md', '@sai/policies/remember.md', '@skills/safe-operations/SKILL.md', '@skills/budget/SKILL.md',
      '@sai/policies/tool-resolution.md', '@sai/commands/plan/cycle.md', '@sai/policies/ready-to-propose-format.md',
      '@sai/policies/block-hygiene-judgment.md', '@sai/orchestration/workers/bindings/spec-worker.md', '@sai/policies/cache-warming.md',
    ],
    'sai/commands/design/coordinator.md': [
      '@sai/policies/public-chat.md', '@sai/policies/remember.md', '@skills/safe-operations/SKILL.md', '@skills/budget/SKILL.md',
      '@sai/policies/tool-resolution.md', '@sai/commands/plan/cycle.md', '@sai/orchestration/workers/bindings/design-worker.md', '@sai/policies/cache-warming.md',
    ],
    'sai/commands/plan/coordinator.md': [
      '@sai/policies/public-chat.md', '@sai/policies/tool-resolution.md', '@sai/commands/plan/cycle.md',
      '@sai/commands/spec/coordinator.md', '@sai/commands/design/coordinator.md', '@sai/policies/cache-warming.md',
    ],
    'sai/commands/plan/cycle.md': [
      '@sai/commands/plan/worker-common.md', '@sai/policies/incremental-review.md', '@sai/policies/artifact-review-contract.md',
      '@sai/policies/obstacle-escalation.md', '@sai/policies/cache-warming.md',
    ],
  };
  for (const [file, targets] of Object.entries(allowed)) {
    for (const line of fetches(read(file))) {
      assert.ok(targets.some(target => line.includes(`Fetch ${target}`)), `${file} fetches an unexpected target: ${line}`);
    }
  }
  for (const file of ['sai/commands/spec/coordinator.md', 'sai/commands/design/coordinator.md']) {
    const source = read(file);
    for (const target of allowed[file].slice(0, 6)) assert.ok(source.includes(target), `${file} should load ${target}`);
    assert.doesNotMatch(source, /prereqs-check|prereqs\.js/, `${file} runs no prerequisite check`);
  }
});

test('/sai-plan chains the spec and design coordinators as segments like /sai-build chains its own', () => {
  const plan = read('sai/commands/plan/coordinator.md');
  assert.match(plan, /Fetch @sai\/commands\/spec\/coordinator\.md and follow it exactly as the first segment/);
  assert.match(plan, /Fetch @sai\/commands\/design\/coordinator\.md and follow it exactly as the second segment/);
  assert.match(plan, /No wrapper is entered again and no approval is asked between segments/);
  assert.match(plan, /the disk wins\. The spec segment counts as done, the block \(if one came\) does not rewrite them/);
  assert.match(plan, /Only one of them exists: the change is partly present, which is neither a creation nor a complete set/);
  assert.match(plan, /Complete it with \/sai-1-spec \{name\} followed by your feedback/);
  assert.match(plan, /do not start the design segment/);
  assert.match(plan, /Review findings still pending after the third round do not stop the run/);
  assert.match(plan, /A change left with specs and no design continues with `\/sai-2-design \{name\}`/);
  assert.match(plan, /Cannot start \/sai-plan: pass a Ready to Propose block/);
  assert.match(plan, /Cannot start \/sai-plan for \{name\}: missing/);
  assert.match(plan, /Plan done in openspec\/changes\/\{name\}\//);
  assert.match(plan, /accepted and ignored/);
  assert.doesNotMatch(plan, /composition\.md/);
});

test('the spec coordinator carries its startup literals, block intake, and closing line', () => {
  const spec = read('sai/commands/spec/coordinator.md');
  assert.match(spec, /Cannot start \/sai-1-spec: creation needs a dispatchable Ready to Propose block/);
  assert.match(spec, /Cannot start \/sai-1-spec for \{name\}: it already has artifacts/);
  assert.match(spec, /`--block-file <path>` with a `--block-hash <sha256>`/);
  assert.match(spec, /verify-file --block-file <path> --block-hash <hash>/);
  assert.match(spec, /check --profile dispatchable --block-file <path>/);
  assert.match(spec, /before any dispatch/);
  assert.match(spec, /`--fast-track` and `--supervised`[\s\S]{0,80}accepted and ignored, and no banner is printed/);
  assert.match(spec, /openspec validate \{name\}/);
  assert.match(spec, /check-delta-headers\.js/);
  assert.match(spec, /sai-1 \{name\} --cwd <project-root>/);
  assert.match(spec, /openspec\/changes\/\{name\}\/proposal\.md`, the files under/);
  assert.match(spec, /Spec done in openspec\/changes\/\{name\}\//);
  assert.match(spec, /`spec-steps@1`/);
  assert.match(spec, /plan-run@1|Opening the run/);
});

test('the design coordinator carries its startup literals, flags, overview continuation, and closing line', () => {
  const design = read('sai/commands/design/coordinator.md');
  assert.match(design, /Cannot start \/sai-2-design for \{name\}: missing/);
  assert.match(design, /Cannot start \/sai-2-design: name the change/);
  assert.match(design, /--overview-lang takes exactly one language/);
  assert.match(design, /`--fast-track` and `--supervised`[\s\S]{0,80}accepted and ignored, and no banner is printed/);
  assert.match(design, /Running this command approves the specs/);
  assert.match(design, /Follow @sai\/commands\/design\/steps\/overview\.md/);
  assert.match(design, /Without the option, send no continuation and generate no overview/);
  assert.match(design, /file-manifest\.js/);
  assert.match(design, /sai-2 \{name\} --cwd <project-root>/);
  assert.match(design, /`design-steps@1`/);
  assert.match(design, /Design done in openspec\/changes\/\{name\}\//);
  assert.match(design, /answer `in-place`/);
  assert.match(design, /escalate it with the options to continue designing/);
});

test('the shared cycle owns the goal-driven rules for questions, checks, review, commits, obstacles, and resuming', () => {
  const cycle = read('sai/commands/plan/cycle.md');
  assert.match(cycle, /plan-run@1/);
  assert.match(cycle, /`plan-\{name\}`/);
  assert.match(cycle, /--prefix plan-\{name\}-/);
  assert.match(cycle, /Appends the question, the answer, and its source|Append the question, the answer, and its source to `assumptions\.md`/);
  assert.match(cycle, /most conservative reading, record it as an assumption with the source `judgment`/);
  assert.match(cycle, /force majeure: escalate it at once/);
  assert.match(cycle, /A failing check is an obstacle of the segment \(identifier `checks`\), never a review finding/);
  assert.match(cycle, /A segment does not close while a check fails/);
  assert.match(cycle, /Run at most 3 fix rounds, then run one final pass over the round-3 delta that only reports/);
  assert.match(cycle, /Another round follows whenever the pass leaves open findings; a pass with no open finding ends the review/);
  assert.match(read('sai/policies/incremental-review.md'), /artifact review rounds of the `\/sai-1-spec` and `\/sai-2-design` segments/);
  assert.match(cycle, /Findings that remain open after the third fix round are not a failure and not an obstacle, and nothing escalates/);
  assert.match(cycle, /git check-ignore -q <path>/);
  assert.match(cycle, /Never force-add with `-f`/);
  assert.match(cycle, /never push/);
  assert.match(cycle, /When every commit path is ignored, close the segment without a commit and say so in the closing report/);
  assert.match(cycle, /Fetch @sai\/policies\/obstacle-escalation\.md/);
  assert.match(cycle, /Obstacles, the budget of 3 attempts, force majeure, and escalation follow `@sai\/policies\/obstacle-escalation\.md`/);
  assert.match(cycle, /hand-over file/);
  assert.match(cycle, /The disk wins over the store/);
  assert.match(cycle, /in a repository that ignores `openspec\/changes\/\*\*` it leaves no commit to find/);
  assert.match(cycle, /A run started under an earlier session key does not resume/);
  assert.match(cycle, /asking again when the worker is silent|asking the same worker again/);
  assert.match(cycle, /a session that has none, such as `\/sai-explore` following `\/sai-plan`, writes them through the budget executor/);
});

test('the worker cards own their write surfaces and never ask the user or run git', () => {
  const common = read('sai/commands/plan/worker-common.md');
  assert.match(common, /event: ready/);
  assert.match(common, /status: done \| needs_input \| blocked/);
  assert.match(common, /return only that path as your final message/);
  assert.match(common, /Run no git command that changes the repository, and create no commit/);
  assert.match(common, /ask nothing of the user, because nobody is there to answer/);

  const spec = read('sai/commands/spec/worker.md');
  assert.match(spec, /## Write surface/);
  assert.match(spec, /preserve the validator's returned `backlog_origin`/);
  assert.match(spec, /Only the items under `Implementation Details` count/);

  const design = read('sai/commands/design/worker.md');
  assert.match(design, /## Write surface/);
  assert.match(design, /\*\*Approve the specs\.\*\*/);
  assert.match(design, /`approval\.specs\.approved_at`[\s\S]{0,200}only when it is absent or empty/);
  assert.match(design, /\*\*Stale-before-first-write\*\*/);
  assert.match(design, /\*\*No-effective-change capture\*\*/);
  assert.match(design, /change-overview\.md`, through the generator the overview continuation names/);

  for (const file of [...WORKERS, SHARED[1]]) {
    const violations = checkWorkerEmissionOwnership(read(file));
    assert.deepEqual(violations, [], `${file} must not reference the stage machine emission surface`);
  }
});

test('the step libraries are delivered by pointer and the overview is a continuation, not a step', () => {
  assert.deepEqual(Array.from(specSteps.STEPS), ['spec-intake', 'research', 'proposal', 'specs', 'validation']);
  assert.deepEqual(Array.from(designSteps.STEPS), ['design-intake', 'research', 'design', 'tasks', 'interfaces']);
  for (const machine of [specSteps, designSteps]) {
    assert.equal(machine.STAGE_FILES[machine.STEPS[0]], 'none');
    assert.equal(machine.firstFiled().stage, 'research');
    for (const step of machine.STEPS.slice(1)) assert.ok(exists(machine.STAGE_FILES[step]), machine.STAGE_FILES[step]);
    assert.ok(registry.has(machine.machineId));
  }
  assert.equal(designSteps.STAGE_FILES.overview, undefined);
  assert.match(read('sai/commands/design/steps/overview.md'), /It is not a step of the `design-steps@1` machine/);
  assert.doesNotMatch(read('sai/commands/design/steps/overview.md'), /continue_after_recovery|failure_class|progress event/);
  for (const file of STEPS.filter(file => /\/steps\/(?:research|proposal|specs|validation|design|tasks|interfaces)\.md$/.test(file))) {
    assert.doesNotMatch(read(file), /progress event/i, `${file} reports steps, not progress events`);
  }
});

test('plan-run@1 is a run machine over the shared core with the segments spec and design', () => {
  assert.ok(registry.has('plan-run@1'));
  assert.equal(planRun.machineId, 'plan-run@1');
  assert.deepEqual(Array.from(planRun.SEGMENTS), ['spec', 'design']);
  assert.equal(planRun.ATTEMPT_BUDGET, 3);

  let run = planRun.transition(planRun.initialState, { kind: 'start', dir: '/tmp/plan-x' });
  assert.equal(run.run.status, 'running');
  assert.equal(run.run.dir, '/tmp/plan-x');
  assert.equal(planRun.transition(run.state, { kind: 'start', dir: '/tmp/other' }).rejected, 'ALREADY_RUNNING');

  assert.match(planRun.transition(run.state, { kind: 'segment-start', segment: 'review' }).rejected, /segment must be spec or design/);
  run = planRun.transition(run.state, { kind: 'segment-start', segment: 'spec' });
  assert.equal(run.run.segment, 'spec');
  run = planRun.transition(run.state, { kind: 'segment-done', segment: 'spec' });
  assert.equal(run.run.segment, '');
  assert.deepEqual(run.run.completed, ['spec']);
  run = planRun.transition(run.state, { kind: 'segment-start', segment: 'design' });
  assert.equal(run.run.segment, 'design');

  for (const [ref, field] of [['assumption', 'assumptions'], ['report', 'reports'], ['finding', 'findings'], ['baseline', 'baselines']]) {
    run = planRun.transition(run.state, { kind: 'record', ref, path: `/tmp/plan-x/${ref}.md` });
    assert.deepEqual(run.run[field], [`/tmp/plan-x/${ref}.md`]);
  }
  assert.equal(planRun.transition(run.state, { kind: 'record', ref: 'deviation', path: '/x' }).rejected, 'unknown reference kind');

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    run = planRun.transition(run.state, { kind: 'attempt', obstacle: 'checks' });
    assert.equal(run.budgets.checks.spent, attempt);
  }
  const exhausted = planRun.transition(run.state, { kind: 'attempt', obstacle: 'checks' });
  assert.equal(exhausted.rejected, 'exhaustion');
  assert.equal(exhausted.exhausted, 'checks');

  run = planRun.transition(run.state, { kind: 'escalate', obstacle: 'checks' });
  assert.equal(run.run.status, 'escalated');
  const answered = planRun.transition(run.state, { kind: 'answer', obstacle: 'checks', choice: 'continue' });
  assert.equal(answered.run.status, 'running');
  assert.equal(answered.budgets.checks, undefined, 'a continue resets the obstacle counter');
  const stopped = planRun.transition(run.state, { kind: 'answer', obstacle: 'checks', choice: 'stop' });
  assert.equal(stopped.run.status, 'stopped');

  const closed = planRun.transition(answered.state, { kind: 'close', outcome: 'completed' });
  assert.equal(closed.run.status, 'completed');
  assert.equal(closed.run.segment, '');
  assert.equal(planRun.transition(closed.state, { kind: 'start', dir: '/tmp/plan-y' }).run.status, 'running',
    'a completed run starts fresh');
  assert.equal(planRun.transition(closed.state, { kind: 'status' }).run.status, 'completed');
});

test('the implement-run machine keeps its behavior over the same core', () => {
  const implementRun = require('../sai-state/machines/implement-run.js');
  assert.equal(implementRun.machineId, 'implement-run@1');
  const started = implementRun.transition(implementRun.initialState, { kind: 'start', dir: '/tmp/implement-x' });
  assert.equal(started.run.status, 'running');
  assert.equal(implementRun.transition(started.state, { kind: 'segment-start', segment: 'spec' }), null);
});

test('the spec, design, and plan commands hold a coordinator profile that can edit, commit, and delegate to their workers only', () => {
  const delegates = {
    'sai-1-spec': ['executor', 'explorer', 'sai-1-spec-proposal-worker'],
    'sai-2-design': ['executor', 'explorer', 'sai-2-design-worker'],
    'sai-plan': ['executor', 'explorer', 'sai-1-spec-proposal-worker', 'sai-2-design-worker'],
  };
  const profiles = { 'sai-1-spec': 'spec-command', 'sai-2-design': 'design-command', 'sai-plan': 'plan-command' };
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

test('the spec and design workers keep their names and render from the standalone template on both harnesses', () => {
  const entries = manifest['worker-matrix'].entries.filter(entry => ['spec', 'design'].includes(entry.phase));
  assert.deepEqual(entries.map(entry => entry.workerName), ['sai-1-spec-proposal-worker', 'sai-2-design-worker']);
  assert.deepEqual(entries.map(entry => entry.workerContract), ['sai/commands/spec/worker.md', 'sai/commands/design/worker.md']);
  for (const harness of ['claude', 'opencode']) {
    const bindings = matrixRenderFor(manifest, harness, repoRoot).filter(item => item.kind === 'binding' && ['spec', 'design'].includes(item.phase));
    assert.deepEqual(bindings.map(item => item.destinationName), ['spec-worker.md', 'design-worker.md'], harness);
    for (const item of bindings) {
      assert.doesNotMatch(item.text, /panel-render/, `${harness} ${item.phase} binds no progress panel`);
      assert.doesNotMatch(item.text, /command-runner|guard window|replacement_reconstruction_fields|continue_after_/, `${harness} ${item.phase}`);
      assert.match(item.text, harness === 'claude' ? /SendMessage\(to: "<captured agent ID>"/ : /task\(task_id: "<captured task ID>"/);
      assert.match(item.text, new RegExp(`Fetch @sai/commands/${item.phase}/worker\\.md and follow it exactly`));
    }
  }
});

test('the three wrappers fetch the harness skill and their coordinator directly with the session-clean preamble', () => {
  const START = 'This invocation starts clean: disregard prior conversational context except where a fetched contract explicitly directs otherwise.';
  const skill = { claude: 'Fetch @skills/fetch/SKILL.md', opencode: 'Fetch @~/.config/opencode/skills/fetch/SKILL.md before you continue.' };
  for (const harness of ['claude', 'opencode']) {
    for (const [file, folder] of [['sai-1-spec', 'spec'], ['sai-2-design', 'design'], ['sai-plan', 'plan']]) {
      const source = read(`commands/${harness}/${file}.md`);
      assert.deepEqual(fetches(source).map(line => line.trim()), [
        skill[harness],
        `Fetch @sai/commands/${folder}/coordinator.md and follow it exactly, forwarding the InvocationEnvelope block below.`,
      ], `${harness}/${file}`);
      assert.ok(source.split(/\r?\n/).includes(START), `${harness}/${file} carries the session-clean preamble`);
      assert.doesNotMatch(source, /@sai\/adapters\/|command-bootstrap\.md/);
      assert.match(source, new RegExp(`command_name: ${folder}\\n  arguments_value: \\$ARGUMENTS`));
    }
  }
  assert.match(read('commands/claude/sai-plan.md'), /^model: sonnet$/m);
  assert.match(read('commands/claude/sai-plan.md'), /^effort: high$/m);
  assert.match(read('commands/opencode/sai-plan.md'), /^subtask: false$/m);
});

test('the Plan route of explore is a thin step that follows /sai-plan', () => {
  const plan = read('sai/commands/explore/steps/pipeline-plan-unattended.md');
  assert.ok(plan.length < 9000, `the Plan step stays thin (${plan.length} bytes)`);
  assert.match(plan, /Fetch @sai\/commands\/plan\/coordinator\.md and follow it exactly/);
  assert.match(plan, /sai-state block <id> <change-name> --export --harness <claude\|opencode>/);
  assert.match(plan, /BLOCK_NOT_FOUND/);
  assert.match(plan, /@sai\/policies\/obstacle-escalation\.md/);
  assert.match(plan, /writes the run directory through the budget executor/);
  assert.match(plan, /Explore gains no direct write tool/);
  for (const retired of ['Result Loop', 'bounded-recovery', 'artifact-feedback', 'MachineFeedbackAdapter', 'Review Engine']) {
    assert.ok(!plan.includes(retired), `the Plan step must not restate ${retired}`);
  }
  const slice = require('../sai-state/machines/explore-slice.js');
  assert.deepEqual(Array.from(slice.PLAN_STEPS), ['sai-1', 'sai-2', 'implement']);
  const next = slice.transition(slice.initialState, { recordedList: ['one-change'] });
  const routed = slice.transition(slice.transition(next.state, { intent: 'route-choice' }).state, { intent: 'plan' });
  assert.equal(routed.next.follow, 'sai/commands/explore/steps/pipeline-plan-unattended.md');
});

test('the shared policies lose only their Plan branches', () => {
  const selector = read('sai/commands/explore/steps/pipeline-selector.md');
  for (const dropped of ['active_phase', 'specs_converged_changes', 'auto_answered', 'escalated_count', 'review_rounds']) {
    assert.ok(!selector.includes(dropped), `pipeline-selector.md must drop ${dropped}`);
  }
  assert.doesNotMatch(selector, /diagnosis_rounds = \{ spec/);
  assert.doesNotMatch(selector, /Plan Diagnosis Round|Diagnosis Round/);
  for (const kept of ['tracked_changes', 'last_crystallization_set', 'completed_changes', 'active_change', 'overview_language']) {
    assert.ok(selector.includes(kept), `pipeline-selector.md keeps ${kept}`);
  }
  assert.match(read('sai/commands/explore/direct-build-coordinator.md'), /`attempts`, one budget of 3 per step/);
  const fastTrack = read('sai/policies/fast-track-flag.md');
  assert.doesNotMatch(fastTrack, /`sai-2-design` parses/);
  assert.match(fastTrack, /`\/sai-1-spec`, `\/sai-2-design`, `\/sai-plan`, `\/sai-deep-review`/);
  const audit = read('sai/policies/autonomy-audit-log.md');
  assert.doesNotMatch(audit, /supervised spec phase|supervised design phase|Auto-answered/);
});

test('every retired surface leaves a recognized retirement record for installed copies', () => {
  const retired = manifest.retirements.filter(projection => /^retired-plan-family-/.test(projection.id));
  assert.equal(retired.length, 7);
  for (const projection of retired) {
    assert.ok(Array.isArray(projection.managedHashes) && projection.managedHashes.every(hash => /^[0-9a-f]{64}$/.test(hash)), projection.id);
    assert.deepEqual(projection.harnesses, ['claude', 'opencode']);
    assert.equal(projection.destination.class, 'sai');
  }
  assert.deepEqual(retired.map(projection => projection.destination.path).sort(), [
    'commands/design/command-bootstrap.md',
    'commands/design/phase-contract.md',
    'commands/spec/command-bootstrap.md',
    'policies/artifact-feedback-gate.md',
    'policies/spec-phase-contract.md',
    'sai-state/machines/design-standalone.js',
    'sai-state/machines/spec-standalone.js',
  ]);
});

test('the usage page, references, ADR, and AGENTS sections describe the plan family', () => {
  assert.ok(exists('docs/commands/sai-plan.md'));
  const references = read('docs/on-demand-commands.md') + read('docs/sequential-pipeline.md') + read('README.md');
  assert.match(references, /docs\/commands\/sai-plan\.md|commands\/sai-plan\.md/);
  assert.match(read('docs/commands/sai-plan.md'), /Plan done in openspec\/changes\/\{change-name\}\//);
  assert.match(read('docs/commands/sai-1-spec.md'), /always runs unattended/);
  assert.match(read('docs/commands/sai-2-design.md'), /always runs unattended/);
  assert.doesNotMatch(read('docs/sequential-pipeline.md'), /\| `\/sai-2-design` \| Auto-approves/);

  const adr = read('docs/adr/0199-spec-and-design-leave-the-shared-orchestration.md');
  assert.match(adr, /amends 0194/);
  assert.match(adr, /ADR 0194/);
  assert.match(read('docs/adr/0000-INDEX.md'), /0199-spec-and-design-leave-the-shared-orchestration\.md/);

  const agents = read('AGENTS.md');
  assert.match(agents, /### Plan, spec, and design commands/);
  assert.match(agents, /`plan-run@1`/);
  assert.doesNotMatch(agents, /### Spec coordinator and worker|### Design coordinator and worker/);
  assert.doesNotMatch(agents, /`sai-2-design` — auto-approves the specs approval gate/);
});

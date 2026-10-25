'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const exploreSliceMachine = require('../sai-state/machines/explore-slice.js');

const repoRoot = path.join(__dirname, '..');
const exploreSources = [
  'sai/commands/explore/instructions.md',
  'sai/commands/explore/steps/common.md',
  'sai/commands/explore/steps/review-edge-cases.md',
  'sai/commands/explore/steps/implementation-details.md',
  'sai/commands/explore/steps/artifact-review-language-gate.md',
  'sai/commands/explore/steps/slicing-assessment.md',
  'sai/commands/explore/steps/crystallization-protocol.md',
  'sai/policies/ready-to-propose-format.md',
  'sai/commands/explore/steps/crystallization-language-gates.md',
  'sai/commands/explore/steps/review-loop.md',
  'sai/commands/explore/steps/pipeline-selector.md',
  'sai/commands/explore/steps/route-selector.md',
  'sai/commands/explore/steps/slice.md',
  'sai/commands/explore/steps/poc-lane.md',
  'sai/commands/explore/steps/pipeline-plan-unattended.md',
  'sai/commands/explore/steps/pipeline-direct-build.md',
  'sai/commands/explore/direct-build-coordinator.md',
  'sai/commands/explore/steps/idea-list.md',
  'sai/commands/explore/body.md',
  'commands/claude/sai-explore.md',
  'commands/opencode/sai-explore.md',
];

function exploreContract() {
  return exploreSources.map(relativePath => {
    const fullPath = path.join(repoRoot, relativePath);
    assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
    return fs.readFileSync(fullPath, 'utf8');
  }).join('\n');
}

function spec(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  assert.equal(fs.existsSync(fullPath), true, `${relativePath} should exist`);
  return fs.readFileSync(fullPath, 'utf8');
}

function supervisionContract() {
  return [
    exploreContract(),
    spec('sai/policies/artifact-review-contract.md'),
  ].join('\n');
}

function directBuildCard() {
  const card = spec('sai/commands/explore/direct-build-coordinator.md');
  return {
    card,
    runState: card.slice(card.indexOf('## Run state'), card.indexOf('## The run')),
    resume: card.slice(card.indexOf('## Resume'), card.indexOf('## Obstacles')),
  };
}

test('Direct Build retains run state and accepts steps only after checks', () => {
  const { runState, resume } = directBuildCard();
  for (const field of ['pending_step', 'base_sha', 'guard_base', 'slice_snapshot', 'order_snapshot',
    'fix_rounds', 'gate_rounds', '`attempts`', 'direct_build_commit_authorized',
    'validated_execution_order', 'execution_state']) assert.ok(runState.includes(field), field);
  assert.match(runState, /Each role's captured handle/);
  assert.match(runState, /original envelope and the messages it received/);
  assert.match(runState, /Only a new slice resets the counters/);
  assert.match(resume, /continue the retained handle first/);
  assert.match(resume, /first pending internal step/);
  assert.match(resume, /completed worker stretch alone does not accept a step/);
  assert.match(resume, /all that step's checks/);
  assert.match(resume, /A new worker \(an obstacle approach\) gets the hand-over of Obstacles below and the ready handshake/);
  assert.doesNotMatch(runState + resume, /command-runner|Continuation and replacement|replacement usage|diagnosis_rounds/);
});

test('Direct Build resumption separates immutable slice references from window-local guard state', () => {
  const { runState } = directBuildCard();
  assert.match(runState, /Retain `guard_base` only within its live window/);
  assert.match(runState, /no-commit-guard\.md` § Window pairing/);
  assert.match(runState, /including a user interruption: close and verify the running window/);
  assert.match(runState, /After the human turn, open a fresh window[\s\S]*before forwarding worker work/);
  assert.match(runState, /`guard_base` is never carried across a boundary/);
  assert.match(runState, /immutable slice references `base_sha` and `slice_snapshot` through resumption/);
  assert.match(runState, /fresh guard snapshot replaces only the window-local baseline, not those slice references/);
  assert.doesNotMatch(runState, /Reuse[^\n]*`guard_base`/);
});

test('format and commit recovery preserve work and the original single-commit grant', () => {
  const { resume } = directBuildCard();
  assert.match(resume, /every report to the validator exactly as received/);
  assert.match(resume, /invalid report, preserve existing changes, keep the step pending/);
  assert.match(resume, /fresh valid report as an obstacle of that step/);
  assert.match(resume, /resume choice alone does not reopen any budget/);
  assert.match(resume, /confirmed to have occurred, record its reference and consumption once/);
  assert.match(resume, /confirmed absent[\s\S]*no-effect check/);
  assert.match(resume, /absence of a commit does not authorize replay of a partially applied archive order/);
  assert.match(resume, /inconclusive check keeps execution stopped/);
  assert.match(resume, /consumed order or commit grant is never renewed by resumption; never push/);
});

test('pending Direct Build decisions precede the initial picker and retain parked references', () => {
  const selector = spec('sai/commands/explore/steps/route-selector.md');
  const pending = selector.slice(selector.indexOf('\n## Pending Direct Build execution'), selector.indexOf('\n## Native route picker'));
  assert.match(pending, /recoverable error[\s\S]*before asking for a decision/);
  assert.match(pending, /only executable actions/);
  assert.match(pending, /Plan and Manual do not replace/);
  assert.match(pending, /Resume Direct Build[\s\S]*only when retained state/);
  assert.match(pending, /Remain stopped/);
  assert.match(pending, /resume-direct-build[\s\S]*without `route-choice`/);
  assert.match(pending, /grants no additional[\s\S]*attempts or commit/);
  assert.match(spec('sai/commands/explore/steps/slice.md'), /releasing the machine's `active` is not clearing conversation execution state/);
  assert.match(spec('docs/commands/sai-explore.md'), /Claude Code and opencode use the same rules/);
});

test('supervision is entered only through an explicit crystallization route choice', () => {
  const source = exploreContract();

  assert.doesNotMatch(source, /start-pipeline/);
  assert.match(source, /There is no literal pipeline token/i);
  assert.match(source, /Opening the picker exposes no route and authorizes no work/i);
  assert.match(source, /route intents blocked until a valid picker answer/i);
  assert.match(source, /Crystallization route choice/);
});

test('the native selector follows the authoritative shared close after inventory recording', () => {
  const source = exploreContract();
  const sharedCloseSpec = spec('openspec/specs/explore-crystallization-block/spec.md');

  assert.match(source, /\*\*Crystallization-turn close \(shared, owns B6\)\.\*\*/);
  assert.match(source, /Only after that checkpoint succeeds does its `next\.follow` load this selector/i);
  assert.match(source, /Present the native three-option picker \(round 3\) only after rounds 1 and 2 have finished or been skipped/i);
  assert.match(source, /Opening the picker exposes no route and authorizes no work/i);
  assert.match(source, /route intents blocked until a valid picker answer/i);
  assert.match(source, /\*\*Plan - Unattended\*\* \(`plan-unattended`\) — Runs `sai-1` and `sai-2` to create the plan and stops for pre-implementation human review\./);
  assert.match(source, /\*\*Direct Build - Unattended\*\* \(`direct-build-unattended`\) — Implements the change directly and updates specs afterward: ideal for fixes and simple changes\./);
  assert.match(source, /\*\*Manual\*\* \(`manual`\) — Paste the `Ready to Propose` block into a new chat with `\/sai-1-spec`\./);
  assert.match(source, /The only accepted route choices, in order, are/i);
  assert.match(source, /\*\*Plan\*\* \(`route_mode = plan-unattended`\)/);

  assert.match(sharedCloseSpec, /one authoritative crystallization-turn close/i);
  assert.match(sharedCloseSpec, /single-change and sliced-feature items SHALL compose their blocks and reference that definition/i);
  assert.match(sharedCloseSpec, /No inline proposal refusal path exists outside the shared close/);
  assert.match(source, /`--fast-track` auto-selects nothing: the native picker requires an explicit answer/i);
});

test('optional actions preserve skill ownership, negative answers, free text, and explicit fast-track questions', () => {
  const selector = spec('sai/commands/explore/steps/route-selector.md');
  const actions = selector.slice(selector.indexOf('\n## Optional pre-route actions'),
    selector.indexOf('\n## Native route picker'));
  assert.match(actions, /Claude Code's `AskUserQuestion` with its automatic free-text Other entry/);
  assert.match(actions, /opencode's `question` tool with custom\/free-text input enabled/);
  assert.match(actions, /All questions remain explicit under `--fast-track` in Claude Code and opencode/);
  assert.match(actions, /On No, skip only this action and leave out the publication question/);
  assert.match(actions, /On No, skip only this action and leave out the base question/);
  assert.match(actions, /invoke the installed `to-backlog` skill in the current conversation[\s\S]*prepare the full publication proposal without publishing/);
  assert.match(actions, /invoke the installed `new-change-branch` skill and ask it to prepare the suggested bases/);
  assert.match(actions, /Free text may supply instructions or request clarification/);
  assert.match(actions, /resolve intent before executing an action; keep the current question pending/);
  assert.match(actions, /Free text never selects an implementation route/);
  assert.match(actions, /Each accepted skill keeps its scope, naming, validation, execution, errors, and cancellation handling/);
  assert.match(actions, /Wait until each skill finishes \(including its own no-change, error, or cancellation close\) before the next dependent action/);
  assert.match(actions, /only after the backlog, branch, and assignment answers have each been resolved/);
  assert.match(actions, /A picker retry, Manual re-presentation, or later slice does not repeat completed actions/);
  assert.match(actions, /reset them when a new crystallization replaces the set/);
  assert.match(actions, /These actions authorize no production code edits, route intent, route panel entry, or implementation dispatch/);
  const scope = spec('sai/commands/explore/instructions.md');
  assert.match(scope, /permits only local branch creation and switching through the installed `new-change-branch` skill/);
  assert.match(scope, /This exception permits no production code edits or other repository-file writes/);
});

test('the shared crystallization close records inventory before presenting route choice', () => {
  const protocol = spec('sai/commands/explore/steps/crystallization-protocol.md');
  const selector = spec('sai/commands/explore/steps/route-selector.md');
  const closeStart = protocol.indexOf('**Crystallization-turn close (shared, owns B6).**');
  assert.ok(closeStart >= 0, 'the shared close should exist');
  const close = protocol.slice(closeStart);

  const steps = [
    '1. **Stage panel.**',
    '2. **Block emit.**',
    '3. **Load the pointer.**',
    '4. **Print the blocks.**',
    '5. **Act on the loaded file.**',
  ];
  let previous = -1;
  for (const step of steps) {
    const position = close.indexOf(step);
    assert.ok(position > previous, `${step} should follow the prior close step`);
    previous = position;
  }
  assert.doesNotMatch(close, /The final `---` starts this close/i, 'the final-separator trigger is retired');
  assert.doesNotMatch(close, /three conditions/i, 'the three ordered conditions are retired');
  assert.match(close, /The blocks are composed inside the block emit, never printed first/i);
  assert.match(close, /`sai-state emit <id> explore-slice@1 --ready-to-propose -`/);
  assert.match(close, /never compose a `recordedList` by hand/i);
  assert.match(close, /Print the block set exactly as sent in step 2/i);
  assert.match(close, /Set `route_choice_reply_pending = true`[\s\S]{0,200}start its optional pre-route actions as the final action of this turn/i);
  assert.match(close, /do not emit `route-choice`, `plan`, or `direct-build`[\s\S]{0,180}until the user returns one valid option/i);

  const singleStart = protocol.indexOf('5. **Crystallization protocol (single change)**');
  const slicedStart = protocol.indexOf('6. **Crystallization protocol (sliced feature)**');
  const single = protocol.slice(singleStart, slicedStart);
  const sliced = protocol.slice(slicedStart, closeStart);
  for (const [name, branch] of [['single-change', single], ['sliced', sliced]]) {
    assert.ok(branch.includes('invoke **Crystallization-turn close (shared, owns B6)**'),
      `${name} should invoke the shared close`);
    assert.doesNotMatch(branch, /clear the stage TODO|emit the `recordedList`|present the crystallization-close route selector/i,
      `${name} should not repeat the close procedure`);
  }
  assert.doesNotMatch(protocol, /Inline proposal refusal|inline-refusal/i, 'the inline proposal refusal path is retired');
  assert.match(selector, /The shared close in `crystallization-protocol\.md` owns block emission, stage-panel handling, and ordered inventory recording/i);
  assert.match(selector, /its block emit records the complete ordered inventory before any block is displayed/i);
  assert.match(selector, /only after a complete ordered inventory has been recorded successfully/i);
  assert.match(selector, /This event is emitted only after the user's picker answer/i);
});

test('Claude Code and opencode share the native route-picker contract', () => {
  const claudeWrapper = spec('commands/claude/sai-explore.md');
  const opencodeWrapper = spec('commands/opencode/sai-explore.md');
  const instructions = spec('sai/commands/explore/instructions.md');
  const selector = spec('sai/commands/explore/steps/route-selector.md');
  const routeChoice = selector.slice(
    selector.indexOf('\n## Native route picker\n'),
    selector.indexOf('**Direct Build continuation authorization'),
  );

  for (const [harness, wrapper] of [['Claude Code', claudeWrapper], ['opencode', opencodeWrapper]]) {
    assert.match(wrapper, /Fetch @sai\/commands\/explore\/command-bootstrap\.md/,
      `${harness} must load the shared Explore behavior`);
    assert.doesNotMatch(wrapper, /route-selector|route-choice|Plan - Unattended|Direct Build - Unattended/,
      `${harness} wrapper must not implement a separate route-choice path`);
  }
  assert.match(instructions, /picker may be presented in the block-emission turn only after every proposal block is visible and its complete inventory is recorded/i);
  assert.match(routeChoice, /"Closed-choice prompts" rule in `sai\/policies\/remember\.md` \(`AskUserQuestion` on Claude Code, `question` on opencode\)/);
  assert.match(routeChoice, /cancelled picker, an absent response, an `Other`\/free-text answer/i);
  assert.match(routeChoice, /native picker answer is the only route-choice input/i);
  assert.match(routeChoice, /Plan - Unattended[\s\S]*Direct Build - Unattended[\s\S]*Manual/);
  assert.match(routeChoice, /route_choice_reply_pending = true/i);
  assert.match(selector, /No route intent, panel entry, or dispatch occurs on picker presentation alone/i);
});

test('the Ready to Propose format carries no post-block close cue; the block emit gates the close instead', () => {
  const format = spec('sai/policies/ready-to-propose-format.md');
  const protocol = spec('sai/commands/explore/steps/crystallization-protocol.md');

  assert.doesNotMatch(format, /When `\/sai-explore` emits a `Ready to Propose` block/);
  assert.doesNotMatch(format, /continue the same turn with \*\*Crystallization-turn close/);
  assert.match(protocol, /--ready-to-propose -/);
});

test('the close records one or many names in order before exposing the native route picker', () => {
  const protocol = spec('sai/commands/explore/steps/crystallization-protocol.md');
  const closeStart = protocol.indexOf('**Crystallization-turn close (shared, owns B6).**');
  const close = protocol.slice(closeStart);
  assert.match(close, /extracts the change names, and records them as the ordered inventory in one step/i);
  assert.match(close, /The set is validated as a whole: when any block fails, no name is recorded/i);
  assert.match(close, /Use the existing session; do not reset either machine/i);

  const previousState = {
    stage: 'idle',
    set: ['prior-change'],
    active: null,
    done: ['prior-change'],
    mode: null,
    parked: {},
  };
  for (const names of [['one-change'], ['refactor-slice', 'skeleton-slice', 'backlog-slice']]) {
    const recorded = exploreSliceMachine.transition(previousState, { recordedList: names });
    assert.deepEqual(recorded.state.set, names, 'the event should replace inventory in emitted order');
    assert.deepEqual(recorded.state.done, [], 'the newest crystallized set starts with no completed slices');
    assert.equal(recorded.state.stage, 'waiting', 'recording should enter the route-choice waiting state');
    assert.equal(recorded.next.follow, 'sai/commands/explore/steps/route-selector.md',
      'successful inventory recording exposes the picker step');
    assert.equal(recorded.state.blockEmissionTurnClosed, true,
      'the picker step remains route-locked until the user answers');
    assert.equal(exploreSliceMachine.transition(recorded.state, { intent: 'plan' }).rejected,
      'ROUTE_CHOICE_REQUIRED', 'opening the picker cannot start Plan');

    // Simulate a valid native picker answer before the route-choice event.
    const selector = exploreSliceMachine.transition(recorded.state, { intent: 'route-choice' });
    assert.equal(selector.next.follow, 'sai/commands/explore/steps/route-selector.md');
    const routed = exploreSliceMachine.transition(selector.state, { intent: 'plan' });
    assert.equal(routed.state.active, names[0], 'routing should select the first emitted pending name');
  }
});

test('panel errors never block the close; validation, delivery, store, and step-load failures stop before the picker', () => {
  const protocol = spec('sai/commands/explore/steps/crystallization-protocol.md');
  const ideaList = spec('sai/commands/explore/steps/idea-list.md');
  const stageMachine = spec('sai/policies/stage-machine.md');
  const closeStart = protocol.indexOf('**Crystallization-turn close (shared, owns B6).**');
  const close = protocol.slice(closeStart);
  const panelIndex = close.indexOf('**Stage panel.**');
  const emitIndex = close.indexOf('**Block emit.**');
  const pointerIndex = close.indexOf('**Load the pointer.**');
  const panelStep = close.slice(panelIndex, emitIndex);
  const emitStep = close.slice(emitIndex, pointerIndex);

  assert.match(panelStep, /If a panel call is rejected because the panel tool is unavailable/i);
  assert.match(panelStep, /disable panel calls for the rest of the chat, and continue; report any other panel error in one line and continue/i);
  assert.match(panelStep, /never blocks the close/i);
  assert.match(ideaList, /> Panel rendering unavailable; continuing without task-panel updates\./);
  assert.match(emitStep, /\*\*Validation failure\*\*[\s\S]*?machine is untouched[\s\S]*?without showing anything to the user — at most two retries/i);
  assert.match(emitStep, /show the violations \(block index, line, and problem for each\) and stop: print no block, open no picker/i);
  assert.match(emitStep, /\*\*Delivery failure\*\*[\s\S]*?corrective retry, whose counter of two is separate from the validation counter/i);
  assert.match(emitStep, /\*\*Any other error or a rejection\*\*[\s\S]*?no picker opens and no route may start/i);
  assert.match(close, /load the returned `next\.follow` file under policy, whatever it names/i);
  assert.match(close, /The picker presentation is not a choice: do not emit `route-choice`, `plan`, or `direct-build`[\s\S]{0,220}until the user returns one valid option/i);
  assert.match(stageMachine, /\*\*Block emits are the one exception\.\*\*[\s\S]*?quoted\s+heredoc in Bash, a single-quoted here-string in PowerShell/i);
  assert.match(stageMachine, /<<'SAI_BLOCKS'/);
  assert.match(stageMachine, /'@ \| node <tool-path> emit <id> explore-slice@1 --ready-to-propose -/);
  assert.match(stageMachine, /A follow-load failure or an emit error stops the run/i);
  assert.match(stageMachine, /show the error and wait for the user/i);
  assert.match(stageMachine, /up to 2 retries of that same emit without asking the user/i);
  assert.match(stageMachine, /The literal `none` is a no-file sentinel, not a path/i);
});

test('overview-language gate is deferred from crystallization until round 3 of the route round', () => {
  const crystallization = [
    spec('sai/commands/explore/steps/common.md'),
    spec('sai/commands/explore/steps/slicing-assessment.md'),
    spec('sai/commands/explore/steps/crystallization-protocol.md'),
    spec('sai/commands/explore/steps/crystallization-language-gates.md'),
  ].join('\n');
  const plan = spec('sai/commands/explore/steps/pipeline-plan-unattended.md');
  const selector = spec('sai/commands/explore/steps/route-selector.md');

  assert.doesNotMatch(crystallization, /overview-language gate \(gate 9|gate 9.*before.*Ready to Propose/i);
  assert.match(plan, /Gate 9 at Plan \(unattended\) activation/);
  assert.match(plan, /owned by `route-selector\.md` § Change overview question/);
  assert.doesNotMatch(plan, /ask gate 9 on its own exactly once/, 'the Plan step points to the selector instead of restating the gate');
  assert.match(selector, /Only when round 3 left it unresolved[\s\S]*?ask gate 9 on its own exactly once here/i);
  assert.match(selector, /dispatch nothing until it is answered or resolves to `None` under the decline rule/i);
  assert.match(selector, /Empty or completed crystallization sets, an ambiguous or invalid reply, and an already-active run end before this gate/i);
  assert.match(selector, /The ask never occurs at crystallization emission.*\*\*Manual\*\*.*\*\*Direct Build \(unattended\)\*\*/i);
});

test('the spec closing line hands off to /sai-2-design and the design closing line to /sai-3-implement', () => {
  const spec1 = spec('sai/commands/spec/coordinator.md');
  const design = spec('sai/commands/design/coordinator.md');
  assert.match(spec1, /Spec done in openspec\/changes\/\{name\}\/\. Review it and run `\/sai-2-design \{name\}` in a new chat when ready\./);
  assert.match(design, /Design done in openspec\/changes\/\{name\}\/\. Run `\/sai-3-implement \{name\}` \*\*in a new chat\*\* when ready\./);
});

test('Manual is an explicit route; invalid picker answers preserve the waiting inventory', () => {
  const source = exploreContract();

  assert.match(source, /Manual creates no delegated entries, dispatches no worker, changes no supervision state/i);
  assert.match(source, /A native picker answer is the only route-choice input/i);
  assert.match(source, /An answer that does not map to exactly one fixed picker option is ambiguous/i);
  assert.match(source, /keep `route_choice_reply_pending = true`/i);
  assert.doesNotMatch(source, /maps to neither route option is treated as \*\*Manual\*\*/i);
  assert.match(source, /Manual creates no delegated entries, dispatches no worker, changes no supervision state/i);
  assert.match(source, /\*\*Manual is not terminal\*\*[\s\S]{0,400}no cap on re-presentations/i);
  assert.match(source, /every new \*\*Manual\*\* answer re-emits handoff plus recommendation once/i);
  assert.match(source, /`--fast-track` auto-selects nothing: the native picker requires an explicit answer/i);
});

test('the selector authorizes the delegated-write exception and is not the removed review picker', () => {
  const source = exploreContract();

  assert.match(source, /Selecting \*\*Plan - Unattended\*\* is the explicit user act that authorizes delegated writes/i);
  assert.match(source, /consent to choice and dispatch only/i);
  assert.match(source, /is \*\*not\*\* the removed global Yes\/No review picker/i);
  assert.match(source, /this review loop stays picker-free at crystallization/i);
});

test('the crystallization closing recommendation names review-loop and no pipeline token', () => {
  const source = exploreContract();

  assert.match(source, /The recommendation names no pipeline token/);
  assert.match(source, /names the literal token `review-loop` exactly once/);
  assert.doesNotMatch(source, /Inline-refusal path|Creating a proposal opens a new context/);
  assert.match(source, /selector remains a three-option \*\*Plan \(unattended\)\*\*\s*\/\s*\*\*Direct Build \(unattended\)\*\*\s*\/\s*\*\*Manual\*\* choice/i,
    'the review-loop description should name all three selector options');
  assert.doesNotMatch(source, /selector remains a two-option \*\*Auto\*\* \/ \*\*Manual\*\* choice/i);
});

test('the selector prompt and descriptions localize while option titles and command literals stay English', () => {
  const source = exploreContract();

  assert.match(source, /The route explanation renders in the user's language[\s\S]{0,180}fixed route names remain exactly `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
  assert.match(source, /The literals `review-loop`, `\/sai-1-spec`, and `\/sai-2-design` stay verbatim English/i);
});

test('supervision tracks ordered unique changes and dispatches only eligible work', () => {
  const source = exploreContract();

  for (const term of [
    /tracked_changes/,
    /completed_changes/,
    /active_change/,
    /ordered unique|duplicate[- ]free|first[- ]emission order/i,
    /empty|completed.*set|already completed/i,
    /(?:ambiguous|unclear)[\s\S]{0,240}(?:dispatch nothing|emit no route intent)/i,
    /Do not present a slice-name picker/i,
    /failed|cancelled.*retry|retryable/i,
    /active.*reject|duplicate starts/i,
  ]) assert.match(source, term);
});

test('explore remains read-only and its Plan route follows the plan coordinator', () => {
  const source = exploreContract();

  assert.match(source, /Explore.*no direct write|no direct write/i);
  assert.match(source, /owned change directory|limited to.*change directory/i);
  assert.match(source, /review-loop/);
  assert.match(source, /Crystallization route choice/);
  assert.match(source, /user[- ]triggered|user triggered|user-selected/i);
  for (const harness of ['Claude Code', 'opencode']) {
    assert.match(source, new RegExp(harness.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(source, /\*\*Plan - Unattended\*\* runs `\/sai-plan` for the first pending slice/);
  assert.doesNotMatch(source, /sai-2 was not run|Independent review and artifact feedback are complete|Supervised sai-1 done/i);
  assert.match(source, /Ready to Propose/);
});

test('Claude Code explore adapter permits worker supervision without direct writes', () => {
  const source = require('./helpers/capability-source').readProjected('commands/claude/sai-explore.md');

  const allowedToolsLine = source.match(/^allowed-tools:\s*(.+)$/im);
  assert.ok(allowedToolsLine, 'allowed-tools frontmatter should exist');
  const allowedTools = allowedToolsLine[1].split(',').map(tool => tool.trim());

  assert.ok(allowedTools.includes('Agent'));
  assert.ok(allowedTools.includes('SendMessage'));
  assert.ok(allowedTools.includes('Bash(openspec:*)'));
  assert.ok(allowedTools.includes('Bash(git:*)'));
  assert.equal(allowedTools.includes('Edit'), false);
  assert.equal(allowedTools.includes('Write'), false);
  assert.equal(allowedTools.includes('Bash'), false);
});

test('retired Copilot and inline explore surfaces are absent', () => {
  for (const retiredPath of [
    'commands/copilot/sai-explore.prompt.md',
    'sai/orchestration/inline-invocation.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} should be absent`);
});

test('install manifest projects shared explore assets and routed spec assets only to routed harnesses', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'sai/install-manifest.json'), 'utf8');

  assert.match(source, /Claude Code|claude/i);
  assert.match(source, /opencode/i);
  assert.doesNotMatch(source, /Copilot|copilot/i);
  assert.match(source, /sai-1-spec-proposal-worker/);
  assert.match(source, /shared.*instruction|instruction.*shared|policies/i);
  assert.doesNotMatch(source, /reviewer.*lifecycle|independent.*reviewer.*projection/i);
});

test('direct spec and design wrappers retain their existing terminal contracts', () => {
  const source = [
    'commands/claude/sai-1-spec.md',
    'commands/opencode/sai-1-spec.md',
    'commands/claude/sai-2-design.md',
    'commands/opencode/sai-2-design.md',
  ].map(relativePath => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')).join('\n');

  assert.doesNotMatch(source, /start-pipeline|pipeline selector.*adapter|explore.*adapter/i);
  assert.doesNotMatch(source, /independent[- ]reviewer|reviewer[- ]binding/i);
  for (const retiredPath of [
    'commands/copilot/sai-1-spec.prompt.md',
    'commands/copilot/sai-2-design.prompt.md',
  ]) assert.equal(fs.existsSync(path.join(repoRoot, retiredPath)), false, `${retiredPath} should be absent`);
});

test('active exploration closure defines the three conversation-only states and success-only rule', () => {
  const source = spec('sai/commands/explore/steps/common.md');

  assert.match(source, /\*\*Pre-crystallization closure:\*\*/);
  assert.match(source, /The state is exactly one of `active-uncrystallized`, `crystallized`, or `discarded`/);
  assert.match(source, /Before a candidate idea exists, no Closure State is active/);
  assert.match(source, /Once a candidate idea exists under active exploration, its state starts as `active-uncrystallized`/);
  assert.match(source, /The one-time readiness signal remains at most once per stable idea/);
  assert.match(source, /On every successful turn while the state is `active-uncrystallized`/);
  assert.match(source, /genuine unresolved question remains/);
  assert.match(source, /When no genuine unresolved question remains/);
  assert.match(source, /At stage 3 \(`Implementation details`\), name `next-step`\. At stage 4/);
  assert.doesNotMatch(source, /Say `crystallize` when ready/);
  assert.match(source, /every later successful qualifying turn/);
});

test('Claude Code and opencode consume the same shared closure contract', () => {
  const shared = exploreContract();
  const claude = spec('commands/claude/sai-explore.md');
  const opencode = spec('commands/opencode/sai-explore.md');

  assert.match(claude, /Fetch @sai\/adapters\/claude\/boot\.md and follow it\./);
  assert.match(opencode, /Fetch @sai\/adapters\/opencode\/boot\.md and follow it\./);
  assert.equal(
    claude.match(/command_name:\s*explore/)?.[0],
    opencode.match(/command_name:\s*explore/)?.[0]
  );

  for (const literal of [
    /active-uncrystallized/,
    /crystallized/,
    /discarded/,
    /crystallize/,
    /\/sai-1-spec/,
  ]) {
    assert.match(shared, literal);
    assert.doesNotMatch(claude, literal);
    assert.doesNotMatch(opencode, literal);
  }
});

test('Step 1 parses an optional overview language before fast-track and leaves absent language unresolved', () => {
  const source = spec('sai/commands/explore/body.md');

  assert.match(source, /## Overview-language validation/);
  assert.match(source, /--overview-lang <language>/);
  assert.match(
    source,
    /(?:extract(?:s|ed|ing)?|consume|set)[\s\S]{0,320}(?:language value|overview[_ -]?language)|(?:language value|overview[_ -]?language)[\s\S]{0,320}(?:extract|consume|set)/i
  );
  assert.match(source, /non-empty/);
  assert.match(source, /duplicate/i);
  assert.match(source, /missing.*value|value.*missing/i);
  assert.match(source, /(?:validation error|invalid|reject(?:s|ed|ion)?)[\s\S]{0,240}(?:duplicate|missing)|(?:duplicate|missing)[\s\S]{0,240}(?:validation error|invalid|reject)/i);
  assert.match(source, /before.*resolution|resolution.*before/i);
  assert.match(source, /--fast-track/);
  assert.match(
    source,
    /(?:absent|omitted|not provided)[\s\S]{0,220}(?:unresolved|no effective (?:overview )?language)|(?:unresolved|no effective (?:overview )?language)[\s\S]{0,220}(?:absent|omitted|not provided)/i
  );
});

test('Step 1 gate 9 uses the opt-in overview-language selector and deterministic option sets', () => {
  const contract = [
    exploreContract(),
    spec('sai/commands/explore/body.md'),
  ].join('\n');
  const selectorStart = contract.search(/## Change overview question/i);

  assert.ok(selectorStart >= 0, 'the opt-in overview-language selector should be specified');
  const selector = contract.slice(selectorStart);

  assert.match(selector, /(?:None\s*(?:â€”|-)\s*do[- ]not[- ]create|do[- ]not[- ]create[\s\S]{0,120}None)/i);
  assert.doesNotMatch(contract, /emitted first and carrying the `Recommended` marker/);
  assert.doesNotMatch(contract, /emitted second, carrying no marker/);
  assert.match(
    selector,
    /(?:English[\s\S]{0,120}undetermined|undetermined[\s\S]{0,120}English)[\s\S]{0,700}(?:two|2) options[\s\S]{0,700}None[\s\S]{0,400}English/i
  );
  assert.match(
    selector,
    /(?:non[- ]English|not English)[\s\S]{0,700}(?:three|3) options[\s\S]{0,700}None[\s\S]{0,400}English[\s\S]{0,500}endonym/i
  );
});

test('Step 1 gate 9 defaults to None for absent fast-track or noncommittal input and honors an explicit flag', () => {
  const contract = [
    exploreContract(),
    spec('sai/commands/explore/body.md'),
  ].join('\n');
  const selectorStart = contract.search(/## Change overview question/i);

  assert.ok(selectorStart >= 0, 'the opt-in overview-language selector should be specified');
  const selector = contract.slice(selectorStart);

  assert.match(
    selector,
    /(?:--fast-track[\s\S]{0,260}(?:absent|omitted|not present)|(?:absent|omitted|not present)[\s\S]{0,260}--fast-track)[\s\S]{0,700}None/i
  );
  assert.match(selector, /(?:declin\w*|non[- ]committal|noncommittal)[\s\S]{0,500}(?:None|do[- ]not[- ]create)/i);
  assert.match(
    selector,
    /(?:explicit(?:ly)?[\s\S]{0,220}`?--overview-lang`?|`?--overview-lang`?[\s\S]{0,220}explicit)[\s\S]{0,700}(?:suppress|skip|bypass|omit|not present|does not present|without)[\s\S]{0,180}(?:gate|selector)/i
  );
});

test('Step 1 forwards selected overview language only for Plan (unattended) and keeps None and Manual free of overview dispatch', () => {
  const source = exploreContract();

  assert.match(source, /overview_language/);
  assert.match(source, /--overview-lang/);
  assert.match(source, /selected.*language|language.*selected/i);
  const plan = spec('sai/commands/explore/steps/pipeline-plan-unattended.md');
  assert.match(plan, /--overview-lang <overview_language>/);
  assert.match(plan, /The last line is present only when \`overview_language\` is not the literal \`None\`/);
  assert.doesNotMatch(plan, /--fast-track|--supervised/, 'the plan arguments carry no fast-track or supervised marker');

  const routeSelector = spec('sai/commands/explore/steps/route-selector.md');
  const manualStart = routeSelector.indexOf('- **Manual** (`route_mode = manual`)');
  assert.ok(manualStart >= 0, 'the Manual route branch should be present');
  const manual = routeSelector.slice(manualStart, routeSelector.indexOf('**Post-Manual handoff', manualStart));
  assert.match(manual, /dispatches no worker/i);
  assert.doesNotMatch(manual, /(?:command_name|arguments_value)\s*:/i,
    'Manual must forward no dispatch envelope');

  assert.match(source, /not.*persist|never.*persist/i);
  assert.match(source, /failed\/cancelled retry|failed or cancelled retry|failed or stopped run|retry/i);
});

test('Step 1 Claude explore wrapper documents both optional flags (opencode commands carry no argument-hint)', () => {
  for (const relativePath of [
    'commands/claude/sai-explore.md',
  ]) {
    const source = spec(relativePath);
    assert.match(
      source,
      /argument-hint:.*--overview-lang <language>.*--fast-track/,
      `${relativePath} should document both optional flags`
    );
  }
});

test('Step 1 rejects malformed language input before dispatch', () => {
  const source = exploreContract();

  assert.match(source, /Missing value for --overview-lang|missing.*value.*--overview-lang/i);
  assert.match(source, /duplicate.*--overview-lang|--overview-lang.*duplicate/i);
  assert.match(source, /no.*resolution|before.*change.*resolution/i);
  assert.match(source, /no.*dispatch|without.*dispatch/i);
});

// â”€â”€â”€ Step 2: spec-design-review-progress-step (external findings and worker correction) â”€

// â”€â”€â”€ Step 3: spec-design-review-progress-step (supervised design review) â”€â”€â”€â”€

// â”€â”€â”€ suppress-worker-review-under-supervision: Auto envelope pins (verify-first) â”€
// â”€â”€â”€ Step 1: supervised-review-in-session (in-session review rounds) â”€

test('non-supervised worker state carries no worker-owned review convergence', () => {
  for (const worker of [
    spec('sai/commands/spec/worker.md'),
    spec('sai/commands/design/worker.md'),
  ]) {
    assert.doesNotMatch(worker, /A completed pass with `High=0` converges|worker-owned review pass/i,
      'the retired non-supervised worker loop must not return');
    assert.doesNotMatch(worker, /progress event carrying only `review`/,
      'no worker progress rule should mark a review step');
  }
});

test('shared native stage selector capability and response shapes keep stable protocol values', () => {
  const shared = exploreContract();

  assert.match(shared, /NativeStageSelectorCapability\s*=\s*\{ available: boolean, supportsFreeText: boolean, present\(selector, orderedOptions\) -> SelectorResponse \}/);
  assert.match(shared, /SelectorResponse\s*=\s*\{ selector: maturity\|later, kind: option\|free-text, value: review-edge-cases\|keep-iterating\|next-step\|discuss-ideas-feedback\|null, text: string\|null \}/);
  for (const value of ['review-edge-cases', 'keep-iterating', 'next-step', 'discuss-ideas-feedback']) {
    assert.match(shared, new RegExp(`\\b${value}\\b`), `${value} should remain a stable selector value`);
  }
  assert.match(shared, /For `kind: option`, `value` is the stable protocol value and `text` is `null`/);
  assert.match(shared, /A response is valid only for the selector that is currently pending/);
});

test('stage selectors preserve Spanish ordering and later placement after both text list questions', () => {
  const shared = exploreContract();
  const edgeCaseQuestion = shared.indexOf('established edge-case text question');
  const implementationQuestion = shared.indexOf('implementation-detail text question');
  const laterSelector = shared.indexOf('one later selector', implementationQuestion);

  assert.ok(edgeCaseQuestion >= 0, 'the established edge-case text question should remain explicit');
  assert.ok(implementationQuestion > edgeCaseQuestion, 'implementation details must follow edge cases');
  assert.ok(laterSelector > implementationQuestion, 'the later selector must follow both existing text questions');
  assert.match(shared, /localized advancement label maps exactly to the stable value `next-step`/);
  assert.match(shared, /Ir al siguiente step/);
  assert.match(shared, /Discutir ideas \/ dar feedback/);
  assert.ok(shared.indexOf('Ir al siguiente step') < shared.indexOf('Discutir ideas / dar feedback'),
    'Spanish later-selector options must preserve next-step before discussion order');
  assert.match(shared, /later selector is additive and does not replace either text question/);
});

test('discussion and free-text selector answers do not advance while next-step is exactly the existing path', () => {
  const shared = exploreContract();

  assert.match(shared, /The discussion value and later-selector free text remain in ask mode and do not advance, agree a list, or crystallize/);
  assert.match(shared, /Arbitrary free text is never treated as advancement merely because a selector was displayed/);
  assert.match(shared, /The later response value `next-step` follows the existing literal `next-step` intent-recognition path exactly/);
  for (const branch of [
    'non-empty and empty edge-case branches',
    'non-empty and empty implementation-detail branches',
    'stage transitions',
    'entry into `Crystallize`',
  ]) assert.match(shared, new RegExp(branch.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')));
  assert.match(shared, /The existing text questions, semantic agreement gates, `ask_mode` transitions, material-change reset/);
});

test('selector semantics remain shared and are not duplicated in harness wrappers or renderers', () => {
  const shared = exploreContract();
  const claudeWrapper = spec('commands/claude/sai-explore.md');
  const opencodeWrapper = spec('commands/opencode/sai-explore.md');
  const claudePanel = spec('sai/adapters/claude/panel-render.md');
  const opencodePanel = spec('sai/adapters/opencode/panel-render.md');
  const claudeList = spec('sai/adapters/claude/idea-list-render.md');
  const opencodeList = spec('sai/adapters/opencode/idea-list-render.md');

  for (const harnessSurface of [claudeWrapper, opencodeWrapper, claudePanel, opencodePanel, claudeList, opencodeList]) {
    assert.doesNotMatch(harnessSurface, /NativeStageSelectorCapability|keep-iterating|discuss-ideas-feedback|selector-presented|selector-option-received|selector-free-text-received/);
  }
});

test('Step 5: the manual gate note precedes the canonical question, names sai-explore and review-loop, and is not a third option', () => {
  const source = exploreContract();
  assert.match(source, /sai-explore[\s\S]{0,1400}review-loop|review-loop[\s\S]{0,1400}sai-explore/i,
    'the manual gate note should name both literal command surfaces');
  assert.match(source, /(?:before|prior to|preceding)[\s\S]{0,500}(?:canonical|review[- ]loop)?[\s\S]{0,500}(?:question|prompt|picker)|(?:question|prompt|picker)[\s\S]{0,500}(?:after|following)[\s\S]{0,500}(?:sai-explore|review-loop)/i,
    'the gate note should precede the canonical question');
  assert.match(source, /(?:not|never)[\s\S]{0,140}(?:a )?(?:third )?(?:option|choice)|(?:third )?(?:option|choice)[\s\S]{0,140}(?:not|never)/i,
    'the note must not become a third picker option');
});

test('Step 5: supervised flow omits the manual gate note and canonical question', () => {
  const source = exploreContract();

  assert.match(source, /supervis(?:ed|ion)[\s\S]{0,600}(?:omit|does not|never|no|without)[\s\S]{0,220}(?:gate note|note|question|ask|picker|free-text)/i,
    'supervised execution should omit both manual gate surfaces');
});

// â”€â”€â”€ Step 4: deferred Manual handoff (green-exception tests) â”€

test('Step 4: the later Manual choice emits every path-specific sai-1 handoff', () => {
  const routeSelector = spec('sai/commands/explore/steps/route-selector.md');
  const selectorSpecFile = spec('openspec/specs/explore-pipeline-selector/spec.md');
  const postManual = routeSelector.indexOf('**Post-Manual handoff and recommendation');
  assert.ok(postManual >= 0, 'the post-Manual handoff contract should be present');
  const handoffBlock = routeSelector.slice(postManual);

  for (const [label, branch] of [
    ['Single-change path', /\*\*Open a new chat\*\*[\s\S]{0,120}\/sai-1-spec/],
    ['Sliced path', /\*\*first\*\*[\s\S]{0,160}\/sai-1-spec[\s\S]{0,220}each later slice/],
  ]) {
    assert.match(handoffBlock, new RegExp(`\\*\\*${label}\\*\\*[\\s\\S]{0,520}${branch.source}`, 'i'),
      `${label} should keep its handoff wording after a Manual choice`);
  }
  assert.doesNotMatch(handoffBlock, /Inline-refusal path/, 'the inline refusal path is retired');
  assert.match(selectorSpecFile, /exactly once only after the native picker returns the exact `Manual` label/,
    'the spec places the handoff after the explicit native Manual choice');
});

test('Step 4: the Ready-to-Propose payload stays bounded and the Manual handoff stays outside it', () => {
  const format = spec('sai/policies/ready-to-propose-format.md');
  const payloadStart = format.indexOf('## Ready to Propose');
  const separator = format.indexOf('\n---', payloadStart);

  assert.ok(payloadStart >= 0 && separator > payloadStart,
    'the ready-to-propose format should retain its heading and separator');

  const payload = format.slice(payloadStart, separator);
  assert.match(payload, /\*\*Capabilities in scope\*\*/);
  assert.match(payload, /\*\*Edge Cases\*\*/);
  assert.match(payload, /\*\*Implementation Details\*\*/);
  assert.match(payload, /\*\*Overview language\*\*:/);
  assert.doesNotMatch(payload, /(?:next[- ]step|handoff)[\s\S]{0,240}`?\/sai-1-spec`?/i,
    'the payload must not contain a path-specific next-step');

  const routeSelector = spec('sai/commands/explore/steps/route-selector.md');
  assert.match(routeSelector, /It succeeds only when a complete inventory is in the machine's `waiting` state/,
    'the route choice consumes only a successfully recorded inventory');
  assert.match(routeSelector, /\*\*Plan - Unattended\*\* and \*\*Direct Build - Unattended\*\* never emit handoff or recommendation/,
    'only a Manual resolution emits the handoff and recommendation');
});

test('Step 4: Manual is explicit and ambiguous answers preserve the waiting state', () => {
  const routeSelector = spec('sai/commands/explore/steps/route-selector.md');

  assert.match(routeSelector, /Manual creates no delegated entries, dispatches no worker, changes no supervision state/i);
  assert.match(routeSelector, /An answer that does not map to exactly one fixed picker option is ambiguous/i);
  assert.match(routeSelector, /preserve the waiting inventory[\s\S]{0,120}emit no route intent/i);
  assert.doesNotMatch(routeSelector, /maps to neither route option is treated as \*\*Manual\*\*/i);
  assert.match(routeSelector, /emit exactly once the closing path's handoff plus the recommendation, with no second choice in that turn/i);
  assert.match(routeSelector, /Choice re-presentations carry no prior handoff/i);
});

test('Step 4: Manual remains uncapped and each later choice emits one handoff', () => {
  const routeSelector = spec('sai/commands/explore/steps/route-selector.md');

  assert.match(routeSelector, /\*\*Manual is not terminal\*\*[\s\S]{0,220}re-present the native route picker[\s\S]{0,300}no cap on re-presentations/i);
  assert.match(routeSelector, /every new \*\*Manual\*\* answer re-emits handoff plus recommendation once/i);
});

test('Step 4: successful Plan (unattended) emits the build handoff and never dispatches implementation', () => {
  const plan = spec('sai/commands/explore/steps/pipeline-plan-unattended.md');
  const close = plan.slice(plan.indexOf('**Close.**'), plan.indexOf('**`next-slice` on Implement.**'));

  assert.ok(close.length > 0, 'the Plan close should be specified');
  assert.match(close, /review here → \`\/sai-build \{name\}\` in another chat/, 'successful Plan should hand off to the build composition');
  assert.match(close, /titled active slice/);
  assert.match(close, /The route never dispatches \`\/sai-3-implement\` or any later worker/);
  assert.doesNotMatch(close, /\`sai-3 was not run\.\`/i, 'successful Plan should not emit the obsolete terminal text');
});

test('Direct Build continuation starts the next ordered slice only after clean success and explicit consent', () => {
  const source = exploreContract();
  const transitionStart = source.indexOf('**Successful slice completion transition');
  const transitionEnd = source.indexOf('This transition is never entered', transitionStart);
  assert.ok(transitionStart >= 0 && transitionEnd > transitionStart,
    'the Build completion transition should be present');

  const transition = source.slice(transitionStart, transitionEnd);
  assert.match(transition, /recompute `pending_slices` only from `last_crystallization_set` minus `completed_changes`/i);
  assert.match(transition, /Resolve the authoritative continuation state in `route-selector\.md`[\s\S]{0,250}If it resolves to `auto_continue`, start the first pending slice as Direct Build/i);
  assert.match(transition, /emit `\{intent: auto-continue\}`/i);
  assert.match(transition, /exactly one local commit for this automatically started slice/i);
  assert.match(transition, /If it resolves to `route_choice`[\s\S]{0,250}present a fresh native three-option picker/i);
  assert.match(transition, /do not emit a route intent or dispatch work until the user's explicit answer arrives in a later turn/i);
  assert.match(transition, /no slice-name picker/i);
  assert.match(transition, /never select a completed name or re-run a name already in `completed_changes`/i);
  assert.match(transition, /Choosing `Manual` through the native route picker starts no additional slice/i);
  assert.match(transition, /require a later explicit request before any pending slice runs/i);
  assert.match(transition, /Failed, cancelled, escalated, coordinator-disproved, or STOP-bearing results do not mark a slice completed or start or select a later slice/i);
});

test('Plan completion and Direct Build continuation use the native route picker', () => {
  const plan = spec('sai/commands/explore/steps/pipeline-plan-unattended.md');
  const directBuild = spec('sai/commands/explore/steps/pipeline-direct-build.md');
  const pocLane = spec('sai/commands/explore/steps/poc-lane.md');
  const routeSelector = spec('sai/commands/explore/steps/route-selector.md');

  assert.match(plan, /returns `stage` to `waiting`/);
  assert.match(plan, /that step presents a fresh native route picker in this turn/i);
  assert.match(plan, /Do not start another route until the user's explicit picker answer arrives in a later turn/i);
  assert.match(directBuild, /deferred crystallization route choice never offers it/);
  assert.match(pocLane, /deferred crystallization route choice never offers it/);
  assert.doesNotMatch(directBuild, /crystallization-close route selector never offers it/);
  assert.doesNotMatch(pocLane, /crystallization-close route selector never offers it/);
  assert.match(routeSelector, /This separate question stays a distinct question of round 3 and is not the route choice above/i);
});

test('Direct Build final report is outcome-first and leaves the audit layout to the corrections entries', () => {
  const directBuild = spec('sai/commands/explore/direct-build-coordinator.md');
  const auditLayout = spec('sai/policies/autonomy-audit-log.md');
  const reportStart = directBuild.indexOf('## Close');

  assert.ok(reportStart >= 0, 'the Direct Build terminal-report contract should exist');
  const report = directBuild.slice(reportStart);
  assert.match(report, /@sai\/policies\/implementation-closing-report\.md.*single format authority/);
  const sections = ['**What you need to know**', '**Next step**', '**Execution details**', '**Verification**', '**Incidents**'];
  let previous = -1;
  for (const section of sections) {
    const index = report.indexOf(section);
    assert.ok(index > previous, `${section} should appear in the required order`);
    previous = index;
  }

  assert.match(report, /archive destination.*local commit reference.*short SHA and subject.*Nothing was pushed/s);
  assert.match(report, /If archiving or the commit did not complete, state what completed and what remains/);
  assert.match(report, /failures known before this run from failures introduced or worsened by it/);
  assert.match(report, /run-caused execution problem or contract violation and its known effect/);
  assert.match(report, /pre-existing test failure is a verification limitation, not an incident/);
  assert.match(report, /Name the violated rule for a contract violation/);
  assert.match(report, /expected generated file is excluded from the commit, name it and the reason/);
  assert.match(report, /omit routine rounds without findings, cap tallies, checks without alerts, automatic answers that caused no problems/i);

  assert.match(auditLayout, /Corrections: <N>/);
  assert.match(auditLayout, /Ignored process statements: <K>/);
  assert.match(auditLayout, /NEVER written to any file, artifact, change\s+directory, or configuration/);
  assert.doesNotMatch(auditLayout, /Auto-answered: <N>/, 'the Plan auto-answer audit is retired');
});

test('Step 4: failed or stopped Plan segments park the slice, print one guidance line, and never dispatch implementation', () => {
  const plan = spec('sai/commands/explore/steps/pipeline-plan-unattended.md');

  assert.match(plan, /When a segment fails, is stopped, or ends on an unanswered escalation, emit \`\{intent: fail\}\` after its report, parking the slice on its current stage/);
  assert.match(plan, /a later \*\*Plan - Unattended\*\* choice with a fresh picker answer retries it/);
  assert.match(plan, /one localized guidance line: \`Next step: choose Plan - Unattended again to resume the stopped segment, or run \/sai-1-spec or \/sai-2-design for \{name\}\.\`/);
  assert.match(plan, /Add the name to \`completed_changes\` only when the design segment completed/);
  assert.match(plan, /The route never dispatches \`\/sai-3-implement\` or any later worker/);
});

test('the Plan route follows /sai-plan and keeps the plan family out of explore', () => {
  const plan = spec('sai/commands/explore/steps/pipeline-plan-unattended.md');
  const selector = spec('sai/commands/explore/steps/pipeline-selector.md');

  assert.match(plan, /Fetch @sai\/commands\/plan\/coordinator\.md and follow it exactly/);
  assert.match(plan, /--block-file <absolute path returned by export>/);
  assert.match(plan, /--block-hash <sha256 returned by export>/);
  assert.match(plan, /Set \`active_change\` before dispatch and reject duplicate starts for the full active interval/);
  assert.match(plan, /\{intent: complete\}\` \(\`sai-1\` → \`sai-2\`\) before the design segment starts/);
  assert.match(plan, /\{intent: complete\}\` \(\`sai-2\` → \`implement\`\)/);
  for (const retired of ['specs_converged_changes', 'active_phase', 'auto_answered', 'escalated_count', 'review_rounds', 'Diagnosis Round']) {
    assert.ok(!plan.includes(retired), `the Plan step must not mention ${retired}`);
    assert.ok(!selector.includes(retired), `the selector state must not mention ${retired}`);
  }
  for (const kept of ['tracked_changes', 'last_crystallization_set', 'completed_changes', 'active_change', 'overview_language']) {
    assert.ok(selector.includes(kept), `the selector state keeps ${kept}`);
  }
  assert.doesNotMatch(selector, /diagnosis_rounds = \{ spec/, 'the spec and design diagnosis counters are retired');
});

test('Step 4: handoff prose localizes while command and review-loop literals remain verbatim English', () => {
  const routeSelector = spec('sai/commands/explore/steps/route-selector.md');

  assert.match(routeSelector, /The handoff's surrounding prose follows the selected crystallization language per the crystallization language gate/i);
  assert.match(routeSelector, /`\/sai-1-spec`, `\/sai-2-design`, and `review-loop` remain verbatim English/i);
  assert.match(routeSelector, /The route explanation renders in the user's language[\s\S]{0,180}fixed route names remain exactly `Plan - Unattended`, `Direct Build - Unattended`, and `Manual`/i);
  assert.match(routeSelector, /The literals `review-loop`, `\/sai-1-spec`, and `\/sai-2-design` stay verbatim English/i);
});

const artifact = relativePath => spec(relativePath);

test('crystallization renders a temporary mode-specific route without changing the evidence catalog', () => {
  const ideaList = spec('sai/commands/explore/steps/idea-list.md');

  assert.match(ideaList, /The chosen route creates its own entries with no baseline items/);
  assert.match(ideaList, /Route state is conversation-only and scoped to the chosen slice/i);
  assert.match(ideaList, /is never persisted, and creates no milestone stamps/i);
});

test('selector starts only the first pending slice and does not fetch Plan or Direct Build files at presentation', () => {
  const routeSelector = spec('sai/commands/explore/steps/route-selector.md');
  assert.doesNotMatch(routeSelector, /Fetch @sai\/commands\/explore\/steps\/pipeline-plan-unattended\.md/);
  assert.doesNotMatch(routeSelector, /Fetch @sai\/commands\/explore\/steps\/pipeline-direct-build\.md/);
  assert.match(routeSelector, /emit `\{intent: plan\}` or `\{intent: direct-build\}` to `explore-slice@1`/);
  assert.match(routeSelector, /machine starts only the first pending slice/i);
  assert.match(routeSelector, /never send a slice name or `pick`/i);
  assert.doesNotMatch(routeSelector, /pick:\s*<chosen/i);
  assert.match(routeSelector, /Do not present a slice-name picker, even when multiple entries remain/i);
  assert.doesNotMatch(routeSelector, /sai-state emit/);
  assert.match(routeSelector, /Load `pipeline-plan-unattended\.md` or `pipeline-direct-build\.md` only through the route emit's `next\.follow`, never at picker presentation/);
});

test('Direct Build continuation consent is one-time, set-scoped, context-complete, and resolves queued changes after slice completion', () => {
  const routeSelector = spec('sai/commands/explore/steps/route-selector.md');
  const directBuild = spec('sai/commands/explore/steps/pipeline-direct-build.md');

  assert.match(routeSelector, /`direct_build_continuation_answer`[\s\S]{0,240}to `unasked`[\s\S]{0,80}becomes `yes` or `no`/);
  assert.match(routeSelector, /Initialize `direct_build_continuation_prompted` to `false` and `direct_build_continuation_answer` to `unasked`/);
  assert.match(routeSelector, /Reset both values and set `pending_direct_build_change` to `null` only when a new crystallization replaces that set/i);
  assert.match(routeSelector, /when more than one pending slice remains and `direct_build_continuation_prompted` is `false`: ask once/i);
  assert.match(routeSelector, /ask once through the harness-native picker, even if earlier slices used Manual or Plan/i);
  assert.match(routeSelector, /Only an explicit `yes` authorizes automatic continuation/i);
  assert.match(routeSelector, /authorizes one local commit per automatically started slice; nothing is pushed/i);
  assert.match(routeSelector, /There are \{pending_count\} proposed slices still pending[\s\S]{0,220}current slice is \{active_change\}/i);
  assert.match(routeSelector, /each automatically started later slice makes a local commit[\s\S]{0,300}nothing is pushed/i);
  assert.match(routeSelector, /No lets this slice finish, then presents the native route picker for the next slice/i);
  assert.match(routeSelector, /Should later slices start automatically after each successful slice\?/);
  assert.match(routeSelector, /localized option labels and descriptions of about 100 characters maximum/i);
  assert.match(routeSelector, /Queue it without interrupting the active slice/i);
  assert.match(routeSelector, /`route_requested` \(`true` only when the user explicitly asks to choose another route\)/i);
  assert.match(routeSelector, /After the current slice returns a clean terminal result, apply any queued answer, then resolve in this order[\s\S]{0,450}answer `yes` returns `auto_continue` and answer `no` returns `route_choice`/i);
  assert.match(routeSelector, /with `route_requested: true`, return `route_choice`/i);
  assert.match(routeSelector, /a queued change from `no` to `yes` auto-starts the next Direct Build slice/i);
  assert.match(routeSelector, /an explicit request to choose another route presents that picker regardless of the answer/i);
  assert.match(directBuild, /authoritative continuation state in `route-selector\.md`/i);
  assert.match(directBuild, /If it resolves to `auto_continue`[\s\S]{0,500}If it resolves to `route_choice`[\s\S]{0,250}present a fresh native three-option picker/i);
  assert.match(directBuild, /do not emit a route intent or dispatch work until the user's explicit answer arrives in a later turn/i);
  assert.match(directBuild, /even an authorized continuation never starts the next slice after a non-clean result/i);
});

test('mode-specific route labels and Plan/Build progression are explicit', () => {
  const ideaList = spec('sai/commands/explore/steps/idea-list.md');

  assert.match(ideaList, /\*\*Plan:\*\* exactly `sai-1`, `sai-2`, `Implement`/);
  assert.match(ideaList, /`sai-1` starts `in_progress`; only clean spec convergence completes it and starts `sai-2` as `in_progress`/);
  assert.match(ideaList, /The route never exposes or claims `sai-3`, `\/sai-3-implement`, or code implementation/);
  assert.match(ideaList, /\*\*Direct Build:\*\* exactly `Build\/Implement`, `Backfill`, and `Archive`, in that order/);
  assert.match(ideaList, /`Build\/Implement` is the user-facing display label[\s\S]{0,200}it is not `\/sai-build`/);
  assert.match(ideaList, /internal substeps remain authoritative in the Direct Build contract but never expand the panel route/i);
});

test('Manual route is a completed handoff only and non-clean routes remain pending and retryable', () => {
  const ideaList = spec('sai/commands/explore/steps/idea-list.md');

  assert.match(ideaList, /\*\*Manual:\*\* exactly `Manual handoff`/);
  assert.match(ideaList, /It becomes `completed` when the path-specific handoff is emitted/);
  assert.match(ideaList, /Manual creates no delegated route steps, dispatches no worker/i);
  assert.match(ideaList, /failed, cancelled, STOP-bearing, coordinator-disproved, or unrecovered route result leaves the active route step `pending` and the route retryable/i);
  assert.match(ideaList, /no later step starts, and the route is not completed/i);
  assert.match(ideaList, /Only a clean terminal result completes the active route/i);
  assert.match(ideaList, /Reset route state when a new slice is chosen; preserve completed slices and all pending slices/i);
});

test('E2: a single change keeps the yes/no branch question and a slice set gets one explicit three-choice question', () => {
  const selector = spec('sai/commands/explore/steps/route-selector.md');
  const question = selector.slice(selector.indexOf('2. **Branch question:**'), selector.indexOf('\n**Free-text answers.**'));
  assert.match(question, /chosen by its size \(the recorded `explore-slice@1` inventory, not the pending remainder\)/);
  assert.match(question, /\*\*One recorded change:\*\* “Would you like to create and switch to a local change branch for this crystallized proposal\?”/);
  assert.match(question, /\*\*More than one recorded change \(a slice set\):\*\* ask one three-choice question/);
  assert.match(question, /“¿Quieres crear una nueva rama\?”/);
  const values = [...question.matchAll(/\(`(shared|per-slice|none)`;/g)].map(match => match[1]);
  assert.deepEqual(values, ['shared', 'per-slice', 'none']);
  assert.match(question, /Sí, crea una única para la issue principal[\s\S]*Crear una rama por slice[\s\S]*No crear nada/);
  assert.match(question, /says that no branch is published/);
  assert.match(selector, /All questions remain explicit under `--fast-track`/);
  assert.match(question, /On `none`, skip only this action, keep the current branch and every existing branch as they are/);
  assert.match(question, /On `shared`, create the branch once after publication through the installed `new-change-branch` skill[\s\S]*originating principal issue's identity[\s\S]*every slice reuse that branch/);
  assert.match(question, /On `per-slice`, create the first pending slice's branch the same way, named after that slice/);
});

test('E4/E5/E6/E7: the slice branch chain grows only from completed slices and stays conversation-scoped', () => {
  const selector = spec('sai/commands/explore/steps/route-selector.md');
  const chain = selector.slice(selector.indexOf('## Slice branch chain'), selector.indexOf('\n## Native route picker'));
  assert.match(chain, /never persist them, never send them to a worker, and never add them to `explore-slice@1`/);
  assert.match(chain, /Inventory order is dependency order/);
  assert.match(chain, /only when its previous slice is completed: Direct Build archive completed, or `next-slice` at `implement` in Plan or Manual/);
  assert.match(chain, /pending, failed, cancelled, parked, or still at sai-1 or sai-2 holds the chain at its position/);
  assert.match(chain, /planning completion alone never completes a slice/);
  assert.match(chain, /immediately before that slice starts[\s\S]*automatic continuation before `\{intent: auto-continue\}`/);
  assert.match(chain, /authorizes every local creation and switch in the chain in advance/);
  assert.match(chain, /`base` set to the previous slice's branch, and `require_clean: true`/);
  assert.match(chain, /Never push or publish/);
  assert.match(chain, /creation stops on uncommitted changes, create nothing and start nothing[\s\S]*previous slice's work must be committed first/);
  assert.match(chain, /`name` reporting that the branch already exists is the lookup in git/);
  assert.match(chain, /records that branch for this slice[\s\S]*resume on it[\s\S]*create nothing/);
  assert.match(chain, /reuse the existing branch[\s\S]*give a corrected name[\s\S]*Never rename, overwrite, or delete the existing branch/);
  assert.match(selector, /prepare the slice's branch when `branch_strategy` is `per-slice` and it is not yet prepared[\s\S]*then set `route_choice_reply_pending = false` and emit `\{intent: route-choice\}`/);
  const slice = spec('sai/commands/explore/steps/slice.md');
  assert.match(slice, /`next-slice` confirms the slice is implemented and committed/);
  assert.match(slice, /the slice machine, its inventory, and its transitions stay unchanged and carry no branch data/);
  assert.match(spec('sai/commands/explore/steps/pipeline-plan-unattended.md'), /`next-slice` confirms the slice is implemented and committed/);
  assert.match(spec('sai/commands/explore/steps/pipeline-direct-build.md'), /an `auto_continue` first prepares the next slice's branch[\s\S]*before `\{intent: auto-continue\}` is emitted and before any worker dispatch/);
  assert.match(spec('sai/commands/explore/instructions.md'), /choosing `per-slice` in the slice-set branch question is that acceptance in advance/);
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const idea = require('../sai-state/machines/explore-idea.js');

const ROOT = path.join(__dirname, '..');
const SAI_STATE_TOOL = path.join(ROOT, 'bin', 'sai-state.js');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function cli(argv) {
  const result = spawnSync(process.execPath, [SAI_STATE_TOOL, ...argv], { encoding: 'utf8' });
  return { code: result.status, json: result.stdout ? JSON.parse(result.stdout) : null };
}

function atStage(stage) {
  let current = idea.initialState;
  while (current.stage !== stage) current = idea.transition(current, { intent: 'next-step' }).state;
  return current;
}

test('I1: pause keeps the stage, sections, lists, and moves, and only resume leaves it', () => {
  const recorded = idea.transition(atStage('review-edge-cases'), { recordedList: ['E1', 'E2'] }).state;
  const paused = idea.transition(recorded, { intent: 'pause' });
  assert.equal(paused.state.exploration, 'paused');
  assert.equal(paused.run.exploration, 'paused');
  assert.equal(paused.state.stage, 'review-edge-cases');
  assert.deepEqual(paused.state.edgeCaseList, ['E1', 'E2']);
  assert.deepEqual(paused.state.sections, recorded.sections);
  assert.ok(!('rejected' in paused));

  for (const event of [{ intent: 'next-step' }, { intent: 'goto', target: 'explore-change', reason: 'user-request' }, { intent: 'poc-lane-late' }, { recordedList: ['E9'] }, { sections: { 'explore-change': { state: 'open' } } }, { intent: 'pause' }, { intent: 'close-explore' }, {}]) {
    const answer = idea.transition(paused.state, event);
    assert.equal(answer.rejected, 'EXPLORATION_PAUSED', JSON.stringify(event));
    assert.deepEqual(answer.state, paused.state, 'a paused exploration never changes');
  }

  const resumed = idea.transition(paused.state, { intent: 'resume' });
  assert.equal(resumed.state.exploration, 'active');
  assert.equal(resumed.state.stage, 'review-edge-cases');
  assert.deepEqual(resumed.state.edgeCaseList, ['E1', 'E2']);
  assert.ok(!('rejected' in resumed));
  assert.equal(idea.transition(resumed.state, { intent: 'next-step' }).state.stage, 'implementation-details');
});

test('E9: a paused exploration at crystallize resumes at crystallize', () => {
  const paused = idea.transition(atStage('crystallize'), { intent: 'pause' }).state;
  assert.equal(idea.transition(paused, { intent: 'resume' }).state.stage, 'crystallize');
});

test('E7 and I1: close discards the explore state and leaves the closed mark', () => {
  const recorded = idea.transition(atStage('review-edge-cases'), { recordedList: ['E1'] }).state;
  const closed = idea.transition(recorded, { intent: 'close-explore' });
  assert.equal(closed.state.exploration, 'closed');
  assert.equal(closed.state.stage, 'explore-change');
  assert.equal(closed.state.edgeCaseList, null);
  assert.deepEqual(closed.state.ideaList, []);

  for (const event of [{ intent: 'next-step' }, { intent: 'resume' }, { intent: 'pause' }, { recordedList: ['x'] }, {}]) {
    const answer = idea.transition(closed.state, event);
    assert.equal(answer.rejected, 'EXPLORATION_CLOSED', JSON.stringify(event));
    assert.equal(answer.state.exploration, 'closed');
  }
});

test('E10: resume without a paused exploration changes nothing', () => {
  const start = atStage('implementation-details');
  const answer = idea.transition(start, { intent: 'resume' });
  assert.equal(answer.rejected, 'NOT_PAUSED');
  assert.deepEqual(answer.state, start);
});

test('status reads the exploration in every state and changes nothing', () => {
  const paused = idea.transition(idea.initialState, { intent: 'pause' }).state;
  const closed = idea.transition(idea.initialState, { intent: 'close-explore' }).state;
  for (const [state, expected] of [[idea.initialState, 'active'], [paused, 'paused'], [closed, 'closed']]) {
    const answer = idea.transition(state, { intent: 'status' });
    assert.equal(answer.run.exploration, expected);
    assert.ok(!('rejected' in answer));
    assert.deepEqual(answer.state, state);
  }
});

test('a state stored before the field existed is an active exploration', () => {
  const legacy = { stage: 'review-edge-cases', ideaList: [], edgeCaseList: null };
  assert.equal(idea.project(legacy).run.exploration, 'active');
  assert.equal(idea.transition(legacy, { intent: 'next-step' }).state.stage, 'implementation-details');
});

test('E11: the paused and closed marks survive in the store, and a new invocation reset reopens them', () => {
  const key = 'explore-leave-confirmation-' + process.pid;
  const id = cli(['spawn', '--key', key]).json.id;
  try {
    cli(['emit', id, 'explore-idea@1', '--set', 'intent=next-step']);
    const paused = cli(['emit', id, 'explore-idea@1', '--set', 'intent=pause']);
    assert.equal(paused.json.run.exploration, 'paused');
    assert.equal(paused.json.stage, 'review-edge-cases');

    const spawned = cli(['spawn', '--key', key]);
    assert.equal(spawned.json.id, id);
    const status = cli(['emit', id, 'explore-idea@1', '--set', 'intent=status']);
    assert.equal(status.json.run.exploration, 'paused');
    assert.equal(status.json.stage, 'review-edge-cases');

    const refused = cli(['emit', id, 'explore-idea@1', '--set', 'intent=next-step']);
    assert.equal(refused.json.rejected, 'EXPLORATION_PAUSED');
    assert.equal(refused.json.stage, 'review-edge-cases');

    assert.equal(cli(['emit', id, 'explore-idea@1', '--set', 'intent=resume']).json.run.exploration, 'active');

    const closed = cli(['emit', id, 'explore-idea@1', '--set', 'intent=close-explore']);
    assert.equal(closed.json.run.exploration, 'closed');
    assert.equal(cli(['emit', id, 'explore-idea@1', '--set', 'intent=status']).json.run.exploration, 'closed');

    cli(['reset', id, 'explore-idea@1']);
    const fresh = cli(['emit', id, 'explore-idea@1', '--set', 'intent=status']);
    assert.equal(fresh.json.run.exploration, 'active');
    assert.equal(fresh.json.stage, 'explore-change');
  } finally {
    cli(['close', id]);
  }
});

test('I3: the leave rule is written once in instructions.md and the other surfaces point to it', () => {
  const instructions = read('sai/commands/explore/instructions.md');
  const rule = instructions.slice(instructions.indexOf('4. **Leave confirmation.**'), instructions.indexOf('## Step loading'));
  assert.ok(rule.length > 0, 'rule 4 exists beside rule 3');
  assert.ok(instructions.indexOf('3. **Direct-looking request classification.**') < instructions.indexOf('4. **Leave confirmation.**'));
  assert.match(rule, /`Stay`[\s\S]*`Pause`[\s\S]*`Close`/, 'the selector offers the three options in order');
  assert.match(rule, /AskUserQuestion[\s\S]*`question` on opencode/, 'both harnesses name their native picker');
  assert.match(rule, /no route of the current slice is running/, 'the window is every turn without a running route');
  assert.match(rule, /back in `waiting` with the route selector presented for a later or a parked slice/, 'the selector shown again for a later slice stays covered');
  assert.match(rule, /`route-choice`\), and running Plan and Direct Build routes keep their own/, 'a started route leaves the rule');
  assert.match(rule, /sai-state reset <id> explore-slice@1` and `sai-state reset <id> direct-build-run@1`/, 'Close also resets the slice machine and the run state');
  assert.match(rule, /read-only rule too/, 'the selector text states that a pause suspends read-only');
  assert.match(rule, /cancelled, dismissed, or ambiguous answer counts as Stay/);
  assert.match(rule, /`resume-explore`/);
  assert.match(rule, /`\/sai-explore` resets the exploration as today, a paused one included/);
  assert.match(rule, /openspec-explore[\s\S]*never edited/);
  for (const ref of ['worker-lifecycle.md` § Dispose (Abandon or stop)', 'cache-warming.md` § Stop your own wait', '§ Retire at terminal output']) {
    assert.ok(rule.includes(ref), 'the end mechanics are reused: ' + ref);
  }

  const body = read('sai/commands/explore/body.md');
  assert.match(body, /paused or closed exploration[\s\S]{0,80}is not an explore turn/);
  assert.match(body, /run\.exploration/);
  assert.match(body, /leave rule of `instructions\.md` \(rule 4\)/);
  assert.ok(!/when it finishes, exploration continues at its current stage\./.test(body), 'the deferred-message sentence points to the rule instead of restating it');

  const common = read('sai/commands/explore/steps/common.md');
  assert.match(common, /\*\*Resume \(`resume-explore` recognition\)\.\*\*/);
  assert.match(common, /route selector pending[\s\S]*present the picker again/);

  const policy = read('sai/policies/stage-machine.md');
  assert.match(policy, /sai-state reset <id> explore-slice@1` and\s+`sai-state reset <id> direct-build-run@1`/, 'the policy documents the close resets');
  for (const literal of ['`pause`', '`resume`', '`close-explore`', 'EXPLORATION_PAUSED', 'EXPLORATION_CLOSED', 'NOT_PAUSED']) {
    assert.ok(policy.includes(literal), literal + ' is documented with the machine intents');
  }
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const selector = read('sai/commands/explore/steps/route-selector.md');
const rounds = read('sai/policies/question-rounds.md');
const actions = selector.slice(selector.indexOf('\n## Optional pre-route actions'), selector.indexOf('\n## Slice branch chain'));
const round1 = actions.slice(actions.indexOf('**Round 1.**'), actions.indexOf('**Round 2.**'));
const round2 = actions.slice(actions.indexOf('**Round 2.**'), actions.indexOf('**After round 2'));
const afterRound2 = actions.slice(actions.indexOf('**After round 2'), actions.indexOf('**Free-text answers.**'));
const picker = selector.slice(selector.indexOf('\n## Native route picker'), selector.indexOf('\n## After a valid answer'));
const continuation = selector.slice(selector.indexOf('\n## Direct Build continuation'), selector.indexOf('\n## Selection, panel, and route state'));

test('the normal flow is three conditional rounds in a fixed question order', () => {
  assert.match(actions, /three conditional question rounds/);
  assert.match(actions, /\*\*round 1\*\* asks the backlog, branch and assignment questions/);
  assert.match(actions, /\*\*round 2\*\* asks publication approval and the branch base/);
  assert.match(actions, /\*\*round 3\*\* asks the route and, conditionally, the Direct Build continuation/);
  assert.match(actions, /not a limit: clarification, corrections, a publication `edit`, `More` for bases, an ambiguous branch name, assignee conflicts, and failures add interactions/);
  const order = ['1. **Backlog question:**', '2. **Branch question:**', '3. **Assignment question:**'].map(label => round1.indexOf(label));
  assert.ok(order[0] >= 0 && order[1] > order[0] && order[2] > order[1]);
  assert.ok(round2.indexOf('1. **Publication approval:**') >= 0 && round2.indexOf('2. **Branch base:**') > round2.indexOf('1. **Publication approval:**'));
  assert.doesNotMatch(selector, /Ask one question at a time/);
  assert.doesNotMatch(selector, /exactly one single-select question/);
});

test('answer combinations: each question keeps its own scope and condition', () => {
  assert.match(actions, /each answer authorizes only its own action; only an explicit answer authorizes/);
  assert.match(round1, /On No, skip only this action and leave out the publication question/);
  assert.match(round1, /On No, skip only this action and leave out the base question/);
  assert.match(round1, /On `none`, skip only this action[\s\S]*leave out the base question/);
  assert.match(round1, /Ask it when a linked issue exists\. With no linked issue, ask it in its intent form only when the backlog answer is Yes[\s\S]*when the backlog answer is No it is left out/);
  assert.match(round1, /set-level assignment answer[\s\S]*applies to the issue of every slice in the set/);
  assert.match(actions, /No registry capability returns the authenticated user without an existing issue, so when no issue exists yet the concrete assignee cannot be named: the assignment question is then asked in its intent form when the backlog answer can be Yes/);
  assert.doesNotMatch(actions, /read-only lookup resolves it without an issue/);
  assert.match(round1, /record the answer as not applicable: it authorizes nothing/);
  assert.match(round1, /`assign`[\s\S]*`keep`[\s\S]*`replace`[\s\S]*`skip`/);
  assert.match(round1, /assignment executes only when implementation starts/);
  assert.match(round2, /A prior general grant, unattended mode, `--fast-track`, or any round 1 Yes is not publication approval/);
  assert.match(round2, /Never choose a base automatically/);
  assert.match(actions, /All questions remain explicit under `--fast-track`/);
});

test('conditional questions share a round with the answer they depend on', () => {
  assert.match(rounds, /no question's presentation waits on another question's answer in the same round/);
  assert.match(rounds, /A \*\*conditional question\*\* is included when its condition can still hold before the round/);
  assert.match(rounds, /its answer takes effect only when its condition holds; otherwise the answer is recorded as not applicable and authorizes nothing/);
  assert.doesNotMatch(rounds, /never depend on each other's answers/);
  assert.match(round1, /conditional question under `@sai\/policies\/question-rounds\.md`/);
});

test('partial cancellation leaves only the cancelled action pending', () => {
  assert.match(actions, /a missing, cancelled, or ambiguous answer leaves its action pending/);
  assert.match(actions, /Cancelling the whole round leaves all its actions pending/);
  assert.match(afterRound2, /Cancel skips only the publication and the branch decision stands/);
  assert.match(afterRound2, /A cancelled or missing base answer creates nothing/);
  assert.match(rounds, /Cancelling the whole round leaves every action of that round pending/);
});

test('stale context invalidates exactly the answers whose context changed', () => {
  assert.match(actions, /An edit or state change invalidates exactly the answers whose context changed/);
  assert.match(afterRound2, /An `edit` answer returns to preparation and asks a full confirmation of the edited proposal in an extra interaction; the base answer stays valid/);
  assert.match(afterRound2, /When the supplied answer no longer matches the proposal, or is missing, the skill asks with its standalone prompt/);
  assert.match(afterRound2, /An approval bound to a proposal whose publication was cancelled or failed lapses and asks again, for that authorization only/);
  assert.match(round2, /`More` opens one extra interaction for the base only; the round's other answers stand/);
});

test('recovery never repeats completed actions and execution follows dependency order', () => {
  assert.match(actions, /completed actions keep their results and are never repeated during recovery/);
  assert.match(actions, /does not repeat completed actions or re-ask answered rounds/);
  const order = ['1. **Publication.**', '2. **Branch name.**', '3. **Branch creation.**', '4. **Assignment.**'].map(label => afterRound2.indexOf(label));
  assert.ok(order[0] >= 0 && order[1] > order[0] && order[2] > order[1] && order[3] > order[2]);
  assert.match(afterRound2, /taking the created issue's identifier after publication/);
  assert.match(afterRound2, /use the existing linked issue's identifier, or none/);
  assert.match(afterRound2, /ask for it in an extra interaction after publication/);
  assert.match(afterRound2, /Nothing is assigned here/);
  assert.match(actions, /conversation state only, scoped to the current crystallized set/);
});

test('round 3 carries the continuation question only for a multi-slice Direct Build', () => {
  assert.match(picker, /the route question is single-select and always present, and the Direct Build continuation question and the change overview question below join the same round only when their conditions are met/);
  assert.match(continuation, /when more than one pending slice remains and `direct_build_continuation_prompted` is `false`: ask once/);
  assert.match(continuation, /takes effect only when the same round's route answer is Direct Build/);
  assert.match(continuation, /When the route answer is Plan or Manual, or no valid route was answered, ignore the continuation answer: it authorizes nothing/);
  assert.match(continuation, /so a later Direct Build round asks again/);
  assert.match(continuation, /authorizes one local commit per automatically started slice; nothing is pushed/);
});

test('round 3 carries the overview question as a conditional question resolved once per set', () => {
  const overview = selector.slice(selector.indexOf('\n## Change overview question'), selector.indexOf('\n## Selection, panel, and route state'));

  assert.match(actions, /\*\*round 3\*\* asks the route and, conditionally, the Direct Build continuation and the change overview question/);
  assert.match(overview, /Round 3 carries it as a conditional question beside the route question/);
  assert.match(overview, /1\. An explicit `--overview-lang <language>` or the user's direct statement[\s\S]*?2\. A value already resolved[\s\S]*?3\. [\s\S]*?explore\.overviewLanguage[\s\S]*?4\. [\s\S]*?`--fast-track`/);
  assert.match(overview, /first match wins and no overview question joins the round/);
  assert.match(overview, /takes effect only when the same round's route answer is \*\*Plan - Unattended\*\*/);
  assert.match(overview, /A missing or cancelled answer leaves `overview_language` unresolved, and the fallback ask below asks gate 9 on its own before the plan coordinator is followed/);
  assert.match(overview, /resolved once per set/);
  assert.match(overview, /Direct Build and Manual never generate a change overview, and no overview question runs at block emission/);
});

test('the slice-set branch question and the per-slice chain use the generic supplied-base capability', () => {
  assert.match(round1, /`shared`, `per-slice`, `none`/);
  assert.match(selector, /the base is a supplied base through the skill's generic supplied-base capability, with no base question/);
  assert.match(selector, /a conditional extra interaction outside the rounds, to reuse the existing branch/);
});

test('both harnesses share one round presentation policy', () => {
  assert.match(rounds, /one `AskUserQuestion` call carrying every question of the round/);
  assert.match(rounds, /`question` call when the picker accepts several questions, and one call per question, consecutively and in the same order, otherwise/);
  assert.match(rounds, /Consecutive calls in the same order form one round/);
  assert.match(read('sai/commands/explore/steps/route-selector.md'), /Fetch @sai\/policies\/question-rounds\.md/, 'route-selector references the shared policy');
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'sai/commands/deep-review/findings-selection.md')), false, 'the deep-review findings round is retired');
  assert.match(actions, /Claude Code's `AskUserQuestion` with its automatic free-text Other entry, or opencode's `question` tool with custom\/free-text input enabled/);
});

test('to-backlog and new-change-branch stay caller-agnostic and expose preparation and supplied-answer capabilities', () => {
  const files = [
    'skills/universal/to-backlog/SKILL.md',
    'skills/universal/to-backlog/slice-set.md',
    'skills/universal/new-change-branch/SKILL.md',
  ];
  for (const file of files) {
    assert.doesNotMatch(read(file), /sai-explore|\/sai-explore|Explore/i, `${file} must not name its caller`);
  }
  const toBacklog = read('skills/universal/to-backlog/SKILL.md');
  assert.match(toBacklog, /Prepare without publishing/);
  assert.match(toBacklog, /the same destination, the same final content,\s+the same baseline version, and the same confirmation token/);
  assert.match(toBacklog, /On a mismatch or a missing answer, ask with section 3's standalone prompt/);
  assert.match(toBacklog, /edit returns to inspection and asks a full confirmation/);
  const branch = read('skills/universal/new-change-branch/SKILL.md');
  assert.match(branch, /## Prepare for a caller/);
  assert.match(branch, /up to four options in all: with\s+more than four bases, three bases plus `More`; with four or fewer, every base\s+without `More`; plus the free-text entry/);
  assert.match(branch, /supplies `base` \(and a resolved\s+type, name, and optional identifier\)/);
  assert.match(branch, /keeps the base question above/);
  for (const kept of ['safe-operations', 'sai/policies/tool-resolution.md', 'sai/tools/new-change-branch.js']) {
    assert.ok(branch.includes(kept) || toBacklog.includes(kept), `${kept} reference stays`);
  }
  assert.match(toBacklog, /Load the `safe-operations`/);
  assert.match(read('skills/universal/to-backlog/slice-set.md'), /backlog-origin-transport\.md/);
  assert.match(read('skills/universal/to-backlog/slice-set.md'), /sai-backlog-slices@1/);
});

test('implementation start verifies an advance assignment approval instead of asking again', () => {
  const start = read('sai/policies/backlog-implementation-start.md');
  assert.match(start, /\*\*Advance approval\.\*\*/);
  assert.match(start, /names a concrete user and binds either an existing selected issue or the\s+publication proposal whose issue the caller then created/);
  assert.match(start, /runs only the checks, with no new question/);
  assert.match(start, /replace the current responsibility with that user\s+\(naming the previous assignees\)/);
  assert.match(start, /for\s+replace, run `propose-assignment` with `choice: "replace"` and `assign` with\s+the `confirmation` it returns/);
  assert.match(start, /the approved set for keep and for replace/);
  assert.match(start, /ask again for that authorization only/);
  assert.match(start, /a lapsed approval \(its proposal was never published\)/);
  assert.match(start, /Fast-track and unattended route\s+consent do not approve assignment/);
  assert.match(start, /\*\*Set-level answer\.\*\*/);
  assert.match(start, /Every later slice of the same set reuses it/);
  assert.match(start, /stop before that slice's implementation and ask keep, replace, or\s+skip/);
  for (const caller of ['sai/commands/explore/steps/pipeline-direct-build.md']) {
    assert.match(read(caller), /Fetch @sai\/policies\/backlog-implementation-start\.md/, `${caller} keeps invoking it`);
  }
});

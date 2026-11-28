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
const creation = selector.slice(selector.indexOf('\n## Branch creation point'), selector.indexOf('\n## Publish and stop close'));
const baseQuestion = selector.slice(selector.indexOf('\n## Branch base question'), selector.indexOf('\n## Publication question'));
const picker = selector.slice(selector.indexOf('\n## Native route picker'), selector.indexOf('\n## After a valid answer'));
const continuation = selector.slice(selector.indexOf('\n## Direct Build continuation'), selector.indexOf('\n## Selection, panel, and route state'));

test('the normal flow is three conditional rounds in a fixed question order', () => {
  assert.match(actions, /three conditional question rounds/);
  assert.match(actions, /\*\*round 1\*\* asks the backlog, branch and assignment questions/);
  assert.match(actions, /\*\*round 2\*\* asks the publication approval;/);
  assert.match(actions, /\*\*round 3\*\* asks the route and, conditionally, the Direct Build continuation, the branch base question, and the publication question/);
  assert.match(actions, /not a limit: clarification, corrections, a publication `edit`, `More` for bases, an ambiguous branch name, assignee conflicts, and failures add interactions/);
  const order = ['1. **Backlog question:**', '2. **Branch question:**', '3. **Assignment question:**'].map(label => round1.indexOf(label));
  assert.ok(order[0] >= 0 && order[1] > order[0] && order[2] > order[1]);
  assert.ok(round2.indexOf('1. **Publication approval:**') >= 0);
  assert.doesNotMatch(round2, /\*\*Branch base:\*\*/);
  assert.match(round2, /It asks the publication approval only: the branch base is a round 3 question/);
  assert.doesNotMatch(selector, /Ask one question at a time/);
  assert.doesNotMatch(selector, /exactly one single-select question/);
});

test('answer combinations: each question keeps its own scope and condition', () => {
  assert.match(actions, /each answer authorizes only its own action; only an explicit answer authorizes/);
  assert.match(round1, /On `skip-continue`, skip only this action and leave out the publication question/);
  assert.match(round1, /On No, skip only this action and leave out the base question/);
  assert.match(round1, /On `none`, skip only this action[\s\S]*leave out the base question/);
  assert.match(round1, /Ask it when a linked issue exists\. With no linked issue, ask it in its intent form only when the backlog answer can be `publish-continue`[\s\S]*when the backlog answer is `skip-continue` it is left out/);
  assert.match(round1, /set-level assignment answer[\s\S]*applies to the issue of every slice in the set/);
  assert.match(actions, /No registry capability returns the authenticated user without an existing issue, so when no issue exists yet the concrete assignee cannot be named: the assignment question is then asked in its intent form when the backlog answer can be `publish-continue`/);
  assert.doesNotMatch(actions, /read-only lookup resolves it without an issue/);
  assert.match(round1, /record the answer as not applicable: it authorizes nothing/);
  assert.match(round1, /`assign`[\s\S]*`keep`[\s\S]*`replace`[\s\S]*`skip`/);
  assert.match(round1, /assignment executes only when implementation starts/);
  assert.match(round2, /A prior general grant, unattended mode, or any round 1 publish answer is not publication approval/);
  assert.match(baseQuestion, /Never choose a base automatically/);
});

test('the backlog question offers three options with stable values and the continue answers keep the former flow', () => {
  const backlog = round1.slice(round1.indexOf('1. **Backlog question:**'), round1.indexOf('2. **Branch question:**'));
  const order = [
    '**Publish and continue with implementation** (`publish-continue`',
    '**Publish and stop** (`publish-stop`',
    '**Do not publish and continue with implementation** (`skip-continue`',
  ].map(label => backlog.indexOf(label));
  assert.ok(order[0] >= 0 && order[1] > order[0] && order[2] > order[1]);
  for (const label of ['Publicar y continuar con la implementación', 'Publicar y parar', 'No publicar y continuar con la implementación']) {
    assert.ok(backlog.includes(label), label);
  }
  assert.match(backlog, /Retain the word `backlog` in the question and option descriptions in every language/);
  assert.match(backlog, /¿Quieres crear o actualizar el backlog con esta propuesta\?/);
  assert.match(backlog, /`publish-continue` behaves as the former Yes and `skip-continue` as the former No/);
  assert.doesNotMatch(backlog, /Do not publish and stop/);
  assert.match(actions, /except for the backlog question, the slice-set branch question, the assignment question/);
});

test('branch and assignment questions are conditional on a continue answer', () => {
  const branch = round1.slice(round1.indexOf('2. **Branch question:**'), round1.indexOf('3. **Assignment question:**'));
  const assignment = round1.slice(round1.indexOf('3. **Assignment question:**'));
  assert.match(branch, /conditional question under `@sai\/policies\/question-rounds\.md`[\s\S]*`publish-continue` or `skip-continue`[\s\S]*under `publish-stop`[\s\S]*no branch is created and the base question is not asked/);
  assert.match(assignment, /condition is that the backlog answer is `publish-continue` or `skip-continue`; under `publish-stop`[\s\S]*not applicable[\s\S]*nothing is assigned/);
  assert.match(assignment, /intent form applies only when the backlog answer is `publish-continue`/);
  assert.match(baseQuestion, /Under `No`, `none`, and `publish-stop` it is left out/);
  assert.match(round2, /Runs only when the backlog answer is `publish-continue` or `publish-stop`/);
});

test('the publish-stop close owns the end of the invocation without round 3', () => {
  const close = selector.slice(selector.indexOf('\n## Publish and stop close'), selector.indexOf('\n## Slice branch chain'));
  assert.ok(close.length > 0);
  assert.match(close, /never stored in `explore-slice@1`/);
  assert.match(close, /`edit` answer to the approval keeps this decision/);
  assert.match(close, /publication-recovery\.md[\s\S]*unchanged/);
  assert.match(close, /`@sai\/policies\/worker-lifecycle\.md`[\s\S]*`@sai\/policies\/cache-warming\.md` § Retire at terminal output/);
  assert.match(close, /the parent and every child for a sliced set/);
  assert.match(close, /that no backlog item was published/);
  assert.match(close, /nothing published, or the published part with its links/);
  assert.match(close, /emits no `explore-slice@1` intent, runs no `sai-state close`, never presents round 3, and emits no route intent/);
  assert.match(close, /A later message in the same chat presents no route picker[\s\S]*new `\/sai-explore` invocation/);
  assert.match(actions, /The one path that ends without presenting the route picker is the `publish-stop` close/);
  assert.match(afterRound2, /Under `publish-stop`, the outcome of this step closes the invocation/);
});

test('a free-text backlog answer maps to one stable value by intent', () => {
  const free = actions.slice(actions.indexOf('**Free-text answers.**'), actions.indexOf('**Skill ownership and completion.**'));
  assert.match(free, /bare affirmative[^.]*maps to `publish-continue`/);
  assert.match(free, /only report or only publish maps to `publish-stop`/);
  assert.match(free, /plain decline maps to `skip-continue`/);
  assert.match(free, /ambiguous backlog answer is clarified and the question stays pending/);
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
  assert.match(creation, /\*\*Missing or cancelled base answer\.\*\* Create no branch/);
  assert.match(rounds, /Cancelling the whole round leaves every action of that round pending/);
});

test('stale context invalidates exactly the answers whose context changed', () => {
  assert.match(actions, /An edit or state change invalidates exactly the answers whose context changed/);
  assert.match(afterRound2, /An `edit` answer returns to preparation and asks a full confirmation of the edited proposal in an extra interaction\./);
  assert.doesNotMatch(afterRound2, /the base answer stays valid/);
  assert.match(afterRound2, /When the supplied answer no longer matches the proposal, or is missing, the skill asks with its standalone prompt/);
  assert.match(afterRound2, /An approval bound to a proposal whose publication was cancelled or failed lapses and asks again, for that authorization only/);
  assert.match(baseQuestion, /`More` re-presents the base question alone with the next page, in an extra interaction inside the same round[\s\S]*the round's other answers stand/);
});

test('recovery never repeats completed actions and execution follows dependency order', () => {
  assert.match(actions, /completed actions keep their results and are never repeated during recovery/);
  assert.match(actions, /does not repeat completed actions or re-ask answered rounds/);
  const order = ['1. **Publication.**', '2. **Branch name.**', '3. **Base preparation.**', '4. **Assignment.**'].map(label => afterRound2.indexOf(label));
  assert.ok(order[0] >= 0 && order[1] > order[0] && order[2] > order[1] && order[3] > order[2]);
  assert.match(afterRound2, /taking the created issue's identifier after publication/);
  assert.match(afterRound2, /use the existing linked issue's identifier, or none/);
  assert.match(afterRound2, /ask for it in an extra interaction after publication, so that any name question runs before round 3/);
  assert.match(afterRound2, /These steps run whether or not round 2 was presented/);
  assert.match(afterRound2, /Nothing is assigned here/);
  assert.match(actions, /conversation state only, scoped to the current crystallized set/);
});

test('round 3 carries the continuation question only for a multi-slice Direct Build', () => {
  assert.match(picker, /the route question is single-select and always present, and the Direct Build continuation question, the base question, and the publication question below join the same round only when their conditions are met, in this order: route, Direct Build continuation, base, publication/);
  assert.match(continuation, /when more than one pending slice remains and `direct_build_continuation_prompted` is `false`: ask once/);
  assert.match(continuation, /takes effect only when the same round's route answer is Direct Build/);
  assert.match(continuation, /When the route answer is Plan or Manual, or no valid route was answered, ignore the continuation answer: it authorizes nothing/);
  assert.match(continuation, /so a later Direct Build round asks again/);
  assert.match(continuation, /authorizes up to two local commits per automatically started slice[\s\S]{0,200}nothing is pushed/);
});

test('the overview question retired from round 3', () => {
  assert.doesNotMatch(selector, /Change overview question|overview_language|--overview-lang|explore\.overviewLanguage|gate 9/i);
  assert.doesNotMatch(actions, /overview/i);
});

test('round 3 carries the publication question once per set and records it in explore-slice@1', () => {
  const publication = selector.slice(selector.indexOf('\n## Publication question'), selector.indexOf('\n## Selection, panel, and route state'));
  const afterAnswer = selector.slice(selector.indexOf('\n## After a valid answer'), selector.indexOf('\n## Direct Build continuation'));

  assert.match(publication, /Round 3 carries its question as a conditional question beside the route question/);
  assert.match(publication, /asked once for the whole `last_crystallization_set`, in the first round 3 of the set, whatever route that slice takes, Manual included/);
  assert.match(publication, /Later round-3 groups of the same set never ask it again/);
  const order = ['1. An answer `explore-slice@1` already holds', '2. Fetch `@sai/policies/tool-resolution.md`', '3. With neither answering'].map(label => publication.indexOf(label));
  assert.ok(order[0] >= 0 && order[1] > order[0] && order[2] > order[1]);
  assert.match(publication, /get pr\.publishAfterRun --json --cwd <project-root>/);
  assert.match(publication, /A returned `yes` or `no` is the answer/);
  assert.match(publication, /`ask`, an absent key, an invalid value, and a tool that cannot run leave the question normal/);
  assert.match(publication, /node <sai-state-path> emit --note "record the publication answer" <id> explore-slice@1 --set intent=publication --set value=<yes\|no>/);
  assert.match(publication, /PUBLICATION_ALREADY_RECORDED/);
  assert.match(publication, /clears it together with the slice inventory/);
  assert.match(publication, /Spanish form, used verbatim:/);
  assert.match(publication, /“Should a pull request be published when each change's automatic run ends\?”/);
  assert.match(publication, /“¿Quieres que se publique una pull request al terminar la ejecución automática de cada cambio\?”/);
  for (const fixed of [
    '“Publish the PR/MR”',
    '“Push the branch and create or update its PR/MR”',
    '“Publicar la PR/MR”',
    '“Subir la rama y crear o actualizar su PR/MR”',
    '“Do not publish”',
    '“Push nothing and publish nothing”',
    '“No publicar nada”',
    '“No subir ni publicar nada”',
  ]) {
    assert.ok(publication.includes(fixed), fixed);
  }
  assert.match(publication, /A declined, cancelled, or non-committal answer to this question resolves `no`/);
  assert.match(publication, /`AskUserQuestion` on Claude Code, `question` on opencode/);
  assert.match(publication, /\*\*Manual\*\* ignores the answer/);
  assert.match(publication, /Standalone `\/sai-direct-build` takes no publication answer and publishes nothing/);
  assert.match(afterAnswer, /record the set's publication answer when round 3 resolved one that `explore-slice@1` does not hold yet/);
  assert.ok(afterAnswer.indexOf('publication answer') < afterAnswer.indexOf('emit `{intent: route-choice}`'));
});

test('the slice-set branch question and the per-slice chain use the generic supplied-base capability', () => {
  assert.match(round1, /`shared`, `per-slice`, `none`/);
  assert.match(selector, /the base is a supplied base through the skill's generic supplied-base capability, with no base question/);
  assert.match(selector, /a conditional extra interaction outside the rounds, to reuse the existing branch/);
});

test('both harnesses share one round presentation policy', () => {
  assert.match(rounds, /one `AskUserQuestion` call carrying every question of the round/);
  assert.match(rounds, /A round with more than four questions takes consecutive `AskUserQuestion` calls in the round's question order, which count as one round/);
  assert.match(rounds, /`question` call when the picker accepts several questions, and one call per question, consecutively and in the same order, otherwise/);
  assert.match(rounds, /Consecutive calls in the same order form one round/);
  assert.match(read('sai/commands/explore/steps/route-selector.md'), /Fetch `@sai\/policies\/question-rounds\.md`/, 'route-selector references the shared policy');
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'sai/commands/deep-review/findings-selection.md')), false, 'the deep-review findings round is retired');
  assert.match(actions, /Claude Code's `AskUserQuestion` with its automatic free-text Other entry, or opencode's `question` tool with custom\/free-text input enabled/);
});

test('round 3 sections follow the question order, with the base question immediately before the publication question', () => {
  const order = ['\n## Native route picker', '\n## Direct Build continuation', '\n## Branch base question', '\n## Publication question'].map(heading => selector.indexOf(heading));
  assert.ok(order[0] >= 0 && order.every((position, index) => index === 0 || position > order[index - 1]));
  assert.match(baseQuestion, /Round 3 carries it as a conditional question immediately before the publication question/);
  assert.match(baseQuestion, /It is included only while a branch is pending/);
  assert.match(baseQuestion, /It is asked only in the first round 3 of the set: a later `per-slice` slice takes the previous slice's branch as its base and a later `shared` slice runs on the shared branch/);
  assert.match(baseQuestion, /first page of the prepared bases[\s\S]*three bases plus `More`[\s\S]*free-text entry/);
  assert.match(baseQuestion, /`AskUserQuestion` on Claude Code, `question` on opencode/);
  assert.match(baseQuestion, /The answer takes effect only when the same round's route answer is valid/);
  assert.match(afterRound2, /\*\*Branch name\.\*\*[\s\S]*\*\*Base preparation\.\*\*[\s\S]*`git fetch --prune`[\s\S]*Nothing is created here/);
});

test('one creation point serves single, shared, and per-slice branches', () => {
  assert.match(creation, /One creation point serves the single, `shared`, and `per-slice` branches: right after exactly one valid route answer of round 3 and before `\{intent: route-choice\}` is emitted \(before the hand-off for Manual\)/);
  assert.match(creation, /supplied base bound to the base reference it prepared/);
  assert.match(creation, /never pushes or publishes/);
  assert.match(creation, /base-SHA recheck in `create` makes a base that moved since the preparation a failed creation/);
  assert.match(creation, /\*\*No valid route answer\.\*\* A cancelled, absent, or invalid route answer starts no route and creates no branch, whatever the base answer was/);
  assert.match(creation, /start the route on the current branch, and withhold publication[\s\S]*reads the publication answer as `no`/);
  assert.match(creation, /\*\*Failed creation\.\*\* The failure blocks the route start[\s\S]*`@sai\/policies\/obstacle-escalation\.md`[\s\S]*`retry`, `skip`, and `stop`/);
  assert.match(creation, /`retry` prepares the chosen base again and repeats the creation\. `skip` applies the missing-base rule above\. `stop` starts no route/);
  assert.match(creation, /\*\*Manual\.\*\* The hand-off names the created branch/);
  assert.doesNotMatch(afterRound2, /\*\*Branch creation\.\*\*/);
  const afterAnswer = selector.slice(selector.indexOf('\n## After a valid answer'), selector.indexOf('\n## Direct Build continuation'));
  assert.ok(afterAnswer.indexOf('create the pending branch at the creation point') >= 0);
  assert.ok(afterAnswer.indexOf('create the pending branch') < afterAnswer.indexOf('record the set\'s publication answer'));
  assert.ok(afterAnswer.indexOf('record the set\'s publication answer') < afterAnswer.indexOf('emit `{intent: route-choice}`'));
  assert.match(selector.slice(selector.indexOf('\n## Slice branch chain'), selector.indexOf('\n## Native route picker')), /The first slice's branch is the pending branch, created at the creation point/);
});

test('the publication question names the pending branch and its remote', () => {
  const publication = selector.slice(selector.indexOf('\n## Publication question'), selector.indexOf('\n## Selection, panel, and route state'));
  assert.match(publication, /With a pending branch \(`## Branch base question`\), name the pending branch by its exact name and its remote[\s\S]*the branch does not exist yet[\s\S]*authorizes the push of that branch only/);
  assert.match(publication, /With no pending branch, name the current branch \(`git symbolic-ref --quiet --short HEAD`\)/);
  assert.match(publication, /A detached HEAD with no pending branch has no branch to name/);
  assert.match(publication, /as `no` while `publication_withheld` is set/);
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

test('the issue intake asks the work question and the drift check in one round for a mature issue', () => {
  const intake = read('sai/commands/explore/steps/issue-intake.md');
  const body = read('sai/commands/explore/body.md');
  assert.match(intake, /Ask the work question and the drift check as one round of `@sai\/policies\/question-rounds\.md`, in that order; the round closes the turn/);
  assert.match(intake, /The drift check is a conditional question, included only when the seed leaves at least one section `agreed`/);
  assert.match(intake, /A message that already states the intent to work on the issue answers the work question with `work`; the round then carries the drift check alone/);
  assert.match(intake, /On `context`, the drift answer is not applicable: nothing is seeded and no document is composed/);
  assert.match(intake, /Ask it once the intake reading is complete/);
  assert.match(intake, /Read maturity from the reading's `ready_to_propose_form`, never from your own judgment/);
  assert.doesNotMatch(intake, /Read the `Maturity` section yourself/);
  assert.match(body, /`work`\/`context` question of `steps\/issue-intake\.md` with the drift check in one round of `sai\/policies\/question-rounds\.md`/);
  assert.match(body, /skips the skill's §3 full presentation and §4 project assessment/);
});

test('the mature fast path runs a deterministic precheck and composes the document with the tool', () => {
  const intake = read('sai/commands/explore/steps/issue-intake.md');
  const crystallization = read('sai/commands/explore/steps/crystallization-protocol.md');
  assert.match(intake, /ready_to_propose_form` is `true`/);
  assert.match(intake, /sai\/tools\/issue-precheck\.js/);
  assert.match(intake, /read `missing` and `unchecked`, never the exit code/);
  assert.match(intake, /when `unchecked` is above zero, add one line/);
  assert.match(intake, /Before the round, show each `missing` entry/);
  assert.match(intake, /The precheck informs and never decides/);
  assert.match(intake, /When `sections` fails, report it in one line, run no fast path/);
  assert.match(intake, /Present the issue as a summary: link, state, title, `Goal`, the counts of edge cases, implementation notes, and decisions, and every comment in full with its author/);
  assert.match(intake, /the drift check ended `declared-clean` or `validate` with no mismatch, the exploration continues at `Crystallize`/);
  assert.match(intake, /Any section left open, and any drift mismatch, means no document is composed here/);
  assert.match(intake, /a re-imported published change document \(the reading returns `change\.name`\) skips it/);
  assert.match(crystallization, /\*\*Tool-composed intake \(fast path\)\.\*\*/);
  assert.match(crystallization, /Skip the open-decision check below/);
  assert.match(crystallization, /`change-document\.js compose`|`compose --input-file/);
  assert.match(crystallization, /--declared-clean` follows a `declared-clean` drift answer/);
  assert.match(crystallization, /pass `--specs "none — <reason>"` \(the value alone, without the `Specs:` key\)/);
  assert.match(crystallization, /pass `--backlog-origin` only when it holds a value/);
  assert.match(crystallization, /On a `compose` call that exits non-zero/);
  assert.match(crystallization, /The Source language level of `crystallization-language-gates\.md` item 8 applies/);
  assert.match(crystallization, /fall back to the ordinary model composition below[\s\S]*do not stop the run/);
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
  for (const caller of ['sai/commands/explore/direct-build-coordinator.md']) {
    assert.match(read(caller), /Fetch `@sai\/policies\/backlog-implementation-start\.md`/, `${caller} keeps invoking it`);
  }
});

test('the backlog question is omitted only against a matching local published state', () => {
  const backlog = round1.slice(round1.indexOf('1. **Backlog question:**'), round1.indexOf('2. **Branch question:**'));
  assert.match(backlog, /\*\*Omitted when the context settles it\.\*\*/);
  assert.match(backlog, /record `skip-continue` without preparing or publishing anything/);
  assert.match(backlog, /a linked issue exists, the published state exists, the set's ordered change names equal the published ones/);
  assert.match(backlog, /the current hash equals the published hash or `change-document\.js compare --stored-file <published document_file> --document-file <current document file>` reports `amend_kind: metadata`/);
  assert.match(backlog, /A missing published state \(including a failed or cancelled last publication\), a different set membership or order, or `amend_kind: content` presents the question/);
  assert.match(backlog, /With no linked issue it is always presented/);
  assert.match(backlog, /The comparison never reads the remote issue/);
  assert.match(actions, /\*\*Published state\.\*\*/);
  assert.match(actions, /the ordered change names of the set, the publication correspondence, and per document the re-exported `document_file` and `hash` from step 4 of `backlog-origin-transport\.md`/);
  assert.match(afterRound2, /complete the origin transport above and keep the resulting published state \(above\)/);
});

test('the round-1 assignment question is omitted only for a verified sole-self-assignee set', () => {
  const assignment = round1.slice(round1.indexOf('3. **Assignment question:**'));
  assert.match(assignment, /\*\*Omitted when the context settles it\.\*\*/);
  assert.match(assignment, /every document of the set has an existing linked issue, `inspect-assignment` completes for each \(a parent fails it\), and its `actor` is the only assignee of each/);
  assert.match(assignment, /record the observed set as the set-level `keep` answer with nothing mutated/);
  assert.match(assignment, /any document has no linked issue, or any issue has another assignee, is a parent, or fails inspection, the question is presented and names every affected issue/);
  assert.match(assignment, /with no linked issue and a possible `publish-continue`, its intent form is presented as today/);
  assert.match(assignment, /The recorded answer is the `sole-self-assignee no-op keep` of `backlog-implementation-start\.md` § Advance approval/);
  assert.match(assignment, /no `assign` runs now or at implementation start/);
  assert.match(actions, /Resolve every document's own linked issue the same way/);
});

test('one notice names the decisions settled from context and an explicit request reopens them', () => {
  assert.match(actions, /\*\*Settled decisions notice\.\*\*/);
  assert.match(actions, /when the context settled the backlog or the assignment decision, print one line in the user's language naming every decision it settled/);
  assert.match(actions, /The line states each recorded no-op answer so a user can correct it/);
  assert.match(actions, /An explicit request to publish or to change the assignment, made before the route answer, discards that recorded answer and presents its question/);
});

test('a recorded no-op answer resolves its question for the completion gate and authorizes only its no-op', () => {
  assert.match(rounds, /A no-op answer recorded from the surrounding context resolves its question for the completion gate and authorizes only its no-op\. It is not an explicit answer and grants no other action/);
  assert.match(actions, /a no-op answer recorded from the surrounding context resolves its question and authorizes only its no-op/);
  assert.match(actions, /explicitly skipped, or recorded as a no-op from context/);
});

test('the implementation-start policy accepts the sole-self-assignee no-op keep as an advance approval', () => {
  const start = read('sai/policies/backlog-implementation-start.md');
  assert.match(start, /A \*\*sole-self-assignee no-op keep\*\* is a valid advance approval that needs no\s+explicit choice/);
  assert.match(start, /`inspect-assignment` returned the authenticated user \(`actor`\)\s+as the only assignee of a non-parent selected issue/);
  assert.match(start, /The caller stores the observed assignee set\s+and calls no `assign`/);
  assert.match(start, /A changed assignee set, a\s+parent issue, or a different authenticated user is not a no-op keep and asks\s+again through steps 2–3/);
  assert.match(start, /the sole-self-assignee no-op keep\s+below is the one form that needs no explicit choice/);
});

test('the published state outlives its crystallization so a later round 1 can compare against it', () => {
  assert.match(actions, /keep the published state in conversation for the current invocation/);
  assert.match(actions, /It outlives the crystallized set it describes, because the backlog omission is evaluated in the round 1 of a later crystallization: a new crystallization does not reset it, only the next completed set publication replaces it/);
  assert.match(actions, /reset them when a new crystallization replaces the set \(the published state above is the one exception\)/);
  assert.doesNotMatch(actions, /A new crystallization replaces it with its set/);
});

test('an artifact review whose dominant intent is also entering the loop appends no invitation', () => {
  const gate = read('sai/commands/explore/steps/artifact-review-language-gate.md');
  assert.match(gate, /When the same turn also fires the `review-loop` token, or its dominant intent is also entering item 9's loop, item 9's \*\*Mixed trigger\*\* rule governs instead/);
});

test('the crystallization language gate does not inherit the explicit-statement level', () => {
  const gates = read('sai/commands/explore/steps/crystallization-language-gates.md');
  assert.match(gates, /The artifact-review gate's \*\*Explicit language statement\*\* level is not part of that machinery: this gate keeps its own order/);
});

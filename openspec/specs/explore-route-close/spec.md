# explore-route-close Specification

## Purpose
TBD - created by archiving change group-post-crystallization-question-rounds. Update Purpose after archive.

## Requirements

### Requirement: Post-crystallization close uses three conditional question rounds

After the complete Ready to Propose block set is visible and a pending slice exists, `sai-explore` SHALL normally ask its post-crystallization questions in three conditional rounds, each presented under `sai/policies/question-rounds.md`. Round 1 SHALL ask, in this order, the backlog question, the conditional branch question, and the conditional assignment question, and SHALL ask only the questions whose context leaves them open. Round 2 SHALL ask only the publication approval. Round 3 SHALL ask the route question and, conditionally, the Direct Build continuation question, the change overview question, the branch base question, and the publication question, in that order; the change overview question SHALL join round 3 only when no explicit `--overview-lang`, direct user statement, value already resolved for the set, or `explore.overviewLanguage` setting resolves the overview language, the branch base question SHALL join round 3 only while a branch is pending, and the publication question SHALL join round 3 only in the first round 3 of the set when neither an answer recorded in `explore-slice@1` nor the `pr.publishAfterRun` setting resolves it. A round with no applicable question SHALL be skipped. A `publish-stop` backlog answer SHALL end the invocation after its publication, before round 3. The three rounds SHALL describe the normal flow, not a limit: clarification, corrections, a publication `edit`, `More` for bases, an ambiguous branch name, assignee conflicts, and failures MAY add interactions outside them. Every question SHALL stay explicit when `--fast-track` is passed, on Claude Code and opencode, because `/sai-explore` strips the token silently.

`Sai-explore` SHALL keep the published state in conversation after a completed set publication and its origin transport, scoped to the set: the ordered change names of the set, the publication correspondence, and per document the re-exported `document_file` and `hash` from step 4 of `sai/policies/backlog-origin-transport.md`. A new crystallization SHALL replace it with its set, and a compaction that loses it SHALL make the backlog question ask again rather than assume the comparison. Before round 1 resolves, when the context settled the backlog or the assignment decision, Explore SHALL print one line in the user's language naming every decision it settled and stating each recorded no-op answer; an explicit request to publish or to change the assignment, made before the route answer, SHALL discard that recorded answer and present its question.

#### Scenario: Single change with backlog and branch accepted

- **WHEN** a single crystallized change is displayed and the user answers `publish-continue` to the backlog question and Yes to the branch question in round 1
- **THEN** round 2 asks only the publication approval, and round 3 asks the route and the branch base before the publication question only after the round 2 actions finish

#### Scenario: No optional action accepted

- **WHEN** the user answers `skip-continue` to the backlog question and No to the branch question in round 1
- **THEN** Explore leaves out the publication approval and base questions, skips round 2, and presents round 3

#### Scenario: Round 3 carries the overview question when nothing resolves it

- **WHEN** round 3 is presented and no flag, statement, resolved set value, or setting resolves the overview language
- **THEN** round 3 asks the change overview question beside the route question as a conditional question

#### Scenario: Round 3 carries the publication question in the first round of the set

- **WHEN** the first round 3 of a set is presented and neither a recorded answer nor `pr.publishAfterRun` resolves the publication answer
- **THEN** round 3 asks the publication question beside the route question as a conditional question

#### Scenario: Publish and stop skips round 3

- **WHEN** the user answers `publish-stop` to the backlog question in round 1
- **THEN** round 2 asks only the publication approval, and Explore presents no round 3 question

#### Scenario: Settled decisions notice names the recorded no-op answers

- **WHEN** the context settled the backlog decision as skip or the assignment decision as keep before round 1 resolves
- **THEN** Explore prints one line in the user's language naming each settled decision and its recorded no-op answer

#### Scenario: Published state is kept until a new crystallization

- **WHEN** a set publication and its origin transport complete
- **THEN** Explore keeps the set's ordered change names, the publication correspondence, and each document's re-exported `document_file` and `hash`, a new crystallization replaces the state, and a compaction that loses it asks the backlog question again

### Requirement: Round answers authorize only their own actions

A round SHALL collect every answer before it executes any action. Each answer SHALL authorize only its own action, and only an explicit answer SHALL authorize; a missing, cancelled, or ambiguous answer SHALL leave its action pending, except that a missing or cancelled base answer beside a valid route answer SHALL give up the branch for the set. A no-op answer recorded from the surrounding context SHALL resolve its question for the completion gate and SHALL authorize only its no-op; it SHALL NOT be an explicit answer and SHALL grant no other action. Cancelling the whole round SHALL leave all its actions pending. An edit or state change SHALL invalidate exactly the answers whose context changed, and completed actions SHALL keep their results and SHALL NOT be repeated during recovery. A round 1 publish answer (`publish-continue` or `publish-stop`), a prior general grant, unattended mode, or `--fast-track` SHALL NOT count as publication approval, and Explore SHALL never choose a base automatically. The one exception SHALL be a prepared `to-backlog` proposal that reports `auto_approve: true`, which the `publication.autoApprove` project setting grants and which needs no publication answer.

#### Scenario: Publication is cancelled but the branch is created

- **WHEN** round 2 returns cancel for the publication and round 3 returns a valid route answer and a valid base
- **THEN** Explore skips only the publication and creates the branch as decided at the creation point

#### Scenario: The whole round is cancelled

- **WHEN** the user cancels round 3 as a whole
- **THEN** every action of that round stays pending, no route starts, and nothing is published or created

#### Scenario: A recorded no-op answer resolves only its question

- **WHEN** the context recorded `skip-continue` for the backlog question or `keep` for the assignment question
- **THEN** that answer resolves its question for the completion gate and authorizes only its no-op, and no publication, assignment, or other action starts from it

### Requirement: Round 2 prepares through the skills and executes in dependency order

Round 2 SHALL run only when the backlog answer is `publish-continue` or `publish-stop` and the prepared `to-backlog` proposal does not report `auto_approve: true`; otherwise it SHALL NOT be presented. It SHALL ask only the publication approval; the branch base SHALL be a round 3 question. Before round 2, Explore SHALL prepare without publishing or creating anything by invoking the installed `to-backlog` skill to prepare the full publication proposal without publishing. Explore SHALL show the complete proposal and its confirmation question before the picker, except that a `to-backlog` proposal reporting `auto_approve: true` SHALL be shown without its confirmation question and no round 2 SHALL be presented. Explore SHALL NOT read `publication.autoApprove` itself. After round 2, whether or not it was presented, Explore SHALL execute in this order: publication through a supplied answer bound to the prepared proposal, or, for a proposal reporting `auto_approve: true`, through `to-backlog` publishing it with its unchanged token unless the user asked in the conversation to review before publishing; branch name resolution, taking the created issue's identifier after publication, or the existing linked issue's identifier or none when publication was cancelled, failed, or did not run; and, when a branch is pending, base preparation through the installed `new-change-branch` skill, whose remote fetch updates remote-tracking references and is the only change this preparation makes. No branch SHALL be created in this sequence. Under `publish-stop`, the outcome of the publication step SHALL close the invocation, and the origin transport, the branch name resolution, and the base preparation SHALL NOT run. An `edit` publication answer SHALL return to preparation and ask a full confirmation of the edited proposal in an extra interaction. When the change does not determine the branch type or name unambiguously, Explore SHALL ask for it in an extra interaction after publication and before round 3. Nothing SHALL be assigned in this sequence.

#### Scenario: Created issue names the branch

- **WHEN** round 2 confirms creating an issue and a branch is pending
- **THEN** Explore publishes first, then names the branch with the created issue's identifier before round 3, and creates the branch at the creation point from the base round 3 selects

#### Scenario: Publication edit keeps the base answer

- **WHEN** the publication answer is `edit`
- **THEN** Explore returns to preparation and asks a full confirmation of the edited proposal in an extra interaction, and the base is still asked in round 3

#### Scenario: Branch base page stays within the picker cap

- **WHEN** the prepared suggested bases number more than four
- **THEN** the round 3 branch base question shows three bases plus `More` and the free-text entry, and with four or fewer it shows every base without `More`

#### Scenario: Auto-approved proposal drops the publication question

- **WHEN** the prepared `to-backlog` proposal reports `auto_approve: true` and a branch will be created
- **THEN** round 2 is not presented, the publication runs with the unchanged token, the branch name takes the created issue's identifier, and round 3 carries the base question

#### Scenario: Publish and stop asks no branch base

- **WHEN** the backlog answer is `publish-stop` and the round 1 branch answer was Yes
- **THEN** round 2 asks only the publication approval, no branch base question is asked, and no branch is created

### Requirement: Round 1 assignment question is conditional on a linked issue

The assignment question SHALL be a conditional question under `sai/policies/question-rounds.md` whose condition includes that the backlog answer is `publish-continue` or `skip-continue`; under `publish-stop` its answer SHALL be recorded as not applicable and nothing SHALL be assigned. When a linked issue exists (the originating issue, the selected `Backlog origin`, or an issue published earlier in this conversation), Explore SHALL resolve read-only, through the provider's `inspect-assignment` and `propose-assignment` capabilities, the concrete assignee, every current assignee, and every affected issue before round 1, resolving every document's own linked issue the same way, and SHALL ask the assignment question in round 1 naming them and stating that nothing is assigned until implementation starts. The options SHALL be, in this order, `assign`, `keep` and `replace` (the latter two only when the issue already has assignees), and `skip`. The question SHALL be asked once for the whole `last_crystallization_set`, and its answer SHALL be the set-level assignment answer, which applies to the issue of every slice in the set so that later slices start without asking it again. When no issue is linked and the backlog answer can be `publish-continue`, Explore SHALL ask the question in its intent form, and the intent form SHALL apply only when the backlog answer is `publish-continue`: it SHALL name no user, SHALL state that the authenticated user of the backlog provider will be assigned once the issue exists, and SHALL offer only `assign` and `skip`. When no issue is linked and the backlog answer is `skip-continue`, the assignment question SHALL be left out of round 1. When every document of the set has an existing linked issue, `inspect-assignment` completes for each (a parent fails it), and its `actor` is the only assignee of each, Explore SHALL leave the question out and SHALL record the observed set as the set-level `keep` answer with nothing mutated; that recorded answer SHALL be the sole-self-assignee no-op keep of `sai/policies/backlog-implementation-start.md`, it SHALL store the observed assignee set, and no `assign` SHALL run now or at implementation start. If any document has no linked issue, or any issue has another assignee, is a parent, or fails inspection, the question SHALL be presented and SHALL name every affected issue. A compaction that loses the recorded keep SHALL ask the question again, and a recorded `keep` SHALL never be turned into `skip`. When the condition ends up unmet, the answer SHALL be recorded as not applicable and SHALL authorize nothing. The answer SHALL be recorded in conversation state as the set-level assignment answer, scoped to the current set: an approved answer bound to the concrete user, the approved previous assignees, and the issue; an intent answer bound to the issue that will be created, with its user resolved at the first implementation start; `skip` bound to the set.

#### Scenario: Linked issue gets the assignment question

- **WHEN** the crystallized change has a linked backlog origin issue
- **THEN** round 1 includes the assignment question naming the authenticated user and the affected issue, and nothing is assigned before implementation starts

#### Scenario: One answer for the whole slice set

- **WHEN** a linked issue exists before round 1 for a set of more than one slice
- **THEN** round 1 asks the assignment question once and its answer applies to the issue of every slice in the set

#### Scenario: Issue that will be created

- **WHEN** no issue is linked before round 1 and the backlog answer is `publish-continue`
- **THEN** round 1 asks the assignment question in its intent form with only `assign` and `skip`, naming no user

#### Scenario: No linked issue

- **WHEN** no issue is linked before round 1
- **THEN** round 1 asks the assignment question in its intent form when the backlog answer can be `publish-continue`, and asks no assignment question when the backlog answer is `skip-continue`

#### Scenario: Publication cancelled after an intent answer

- **WHEN** an intent answer was recorded and the backlog publication is cancelled or fails
- **THEN** the intent answer lapses and implementation start asks the assignment question again

#### Scenario: New crystallization resets the answer

- **WHEN** a new crystallization replaces `last_crystallization_set`
- **THEN** the set-level assignment answer and the overview answer are reset

#### Scenario: Publish and stop makes the assignment answer not applicable

- **WHEN** the user answers `assign` to the assignment question and `publish-stop` to the backlog question
- **THEN** the assignment answer is recorded as not applicable and nothing is assigned

#### Scenario: A sole-self-assignee set records keep without a question

- **WHEN** every document of the set has an existing linked issue, `inspect-assignment` completes for each, and its `actor` is the only assignee of each
- **THEN** Explore leaves the assignment question out, records the observed set as the set-level `keep` answer, and mutates nothing

#### Scenario: Another assignee or a parent issue asks the assignment question

- **WHEN** any document has no linked issue, or any affected issue has another assignee, is a parent, or fails inspection
- **THEN** the assignment question is presented and names every affected issue

#### Scenario: A compaction that loses a recorded keep asks again

- **WHEN** a compaction removes the recorded sole-self-assignee keep from the conversation
- **THEN** the assignment question is asked again and the recorded keep is never assumed or turned into `skip`

### Requirement: Round state is conversation-scoped

Round answers, authorizations, completed action results, and the Direct Build continuation flag SHALL live only in conversation state, scoped to the current crystallized set, and SHALL reset when a new crystallization replaces the set. A picker retry, Manual re-presentation, or later slice SHALL NOT repeat completed actions or re-ask answered rounds.

#### Scenario: Picker retry after completed rounds

- **WHEN** the route picker is presented again for the same crystallized set after rounds 1 and 2 completed
- **THEN** Explore asks only the route round and repeats no completed action

### Requirement: Shared round presentation policy

`sai/policies/question-rounds.md` SHALL be the single source for presenting several independent closed questions as one round, and `sai/commands/explore/steps/route-selector.md` SHALL reference it without restating it. On Claude Code a round SHALL be one `AskUserQuestion` call carrying every question, and a round with more than four questions SHALL take consecutive `AskUserQuestion` calls in the round's question order, which count as one round, with the round's answers collected only after the last call. On opencode it SHALL be one `question` call when the picker accepts several questions, and otherwise one call per question, consecutively and in the same order, which together form one round. No question's presentation SHALL wait on another answer in the same round. A conditional question SHALL be included when its condition can still hold before the round, its answer SHALL take effect only when the condition holds, and otherwise the answer SHALL be recorded as not applicable and authorize nothing.

#### Scenario: opencode picker takes one question per call
- **WHEN** a round is presented on opencode whose `question` picker accepts only one question per call
- **THEN** the round's questions are asked one call each, consecutively and in the same order, and count as one round

#### Scenario: Claude Code round with more than four questions
- **WHEN** a round with more than four questions is presented on Claude Code
- **THEN** it takes consecutive `AskUserQuestion` calls in the round's question order, which count as one round

### Requirement: Publish and stop close ends the invocation after the publication

When the backlog answer is `publish-stop`, `sai-explore` SHALL close the invocation after `to-backlog` finishes, whichever way it ends: published; the publication approval cancelled; ended without complete success after the unchanged `to-backlog` publication recovery; or skipped through the `skip` answer of the retry-or-skip question that missing or denied skill access raises. The `publish-stop` answer SHALL live in conversation state only, scoped to the current crystallized set, and SHALL NOT be stored in `explore-slice@1`. An `edit` answer to the publication approval SHALL keep the `publish-stop` decision: the edited proposal SHALL get its full confirmation, and the close SHALL apply once it is published. At the close Explore SHALL dispose its live explorers as `sai/policies/worker-lifecycle.md` says, SHALL retire its main-session cache-warming chain as `sai/policies/cache-warming.md` § Retire at terminal output says, and SHALL then print, in the user's language, a terminal output that states the actual outcome: after a publication, the issue link `to-backlog` returned (the created or updated issue for a single change, or the parent and every child for a sliced set); after a cancelled approval or a skip after missing skill access, that no backlog item was published; after a recovery that ended without complete success, the result `to-backlog` reported (nothing published, or the published part with its links). The close SHALL emit no `explore-slice@1` intent, SHALL run no `sai-state close`, SHALL NOT present round 3, and SHALL emit no route intent. A later message in the same chat SHALL NOT present the route picker; implementing the change SHALL need a new `/sai-explore` invocation. This close SHALL be the one path that ends the post-crystallization flow without presenting the route picker. Claude Code and opencode SHALL follow the same close.

#### Scenario: Single change is published and the invocation stops

- **WHEN** the backlog answer is `publish-stop` and `to-backlog` publishes the issue of a single change
- **THEN** Explore prints the created or updated issue link as the terminal output, presents no round 3 question, and emits no route intent

#### Scenario: Sliced set is published and the invocation stops

- **WHEN** the backlog answer is `publish-stop` and `to-backlog` publishes a sliced set
- **THEN** the terminal output lists the parent issue link and the link of every child issue

#### Scenario: Approval is cancelled under publish and stop

- **WHEN** the backlog answer is `publish-stop` and the user cancels the publication approval
- **THEN** nothing is published and the terminal output states that no backlog item was published

#### Scenario: Publication recovery ends without complete success

- **WHEN** the backlog answer is `publish-stop` and the `to-backlog` publication recovery ends with only part of a sliced set published
- **THEN** the terminal output lists the published part with its links and does not state that nothing was published

#### Scenario: Skill access is skipped under publish and stop

- **WHEN** the backlog answer is `publish-stop`, `to-backlog` skill access is missing or denied, and the user answers `skip` to the retry-or-skip question
- **THEN** the terminal output states that no backlog item was published

#### Scenario: Edited proposal keeps the stop decision

- **WHEN** the backlog answer is `publish-stop` and the user answers `edit` to the publication approval
- **THEN** Explore asks a full confirmation of the edited proposal and closes the invocation once that proposal is published

#### Scenario: Later message presents no route picker

- **WHEN** the user sends another message in the same chat after the `publish-stop` close
- **THEN** Explore presents no route picker and emits no `explore-slice@1` intent

#### Scenario: Stop answer is not machine state

- **WHEN** the backlog answer is `publish-stop`
- **THEN** no `explore-slice@1` record holds the `publish-stop` answer and no `sai-state close` runs at the close

### Requirement: Round 3 asks the branch base before the publication question

While a branch is pending, round 3 SHALL carry the branch base question as a conditional question immediately before the publication question, in the order route, Direct Build continuation, change overview, base, publication, whatever route the round returns. A branch SHALL be pending when the round 1 branch answer was `Yes`, `shared`, or `per-slice`, its name is resolved, its bases are prepared, and the set has neither created nor given up its branch. Under `No`, `none`, and `publish-stop` the base question SHALL be left out. Before round 3 opens, Explore SHALL resolve the branch name after the backlog publication, so that it can take the created issue's identifier and any name question runs before round 3, and SHALL prepare the suggested bases through the installed `new-change-branch` skill's caller preparation, whose remote fetch is the only change of that preparation. Before the picker Explore SHALL name the branch that will be created and say that nothing is created until the route is answered. The base question SHALL show the first page of the prepared bases in the skill's order (with more than four bases, three bases plus `More`; with four or fewer, every base without `More`) and the free-text entry, and Explore SHALL never choose a base automatically. A `More` answer SHALL re-present the base question alone with the next page inside the same round, before the publication question, while the round's other answers stand. The base question SHALL be asked only in the first round 3 of the set: a later `per-slice` slice SHALL take the previous slice's branch as its base and a later `shared` slice SHALL run on the shared branch, with no base question. A round 3 re-presented after an invalid route answer SHALL ask it again.

#### Scenario: Base question sits immediately before the publication question

- **WHEN** round 3 is presented with a pending branch and every conditional question applies
- **THEN** the questions appear in the order route, Direct Build continuation, change overview, base, publication

#### Scenario: Skipped backlog still asks the base in round 3

- **WHEN** the backlog answer is `skip-continue` and the round 1 branch answer is Yes
- **THEN** round 2 is not presented, the branch name is resolved without an issue identifier before round 3, and round 3 carries the base question

#### Scenario: More pages the base inside the round

- **WHEN** the user answers `More` to the base question
- **THEN** Explore re-presents the base question alone with the next page of prepared bases before the publication question, inside the same round

#### Scenario: Later slices ask no base

- **WHEN** a later slice of a `per-slice` or `shared` set reaches round 3
- **THEN** round 3 carries no base question and the slice runs on the previous slice's branch or the shared branch

#### Scenario: No branch decision leaves the base out

- **WHEN** the round 1 branch answer is `No` or `none`
- **THEN** round 3 carries no base question and no branch is created

### Requirement: Pending branches are created at one creation point

The single, `shared`, and first `per-slice` branch SHALL be created at one creation point: right after exactly one valid route answer of round 3 and before `{intent: route-choice}` is emitted, and before the hand-off for Manual. Explore SHALL hand the installed `new-change-branch` skill the round 3 base answer as a supplied base bound to the prepared base reference, together with the resolved name; the skill SHALL create the branch locally, switch to it, and never push or publish, and its base-SHA recheck SHALL turn a base that moved since the preparation into a failed creation. A cancelled, absent, or invalid route answer SHALL start no route and create no branch, whatever the base answer was. A missing or cancelled base answer SHALL create no branch, set the set's branch strategy to `none`, start the route on the current branch, and withhold publication for the set in conversation state, so that every route reads the publication answer as `no` whether it was asked, stored, or set by `pr.publishAfterRun`; the closing report of each slice SHALL say that the branch was not created and why, and that nothing was published for that reason. A failed creation SHALL block the route start as an obstacle under `sai/policies/obstacle-escalation.md`, escalated with the options `retry`, `skip`, and `stop`: `retry` SHALL prepare the chosen base again and repeat the creation, `skip` SHALL apply the missing-base rule, and `stop` SHALL start no route, emit no route intent, and leave the branch pending. For the Manual route the hand-off SHALL name the created branch and its base. Claude Code and opencode SHALL follow the same creation point.

#### Scenario: Single branch is created after the route answer

- **WHEN** round 3 returns one valid route answer and a valid base for a pending single or `shared` branch
- **THEN** Explore creates and switches to the branch from that base before emitting `{intent: route-choice}`

#### Scenario: Cancelled base withholds publication

- **WHEN** round 3 returns a valid route answer, no base answer, and a `yes` publication answer
- **THEN** no branch is created, the route starts on the current branch, nothing is published, and the closing report states why

#### Scenario: Invalid route answer creates nothing

- **WHEN** round 3 returns a cancelled or missing route answer and a valid base
- **THEN** no route starts and no branch is created

#### Scenario: Failed creation offers retry, skip, and stop

- **WHEN** the branch creation fails at the creation point
- **THEN** the route does not start and Explore asks the user to retry, skip, or stop, where skip applies the missing-base rule and stop starts no route

#### Scenario: Manual hand-off names the created branch

- **WHEN** the route answer is Manual and the branch is created at the creation point
- **THEN** the hand-off names the created branch

# explore-route-close Specification

## Purpose
TBD - created by archiving change group-post-crystallization-question-rounds. Update Purpose after archive.

## Requirements

### Requirement: Post-crystallization close uses three conditional question rounds

After the complete Ready to Propose block set is visible and a pending slice exists, `sai-explore` SHALL normally ask its post-crystallization questions in three conditional rounds, each presented under `sai/policies/question-rounds.md`. Round 1 SHALL ask, in this order, the backlog question, the conditional branch question, and the conditional assignment question. Round 2 SHALL ask, in this order, the publication approval and the branch base. Round 3 SHALL ask the route question and, conditionally, the Direct Build continuation question, the change overview question, and the publication question; the change overview question SHALL join round 3 only when no explicit `--overview-lang`, direct user statement, value already resolved for the set, or `explore.overviewLanguage` setting resolves the overview language, and the publication question SHALL join round 3 only in the first round 3 of the set when neither an answer recorded in `explore-slice@1` nor the `pr.publishAfterRun` setting resolves it. A round with no applicable question SHALL be skipped. A `publish-stop` backlog answer SHALL end the invocation after its publication, before round 3. The three rounds SHALL describe the normal flow, not a limit: clarification, corrections, a publication `edit`, `More` for bases, an ambiguous branch name, assignee conflicts, and failures MAY add interactions outside them. Every question SHALL stay explicit when `--fast-track` is passed, on Claude Code and opencode, because `/sai-explore` strips the token silently.

#### Scenario: Single change with backlog and branch accepted

- **WHEN** a single crystallized change is displayed and the user answers `publish-continue` to the backlog question and Yes to the branch question in round 1
- **THEN** round 2 asks the publication approval before the branch base, and round 3 asks the route only after the round 2 actions finish

#### Scenario: No optional action accepted

- **WHEN** the user answers `skip-continue` to the backlog question and No to the branch question in round 1
- **THEN** Explore leaves out the publication and base questions, skips round 2, and presents round 3

#### Scenario: Round 3 carries the overview question when nothing resolves it

- **WHEN** round 3 is presented and no flag, statement, resolved set value, or setting resolves the overview language
- **THEN** round 3 asks the change overview question beside the route question as a conditional question

#### Scenario: Round 3 carries the publication question in the first round of the set

- **WHEN** the first round 3 of a set is presented and neither a recorded answer nor `pr.publishAfterRun` resolves the publication answer
- **THEN** round 3 asks the publication question beside the route question as a conditional question

#### Scenario: Publish and stop skips round 3

- **WHEN** the user answers `publish-stop` to the backlog question in round 1
- **THEN** round 2 asks only the publication approval, and Explore presents no round 3 question

### Requirement: Round answers authorize only their own actions

A round SHALL collect every answer before it executes any action. Each answer SHALL authorize only its own action, and only an explicit answer SHALL authorize; a missing, cancelled, or ambiguous answer SHALL leave its action pending. Cancelling the whole round SHALL leave all its actions pending. An edit or state change SHALL invalidate exactly the answers whose context changed, and completed actions SHALL keep their results and SHALL NOT be repeated during recovery. A round 1 publish answer (`publish-continue` or `publish-stop`), a prior general grant, unattended mode, or `--fast-track` SHALL NOT count as publication approval, and Explore SHALL never choose a base automatically. The one exception SHALL be a prepared `to-backlog` proposal that reports `auto_approve: true`, which the `publication.autoApprove` project setting grants and which needs no publication answer.

#### Scenario: Publication is cancelled but the branch is created

- **WHEN** round 2 returns cancel for the publication and a valid base for the branch
- **THEN** Explore skips only the publication and creates the branch as decided

#### Scenario: The whole round is cancelled

- **WHEN** the user cancels round 2 as a whole
- **THEN** every action of that round stays pending and nothing is published or created

### Requirement: Round 2 prepares through the skills and executes in dependency order

Round 2 SHALL run only when the backlog answer is `publish-continue` or `publish-stop`, or a branch will be created; under `publish-stop` no branch SHALL be prepared, so round 2 SHALL ask only the publication approval and never the branch base. Before round 2, Explore SHALL prepare read-only: for a publish answer it SHALL invoke the installed `to-backlog` skill to prepare the full publication proposal without publishing, and for a branch decision it SHALL invoke the installed `new-change-branch` skill to prepare the suggested bases. Explore SHALL show the complete proposal and its confirmation question before the picker, except that a `to-backlog` proposal reporting `auto_approve: true` SHALL be shown without its confirmation question: round 2 SHALL omit the publication approval question, SHALL keep the branch base question when a branch will be created, and SHALL hold no question when none is. Explore SHALL NOT read `publication.autoApprove` itself. The branch base question SHALL show the first page of suggested bases in the skill's order (with more than four bases, three bases plus `More`; with four or fewer, every base without `More`) and the free-text entry; `More` SHALL open one extra interaction for the base only while the round's other answers stand. After round 2, Explore SHALL execute in this order: publication through a supplied answer bound to the prepared proposal, or, for a proposal reporting `auto_approve: true`, through `to-backlog` publishing it with its unchanged token unless the user asked in the conversation to review before publishing; branch name resolution, taking the created issue's identifier after publication, or the existing linked issue's identifier or none when publication was cancelled or failed; branch creation through a supplied base bound to the prepared base reference, creating nothing when the base answer is cancelled or missing. Under `publish-stop`, the outcome of the publication step SHALL close the invocation, and the origin transport, the branch name resolution, and the branch creation SHALL NOT run. An `edit` publication answer SHALL return to preparation and ask a full confirmation of the edited proposal in an extra interaction while the base answer stays valid. When the change does not determine the branch type or name unambiguously, Explore SHALL ask for it in an extra interaction after publication. Nothing SHALL be assigned in this sequence.

#### Scenario: Created issue names the branch

- **WHEN** round 2 confirms creating an issue and selects a base
- **THEN** Explore publishes first, then names the branch with the created issue's identifier, then creates the branch from the selected base

#### Scenario: Publication edit keeps the base answer

- **WHEN** the publication answer is `edit`
- **THEN** Explore returns to preparation, asks a full confirmation of the edited proposal in an extra interaction, and keeps the round's base answer

#### Scenario: Branch base page stays within the picker cap

- **WHEN** the prepared suggested bases number more than four
- **THEN** the branch base question shows three bases plus `More` and the free-text entry, and with four or fewer it shows every base without `More`

#### Scenario: Auto-approved proposal drops the publication question

- **WHEN** the prepared `to-backlog` proposal reports `auto_approve: true` and a branch will be created
- **THEN** round 2 shows the complete proposal, asks only the branch base question, and the publication runs with the unchanged token before the branch is named

#### Scenario: Publish and stop asks no branch base

- **WHEN** the backlog answer is `publish-stop` and the round 1 branch answer was Yes
- **THEN** round 2 asks only the publication approval, no branch base question is asked, and no branch is created

### Requirement: Round 1 assignment question is conditional on a linked issue

The assignment question SHALL be a conditional question under `sai/policies/question-rounds.md` whose condition includes that the backlog answer is `publish-continue` or `skip-continue`; under `publish-stop` its answer SHALL be recorded as not applicable and nothing SHALL be assigned. When a linked issue exists (the originating issue, the selected `Backlog origin`, or an issue published earlier in this conversation), Explore SHALL resolve read-only, through the provider's `inspect-assignment` and `propose-assignment` capabilities, the concrete assignee, every current assignee, and every affected issue before round 1, and SHALL ask the assignment question in round 1 naming them and stating that nothing is assigned until implementation starts. The options SHALL be, in this order, `assign`, `keep` and `replace` (the latter two only when the issue already has assignees), and `skip`. The question SHALL be asked once for the whole `last_crystallization_set`, and its answer SHALL be the set-level assignment answer, which applies to the issue of every slice in the set so that later slices start without asking it again. When no issue is linked and the backlog answer can be `publish-continue`, Explore SHALL ask the question in its intent form, and the intent form SHALL apply only when the backlog answer is `publish-continue`: it SHALL name no user, SHALL state that the authenticated user of the backlog provider will be assigned once the issue exists, and SHALL offer only `assign` and `skip`. When no issue is linked and the backlog answer is `skip-continue`, the assignment question SHALL be left out of round 1. When the condition ends up unmet, the answer SHALL be recorded as not applicable and SHALL authorize nothing. The answer SHALL be recorded in conversation state as the set-level assignment answer, scoped to the current set: an approved answer bound to the concrete user, the approved previous assignees, and the issue; an intent answer bound to the issue that will be created, with its user resolved at the first implementation start; `skip` bound to the set. A new crystallization that replaces the set SHALL reset the set-level assignment answer together with the overview answer. An approval or an intent answer bound to a proposal whose publication was cancelled or failed SHALL lapse, and implementation start SHALL ask again for that authorization only. The answer SHALL be verified when each slice starts.

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

### Requirement: Round state is conversation-scoped

Round answers, authorizations, completed action results, and the Direct Build continuation flag SHALL live only in conversation state, scoped to the current crystallized set, and SHALL reset when a new crystallization replaces the set. A picker retry, Manual re-presentation, or later slice SHALL NOT repeat completed actions or re-ask answered rounds.

#### Scenario: Picker retry after completed rounds

- **WHEN** the route picker is presented again for the same crystallized set after rounds 1 and 2 completed
- **THEN** Explore asks only the route round and repeats no completed action

### Requirement: Shared round presentation policy

`sai/policies/question-rounds.md` SHALL be the single source for presenting several independent closed questions as one round, and `sai/commands/explore/steps/route-selector.md` SHALL reference it without restating it. On Claude Code a round SHALL be one `AskUserQuestion` call carrying every question. On opencode it SHALL be one `question` call when the picker accepts several questions, and otherwise one call per question, consecutively and in the same order, which together form one round. No question's presentation SHALL wait on another answer in the same round. A conditional question SHALL be included when its condition can still hold before the round, its answer SHALL take effect only when the condition holds, and otherwise the answer SHALL be recorded as not applicable and authorize nothing.

#### Scenario: opencode picker takes one question per call
- **WHEN** a round is presented on opencode whose `question` picker accepts only one question per call
- **THEN** the round's questions are asked one call each, consecutively and in the same order, and count as one round

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

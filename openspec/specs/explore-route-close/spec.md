# explore-route-close Specification

## Purpose
TBD - created by archiving change group-post-crystallization-question-rounds. Update Purpose after archive.

## Requirements

### Requirement: Post-crystallization close uses three conditional question rounds

After the complete Ready to Propose block set is visible and a pending slice exists, `sai-explore` SHALL normally ask its post-crystallization questions in three conditional rounds, each presented under `sai/policies/question-rounds.md`. Round 1 SHALL ask, in this order, the backlog question, the branch question, and the conditional assignment question. Round 2 SHALL ask, in this order, the publication approval and the branch base. Round 3 SHALL ask the route question and, conditionally, the Direct Build continuation question and the change overview question; the change overview question SHALL join round 3 only when no explicit `--overview-lang`, direct user statement, value already resolved for the set, `explore.overviewLanguage` setting, or active `--fast-track` resolves the overview language. A round with no applicable question SHALL be skipped. The three rounds SHALL describe the normal flow, not a limit: clarification, corrections, a publication `edit`, `More` for bases, an ambiguous branch name, assignee conflicts, and failures MAY add interactions outside them. Every question SHALL remain explicit under `--fast-track` on Claude Code and opencode.

#### Scenario: Single change with backlog and branch accepted

- **WHEN** a single crystallized change is displayed and the user answers Yes to the backlog and branch questions in round 1
- **THEN** round 2 asks the publication approval before the branch base, and round 3 asks the route only after the round 2 actions finish

#### Scenario: No optional action accepted

- **WHEN** the user answers No to the backlog question and No to the branch question in round 1
- **THEN** Explore leaves out the publication and base questions, skips round 2, and presents round 3

#### Scenario: Round 3 carries the overview question when nothing resolves it

- **WHEN** round 3 is presented and no flag, statement, resolved set value, setting, or fast-track resolves the overview language
- **THEN** round 3 asks the change overview question beside the route question as a conditional question

### Requirement: Round answers authorize only their own actions

A round SHALL collect every answer before it executes any action. Each answer SHALL authorize only its own action, and only an explicit answer SHALL authorize; a missing, cancelled, or ambiguous answer SHALL leave its action pending. Cancelling the whole round SHALL leave all its actions pending. An edit or state change SHALL invalidate exactly the answers whose context changed, and completed actions SHALL keep their results and SHALL NOT be repeated during recovery. A backlog Yes, a prior general grant, unattended mode, or `--fast-track` SHALL NOT count as publication approval, and Explore SHALL never choose a base automatically.

#### Scenario: Publication is cancelled but the branch is created

- **WHEN** round 2 returns cancel for the publication and a valid base for the branch
- **THEN** Explore skips only the publication and creates the branch as decided

#### Scenario: The whole round is cancelled

- **WHEN** the user cancels round 2 as a whole
- **THEN** every action of that round stays pending and nothing is published or created

### Requirement: Round 2 prepares through the skills and executes in dependency order

Before round 2, Explore SHALL prepare read-only: for a backlog Yes it SHALL invoke the installed `to-backlog` skill to prepare the full publication proposal without publishing, and for a branch decision it SHALL invoke the installed `new-change-branch` skill to prepare the suggested bases. Explore SHALL show the complete proposal and its confirmation question before the picker. The branch base question SHALL show the first page of suggested bases in the skill's order (with more than four bases, three bases plus `More`; with four or fewer, every base without `More`) and the free-text entry; `More` SHALL open one extra interaction for the base only while the round's other answers stand. After round 2, Explore SHALL execute in this order: publication through a supplied answer bound to the prepared proposal; branch name resolution, taking the created issue's identifier after publication, or the existing linked issue's identifier or none when publication was cancelled or failed; branch creation through a supplied base bound to the prepared base reference, creating nothing when the base answer is cancelled or missing. An `edit` publication answer SHALL return to preparation and ask a full confirmation of the edited proposal in an extra interaction while the base answer stays valid. When the change does not determine the branch type or name unambiguously, Explore SHALL ask for it in an extra interaction after publication. Nothing SHALL be assigned in this sequence.

#### Scenario: Created issue names the branch

- **WHEN** round 2 confirms creating an issue and selects a base
- **THEN** Explore publishes first, then names the branch with the created issue's identifier, then creates the branch from the selected base

#### Scenario: Publication edit keeps the base answer

- **WHEN** the publication answer is `edit`
- **THEN** Explore returns to preparation, asks a full confirmation of the edited proposal in an extra interaction, and keeps the round's base answer

#### Scenario: Branch base page stays within the picker cap

- **WHEN** the prepared suggested bases number more than four
- **THEN** the branch base question shows three bases plus `More` and the free-text entry, and with four or fewer it shows every base without `More`

### Requirement: Round 1 assignment question is conditional on a linked issue

When a linked issue exists (the originating issue, the selected `Backlog origin`, or an issue published earlier in this conversation), Explore SHALL resolve read-only, through the provider's `inspect-assignment` and `propose-assignment` capabilities, the concrete assignee, every current assignee, and every affected issue before round 1, and SHALL ask the assignment question in round 1 naming them and stating that nothing is assigned until implementation starts. The options SHALL be, in this order, `assign`, `keep` and `replace` (the latter two only when the issue already has assignees), and `skip`. The question SHALL be asked once for the whole `last_crystallization_set`, and its answer SHALL be the set-level assignment answer, which applies to the issue of every slice in the set so that later slices start without asking it again. When no issue is linked and the backlog answer is Yes, Explore SHALL ask the question in its intent form: it SHALL name no user, SHALL state that the authenticated user of the backlog provider will be assigned once the issue exists, and SHALL offer only `assign` and `skip`. When no issue is linked and the backlog answer is No, the assignment question SHALL be left out of round 1. When the condition ends up unmet, the answer SHALL be recorded as not applicable and SHALL authorize nothing. The answer SHALL be recorded in conversation state as the set-level assignment answer, scoped to the current set: an approved answer bound to the concrete user, the approved previous assignees, and the issue; an intent answer bound to the issue that will be created, with its user resolved at the first implementation start; `skip` bound to the set. A new crystallization that replaces the set SHALL reset the set-level assignment answer together with the overview answer. An approval or an intent answer bound to a proposal whose publication was cancelled or failed SHALL lapse, and implementation start SHALL ask again for that authorization only. The answer SHALL be verified when each slice starts.

#### Scenario: Linked issue gets the assignment question

- **WHEN** the crystallized change has a linked backlog origin issue
- **THEN** round 1 includes the assignment question naming the authenticated user and the affected issue, and nothing is assigned before implementation starts

#### Scenario: One answer for the whole slice set

- **WHEN** a linked issue exists before round 1 for a set of more than one slice
- **THEN** round 1 asks the assignment question once and its answer applies to the issue of every slice in the set

#### Scenario: Issue that will be created

- **WHEN** no issue is linked before round 1 and the backlog answer is Yes
- **THEN** round 1 asks the assignment question in its intent form with only `assign` and `skip`, naming no user

#### Scenario: No linked issue

- **WHEN** no issue is linked before round 1
- **THEN** round 1 asks the assignment question in its intent form when the backlog answer can be Yes, and asks no assignment question when the backlog answer is No

#### Scenario: Publication cancelled after an intent answer

- **WHEN** an intent answer was recorded and the backlog publication is cancelled or fails
- **THEN** the intent answer lapses and implementation start asks the assignment question again

#### Scenario: New crystallization resets the answer

- **WHEN** a new crystallization replaces `last_crystallization_set`
- **THEN** the set-level assignment answer and the overview answer are reset

### Requirement: Round state is conversation-scoped

Round answers, authorizations, completed action results, and the Direct Build continuation flag SHALL live only in conversation state, scoped to the current crystallized set, and SHALL reset when a new crystallization replaces the set. A picker retry, Manual re-presentation, or later slice SHALL NOT repeat completed actions or re-ask answered rounds.

#### Scenario: Picker retry after completed rounds

- **WHEN** the route picker is presented again for the same crystallized set after rounds 1 and 2 completed
- **THEN** Explore asks only the route round and repeats no completed action

### Requirement: Shared round presentation policy

`sai/policies/question-rounds.md` SHALL be the single source for presenting several independent closed questions as one round, and both `sai/commands/meta-review/findings-selection.md` and `sai/commands/explore/steps/route-selector.md` SHALL reference it without restating it. On Claude Code a round SHALL be one `AskUserQuestion` call carrying every question. On opencode it SHALL be one `question` call when the picker accepts several questions, and otherwise one call per question, consecutively and in the same order, which together form one round. No question's presentation SHALL wait on another answer in the same round. A conditional question SHALL be included when its condition can still hold before the round, its answer SHALL take effect only when the condition holds, and otherwise the answer SHALL be recorded as not applicable and authorize nothing.

#### Scenario: opencode picker takes one question per call

- **WHEN** a round is presented on opencode whose `question` picker accepts only one question per call
- **THEN** the round's questions are asked one call each, consecutively and in the same order, and count as one round

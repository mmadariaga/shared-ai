# explore-pre-route-actions Specification

## Purpose
Define the optional backlog and local branch preparation workflows offered after crystallized proposal display and before explicit implementation route selection.

## Requirements

### Requirement: Offer backlog then branch preparation before route selection

After every block in the recorded crystallized proposal set is visible and a pending slice exists, `sai-explore` SHALL ask the backlog question, the branch question, and the conditional assignment question together in round 1, then the applicable publication approval and branch base in round 2, and only then present the implementation route picker as round 3, each round presented under `sai/policies/question-rounds.md`. It SHALL ask in the user's language with concise context naming the crystallized work and each question's action. Claude Code SHALL use `AskUserQuestion` with its automatic free-text Other entry; opencode SHALL use `question` with custom/free-text input enabled. The backlog question SHALL offer Yes then No, with stable values `yes` and `no`. All questions SHALL remain explicit under `--fast-track`.

The branch question SHALL be chosen by the size of the recorded `explore-slice@1` inventory, not the pending remainder. When the inventory has one change, Explore SHALL ask whether to create and switch to a local change branch, offering Yes then No with stable values `yes` and `no`. When the inventory has more than one change (a slice set), Explore SHALL instead ask one three-choice question for the whole set, localized from “Would you like to create a new branch?” (Spanish example: “¿Quieres crear una nueva rama?”), offering in this order: one branch for the main issue (`shared`; Spanish “Sí, crea una única para la issue principal”), one branch per slice (`per-slice`; Spanish “Crear una rama por slice”), and no branch (`none`; Spanish “No crear nada”). Labels and descriptions SHALL be localized and the stable values SHALL NOT be. The question SHALL say that no branch is published.

The backlog question and its option descriptions SHALL retain the word `backlog` in every language. The Yes description SHALL identify creating or updating the backlog, and the No description SHALL identify skipping the backlog action. Yes and No labels SHALL remain localized with their existing stable values. The Spanish example SHALL be “¿Quieres crear o actualizar el backlog con esta propuesta?”

#### Scenario: Complete proposal precedes optional actions

- **WHEN** a successful crystallization close displays the complete recorded block set with a pending slice and no active route
- **THEN** Explore asks the backlog, branch, and applicable assignment questions in round 1, the applicable publication and base questions in round 2, and presents the route picker only after rounds 1 and 2 finish or are skipped

#### Scenario: Fast-track preserves both questions on both harnesses

- **WHEN** Claude Code or opencode runs Explore with `--fast-track` and reaches the optional actions
- **THEN** every round question, including the slice-set three-choice branch question, remains explicit with free-text support rather than receiving automatic answers

#### Scenario: Localized backlog question retains recognizable terminology

- **WHEN** Explore presents the optional backlog question in any user language on Claude Code or opencode
- **THEN** the question and option descriptions retain `backlog`, with localized Yes and No labels describing creating or updating and skipping the backlog action respectively, and stable values `yes` and `no`

#### Scenario: Spanish backlog wording

- **WHEN** Explore uses the documented Spanish example for the optional backlog question
- **THEN** it asks “¿Quieres crear o actualizar el backlog con esta propuesta?”

#### Scenario: Single change keeps the yes/no branch question

- **WHEN** the recorded inventory holds exactly one change
- **THEN** Explore asks the yes/no local branch question with stable values `yes` and `no`

#### Scenario: Slice set gets one three-choice branch question

- **WHEN** the recorded inventory holds more than one change
- **THEN** Explore asks one localized branch question for the whole set with options in the order `shared`, `per-slice`, `none`

### Requirement: Resolve optional action replies without selecting an implementation route

A Yes or clear free-text request to perform the current action SHALL record that action's Yes with the user's instructions. A No or clear free-text decline SHALL skip only the current action and leave out the round 2 question that depends on it (the publication question for the backlog, the base question for the branch). A clarification request or ambiguous intent SHALL leave the current action pending until intent is resolved, without executing it. Empty, absent, or cancelled question responses SHALL remain unresolved. Free text at an optional action SHALL NOT select an implementation route. A reply that materially revises the idea SHALL follow the existing material-change rule before action classification.

#### Scenario: Backlog action is declined

- **WHEN** the user answers No to the backlog question
- **THEN** Explore skips backlog capture only, leaves out the publication question, and selects no implementation route

#### Scenario: Branch action is declined

- **WHEN** the user answers No to the branch question
- **THEN** Explore skips branch preparation only and leaves out the base question

#### Scenario: Free text clearly requests the action

- **WHEN** free text clearly requests the currently offered backlog or branch action and supplies instructions
- **THEN** Explore records that action's Yes with those instructions and does not interpret that reply as an implementation route selection

#### Scenario: Free text needs clarification

- **WHEN** the user requests clarification or provides ambiguous intent for an optional action
- **THEN** Explore answers or clarifies and keeps that action pending until intent is resolved before execution

#### Scenario: Optional question receives no resolved answer

- **WHEN** the optional question response is empty, absent, or cancelled
- **THEN** Explore keeps the question pending without treating it as Yes, No, or a route choice

### Requirement: Existing skills own accepted optional workflows

On backlog acceptance, Explore SHALL invoke the installed `to-backlog` skill in the current conversation with the complete crystallized context and user instructions to prepare the publication proposal without publishing, present that proposal's confirmation in round 2, and hand the explicit answer back as a supplied answer bound to that proposal. On branch acceptance, it SHALL invoke the installed `new-change-branch` skill to prepare the suggested bases, present the base question in round 2, and hand the answer back as a supplied base together with the resolved name and exactly one issue identity: the current slice's returned identity for a single change or `per-slice`, or the originating principal issue's identity for `shared` when one exists. Each skill SHALL retain its scope, naming, validation, execution, errors, and cancellation handling. Explore SHALL NOT duplicate those rules or treat backlog acceptance as publication confirmation, a link as an origin decision, or branch acceptance as base selection. Explore SHALL wait for each skill's close, including a no-change, error, or cancellation close, before the next dependent action. Missing or denied skill access SHALL leave the action pending while Explore reports the blocker and asks whether to retry or skip; it SHALL NOT substitute its own mechanics.

#### Scenario: Backlog workflow is accepted

- **WHEN** the user accepts backlog capture in round 1
- **THEN** Explore has `to-backlog` prepare the proposal without publishing, asks its confirmation in round 2, and publishes only through a supplied answer bound to that proposal

#### Scenario: Branch workflow is accepted

- **WHEN** the user accepts branch preparation in round 1
- **THEN** Explore has `new-change-branch` prepare the suggested bases, asks the base in round 2, and creates the branch after publication through a supplied base

#### Scenario: Shared strategy names the branch from the principal issue

- **WHEN** the user chooses `shared` for a slice set whose originating principal issue is known
- **THEN** Explore invokes `new-change-branch` once with that issue's identity and every slice reuses the resulting branch

#### Scenario: Skill pauses for input

- **WHEN** an accepted skill asks for input outside a round before closing
- **THEN** Explore keeps the current action pending and resumes that workflow rather than opening another question

#### Scenario: Skill closes without performing its operation

- **WHEN** an accepted skill finishes with its own no-change, error, or cancellation close
- **THEN** Explore treats that invocation as finished and proceeds to the next dependent action or, after rounds 1 and 2 finish, the route picker

#### Scenario: Skill access is unavailable

- **WHEN** an accepted skill is missing or access to it is denied
- **THEN** Explore keeps the action pending, reports the blocker, and asks whether to retry or explicitly skip without implementing replacement mechanics

### Requirement: Track optional action completion per crystallized set

Explore SHALL maintain the current optional action and completion state in conversation state for `last_crystallization_set`. It SHALL run the sequence once for that set and reset completion when a new crystallization replaces it. A picker retry, Manual re-presentation, or later slice SHALL NOT repeat completed actions. An active slice SHALL retain its authoritative route pointer and defer new optional questions until it closes.

#### Scenario: Selector is presented again for the same set

- **WHEN** a picker retry, Manual re-presentation, or later slice returns to the selector after optional actions completed for the current set
- **THEN** Explore does not repeat those actions and still requires the appropriate fresh explicit route answer

#### Scenario: A new crystallization replaces the proposal set

- **WHEN** a new crystallization replaces `last_crystallization_set`
- **THEN** Explore resets optional action state for the new set and runs its sequence after the complete new block set is visible and no slice is active

#### Scenario: Re-crystallization occurs during an active slice

- **WHEN** new blocks are recorded while a slice remains active
- **THEN** Explore follows that slice's authoritative pointer and defers the new set's optional questions until the active slice closes

### Requirement: Optional actions grant no implementation authorization

Explore SHALL present the native implementation route picker only after the backlog, branch, and assignment answers have each been resolved (executed, deferred to implementation start, or explicitly skipped) and every authorized action of rounds 1 and 2 has finished. Optional action replies and accepted skills SHALL NOT authorize production code edits, route intents, route panel entries, or implementation dispatch, and only the assignment question's own answer SHALL authorize assignment. Existing implementation routes SHALL require their existing explicit native-picker selection.

#### Scenario: Optional workflow succeeds

- **WHEN** a backlog or branch workflow completes successfully
- **THEN** Explore continues the round sequence or presents the route picker without starting implementation or emitting a route intent

#### Scenario: Both optional actions finish

- **WHEN** the backlog, branch, and assignment answers are resolved and every authorized action of rounds 1 and 2 has finished
- **THEN** Explore presents the existing route picker and waits for an explicit valid route selection before starting its selected route

### Requirement: Slice-set branch strategies stay local and conversation-scoped

Explore SHALL keep the branch strategy (`single`, `shared`, `per-slice`, or `none`) and the slice-to-branch correspondence in conversation state only, reset both when a new crystallization replaces the set, and MUST NOT persist them, send them to a worker, or add them to `explore-slice@1`. `shared` SHALL create one branch before the route picker and every slice SHALL reuse it. `per-slice` SHALL create the first slice's branch, named after that slice, from the base selected in `new-change-branch` before the route picker. `none` SHALL keep the current branch and every existing branch unchanged. Every strategy SHALL only create and switch local branches, keep local changes, run the existing safety checks, never publish a branch remotely, and never rename an existing branch.

#### Scenario: None keeps every branch

- **WHEN** the user chooses `none` for a slice set
- **THEN** Explore creates no branch, keeps the current branch and every existing branch as they are, and proceeds to the route picker

#### Scenario: Strategy is not machine state

- **WHEN** a branch strategy is chosen for a slice set
- **THEN** the strategy and slice-to-branch correspondence appear in no worker payload and no `explore-slice@1` state

### Requirement: Chain per-slice branches across slice transitions

With the `per-slice` strategy, each later slice's branch SHALL be created from the branch of the slice that precedes it in `last_crystallization_set` order, which is treated as dependency order, so independent slices also inherit the previous branch's changes. The chain SHALL grow only when its previous slice is completed: Direct Build archive completed, or `next-slice` at `implement` in Plan or Manual. A slice that is pending, failed, cancelled, parked, or still at sai-1 or sai-2 SHALL hold the chain at its position. The next branch SHALL be created immediately before its slice starts: after a valid Plan, Direct Build, or Manual picker answer and before `intent: route-choice` is emitted (for Manual, before the handoff), and in Direct Build automatic continuation before `intent: auto-continue` is emitted and before any worker dispatch. Explore SHALL create it through the installed `new-change-branch` skill with the slice's change name, the first branch's type, the slice's own issue identity when one was returned, `base` set to the previous slice's branch, and `require_clean: true`. Choosing `per-slice` SHALL authorize every local creation and switch in the chain in advance, so automatic continuation asks nothing further.

#### Scenario: Later branch starts from the previous slice's branch

- **WHEN** the previous slice in a `per-slice` chain is completed and the next slice starts
- **THEN** Explore creates the next slice's branch from the previous slice's branch tip and switches to it before the slice starts

#### Scenario: Incomplete previous slice holds the chain

- **WHEN** the previous slice is pending, failed, cancelled, or still at sai-1 or sai-2
- **THEN** Explore creates no later branch

#### Scenario: Uncommitted changes stop chained creation

- **WHEN** chained creation stops because the working tree has uncommitted changes
- **THEN** Explore creates nothing, starts nothing, names the slice, asks the user to commit the previous slice's work, and in automatic continuation presents the native route picker for that slice instead

#### Scenario: Retry after the user commits

- **WHEN** the user reports that the previous slice's work is committed
- **THEN** Explore retries the chained creation before the slice starts

### Requirement: Resume or resolve an existing expected slice branch

The expected branch of a slice SHALL be the name that the `new-change-branch` `name` operation resolves for it, and `name` reporting that the branch already exists SHALL be the lookup in git. When the conversation's slice-to-branch record shows that it prepared that branch for the slice, Explore SHALL resume on it, switching to it locally when it is not active, creating nothing and keeping local changes. Otherwise Explore SHALL ask one native closed-choice question to either reuse the existing branch (switch to it and record it) or give a corrected name (run the skill again with it). Explore MUST NOT rename, overwrite, or delete the existing branch. After a branch is prepared or reused, Explore SHALL record it for that slice.

#### Scenario: Branch prepared by this conversation is resumed

- **WHEN** a slice's expected branch exists and the conversation recorded it for that slice
- **THEN** Explore switches to it when needed and creates nothing

#### Scenario: Branch created elsewhere needs a user decision

- **WHEN** a slice's expected branch exists but the conversation did not prepare it
- **THEN** Explore asks whether to reuse it or give a corrected name and preserves the existing branch in both cases

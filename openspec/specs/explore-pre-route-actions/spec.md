# explore-pre-route-actions Specification

## Purpose
Define the optional backlog and local branch preparation workflows offered after crystallized proposal display and before explicit implementation route selection.

## Requirements

### Requirement: Offer backlog then branch preparation before route selection

After every block in the recorded crystallized proposal set is visible and a pending slice exists, `sai-explore` SHALL ask whether to create or update a backlog item, then whether to create and switch to a local change branch, and only then present the implementation route picker. It SHALL ask one optional question at a time in the user's language with concise context naming the crystallized work. Claude Code SHALL use `AskUserQuestion` with its automatic free-text Other entry; opencode SHALL use `question` with custom/free-text input enabled. Both questions SHALL offer Yes then No, with stable values `yes` and `no`, and SHALL remain explicit under `--fast-track`.

#### Scenario: Complete proposal precedes optional actions

- **WHEN** a successful crystallization close displays the complete recorded block set with a pending slice and no active route
- **THEN** Explore asks the backlog question first, the branch question after the backlog action finishes or is skipped, and presents the route picker only after both actions finish or are explicitly skipped

#### Scenario: Fast-track preserves both questions on both harnesses

- **WHEN** Claude Code or opencode runs Explore with `--fast-track` and reaches the optional actions
- **THEN** both questions remain explicit with Yes, No, and free-text support rather than receiving automatic answers

### Requirement: Resolve optional action replies without selecting an implementation route

A Yes or clear free-text request to perform the current action SHALL invoke its existing skill with the user's instructions. A No or clear free-text decline SHALL skip only the current action. A clarification request or ambiguous intent SHALL leave the current action pending until intent is resolved, without executing it. Empty, absent, or cancelled question responses SHALL remain unresolved. Free text at an optional action SHALL NOT select an implementation route. A reply that materially revises the idea SHALL follow the existing material-change rule before action classification.

#### Scenario: Backlog action is declined

- **WHEN** the user answers No to the backlog question
- **THEN** Explore skips backlog capture only and asks the branch question without selecting an implementation route

#### Scenario: Branch action is declined

- **WHEN** the user answers No to the branch question after the backlog action finishes or is skipped
- **THEN** Explore skips branch preparation only and presents the existing native implementation route picker

#### Scenario: Free text clearly requests the action

- **WHEN** free text clearly requests the currently offered backlog or branch action and supplies instructions
- **THEN** Explore invokes the corresponding skill with those instructions and does not interpret that reply as an implementation route selection

#### Scenario: Free text needs clarification

- **WHEN** the user requests clarification or provides ambiguous intent for an optional action
- **THEN** Explore answers or clarifies and keeps that action pending until intent is resolved before execution

#### Scenario: Optional question receives no resolved answer

- **WHEN** the optional question response is empty, absent, or cancelled
- **THEN** Explore keeps the question pending without treating it as Yes, No, or a route choice

### Requirement: Existing skills own accepted optional workflows

On backlog acceptance, Explore SHALL load the installed `to-backlog` skill in the current conversation with the complete crystallized context and user instructions. On branch acceptance, it SHALL load the installed `new-change-branch` skill with that context, any returned backlog reference, and user instructions. Each skill SHALL retain ownership of scope, naming, destination selection, questions, confirmations, errors, and cancellation handling. Explore SHALL NOT duplicate those rules or treat backlog acceptance as publication confirmation, a link as an origin decision, or branch acceptance as base selection. Explore SHALL wait for the skill's close, including a no-change, error, or cancellation close, before advancing. Missing or denied skill access SHALL leave the action pending while Explore reports the blocker and asks whether to retry or skip; it SHALL NOT substitute its own mechanics.

#### Scenario: Backlog workflow is accepted

- **WHEN** the user accepts backlog capture
- **THEN** Explore invokes `to-backlog` in the current conversation with complete crystallized context and instructions, leaves creation-versus-update and publication confirmation to that skill, and waits for its close before asking about the branch

#### Scenario: Branch workflow is accepted

- **WHEN** the user accepts branch preparation
- **THEN** Explore invokes `new-change-branch` in the current conversation with crystallized context, any returned backlog reference, and instructions, leaving its internal decisions and confirmations to that skill

#### Scenario: Skill pauses for input

- **WHEN** an accepted skill asks for input before closing
- **THEN** Explore keeps the current action pending and resumes that workflow rather than opening the next optional question or implementation picker

#### Scenario: Skill closes without performing its operation

- **WHEN** an accepted skill finishes with its own no-change, error, or cancellation close
- **THEN** Explore treats that invocation as finished and proceeds to the next optional question or, after both actions finish, the route picker

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

Explore SHALL present the native implementation route picker only after both optional actions finish or are explicitly skipped. Optional action replies and accepted skills SHALL NOT authorize production code edits, route intents, route panel entries, or implementation dispatch. Existing implementation routes SHALL require their existing explicit native-picker selection.

#### Scenario: Optional workflow succeeds

- **WHEN** a backlog or branch workflow completes successfully
- **THEN** Explore continues the optional-action sequence or presents the route picker without starting implementation or emitting a route intent

#### Scenario: Both optional actions finish

- **WHEN** both optional actions have finished or been explicitly skipped
- **THEN** Explore presents the existing route picker and waits for an explicit valid route selection before starting its selected route

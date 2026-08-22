# explore-pipeline-selector Specification

## Purpose

Define the crystallization-close selector that explicitly authorizes supervised pipeline execution.
## Requirements
### Requirement: Emit the crystallization-close selector

`sai-explore` SHALL emit exactly one harness-native three-option selector after the shared close's one keep-window-open recommendation, as the final emission of the shared close and crystallization turn defined by `explore-crystallization-block`. The selector SHALL be emitted after every single-change, sliced-final, and inline-refusal crystallization handoff; the options SHALL appear in this fixed order — `Auto`, `Auto (fast implementation)`, `Manual` — each carrying its fixed one-line description (`Auto` — Unattended alternative to Manual mode. Same steps, same order.; `Auto (fast implementation)` — Takes shortcuts vs. the other options. Good choice for simple changes or when you're in a hurry.; `Manual` — Best visibility into what's happening; requires you to make some decisions.), and `Auto` SHALL remain the sole ordinary supervised pipeline entry while `Auto (fast implementation)` is the sole fast-lane entry. Question text and every option label, with each option's one-line description, SHALL render in the user's language while the literal `review-loop`, `/sai-1-spec`, and `/sai-2-design` strings stay verbatim English. A response to the selector is a separate turn; only the Manual/unmapped branch may emit its path-specific next-step handoff after that response, and that handoff is not part of the crystallization close.

#### Scenario: crystallization closes

- **WHEN** single, sliced, or inline-refusal crystallization emits its final handoff block
- **THEN** the shared close emits the existing keep-window recommendation naming `review-loop` exactly once
- **AND** it emits exactly one selector offering exactly three fixed-order options with their one-line descriptions — Auto delegation, Auto (fast implementation) fast-lane execution, Manual continuation
- **AND** the selector is the final emission of the turn

#### Scenario: sliced crystallization does not repeat the selector

- **WHEN** a sliced crystallization emits multiple handoff blocks
- **THEN** the selector is emitted only once after the final block
- **AND** no per-slice selector is presented

### Requirement: Authorize Auto dispatch

Selecting `Auto` SHALL authorize the existing supervised `sai-1` and `sai-2` lifecycle using `last_crystallization_set` while preserving worker-owned writes, review rounds, chaining, retries, and the existing terminal behavior. Successful Auto completion SHALL emit no next-step line and SHALL NOT dispatch a later implementation phase. When a selected Auto run returns `failed` or `cancelled`, explore SHALL emit exactly one localized user-facing guidance line naming the phase at which the run stopped: `/sai-1-spec` when the selected name was routed to the spec phase because it was absent from `specs_converged_changes`, or `/sai-2-design` when it was routed to a design-phase retry because it was present in `specs_converged_changes` and absent from `completed_changes`. The phase-specific line SHALL not dispatch a later implementation phase, change the retry state, or introduce another state key.

#### Scenario: Auto is selected

- **WHEN** the user selects Auto from the crystallization-close selector
- **THEN** the supervisor selects at most one eligible latest-turn change and dispatches the existing phase machinery without expanding write scope

#### Scenario: Auto reaches a successful terminal state

- **WHEN** the selected Auto run completes its applicable supervised `sai-1` and `sai-2` lifecycle successfully
- **THEN** explore reports the completed supervised run
- **AND** it emits no next-step line
- **AND** it does not dispatch a later implementation phase

#### Scenario: Auto fails or is cancelled

- **WHEN** the selected Auto run returns `failed` or `cancelled`
- **THEN** explore does not facilitate a later implementation phase
- **AND** it emits exactly one localized guidance line naming the applicable stopped phase
- **AND** the change remains retryable under the existing Auto state rules

### Requirement: Define Manual behavior

Selecting `Manual` SHALL dispatch nothing and SHALL NOT change supervision state. An unmapped free-text answer MUST be treated as `Manual`. The `Manual` branch SHALL refer to the one existing keep-window recommendation already emitted before the selector, naming `review-loop` exactly once; it SHALL not emit a second recommendation or selector for the same answer. After the selector response, the branch SHALL emit the path-specific existing next-step handoff exactly once. The literals `/sai-1-spec`, `/sai-2-design`, and `review-loop` SHALL remain verbatim English; surrounding handoff prose SHALL follow the selected crystallization language. `Manual` SHALL remain re-invocable without a cap when the user later asks to see or run the supervised pipeline selector; each such later Manual/unmapped response SHALL receive its own one-time path-specific handoff.

#### Scenario: Manual is selected

- **WHEN** the user selects `Manual`
- **THEN** no pipeline worker is dispatched
- **AND** no supervision state is changed
- **AND** the already-emitted keep-window recommendation remains the sole recommendation naming `review-loop` exactly once
- **AND** no second recommendation or selector is emitted for the same answer
- **AND** the applicable path-specific `/sai-1-spec` next-step handoff is emitted exactly once after the selector response

#### Scenario: free text maps to Manual

- **WHEN** the user's answer maps to neither selector option
- **THEN** it is treated as `Manual`
- **AND** no worker is dispatched
- **AND** the already-emitted keep-window recommendation remains the sole recommendation naming `review-loop` exactly once
- **AND** no second recommendation or selector is emitted for the same answer
- **AND** the applicable path-specific `/sai-1-spec` next-step handoff is emitted exactly once after the selector response

#### Scenario: Manual is requested again later

- **WHEN** the user later asks to see or run the supervised pipeline selector
- **THEN** `sai-explore` re-emits the selector through the existing rule
- **AND** there is no cap on such re-emissions

### Requirement: Preserve explicit gating

`--fast-track` SHALL NOT auto-select Auto or suppress the selector. Selector text SHALL follow language localization while `review-loop`, `/sai-1-spec`, and `/sai-2-design` MUST remain English literals.

#### Scenario: fast-track reaches selector presentation

- **WHEN** `--fast-track` is active or the crystallization turn is non-English
- **THEN** the selector is still explicitly asked with localized prose and unchanged command literals

### Requirement: Obsolete token forms dispatch nothing

No token or dominant-intent form SHALL dispatch supervision. When a user sends or discusses the retired `start-pipeline` token, explore SHALL perform no token-based dispatch; supervised execution remains reachable only through selector re-emission or manual continuation.

#### Scenario: obsolete token is sent
- **WHEN** a user sends or discusses `start-pipeline` after crystallization
- **THEN** explore performs no token-based dispatch and requires selector re-emission or manual continuation

### Requirement: Auto dispatch source is the last crystallization set

An `Auto` selection SHALL operate only on uncompleted change names in `last_crystallization_set` — the ordered, duplicate-free `**Change name**` values emitted by the most recent crystallization turn, in emission order. It SHALL use the existing `completed_changes` and `specs_converged_changes` values to determine whether the selected name starts at the spec phase or retries the design phase. It SHALL NOT discover active changes from the repository, infer a change from unrelated files, add a change that was not crystallized in the current chat, or introduce another state key. Each `Auto` selection SHALL select and dispatch at most one change.

#### Scenario: multiple uncompleted changes remain
- **WHEN** `last_crystallization_set` contains multiple uncompleted changes and the user selects `Auto`
- **THEN** explore presents a harness-native single-select picker containing those changes in emission order plus `Cancel`
- **AND** only the selected change is dispatched
- **AND** no untracked repository change is included

#### Scenario: one uncompleted change remains
- **WHEN** exactly one entry of `last_crystallization_set` is uncompleted and the user selects `Auto`
- **THEN** explore identifies that change and dispatches it without a redundant selection picker

#### Scenario: user cancels selection
- **WHEN** the user selects `Cancel` from the multi-change picker
- **THEN** explore dispatches no worker and leaves every state value unchanged

#### Scenario: failed Auto remains retryable from existing state

- **WHEN** an Auto attempt fails or is cancelled before its applicable terminal worker completes
- **THEN** the name remains absent from `completed_changes`
- **AND** a later Auto selection reuses `last_crystallization_set` and the existing `specs_converged_changes` membership to route the retry
- **AND** no new state key or repository discovery is used

### Requirement: Empty or completed selection set receives an explicit acknowledgement

When `Auto` is selected while `last_crystallization_set` is empty or contains no uncompleted change, explore SHALL perform no dispatch and SHALL explicitly report the applicable reason. Silence is not an acceptable response.

#### Scenario: Auto is selected in a chat that crystallized nothing
- **WHEN** the user selects `Auto` before any change name was crystallized in the current chat
- **THEN** explore acknowledges that there is no crystallized change and dispatches no worker

#### Scenario: every change of the last crystallization turn completed
- **WHEN** the user selects `Auto` after every change of the last crystallization turn completed supervised execution
- **THEN** explore acknowledges that every change is already completed and dispatches no duplicate worker

### Requirement: Active supervision rejects duplicate starts

An active supervised run SHALL begin when the user confirms a picker selection, or when explore identifies the sole uncompleted change immediately before dispatch. It SHALL remain active through spec-worker execution and continuation, the in-session review rounds, machine-feedback processing, the supervised gate application point (shared gate with `mode = supervised`, which auto-executes next-action without a user-facing picker), the phase transition, and — when the spec phase converges or ends by cap exhaustion — the chained design phase including its worker execution and continuation, its in-session review rounds, machine-feedback processing, the supervised design gate application point (same shared gate with `mode = supervised`), and post-gate overview generation. The interval SHALL end only when the chained design phase terminates, or, when a failed or cancelled spec worker stops the run before design, when that spec attempt completes, fails, or is cancelled. While that interval is active, another `Auto` selection SHALL receive an explicit already-running acknowledgement and SHALL NOT create a concurrent or queued duplicate run.

#### Scenario: Auto is selected during an active run
- **WHEN** the user selects `Auto` while supervision is already active
- **THEN** explore reports that the pipeline is already running
- **AND** it creates no additional dispatch or queue entry

#### Scenario: Auto is selected during the chained design phase
- **WHEN** the user selects `Auto` while the chained design phase of an active run is executing
- **THEN** explore reports that the pipeline is already running
- **AND** it creates no additional dispatch or queue entry

#### Scenario: interval ends after the design phase terminates
- **WHEN** the spec phase converged or ended by cap exhaustion and the chained design phase reaches its terminal outcome
- **THEN** the active-supervision interval ends
- **AND** a later `Auto` selection is eligible to begin a new run

#### Scenario: active interval includes supervised gate application, not a user-facing picker

- **WHEN** a supervised spec or design review round resolves the deferred-gate condition while a run is active
- **THEN** the active-supervision interval remains active across the supervised gate application point
- **AND** no user-facing artifact feedback picker is presented

### Requirement: Copilot acknowledges unavailable supervision

On GitHub Copilot, an `Auto` selection SHALL dispatch no spec worker or reviewer and SHALL reply that pipeline supervision is unavailable on this harness, so the shared instruction contains no harness-conditional selector emission. All other Copilot explore behavior SHALL remain unchanged.

#### Scenario: Copilot user selects Auto
- **WHEN** the user selects `Auto` in a GitHub Copilot explore session
- **THEN** explore replies that supervision is unavailable on this harness
- **AND** it performs no worker dispatch and no artifact write

### Requirement: Re-crystallization supersedes prior lifecycle state

A crystallization turn that re-emits an already-supervised change name SHALL, when replacing `last_crystallization_set`, remove every name in the new set from `completed_changes` and `specs_converged_changes`, so a later `Auto` selection dispatches the spec phase over the new block instead of acknowledging the change as completed or entering a design-phase retry over superseded specs.

#### Scenario: a completed change is re-crystallized
- **WHEN** a change name in `completed_changes` is re-emitted by a later crystallization turn and the user selects `Auto`
- **THEN** explore dispatches the spec worker over the newly emitted block
- **AND** it does not acknowledge the change as already completed

#### Scenario: a specs-converged change is re-crystallized
- **WHEN** a change name in `specs_converged_changes` but not `completed_changes` is re-emitted by a later crystallization turn and the user selects `Auto`
- **THEN** explore dispatches the spec phase over the new block rather than the design-phase retry branch

### Requirement: Authorize Auto (fast implementation) dispatch

Selecting **Auto (fast implementation)** SHALL be the explicit user act that authorizes item 1's delegated-write exception for the two fast-lane workers AND pre-authorizes exactly one local commit executed by the hands worker inside its closed order; it SHALL remain consent to selection and dispatch only, never consent to answer a later worker question. Neither this option nor any other selection loads or dispatches anything unless selected; Manual and every other command surface are unaffected by the third option.

#### Scenario: Consent scope of the fast-lane selection

- **WHEN** the user selects Auto (fast implementation) on the crystallization-close selector
- **THEN** delegated writes are consented for the two fast-lane workers and exactly one local commit is pre-authorized, with no other command surface affected


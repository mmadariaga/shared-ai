# explore-pipeline-selector Specification

## Purpose

Define the crystallization-close selector that explicitly authorizes supervised pipeline execution.

## Requirements

### Requirement: Emit the crystallization-close selector

`sai-explore` SHALL emit exactly one native two-option selector after every crystallization handoff and keep-window reminder. `Auto` MUST precede `Manual` and SHALL be the sole supervised pipeline entry.

#### Scenario: crystallization closes

- **WHEN** single, sliced, or inline-refusal crystallization emits its final handoff block
- **THEN** the turn ends with one localized selector offering Auto delegation or Manual continuation without a literal pipeline-token trigger

### Requirement: Authorize Auto dispatch

Selecting `Auto` SHALL authorize the existing supervised `sai-1` and `sai-2` lifecycle using `last_crystallization_set` while preserving worker-owned writes, review rounds, chaining, and retries.

#### Scenario: Auto is selected

- **WHEN** the user selects Auto from the crystallization-close selector
- **THEN** the supervisor selects at most one eligible latest-turn change and dispatches the existing phase machinery without expanding write scope

### Requirement: Define Manual behavior

Selecting `Manual` SHALL dispatch nothing or change supervision state. An unmapped free-text answer MUST be treated as Manual, and Manual SHALL remain re-invocable without a cap.

#### Scenario: Manual is selected

- **WHEN** the user selects Manual or provides an answer that maps to neither option
- **THEN** the turn closes with the keep-window reminder naming `review-loop` and no pipeline worker is dispatched

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

An `Auto` selection SHALL operate only on uncompleted change names in `last_crystallization_set` — the ordered, duplicate-free `**Change name**` values emitted by the most recent crystallization turn, in emission order. It SHALL NOT discover active changes from the repository, infer a change from unrelated files, or add a change that was not crystallized in the current chat; a duplicate emission of an already-listed name adds no entry. Each `Auto` selection SHALL select and dispatch at most one change.

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

### Requirement: Empty or completed selection set receives an explicit acknowledgement

When `Auto` is selected while `last_crystallization_set` is empty or contains no uncompleted change, explore SHALL perform no dispatch and SHALL explicitly report the applicable reason. Silence is not an acceptable response.

#### Scenario: Auto is selected in a chat that crystallized nothing
- **WHEN** the user selects `Auto` before any change name was crystallized in the current chat
- **THEN** explore acknowledges that there is no crystallized change and dispatches no worker

#### Scenario: every change of the last crystallization turn completed
- **WHEN** the user selects `Auto` after every change of the last crystallization turn completed supervised execution
- **THEN** explore acknowledges that every change is already completed and dispatches no duplicate worker

### Requirement: Active supervision rejects duplicate starts

An active supervised run SHALL begin when the user confirms a picker selection, or when explore identifies the sole uncompleted change immediately before dispatch. It SHALL remain active through spec-worker execution and continuation, the in-session review rounds, machine-feedback processing, the user-facing artifact feedback gate, the phase transition, and — when the spec phase converges or ends by cap exhaustion — the chained design phase including its worker execution and continuation, its in-session review rounds, machine-feedback processing, user-facing artifact feedback gate, and post-gate overview generation. The interval SHALL end only when the chained design phase terminates, or, when a failed or cancelled spec worker stops the run before design, when that spec attempt completes, fails, or is cancelled. While that interval is active, another `Auto` selection SHALL receive an explicit already-running acknowledgement and SHALL NOT create a concurrent or queued duplicate run.

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

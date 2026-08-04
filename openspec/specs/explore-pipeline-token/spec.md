# explore-pipeline-token Specification

## Purpose

Define explicit `start-pipeline` triggering, tracked-change selection, and supervision availability behavior.

## Requirements

### Requirement: Literal start-pipeline token is the sole supervision trigger

`sai-explore` SHALL recognize the literal `start-pipeline` using the same trigger machinery as `review-loop`: the token fires when it is bare (alone with optional trivial punctuation or greeting) or when starting the supervised pipeline is the turn's dominant intent. The recognized token is explicit consent to enter change selection. Explore SHALL NOT auto-start supervision, auto-offer a supervision picker after crystallization, or treat the closing recommendation itself as consent.

#### Scenario: token is sent
- **WHEN** the user sends the literal `start-pipeline` token after one or more changes were crystallized in the current explore chat
- **THEN** explore enters harness-appropriate selection of one uncompleted change from the tracked crystallized set

#### Scenario: crystallization completes without the token
- **WHEN** explore emits its crystallization output and the user has not sent `start-pipeline`
- **THEN** no spec worker is dispatched and no supervision picker is auto-offered

#### Scenario: token carries trivial conversational text
- **WHEN** the user sends `start-pipeline!`, `ok, start-pipeline`, or another form accepted by the existing `review-loop` trigger machinery
- **THEN** explore recognizes the token and enters change selection

#### Scenario: token is incidental rather than dominant intent
- **WHEN** a user message merely discusses `start-pipeline` and starting supervision is not the turn's dominant intent
- **THEN** the message does not trigger pipeline supervision

### Requirement: Pipeline source is the chat-scoped tracked crystallized set

The token SHALL operate only on uncompleted change names emitted into the existing chat-scoped tracked crystallized set, preserving first-emission order and ignoring duplicate emissions. It SHALL NOT discover active changes from the repository, infer a change from unrelated files, or add a change that was not crystallized in the current chat. Each token invocation SHALL select and supervise at most one tracked change.

#### Scenario: multiple changes were crystallized
- **WHEN** the tracked set contains multiple uncompleted changes and the user sends `start-pipeline`
- **THEN** explore presents a harness-native single-select picker containing those changes in first-emission order plus `Cancel`
- **AND** only the selected change is dispatched
- **AND** no untracked repository change is included

#### Scenario: one uncompleted change remains
- **WHEN** exactly one tracked change is uncompleted and the user sends `start-pipeline`
- **THEN** explore identifies that change and dispatches it without a redundant selection picker

#### Scenario: user cancels selection
- **WHEN** the user selects `Cancel` from the multi-change picker
- **THEN** explore dispatches no worker and leaves every change uncompleted

#### Scenario: tracked change was emitted twice
- **WHEN** the same change name appears more than once in crystallization output
- **THEN** `start-pipeline` supervises that change only once

### Requirement: Empty tracked set receives an explicit acknowledgement

When `start-pipeline` is sent while the tracked crystallized set is empty or contains no uncompleted change, explore SHALL perform no dispatch and SHALL explicitly report the applicable reason. Silence is not an acceptable response.

#### Scenario: token is sent in a fresh explore chat
- **WHEN** the user sends `start-pipeline` before any change name was crystallized in the current chat
- **THEN** explore acknowledges that there is no tracked crystallized change and dispatches no worker

#### Scenario: every tracked change completed
- **WHEN** the user sends `start-pipeline` after every tracked change completed supervised spec execution in this explore chat
- **THEN** explore acknowledges that there is no uncompleted tracked change and dispatches no duplicate worker

### Requirement: Active supervision rejects duplicate starts

An active `start-pipeline` run SHALL begin when the user confirms a picker selection, or when explore identifies the sole uncompleted change immediately before dispatch. It SHALL remain active through spec-worker execution and continuation, independent review, machine-feedback processing, the user-facing artifact feedback gate, the phase transition, and — when the spec phase converges — the chained design phase including its worker execution and continuation, independent review, machine-feedback processing, and user-facing artifact feedback gate. The interval SHALL end only when the chained design phase terminates, or, when a non-convergent spec ending stops the run before design, when that spec attempt completes, fails, or is cancelled. While that interval is active, another `start-pipeline` token SHALL receive an explicit already-running acknowledgement and SHALL NOT create a concurrent or queued duplicate run.

#### Scenario: token is sent during an active run
- **WHEN** the user sends `start-pipeline` while supervision is already active
- **THEN** explore reports that the pipeline is already running
- **AND** it creates no additional dispatch or queue entry

#### Scenario: token is sent during the chained design phase
- **WHEN** the user sends `start-pipeline` while the chained design phase of an active run is executing
- **THEN** explore reports that the pipeline is already running
- **AND** it creates no additional dispatch or queue entry

#### Scenario: interval ends after the design phase terminates
- **WHEN** the spec phase converged and the chained design phase reaches its terminal outcome
- **THEN** the active-supervision interval ends
- **AND** a later `start-pipeline` token is eligible to begin a new run

### Requirement: Copilot acknowledges unavailable supervision

On GitHub Copilot, `start-pipeline` SHALL dispatch no spec worker or reviewer and SHALL reply that pipeline supervision is unavailable on this harness. The token SHALL remain named and recognized so the shared instruction contains no harness-conditional token emission, and all other Copilot explore behavior SHALL remain unchanged.

#### Scenario: Copilot receives start-pipeline
- **WHEN** the user sends `start-pipeline` in a GitHub Copilot explore session
- **THEN** explore replies that supervision is unavailable on this harness
- **AND** it performs no worker dispatch and no artifact write

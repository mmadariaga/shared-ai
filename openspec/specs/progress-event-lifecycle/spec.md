# Progress Event Lifecycle Specification

## Purpose

Define the nonterminal progress event: its shape, its additive non-terminal role before the terminal lifecycle status, its continuation acknowledgement, and its design-worker scope.

## Requirements

### Requirement: progress-event-shape

A routed planning worker MAY return an additive non-terminal progress event with exactly:

    event: "progress"
    step_ids: string[]
    changed_files: string[]

It SHALL be structurally modelled on the design notice: it is not a lifecycle status, it carries `changed_files`, and no progress event contains a continuation identifier, binding dispatch metadata, or artifact contents. Every path in the event's `changed_files` feeds the coordinator's invocation-scoped changed-file union in first-seen order.

#### Scenario: worker reports a progress batch

- **WHEN** a worker completes one or more progress steps
- **THEN** it SHALL return a progress event listing every completed step id in the batch in declared plan order

#### Scenario: progress event carries changed files

- **WHEN** a progress event is returned after a write
- **THEN** its `changed_files` SHALL list every path written since the preceding result
- **AND** the coordinator SHALL add each path to the invocation-scoped changed-file union in first-seen order

### Requirement: progress-event-nonterminal-additive

The progress event SHALL be optional and non-terminal: a worker MAY emit zero or more progress events before a terminal result, and the terminal payload (`completed`, `needs_input`, `failed`, `cancelled`) remains the only way the run closes. The event SHALL be additive: it extends, and never replaces, the closed lifecycle payloads.

#### Scenario: progress precedes terminal

- **WHEN** a worker emits progress events during a run
- **THEN** the run SHALL still close with exactly one terminal lifecycle status

#### Scenario: worker emits no progress

- **WHEN** a worker never emits a progress event
- **THEN** the coordinator SHALL render the plan without marked steps during the run, complete normally, and apply terminal reconciliation at the terminal result

### Requirement: progress-event-continuation

The coordinator SHALL mark the reported steps and resume the same worker with the fixed protocol value `continue_after_progress`, mirroring `continue_after_notice`. The acknowledgement SHALL be protocol-only and SHALL NOT be recorded as user input, opaque interaction history, or pending feedback.

#### Scenario: progress is acknowledged

- **WHEN** the coordinator receives a progress event
- **THEN** it SHALL mark the reported step ids and continue the same worker with exactly `continue_after_progress`

#### Scenario: progress acknowledgement stays protocol-only

- **WHEN** the coordinator sends `continue_after_progress`
- **THEN** the acknowledgement SHALL be excluded from opaque input history, user-answer handling, and pending feedback

### Requirement: planning-worker-scope

In this change, the design, spec-proposal, and implementation-planning workers SHALL emit progress events, after prerequisite checks pass and change resolution completes. Audit workers (review, security, performance, accessibility) SHALL NOT emit progress events, and their payload validation SHALL remain unchanged.

#### Scenario: planning workers emit progress

- **WHEN** a design, spec-proposal, or implementation-planning worker passes prerequisites, resolves the change, and completes one or more plan steps
- **THEN** it SHALL emit a progress event with the completed step ids

#### Scenario: audit workers stay untouched

- **WHEN** a review, security, performance, or accessibility worker runs
- **THEN** it SHALL NOT emit a progress event and its payload validation SHALL be unchanged

# Progress Event Lifecycle Specification

## Purpose

Define the nonterminal progress event: its shape, its additive non-terminal role before the terminal lifecycle status, its continuation acknowledgement, and its design-worker scope.

## Requirements

### Requirement: progress-event-shape

A routed worker for a phase whose adapter declares a progress plan SHALL return an additive non-terminal progress event with exactly the following shape whenever one or more newly completed plan steps are available:

    event: "progress"
    step_ids: string[]
    changed_files: string[]

It SHALL be structurally modelled on the design notice: it is not a lifecycle status, it carries `changed_files`, and no progress event contains a continuation identifier, binding dispatch metadata, or artifact contents. Every path in the event's `changed_files` feeds the coordinator's invocation-scoped changed-file union in first-seen order.

#### Scenario: audit worker reports a progress batch

- **WHEN** a review, security, performance, or accessibility worker completes one or more progress steps
- **THEN** it SHALL return a progress event listing every newly completed step id in that batch in declared plan order
- **AND** the event SHALL contain no fields beyond the closed progress-event shape

#### Scenario: progress event carries changed files

- **WHEN** a progress event is returned after a planning or audit worker write
- **THEN** its `changed_files` SHALL list every path written since the preceding result
- **AND** the coordinator SHALL add each path to the invocation-scoped changed-file union in first-seen order

### Requirement: progress-event-nonterminal-additive

The progress event SHALL be optional only for a phase without a declared progress plan or for a planned worker that has no newly completed milestone to report. For a phase with a declared progress plan, a worker SHALL emit one progress event for each result that makes one or more new plan steps complete before the terminal result. The event SHALL remain non-terminal and additive: the terminal payload (`completed`, `needs_input`, `failed`, `cancelled`) remains the only way the run closes.

#### Scenario: progress precedes terminal

- **WHEN** a planned worker completes one or more new progress steps before its terminal result
- **THEN** it SHALL emit the corresponding progress event before returning the terminal result
- **AND** the run SHALL still close with exactly one terminal lifecycle status

#### Scenario: worker has no plan or no new step

- **WHEN** a worker has no declared progress plan, or a planned worker has no newly completed step since its preceding result
- **THEN** it MAY return no progress event
- **AND** the coordinator SHALL retain the worker's existing lifecycle behavior

### Requirement: progress-event-continuation

The coordinator SHALL mark the reported steps and resume the same worker with the fixed protocol value `continue_after_progress`, mirroring `continue_after_notice`. The acknowledgement SHALL be protocol-only and SHALL NOT be recorded as user input, opaque interaction history, or pending feedback.

#### Scenario: progress is acknowledged

- **WHEN** the coordinator receives a progress event
- **THEN** it SHALL mark the reported step ids and continue the same worker with exactly `continue_after_progress`

#### Scenario: progress acknowledgement stays protocol-only

- **WHEN** the coordinator sends `continue_after_progress`
- **THEN** the acknowledgement SHALL be excluded from opaque input history, user-answer handling, and pending feedback

### Requirement: planning-worker-scope

In this change, the design, spec-proposal, implementation-planning, review, security, performance, and accessibility workers SHALL emit progress events after prerequisite checks pass, their required change or scope resolution completes, and one or more newly completed declared plan steps are available. Progress events remain optional for a worker whose phase adapter declares no progress plan; that worker SHALL retain its existing payload validation and lifecycle behavior.

#### Scenario: planning workers emit progress

- **WHEN** a design, spec-proposal, or implementation-planning worker passes prerequisites, resolves the change, and completes one or more plan steps
- **THEN** it SHALL emit a progress event with the completed step ids

#### Scenario: audit workers emit progress

- **WHEN** a review, security, performance, or accessibility worker passes prerequisites, resolves its required change or scope, and completes one or more plan steps
- **THEN** it SHALL emit a progress event with the completed canonical step ids

#### Scenario: progress is not emitted before resolution

- **WHEN** a planning or audit worker has not passed prerequisites or completed its required resolution gate
- **THEN** it SHALL NOT emit a progress event
- **AND** its existing `needs_input`, `failed`, or `cancelled` behavior SHALL remain available

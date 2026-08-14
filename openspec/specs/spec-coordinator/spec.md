# Spec Coordinator Specification

## Purpose

Define the spec coordinator's progress-plan rendering and marking responsibilities: declaring the canonical spec progress plan at dispatch, marking steps only from worker progress events, and admitting progress events as the sole nonterminal extension.

## Requirements

### Requirement: Spec coordinator renders and marks the declared plan

The routed spec coordinator SHALL declare the canonical spec progress plan from `spec-progress-plan` at dispatch, render it as a live task list per the neutral policy `sai/policies/todo-structure.md` (first step `in_progress`, rest `pending`), mark steps only from worker progress-event `step_ids`, and reconcile the list at its reconciliation trigger. The trigger for `/sai-1-spec` is the artifact feedback gate's proceed selection (`Finish step`), at which the coordinator reconciles against the last terminal `completed` it received, per `coordinator-progress-ownership`; the pre-gate `completed` itself SHALL NOT trigger reconciliation. At the trigger, a successful outcome renders every unmarked step `completed` **except** the `review` step, which is left exactly as last rendered per `review-step-evidence-marking`; a `failed` or `cancelled` outcome leaves the list exactly as last rendered; and a `needs_input` result, which is never a trigger, also leaves the list exactly as last rendered. It SHALL hold the plan and marked set in invocation-scoped state, never derive, infer, or extend the plan, and SHALL NOT read artifacts or resolve phase data to determine progress.

#### Scenario: spec plan renders at dispatch

- **WHEN** the spec coordinator dispatches the spec-proposal worker
- **THEN** the full declared plan is rendered before the first worker result with the first step `in_progress` and the remaining steps `pending`

#### Scenario: steps are marked from events only

- **WHEN** the worker returns a progress event listing declared step ids
- **THEN** the coordinator marks exactly those steps completed and ignores undeclared ids without amending the plan

#### Scenario: reconciliation applies at the proceed selection

- **WHEN** the user selects `Finish step` at the artifact feedback gate with unmarked steps remaining
- **THEN** the coordinator renders every remaining step `completed` except an unmarked `review` step, which it leaves exactly as last rendered

#### Scenario: the pre-gate completed does not reconcile

- **WHEN** the worker returns `completed` and the coordinator presents the artifact feedback gate
- **THEN** the coordinator leaves the list exactly as last rendered and reconciles nothing

#### Scenario: an unmarked review step survives the close

- **WHEN** the run closes with `review` unmarked because no review pass reported `High=0`
- **THEN** the rendered list still shows `review` unmarked after reconciliation

### Requirement: Spec coordinator admits progress events as the sole nonterminal extension

The spec coordinator SHALL accept progress events as the only allowed nonterminal extension. `extension_handlers` SHALL remain empty, there is no design notice state, and validation SHALL cover the four closed lifecycle statuses plus the progress event shape `{event: "progress", step_ids: string[], changed_files: string[]}`. On a progress event the coordinator SHALL union the event's `changed_files` in first-seen order and continue the same worker with exactly `continue_after_progress`; the acknowledgement SHALL be protocol-only and SHALL NOT be recorded as user input, opaque input history, or pending feedback.

#### Scenario: progress is acknowledged without history

- **WHEN** the coordinator receives a progress event
- **THEN** it SHALL add every reported path to the invocation-scoped changed-file union in first-seen order and continue the same worker with exactly `continue_after_progress`
- **AND** the acknowledgement SHALL be excluded from opaque input history, user-answer handling, and pending feedback

#### Scenario: no design notice state

- **WHEN** the spec coordinator validates worker results
- **THEN** it SHALL NOT accept or process a design notice event and SHALL validate only the four closed statuses plus the progress event shape

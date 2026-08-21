# Spec Coordinator Specification

## Purpose

Define the spec coordinator's progress-plan rendering and marking responsibilities: declaring the canonical spec progress plan at dispatch, marking steps only from worker progress events, and admitting progress events as the sole nonterminal extension.

## Requirements

### Requirement: Spec coordinator diagnoses only non-clean closures

The routed spec coordinator SHALL declare the shared recovery policy and the spec worker's artifact ownership, but SHALL not restate shared diagnosis criteria. On the clean route it SHALL remain a thin lifecycle router and SHALL not read proposal/spec artifacts. On a post-resolution non-clean closure, it MAY read only `proposal.md`, `specs/**`, and permitted root `GLOSSARY.md` state to establish the cause, apply the coordinator-verification tiebreak, and select the shared route. It SHALL never write or repair those files; any in-scope correction SHALL be a same-worker re-dispatch carrying the coordinator diagnosis.

#### Scenario: Happy path never opens a file
- **WHEN** the spec worker returns progress, needs input, completed, or cancelled without a non-clean closure
- **THEN** the coordinator SHALL use the existing lifecycle, progress, and feedback behavior
- **AND** SHALL not read any change artifact

#### Scenario: Failed spec result is inspected
- **WHEN** the resolved spec worker returns `failed`
- **THEN** the coordinator SHALL inspect the declared spec artifact surface before selecting recovery or hand-back
- **AND** SHALL name the failure class, artifact, concrete point, and cause locus in the user-facing diagnosis when evidence permits

#### Scenario: Coordinator-disproved completion is inspected
- **WHEN** a `completed` spec result is independently disproven or carries a STOP
- **THEN** the coordinator SHALL treat it as non-clean and inspect the phase artifacts
- **AND** SHALL let coordinator evidence override the worker's completion claim

#### Scenario: Spec coordinator never repairs
- **WHEN** the diagnosed cause is inside the spec worker's authorized surface
- **THEN** the coordinator SHALL forward the ordered recovery diagnosis to the same worker
- **AND** SHALL not edit proposal, specs, glossary, `.openspec.yaml`, or any other artifact

#### Scenario: Prior-phase cause stops with zero attempts
- **WHEN** evidence shows that the spec failure depends on an external request or an artifact outside the spec worker's declared surface
- **THEN** the coordinator SHALL name that cause as out of scope or unresolved
- **AND** SHALL spend zero recovery slots

### Requirement: Spec coordination preserves gates and progress

The non-clean diagnosis route SHALL not change the canonical six-step progress plan, artifact-feedback gate, review behavior, changed-file union, or mandatory stop. Diagnosis announcements and hand-backs SHALL be conversation text only and SHALL not add progress steps or durable metadata.

#### Scenario: Recovery does not alter progress
- **WHEN** the same spec worker is continued after a diagnosis
- **THEN** the coordinator SHALL mark progress only from the existing worker progress events
- **AND** SHALL not mark a step from a recovery announcement or diagnosis record

#### Scenario: Existing feedback gate remains unchanged
- **WHEN** spec artifacts complete cleanly and the feedback gate is offered
- **THEN** the coordinator SHALL present the existing gate and prompt exactly as before
- **AND** the non-clean route SHALL not run

### Requirement: Spec coordinator renders and marks the declared plan

The routed spec coordinator SHALL declare the canonical spec progress plan from `spec-progress-plan` at dispatch, render it as a live task list per the neutral policy `sai/policies/todo-structure.md` (first step `in_progress`, rest `pending`), mark steps only from worker progress-event `step_ids`, and reconcile the list at its reconciliation trigger. The trigger for `/sai-1-spec` is the artifact feedback gate's proceed selection (`Finish step`), at which the coordinator reconciles against the last terminal `completed` it received, per `coordinator-progress-ownership`; the pre-gate `completed` itself SHALL NOT trigger reconciliation. At the trigger, a successful outcome renders every unmarked step `completed` **except** the `review` step, which is left exactly as last rendered per `review-step-evidence-marking`; a `failed` or `cancelled` outcome leaves the list exactly as last rendered; and a `needs_input` result, which is never a trigger, also leaves the list exactly as last rendered. It SHALL hold the plan and marked set in invocation-scoped state, never derive, infer, or extend the plan, and SHALL NOT read artifacts to determine progress. The coordinator's artifact-read permission is limited to the separate post-resolution non-clean diagnosis route defined by this change and SHALL not affect progress reconciliation.

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

The spec coordinator SHALL accept progress events as the only allowed nonterminal extension. `extension_handlers` SHALL remain empty, there is no design notice state, and validation SHALL cover the four closed lifecycle statuses plus the progress event shape `{event: "progress", emitted_on: string, step_ids: string[], changed_files: string[]}`. On a progress event the coordinator SHALL validate and forward `emitted_on` verbatim, union the event's `changed_files` in first-seen order, and continue the same worker with exactly `continue_after_progress`; the acknowledgement SHALL be protocol-only and SHALL NOT be recorded as user input, opaque input history, or pending feedback.

#### Scenario: progress is acknowledged without history

- **WHEN** the coordinator receives a progress event
- **THEN** it SHALL add every reported path to the invocation-scoped changed-file union in first-seen order and continue the same worker with exactly `continue_after_progress`
- **AND** the acknowledgement SHALL be excluded from opaque input history, user-answer handling, and pending feedback

#### Scenario: no design notice state

- **WHEN** the spec coordinator validates worker results
- **THEN** it SHALL NOT accept or process a design notice event and SHALL validate only the four closed statuses plus the progress event shape

# Coordinator Progress Ownership Specification

## Purpose

Define the coordinator's ownership of the invocation-scoped progress plan: plan state, marking rules, survival across continuation and replacement, changed-file union integration, deterministic rendering, and terminal reconciliation.

## Requirements

### Requirement: plan-held-invocation-scoped

The coordinator SHALL hold the authoritative progress plan in invocation-scoped state, initialized at invocation start from the phase adapter's declaration, and SHALL keep the marked set (the step ids reported by progress events) alongside it.

#### Scenario: plan initialized at dispatch

- **WHEN** a routed invocation begins with a declared plan
- **THEN** the coordinator SHALL initialize its invocation-scoped plan state from the adapter declaration before dispatch

#### Scenario: marks accumulate

- **WHEN** progress events report step ids over the run
- **THEN** the coordinator SHALL accumulate the marked set in first-reported order and SHALL never reset it

### Requirement: marks-only-from-events

The coordinator SHALL mark a progress step completed only when its id appears in a worker progress event's `step_ids`. It SHALL NOT mark steps from its own reasoning, from artifacts, or from terminal payloads.

#### Scenario: step marked on event

- **WHEN** a progress event lists a declared step id
- **THEN** the coordinator SHALL mark that step completed and render it as such

#### Scenario: unknown step id ignored

- **WHEN** a progress event lists a step id that is not in the declared plan
- **THEN** the coordinator SHALL ignore the id without failing and without amending the plan

### Requirement: plan-survives-reconstruction

The progress plan and its marked set SHALL survive same-worker continuation and replacement-worker reconstruction: the coordinator retains both in invocation-scoped state, and no reconstruction field carries plan content because the step ids are canonical in the phase contracts — a replacement worker enumerates the same ids from its own phase contract. The replacement worker SHALL NOT receive the plan or the marked set.

#### Scenario: continuation keeps plan state

- **WHEN** the same worker is continued after a progress event
- **THEN** the coordinator SHALL retain the plan and marked set unchanged

#### Scenario: replacement worker knows canonical ids

- **WHEN** a replacement worker is dispatched with the original envelope
- **THEN** the coordinator SHALL retain the plan and marked set, and the replacement SHALL report step ids from its own phase contract without receiving a plan reconstruction field

### Requirement: progress-changed-files-union

Every path in a progress event's `changed_files` SHALL be added to the coordinator's invocation-scoped changed-file union in first-seen order, exactly as terminal-payload and notice paths are. The union SHALL never be reset by a progress event, and the contract's non-reset enumeration (input, feedback, notice, continuation, recovery) SHALL include progress events.

#### Scenario: progress paths join the union

- **WHEN** a progress event reports paths written since the preceding result
- **THEN** the coordinator SHALL add each path to the invocation-scoped union in first-seen order

#### Scenario: union survives progress and terminal

- **WHEN** a path was reported only on a progress event and the run later returns `completed`
- **THEN** the path SHALL still appear in the terminal changed-file report and the union SHALL NOT have been reset

### Requirement: deterministic-render-state

The coordinator SHALL derive each rendered step's state from plan order and the marked set only: a step whose id is in the marked set SHALL render `completed`; the first step in plan order whose id is not in the marked set SHALL render `in_progress`; every remaining step SHALL render `pending`. When every step is marked, all SHALL render `completed`; when none is marked, the first step SHALL render `in_progress`. The derivation is a rendering action, not a completion mark, and it is independent of batch contiguity: plan order governs, never the order within a batch or the order of events. The derivation applies only when the plan meets the minimum-threshold rule of `sai/policies/todo-structure.md`: a below-threshold plan renders no list while progress events are still processed, marked, and acknowledged.

#### Scenario: non-contiguous batch keeps plan order

- **WHEN** a progress event completes later plan steps while an earlier step remains unmarked
- **THEN** the earlier step SHALL render `in_progress` and the completed later steps SHALL render `completed`

#### Scenario: all steps marked

- **WHEN** the marked set contains every declared step id
- **THEN** every rendered step SHALL carry `completed` and no step SHALL carry `in_progress`

### Requirement: first-render-at-dispatch

The coordinator SHALL render the full progress plan at dispatch, before the first worker result, applying the deterministic state derivation: with an empty marked set the first step renders `in_progress` and every other step renders `pending`. This applies only when the plan meets the minimum-threshold rule of `sai/policies/todo-structure.md`.

#### Scenario: list visible before first result

- **WHEN** a routed invocation begins with a declared plan of three or more steps
- **THEN** the task list SHALL be rendered before the first worker result, with the first step `in_progress` and the rest `pending`

### Requirement: terminal-reconciliation

At a run-closing result (`completed`, `failed`, `cancelled`) the coordinator SHALL reconcile the rendered list with the outcome: on `completed`, every unmarked step SHALL render `completed`, because the run closed successfully; on `failed` or `cancelled`, the list SHALL remain exactly as last rendered, with no further marks and no clearing. A `needs_input` result SHALL leave the list exactly as last rendered: it is a terminal lifecycle status but not a run-closing result — the run pauses for user input and resumes, so no reconciliation applies. Reconciliation is a rendering action at the run-closing result, not progress marking, and applies only when the plan meets the minimum-threshold rule of `sai/policies/todo-structure.md`.

#### Scenario: completed run shows all steps completed

- **WHEN** the worker returns `completed` with unmarked steps remaining
- **THEN** the coordinator SHALL render every step as `completed`

#### Scenario: failed run freezes the list

- **WHEN** the worker returns `failed` or `cancelled`
- **THEN** the coordinator SHALL leave the list exactly as last rendered, with no further marks and no clearing

#### Scenario: needs-input leaves the list unchanged

- **WHEN** the worker returns `needs_input` with the list rendered
- **THEN** the coordinator SHALL leave the list exactly as last rendered, with no further marks and no clearing, because the run pauses for user input and resumes

### Requirement: render-and-mark-only

The coordinator's progress behavior SHALL be limited to rendering the declared plan, deriving rendered states, marking reported steps, and reconciling the list at run-closing results. The coordinator SHALL NOT read artifacts or resolve phase data to determine progress.

#### Scenario: coordinator renders without artifact reads

- **WHEN** the coordinator renders or updates the task list
- **THEN** it SHALL use only the declared plan and the accumulated marked set, and SHALL NOT read OpenSpec artifacts or git state

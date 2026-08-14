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

Reconciliation SHALL be triggered by an observable **reconciliation trigger**, defined per phase, rather than by a terminal result the coordinator has already received and consumed:

- for `/sai-1-spec`, the trigger is the artifact feedback gate's proceed selection (`Finish step`), at which the coordinator reconciles against the last terminal `completed` it received;
- for `/sai-2-design`, the trigger is the overview-generation terminal that follows the gate's `Continue` (`design-phase-navigation`);
- for a phase whose contract follows its terminal result with no further worker work, the trigger is that terminal result itself.

A terminal `completed` that the coordinator answers by presenting the artifact feedback gate SHALL NOT itself trigger reconciliation, because the same worker may still be continued from that gate. A coordinator SHALL NOT reconcile before its phase's trigger.

At the trigger, the coordinator SHALL reconcile the rendered list with the outcome: for a successful outcome, every unmarked step SHALL render `completed` **except** an evidence-marked step, which SHALL be left exactly as last rendered; for a `failed` or `cancelled` outcome, the whole list SHALL remain exactly as last rendered, with no further marks and no clearing. A `needs_input` result SHALL leave the list exactly as last rendered: it is a terminal lifecycle status but never a reconciliation trigger — the run pauses for user input and resumes. Reconciliation is a rendering action, not progress marking, and applies only when the plan meets the minimum-threshold rule of `sai/policies/todo-structure.md`.

An **evidence-marked step** is a step so designated by `review-step-evidence-marking`, which today designates exactly the `review` step of the spec plan (`spec-progress-plan`) and of the design plan (`design-coordinator`). The carve-out SHALL be scoped by that designation and never by a bare step id, so a step merely named `review` in some other declared plan SHALL NOT inherit it. No other declared plan uses that id today — not `implement-progress-plan`, not the four audit plans, and not the apply step projection — so the designation currently covers exactly those two steps.

"Left exactly as last rendered" SHALL be the single freeze formulation for an evidence-marked step: the coordinator SHALL NOT re-derive that step's state at the trigger, and its rendered state SHALL remain whatever the last render produced.

The carve-out exists because an evidence-marked step asserts evidence: rendering `review` `completed` without a review pass reporting `High=0` would assert evidence that does not exist. The carve-out SHALL apply only to reconciliation; it SHALL NOT change the state vocabulary, the deterministic state derivation, the minimum-threshold rule, or the emission-ownership invariant.

#### Scenario: a pre-gate completed does not reconcile

- **WHEN** a worker returns `completed` and the coordinator answers it by presenting the artifact feedback gate
- **THEN** the coordinator SHALL leave the list exactly as last rendered and SHALL NOT reconcile any unmarked step
- **AND** it SHALL reconcile only when its phase's reconciliation trigger fires

#### Scenario: sai-1 reconciles at the gate's proceed selection

- **WHEN** the user selects `Finish step` at `/sai-1-spec`'s artifact feedback gate
- **THEN** that selection SHALL be the reconciliation trigger
- **AND** the coordinator SHALL reconcile against the last terminal `completed` it received

#### Scenario: sai-2 reconciles at the generation terminal

- **WHEN** `/sai-2-design`'s post-gate overview-generation continuation returns its terminal result
- **THEN** that terminal SHALL be the reconciliation trigger

#### Scenario: the design overview step is never reconciled before generation runs

- **WHEN** `/sai-2-design`'s worker returns its pre-gate `completed` with `overview` still unmarked
- **THEN** `overview` SHALL remain unmarked and SHALL NOT render `completed`
- **AND** it SHALL become `completed` only from the worker's own progress event after a successful `change-overview.md` materialization, or from reconciliation at the post-gate generation terminal

#### Scenario: successful close shows all steps completed except an unmarked evidence-marked step

- **WHEN** the reconciliation trigger fires on a successful outcome with unmarked steps remaining
- **THEN** the coordinator SHALL render every unmarked step `completed` except the evidence-marked `review` step
- **AND** the unmarked `review` step SHALL remain exactly as last rendered

#### Scenario: an already-marked review step is unaffected

- **WHEN** the trigger fires and `review` was already marked by a progress event
- **THEN** `review` SHALL continue to render `completed` and the carve-out SHALL have no effect

#### Scenario: two unmarked steps at close

- **WHEN** the trigger fires on a successful outcome with both `validation` and `review` unmarked, and the list was last rendered with `validation` `in_progress` and `review` `pending`
- **THEN** `validation` SHALL render `completed`, because it is not evidence-marked
- **AND** `review` SHALL remain exactly as last rendered — `pending` — because the freeze formulation governs and no state is re-derived for it

#### Scenario: a review step in another plan does not inherit the carve-out

- **WHEN** a declared plan other than the spec or design plan contains a step whose id is `review`
- **THEN** that step SHALL NOT be treated as evidence-marked and SHALL be reconciled to `completed` like any other step

#### Scenario: failed run freezes the list

- **WHEN** the outcome at the trigger is `failed` or `cancelled`
- **THEN** the coordinator SHALL leave the list exactly as last rendered, with no further marks and no clearing

#### Scenario: needs-input leaves the list unchanged

- **WHEN** the worker returns `needs_input` with the list rendered
- **THEN** the coordinator SHALL leave the list exactly as last rendered, with no further marks and no clearing, because the run pauses for user input and resumes

### Requirement: render-and-mark-only

The coordinator's progress behavior SHALL be limited to rendering the declared plan, deriving rendered states, marking reported steps, and reconciling the list at run-closing results. The coordinator SHALL NOT read artifacts or resolve phase data to determine progress.

#### Scenario: coordinator renders without artifact reads

- **WHEN** the coordinator renders or updates the task list
- **THEN** it SHALL use only the declared plan and the accumulated marked set, and SHALL NOT read OpenSpec artifacts or git state

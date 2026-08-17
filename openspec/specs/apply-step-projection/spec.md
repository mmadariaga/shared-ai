# apply-step-projection Specification

## Purpose

TBD — placeholder purpose for the apply step projection capability.

## Requirements

### Requirement: projection-from-step-headings

`/sai-4-apply` SHALL render a task list at run start, projected from the `#### Step N:` headings of `openspec/changes/{change-name}/implementation.md`, in plan order: each heading yields exactly one list entry whose stable id is the heading's step integer and whose label is the heading text. Rendering SHALL NOT add, remove, rename, reorder, or re-label entries.

#### Scenario: three-step plan renders three entries

- **WHEN** `/sai-4-apply` starts on a change whose `implementation.md` has three `#### Step N:` headings
- **THEN** the coordinator renders a task list with exactly three entries, one per heading, in plan order

#### Scenario: appended audit steps render as entries

- **WHEN** `/sai-4-apply` starts on a change whose `implementation.md` includes steps appended for audit artifacts (e.g. `#### Step 7: Address review findings`)
- **THEN** the appended steps render as entries like any other step heading, in plan order

### Requirement: mark-on-verified-completion

A projected entry SHALL be marked `completed` in the same batched update where the coordinator marks that Step's checkboxes `[x]` in `implementation.md` — after the Step's Verification Checklist passes and, when applicable, the human verification gate confirms. The two representations of the same progress SHALL stay in step within a run.

#### Scenario: verified step marks entry and checkboxes together

- **WHEN** the coordinator marks all of a Step's checkboxes `[x]` in `implementation.md` after verification passes
- **THEN** the corresponding projected entry is marked `completed` in the same update, so the harness list and the on-disk checkboxes never disagree

#### Scenario: unverified step stays unmarked

- **WHEN** a Step's verification has not passed (or a human gate for it is still open)
- **THEN** the projected entry for that Step is not marked `completed`

### Requirement: mirror-not-replace

The harness list SHALL mirror the on-disk checkboxes rather than replace them: `implementation.md` remains the durable progress record that `sai-archive` and `sai-status` read. The initial render state SHALL derive from the on-disk checkbox state at run start — a Step whose checkboxes are fully marked `[x]` renders `completed`, the first not-fully-marked Step in plan order renders `in_progress`, and the remaining Steps render `pending` — per the deterministic state derivation of `sai/policies/todo-structure.md`.

#### Scenario: re-run renders already-completed steps as completed

- **WHEN** `/sai-4-apply` starts on a change whose `implementation.md` already has some Steps fully marked `[x]` (e.g. a re-run)
- **THEN** those Steps render `completed`, the first not-fully-marked Step renders `in_progress`, and the rest render `pending`

#### Scenario: archive still reads implementation.md

- **WHEN** a run renders the projected list
- **THEN** `sai-archive`'s completion check and `sai-status`'s checked-vs-total panel still read `openspec/changes/{change-name}/implementation.md` as their source of truth, unchanged

### Requirement: below-threshold-no-list

The projection SHALL apply the minimum-threshold rule of `sai/policies/todo-structure.md`: an implementation plan with fewer than the minimum number of `#### Step N:` headings SHALL NOT be rendered as a task list on either harness, while the apply run proceeds normally. The threshold constant is single-sourced in the policy and SHALL NOT be restated or redefined by this projection.

#### Scenario: two-step plan renders nothing

- **WHEN** `/sai-4-apply` starts on a change whose `implementation.md` has fewer than the minimum number of step headings
- **THEN** neither harness renders a task list and the apply run proceeds normally

#### Scenario: three-step plan renders

- **WHEN** `/sai-4-apply` starts on a change whose `implementation.md` has at least the minimum number of step headings
- **THEN** both harnesses render the task list per the neutral policy

### Requirement: no-progress-protocol

The projection SHALL NOT introduce progress events, a `progress_plan` declaration, or any change to the worker lifecycle or coordinator contract. `/sai-4-apply` now has a coordinator-worker boundary — the RED and GREEN workers emit lifecycle progress events per the shared worker lifecycle — but the run-start step list is NOT the apply progress plan declared in `apply-routed-card-set`: it is derived by the coordinator directly from the artifact and is never marked from worker progress events. The task-list tool call SHALL originate from the coordinator session only, never from a RED or GREEN Step-execution worker.

#### Scenario: apply run emits no projection progress event

- **WHEN** `/sai-4-apply` renders and marks the projected list
- **THEN** no `event: progress` payload is emitted for the projection and no `continue_after_progress` acknowledgement is used for it; the projection remains coordinator-derived even though the Step loop itself is worker-driven

#### Scenario: Step-execution worker never emits the tool call

- **WHEN** a RED or GREEN Step-execution worker runs during an apply run
- **THEN** the worker does not emit the task-list tool call; only the coordinator session does

### Requirement: Apply projection stays unstamped

The apply run-start projection SHALL remain separate from dispatch-local progress plans and SHALL receive no milestone stamps from RED or GREEN worker events.

#### Scenario: Timestamped apply results do not stamp projection
- **WHEN** RED or GREEN returns a progress or terminal result with `emitted_on`
- **THEN** the implementation step projection remains unstamped.

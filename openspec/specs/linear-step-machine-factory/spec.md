# linear-step-machine-factory Specification

## Purpose
TBD - created by archiving change extract-step-machine-routing. Update Purpose after archive.
## Requirements
### Requirement: Linear step machine factory function

A factory function `createLinearStepMachine({ machineId, steps, stageFiles })` SHALL be exported from `sai-state/machines/linear-steps.js` and create a stateful stage machine object with the standard machine interface: properties `machineId`, `initialState`, `STEPS`, `STAGE_FILES`, `DONE_STAGE`, and methods `transition` and `project`.

**Scope:** Factory implementation for data modules spec-standalone, implement-standalone, review-standalone, and future linear machines.

#### Scenario: Factory creates machine with required interface

- **WHEN** `createLinearStepMachine({ machineId: 'spec-standalone@1', steps: ['prereqs-and-change', 'research', ...], stageFiles: {...} })` is invoked
- **THEN** it returns an object with `machineId` property set to 'spec-standalone@1', `initialState` object, `STEPS` array, `STAGE_FILES` object, `DONE_STAGE` string constant, and `transition` and `project` methods

### Requirement: Factory-created initial state

The factory-created machine MUST initialize with the first step as the active stage and an empty done list (no steps completed).

**Scope:** Bootstrap behavior for all linear step machines.

#### Scenario: Initial state ready for first progress event

- **WHEN** the machine is first created from the factory
- **THEN** `initialState.stage` equals the first step id (the array first element), `initialState.done` is an empty array, and the machine projects with the first step's pointer

### Requirement: Factory-created first and terminal step pointers

The factory-created machine MUST return `follow: none` when projecting from the first step and when projecting from the terminal `done` stage. All other steps return their mapped follow paths.

**Scope:** Minimal fetch for bootstrap and completion; follow values read directly from the stageFiles map.

#### Scenario: First step pointer carries no fetch

- **WHEN** the machine projects from its initial state (first step)
- **THEN** `next.follow` is exactly `'none'` and `next.hint` describes no fetch required

#### Scenario: Terminal done pointer carries no fetch

- **WHEN** the machine projects from the done stage (all steps completed)
- **THEN** `next.follow` is exactly `'none'` and `next.hint` describes completion

#### Scenario: Middle steps return mapped paths

- **WHEN** the machine projects from any step between first and done
- **THEN** `next.follow` contains the path from `stageFiles[stage]`

### Requirement: Signal field precedence

The factory-created machine MUST accept both `step_ids` and `completedIds` as signal fields with deterministic precedence: if `step_ids` is present as an array (including an empty array), use it; otherwise if `completedIds` is present as an array, use it; otherwise no advance occurs.

**Scope:** Tolerant signal parsing for emit events.

#### Scenario: step_ids takes precedence over completedIds

- **WHEN** a transition signal carries both `{ step_ids: ['research'], completedIds: ['other'] }`
- **THEN** the machine uses `step_ids` for advancement and `completedIds` is ignored

#### Scenario: Empty step_ids list is valid

- **WHEN** a transition signal carries `{ step_ids: [] }`
- **THEN** the machine recognizes it as a valid empty list (not absent) and does not advance, even if `completedIds` is also present

#### Scenario: Fallback to completedIds when step_ids absent

- **WHEN** a transition signal carries only `{ completedIds: ['prereqs-and-change'] }`
- **THEN** the machine uses `completedIds` for advancement

### Requirement: Silent undeclared id drop

Undeclared step ids (not in the STEPS array) MUST be silently ignored with no notification channel, no state change, and no `rejected` marker.

**Scope:** Robustness against unknown worker ids.

#### Scenario: Unknown ids cause no state change

- **WHEN** a progress event reports `step_ids: ['not-a-step', 'also-unknown']` while the machine is at any stage
- **THEN** the machine does not advance, returns the unchanged state with the same pointer, and carries no `rejected` field

#### Scenario: Mix of known and unknown ids

- **WHEN** a progress event reports `step_ids: ['research', 'unknown', 'proposal']`
- **THEN** only the known ids advance the machine; unknown ids are silently dropped

### Requirement: Monotonic marks

Marks in the done list MUST be monotonic: only appended, never reopened, never removed. The done list stays deterministic regardless of wire order.

**Scope:** Invariant for all linear step machines.

#### Scenario: Re-reported step does not duplicate

- **WHEN** a progress event reports `step_ids: ['research']` and the done list already contains `['prereqs-and-change', 'research']`
- **THEN** the done list remains `['prereqs-and-change', 'research']` (no duplicate of research)

#### Scenario: Out-of-order ids land in canonical order

- **WHEN** a progress event reports `step_ids: ['proposal', 'prereqs-and-change', 'research']` while done is empty
- **THEN** the done list becomes `['prereqs-and-change', 'research', 'proposal']` (canonical STEPS order, not wire order)

#### Scenario: Done list never decreases

- **WHEN** a state transitions through multiple progress events
- **THEN** the done list only grows; no step is ever removed from the done list


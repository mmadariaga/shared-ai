# spec-step-routing Specification

## Purpose
TBD - created by archiving change spec-standalone-state-machine. Update Purpose after archive.
## Requirements
### Requirement: Six-step stage table as-is

The machine SHALL replicate the six steps from the canonical spec phase contract as-is in canonical order `prereqs-and-change`, `research`, `proposal`, `specs`, `validation`, `review`, happy-path only with no wait or failure states. The terminal stage SHALL be `done`.

#### Scenario: Table order matches the canonical plan

- **WHEN** the caller inspects STEPS on the sidecar machine
- **THEN** the list is exactly the six canonical steps in order with DONE_STAGE as done

### Requirement: Stateful sidecar identity and initial state

The machine SHALL be identified as `spec-standalone@1` with initial stage `prereqs-and-change` and empty done set. The machine SHALL be routing-only and SHALL never write artifacts.

#### Scenario: Fresh session starts at prereqs-and-change

- **WHEN** a standalone run opens a fresh sidecar session
- **THEN** the stage is prereqs-and-change, done is empty, and no prior marks are reused

### Requirement: Monotonic transition with silent ignore

Transition SHALL add newly completed declared ids in canonical STEPS order so the done set stays deterministic regardless of wire order. Undeclared ids SHALL be ignored silently with no notification channel and no state change, and the authoritative pointer SHALL re-steer the worker. Marks SHALL be monotonic and SHALL never be reopened or removed.

#### Scenario: Undeclared ids leave state and pointer unchanged

- **WHEN** the caller emits undeclared ids against a session at research
- **THEN** the state and next follow are unchanged and no rejection marker is present

### Requirement: Project re-resolution for replacement

Project SHALL derive the active step from the surviving session done set via first-unmarked so a replacement first continuation carries the correct pointer even when the cached stage is stale. Transition and project SHALL be pure with no input mutation.

#### Scenario: Replacement projects proposal after research

- **WHEN** the caller projects a surviving session with done holding prereqs-and-change and research
- **THEN** next follow names the proposal step file with the loaded-set skip hint

### Requirement: Registry registration alongside explore machines

The registry SHALL register `spec-standalone@1` alongside `explore-idea@1` and `explore-slice@1` with no change to existing registrations.

#### Scenario: Registry hosts all three machines

- **WHEN** the caller checks registry membership after startup
- **THEN** spec-standalone, explore-idea, and explore-slice machines are all present


# implement-coordinator-step-pointers — Spec

## Purpose

TBD - created by archiving change implement-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Static step_pointer_map covers every declared step id

The implementation coordinator SHALL declare a static `step_pointer_map` that maps every declared progress-plan step id to its just-in-time instruction pointer, with exactly six rows: `prereqs-resolution` maps to `none` and the five remaining step ids map to their instruction files under `sai/commands/implement/steps/`.

#### Scenario: The map has one row per declared step

- **WHEN** the implementation coordinator declares its `step_pointer_map`
- **THEN** the map contains exactly six rows, one per declared progress-plan step id, and every row other than `prereqs-resolution` names the matching step file.

### Requirement: Progress-event continuations are exactly two lines

While the `step_pointer_map` is in force, every progress-event continuation payload the coordinator sends SHALL be exactly two lines: the protocol continuation line, then one pointer line `Active step: <id> — follow <path>` whose id and path come from the static map. With every declared step marked, the second line SHALL read exactly `Active step: none — complete remaining work and return your terminal result.`

#### Scenario: Unmarked step yields a pointer line

- **WHEN** a progress-event continuation is sent and a declared step remains unmarked in plan order
- **THEN** the continuation is exactly two lines and the second line names the next active step id and its file path.

#### Scenario: Terminal none row after the last step

- **WHEN** a progress-event continuation is sent and every declared step is marked
- **THEN** the second line reads exactly `Active step: none — complete remaining work and return your terminal result.`

### Requirement: Non-progress continuations carry no pointer line

Needs_input continuations and recovery continuations SHALL carry no pointer line, so the worker's active step file persists across them in its continuous session.

#### Scenario: Needs_input continuation leaves the active step unchanged

- **WHEN** the coordinator sends a needs_input or recovery continuation while the map is in force
- **THEN** the continuation carries no pointer line and the worker's active step file persists across it.

### Requirement: Replacement reconstruction carries active_step_id

Replacement reconstruction SHALL include the departing worker's `active_step_id`, and the replacement's first continuation SHALL carry the correct pointer line for that step.

#### Scenario: Replacement resumes the active step

- **WHEN** the coordinator reconstructs a replacement implementation worker
- **THEN** the reconstruction fields include the departing worker's `active_step_id` and the replacement's first continuation carries the pointer line for that step.

### Requirement: Coordinator owns active-step pointer delivery

The implementation coordinator SHALL own progress rendering and delivery of the active-step pointer, while the worker SHALL execute the step named by that pointer without selecting a different step.

#### Scenario: Coordinator advances the plan

- **WHEN** the coordinator emits a continuation for the next implementation step
- **THEN** the continuation carries the coordinator-selected active-step pointer and the worker executes that step.

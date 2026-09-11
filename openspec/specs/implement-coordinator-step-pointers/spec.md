# implement-coordinator-step-pointers — Spec

## Purpose

TBD - created by archiving change implement-step-gated-instructions. Update Purpose after archive.
## Requirements
### Requirement: Progress-event continuations are exactly two lines

Progress-event continuation payloads the coordinator sends SHALL be exactly two lines: the protocol continuation line, then one pointer line `Active step: <id> — follow <path>` derived from the step machine's project output. With every declared step marked, the second line SHALL read exactly `Active step: none — complete remaining work and return your terminal result.`

The pointer line format and derivation are specified in `@sai/policies/stage-machine.md` § Step machines; the coordinator reads the projected pointer from the machine and includes it in the two-line payload.

#### Scenario: Unmarked step yields a pointer line

- **WHEN** a progress-event continuation is sent and a declared step remains unmarked
- **THEN** the continuation is exactly two lines and the second line names the next active step id and its file path from the machine's project output

#### Scenario: Terminal none row after the last step

- **WHEN** a progress-event continuation is sent and every declared step is marked
- **THEN** the second line reads exactly `Active step: none — complete remaining work and return your terminal result.`

### Requirement: Non-progress continuations carry no pointer line

Needs_input continuations and recovery continuations SHALL carry no pointer line, so the worker's active step file persists across them in its continuous session. The coordinator does not invoke the machine's emit for non-progress continuations per `@sai/policies/stage-machine.md` § Step machines.

#### Scenario: Needs_input continuation leaves the active step unchanged

- **WHEN** the coordinator sends a needs_input or recovery continuation while the machine is declared
- **THEN** the continuation carries no pointer line and the worker's active step file persists across it

### Requirement: Replacement reconstruction carries active_step_id

Replacement reconstruction SHALL include the departing worker's `active_step_id`, and the replacement's first continuation SHALL carry the correct pointer line for that step. The replacement worker re-resolves the active step from the surviving session and the machine re-projects the pointer for the active step's continuation.

#### Scenario: Replacement resumes the active step

- **WHEN** the coordinator reconstructs a replacement implementation worker
- **THEN** the reconstruction fields include the departing worker's `active_step_id` and the replacement's first continuation carries the pointer line for that step

### Requirement: Coordinator owns active-step pointer delivery

The implementation coordinator SHALL own progress rendering and delivery of the active-step pointer, while the worker SHALL execute the step named by that pointer without selecting a different step.

#### Scenario: Coordinator advances the plan

- **WHEN** the coordinator emits a continuation for the next implementation step
- **THEN** the continuation carries the coordinator-selected active-step pointer and the worker executes that step.


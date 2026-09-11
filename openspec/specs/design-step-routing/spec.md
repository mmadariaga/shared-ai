# design-step-routing Specification

## Purpose
TBD - created by archiving change design-standalone-state-machine. Update Purpose after archive.
## Requirements
### Requirement: Design standalone variant selection
The machine SHALL select the opted-in seven-step plan when the canonical boolean spawn flag `withOverview` is true and the unopted six-step plan otherwise, defaulting to unopted when absent. A pristine session SHALL adopt the flag from the first signal carrying a boolean and SHALL ignore every later signal flag. Non-boolean flag values SHALL never adopt.

#### Scenario: Pristine adoption with later immutability
- **WHEN** a pristine session receives withOverview true and a later signal carries withOverview false
- **THEN** the run stays opted-in and unopted runs never derive overview

### Requirement: Design happy-path progression to done
The machine SHALL walk `prereqs-resolution` then `research`, `design`, `tasks`, `interfaces`, `review`, and `overview` when opted-in, omitting `overview` when unopted. The terminal `done` stage SHALL map to follow none with the all-complete hint, and the coordinator SHALL emit the exact `Active step: none` literal when every variant step is marked.

#### Scenario: Opted-in walk ends with none literal
- **WHEN** the caller marks each variant step in plan order through the sidecar
- **THEN** each step points at its successor file and marking the final step returns done with follow none

### Requirement: Silent ignore with authoritative re-steer
The machine SHALL ignore undeclared worker ids silently with no notification channel and no state change. The coordinator SHALL re-emit the authoritative pointer from the unchanged state, which re-steers the worker.

#### Scenario: Unknown ids leave state unchanged
- **WHEN** the worker reports only undeclared ids while parked at research
- **THEN** the state and pointer stay unchanged with no rejection marker

### Requirement: Replacement re-resolution and parked lifecycle

Every standalone run SHALL open a fresh step machine session with `spawn` followed by an immediate `reset` of the design machine to clear its state (other machines in the session remain untouched). Replacement SHALL re-resolve the active step from the surviving session done set and its immutable variant via project. Needs input, failed, and cancelled outcomes SHALL park the machine with pointer-free feedback and recovery continuations until the next progress event. 

At run-close (completed, failed, or cancelled), the coordinator SHALL invoke `reset` again to clear the design machine's state only (other machines in the session remain untouched); later runs in the same chat with design-standalone@1 start from step zero. Emit or follow-load failure SHALL stop the run, show the error, and wait with nothing guessed and never routed through Bounded Recovery. Store failure (unreachable, corrupt-session-file warning, version mismatch, or unknown machine error) SHALL stop the coordinator, surface the error, and wait for user instructions with no degraded-mode continuation.

#### Scenario: Replacement projects surviving done set

- **WHEN** a replacement projects a surviving session holding prereqs-resolution and research as done while opted-in
- **THEN** the first continuation carries the design step pointer

#### Scenario: Run-close resets design machine only

- **WHEN** a run closes at any terminal result
- **THEN** the coordinator invokes `reset` to clear only the design machine's state; other machines in the session remain untouched and a later run with design-standalone@1 starts from step zero

#### Scenario: Store failure stops coordinator

- **WHEN** the sai-state store fails (unreachable, corrupt session file, version mismatch, unknown machine)
- **THEN** the coordinator stops, displays the error context, and waits for user instructions; it does not continue degraded and does not route through Bounded Recovery


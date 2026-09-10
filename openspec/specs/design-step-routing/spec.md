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
Every standalone run SHALL open a fresh sidecar session and SHALL close it when the run closes with no machine auto-retry. Replacement SHALL re-resolve the active step from the surviving session done set and its immutable variant via project. Needs input, failed, and cancelled outcomes SHALL park the machine with pointer-free feedback and recovery continuations until the next progress event. Emit or follow-load failure SHALL stop the run, show the error, and wait with nothing guessed and never routed through Bounded Recovery.

#### Scenario: Replacement projects surviving done set
- **WHEN** a replacement projects a surviving session holding prereqs-resolution and research as done while opted-in
- **THEN** the first continuation carries the design step pointer


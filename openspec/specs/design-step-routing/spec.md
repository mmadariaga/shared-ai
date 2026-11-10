# design-step-routing Specification

## Purpose
TBD - created by archiving change design-standalone-state-machine. Update Purpose after archive.

## Requirements

### Requirement: Silent ignore with authoritative re-steer
The machine SHALL reject a worker report that names an undeclared id with `rejected: "UNKNOWN_STEP_ID"` and the undeclared ids in `unknown_ids`, with no state change and none of its declared ids applied. The coordinator SHALL re-emit the authoritative pointer from the unchanged state, which re-steers the worker.

#### Scenario: Unknown ids leave state unchanged
- **WHEN** the worker reports only undeclared ids while parked at research
- **THEN** the state and pointer stay unchanged and the response carries `rejected: "UNKNOWN_STEP_ID"` with those ids in `unknown_ids`

### Requirement: design-steps happy-path progression to done

The `design-steps@1` machine SHALL walk `design-intake` then `research`, `design`, `tasks`, and `interfaces`, with no `overview` and no `review` step. The terminal `done` stage SHALL map to follow none with the all-complete hint, and the coordinator SHALL send no further step pointer once the machine reports `done`.

#### Scenario: Walk ends with follow none

- **WHEN** the caller marks each design step in order through the machine
- **THEN** each step points at its successor file and marking the final step returns done with follow none

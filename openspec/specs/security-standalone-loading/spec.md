# security-standalone-loading Specification

## Purpose
TBD - created by archiving change add-security-step-machine. Update Purpose after archive.

## Requirements

### Requirement: Closed standalone stage table for security

The machine SHALL expose exactly the five progress-plan ids in order as its closed states: `resolve-security-scope`, `discover-module-map`, `resolve-sast-analysis`, `resolve-sca`, `close-security-outcome`, plus terminal `done`. The STEPS list, STAGE_FILES mapping, DONE_STAGE marker, and initialState with empty done set SHALL match the coordinator plan with no extra states.

#### Scenario: First unmarked state drives routing

- **WHEN** the stage machine holds a done set with earlier steps marked
- **THEN** the active stage SHALL be the first unmarked id in canonical order

### Requirement: Minimal boot with just-in-time follow loads

The security worker SHALL boot from its worker card plus `sai/commands/audit/worker-common.md` and `sai/commands/security/steps/common.md` only, with resolve-security-scope carrying follow none. Each of the four step files under sai/commands/security/steps/ SHALL load only when the pointer names it, and the creation dispatch SHALL carry only the ready prompt, with the first pointer, targeting discover-module-map, opening the task message.

#### Scenario: Step file loads at its point of use

- **WHEN** the step machine returns a next.follow naming a step file
- **THEN** the coordinator sends that pointer and the worker fetches that single file at that point and at no earlier point

### Requirement: No-whitelist follow-load with stop-on-failure

After each emit the coordinator SHALL fetch whatever next.follow names with no file whitelist. A machine-named unknown file or a path outside the steps directory SHALL stop with an error and fetch nothing. A follow-load failure SHALL stop, show the error, and wait with nothing guessed and never routed through Bounded Recovery.

#### Scenario: Unknown follow target stops without fetching

- **WHEN** the machine names an unknown file or a path outside the steps directory
- **THEN** the run SHALL stop with an error and fetch nothing

### Requirement: Minimal wire with mandatory machine identity

Every emit SHALL travel as stage plus next only, with mandatory machineId on the request and no snapshots or state in the request or on the wire. A step-machine progress emit (`emit <id> <machineId> --progress -`) SHALL additionally carry its `validation` verdict block, and SHALL carry no other field. A malformed machineId SHALL answer INVALID_EVENT or UNKNOWN_MACHINE with no fallback. The signal SHALL be step_ids with completedIds as tolerant alias, and anything else SHALL advance nothing.

#### Scenario: Minimal emit carries stage and pointer only

- **WHEN** the stage machine emits after applying reported ids
- **THEN** the wire SHALL carry only stage and next with the machine identity and no snapshot, plus the `validation` verdict block when the emit is a progress emit

### Requirement: Silent ignore of undeclared ids with authoritative re-steer

Newly completed declared ids SHALL be added in canonical STEPS order with marks monotonic and never reopened. Missing, empty, or only-undeclared ids SHALL be ignored silently with no notification channel and no state change, and the coordinator SHALL re-emit the authoritative pointer which re-steers the worker.

#### Scenario: Undeclared ids leave state unchanged

- **WHEN** the signal carries only ids outside the five declared states
- **THEN** the state SHALL stay unchanged with no rejection marker

### Requirement: Terminal done maps to completion pointer

The terminal done state SHALL map to the exact literal `Active step: none — complete remaining work and return your terminal result.`

#### Scenario: All steps marked transitions to done

- **WHEN** the final step `close-security-outcome` is marked completed
- **THEN** the state SHALL transition to done with next.follow returning none and the hint indicating all steps are complete

### Requirement: Every security activation routes through security-steps@1

Both the direct `/sai-5-security` activation and the `/sai-deep-review` activation SHALL run the security audit as one cycle of the shared audit coordinator on the `security-steps@1` machine, in a `sai-state` session keyed `security-{name}`; when the store fails, the coordinator SHALL send pointers from the static step order. The `security-standalone@1` machine SHALL NOT be registered, and its file under `sai-state/machines/` SHALL be retired. No session or state SHALL be shared between activations.

#### Scenario: Direct activation consults the machine

- **WHEN** `/sai-5-security` is invoked directly
- **THEN** the shared audit coordinator resets `security-steps@1` and sends each pointer from its responses

#### Scenario: Deep-review activation consults the same machine

- **WHEN** `/sai-deep-review` activates the security audit
- **THEN** its security cycle resets `security-steps@1` in the session `security-{name}` and sends the same pointers as the direct path

#### Scenario: Retired machine is unregistered

- **WHEN** `sai-state/registry.js` is loaded
- **THEN** `security-standalone@1` is not registered and `security-steps@1` is

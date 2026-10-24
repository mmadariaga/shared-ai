# performance-standalone-loading Specification

## Purpose
TBD - created by archiving change add-performance-step-machine. Update Purpose after archive.

## Requirements

### Requirement: Closed standalone stage table for performance

The machine SHALL expose exactly the five progress-plan ids in order as its closed states: `resolve-performance-scope`, `map-stack-hot-paths`, `audit-performance-tiers`, `resolve-diagnostics`, `close-performance-outcome`, plus terminal `done`. The STEPS list, STAGE_FILES mapping, DONE_STAGE marker, and initialState with empty done set SHALL match the coordinator plan with no extra states.

#### Scenario: First unmarked state drives routing

- **WHEN** the stage machine holds a done set with earlier steps marked
- **THEN** the active stage SHALL be the first unmarked id in canonical order

### Requirement: Minimal boot with just-in-time follow loads

The performance worker SHALL boot from its worker card plus `sai/commands/audit/worker-common.md` and `sai/commands/performance/steps/common.md` only, with resolve-performance-scope carrying follow none. Each of the four step files under sai/commands/performance/steps/ SHALL load only when the pointer names it, and the creation dispatch SHALL carry only the ready prompt, with the first pointer, targeting map-stack-hot-paths, opening the task message.

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

- **WHEN** the final step `close-performance-outcome` is marked completed
- **THEN** the state SHALL transition to done with next.follow returning none and the hint indicating all steps are complete

### Requirement: Every-activation scope with byte-identical pointers

The direct `/sai-6-performance` activation SHALL route through the shared audit coordinator and the `performance-steps@1` machine, in a `sai-state` session keyed `performance-{name}`; when the store fails, the coordinator SHALL send pointers from the static step order. The `performance-standalone@1` machine SHALL govern only the chained activation (as an audit segment of a chained `/sai-deep-review` invocation) while `/sai-deep-review` still composes the former performance coordinator. Both machines SHALL carry the same step ids and step files. No shared sessions or state exist between activations.

#### Scenario: Direct activation consults the machine

- **WHEN** `/sai-6-performance` is invoked directly
- **THEN** the shared audit coordinator resets `performance-steps@1` and sends each pointer from its responses

#### Scenario: Chained activation consults the same machine

- **WHEN** the performance adapter runs as an audit segment of a chained `/sai-deep-review` invocation
- **THEN** the `performance-standalone@1` machine arbitrates step routing with the same step ids and step files as the direct path, with no supervised-transition fallback or separate static map

#### Scenario: Store failure during chained segment stops the chain

- **WHEN** the machine emits and the store reports a failure during the performance segment of a chained `/sai-deep-review` invocation
- **THEN** the run stops per stage-machine.md and the `/sai-deep-review` invocation stops with it

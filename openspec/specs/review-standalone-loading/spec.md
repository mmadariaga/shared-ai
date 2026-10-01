# review-standalone-loading Specification

## Purpose
TBD - created by backfilling change review-standalone-machine. Update Purpose after archive.

## Requirements

### Requirement: Closed standalone stage table for review

The machine SHALL expose exactly four progress-plan ids in order: `resolve-change`, `establish-diff-scope`, `resolve-review-analysis`, `close-review-outcome`, plus terminal `done`. STEPS, STAGE_FILES, DONE_STAGE, and initialState with an empty done set SHALL match the coordinator plan with no extra state or replacement mutation check.

#### Scenario: First unmarked state drives routing
- **WHEN** the stage machine holds a done set with earlier steps marked
- **THEN** the active stage SHALL be the first unmarked id in canonical order

### Requirement: Minimal boot with just-in-time follow loads

The standalone run SHALL boot only from worker contract plus `steps/common.md`, with `resolve-change` carrying follow none. Each of the three filed steps SHALL load only when the machine pointer names it. Initial dispatch SHALL have no task or pointer; post-ready task disclosure SHALL carry the first pointer targeting `establish-diff-scope`. The first event SHALL report resolution and scope together, followed by one analysis event and one close event on the complete path. Steps SHALL NOT merge or prefetch.

#### Scenario: Step file loads at its point of use
- **WHEN** the stage machine emits next.follow naming a step file
- **THEN** the coordinator SHALL deliver that single file pointer at that point and at no earlier point, except the first filed pointer delivered with task disclosure

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

Newly completed declared ids SHALL be added in canonical STEPS order with marks monotonic and never reopened. Missing, empty, or only-undeclared ids SHALL be ignored silently with no notification or state change, and the coordinator SHALL re-emit the authoritative pointer. The retired mutation id SHALL be undeclared.

#### Scenario: Undeclared ids leave state unchanged
- **WHEN** the signal carries only ids outside the four declared states
- **THEN** the state SHALL stay unchanged with no rejection marker

### Requirement: Terminal done maps to completion pointer

The terminal done state SHALL map to the exact literal `Active step: none — complete remaining work and return your terminal result.`

#### Scenario: All steps marked transitions to done

- **WHEN** the final step `close-review-outcome` is marked completed
- **THEN** the state SHALL transition to done with next.follow returning none and the hint indicating all steps are complete

### Requirement: Every-activation scope with byte-identical pointers

The machine SHALL govern the review adapter for every activation — direct (`/sai-5-review`) and chained (as position 0 of `/sai-review`). No shared sessions or state exist between activations. Pointer sequences remain byte-identical between direct and chained paths. Feedback and recovery continuations SHALL carry no pointer and never consult the machine; parking and pointer behavior follow `@sai/policies/stage-machine.md` § Step machines.

#### Scenario: Direct activation consults the machine

- **WHEN** `/sai-5-review` is invoked directly
- **THEN** the machine arbitrates step routing via the coordinator's declared `step_machine: review-standalone@1` and delivers the two-line continuation

#### Scenario: Chained activation consults the same machine

- **WHEN** the review adapter runs as position 0 of a chained `/sai-review` invocation
- **THEN** the same machine arbitrates step routing with identical pointer derivation as the direct path, with no supervised-transition fallback or separate static map

#### Scenario: Store failure during chained segment stops the chain

- **WHEN** the machine emits and the store reports a failure during a chained `/sai-review` segment
- **THEN** the run stops per stage-machine.md, and `/sai-review` does not proceed to the next segment

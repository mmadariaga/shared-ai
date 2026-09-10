# review-standalone-loading Specification

## Purpose
TBD - created by backfilling change review-standalone-machine. Update Purpose after archive.
## Requirements
### Requirement: Closed standalone stage table for review

The machine SHALL expose exactly the five progress-plan ids in order as its closed states: `resolve-change`, `establish-diff-scope`, `resolve-review-analysis`, `resolve-mutation-analysis`, `close-review-outcome`, plus terminal `done`. The STEPS list, STAGE_FILES mapping, DONE_STAGE marker, and initialState with empty done set SHALL match the coordinator plan with no extra states.

#### Scenario: First unmarked state drives routing

- **WHEN** the stage machine holds a done set with earlier steps marked
- **THEN** the active stage SHALL be the first unmarked id in canonical order

### Requirement: Minimal boot with just-in-time follow loads

The standalone run SHALL boot from the nucleus only, worker contract plus steps/common.md, with resolve-change carrying follow none. Each of the four step files under sai/commands/review/steps/ SHALL load only when next.follow names it, and the initial dispatch SHALL bear no Active step line with the first pointer targeting establish-diff-scope.

#### Scenario: Step file loads at its point of use

- **WHEN** the stage machine emits next.follow naming a step file
- **THEN** the coordinator SHALL fetch that single file at that point and at no earlier point

### Requirement: No-whitelist follow-load with stop-on-failure

After each emit the coordinator SHALL fetch whatever next.follow names with no file whitelist. A machine-named unknown file or a path outside the steps directory SHALL stop with an error and fetch nothing. A follow-load failure SHALL stop, show the error, and wait with nothing guessed and never routed through Bounded Recovery.

#### Scenario: Unknown follow target stops without fetching

- **WHEN** the machine names an unknown file or a path outside the steps directory
- **THEN** the run SHALL stop with an error and fetch nothing

### Requirement: Minimal wire with mandatory machine identity

Every emit SHALL travel as stage plus next only, with mandatory machineId on the request and no snapshots or state in the request. A malformed machineId SHALL answer INVALID_EVENT or UNKNOWN_MACHINE with no fallback. The signal SHALL be step_ids with completedIds as tolerant alias, and anything else SHALL advance nothing.

#### Scenario: Minimal emit carries stage and pointer only

- **WHEN** the stage machine emits after applying reported ids
- **THEN** the wire SHALL carry only stage and next with the machine identity and no snapshot

### Requirement: Silent ignore of undeclared ids with authoritative re-steer

Newly completed declared ids SHALL be added in canonical STEPS order with marks monotonic and never reopened. Missing, empty, or only-undeclared ids SHALL be ignored silently with no notification channel and no state change, and the coordinator SHALL re-emit the authoritative pointer which re-steers the worker.

#### Scenario: Undeclared ids leave state unchanged

- **WHEN** the signal carries only ids outside the five declared states
- **THEN** the state SHALL stay unchanged with no rejection marker

### Requirement: Standalone-only scope with byte-identical composed path

The stage machine SHALL govern `sai-5` only in standalone mode; on the chained path (`/sai-review` review position 0 non-final) the same adapter runs with supervised transition and this machine does not arbitrate. No shared sessions or state exist between the two paths. The composed path keeps today's `step_pointer_map` derivation byte-identical and never consults this machine.

#### Scenario: Composed path ignores the machine

- **WHEN** review runs as position 0 in a chained `/sai-review` invocation
- **THEN** the machine does not arbitrate and the coordinator uses the unchanged `step_pointer_map` derivation

### Requirement: Terminal done maps to completion pointer

The terminal done state SHALL map to the exact literal `Active step: none — complete remaining work and return your terminal result.`

#### Scenario: All steps marked transitions to done

- **WHEN** the final step `close-review-outcome` is marked completed
- **THEN** the state SHALL transition to done with next.follow returning none and the hint indicating all steps are complete


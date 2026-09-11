# implement-standalone-loading Specification

## Purpose
TBD - created by archiving change implement-standalone-machine. Update Purpose after archive.
## Requirements
### Requirement: Closed standalone stage table
The machine SHALL expose exactly the six progress-plan ids in order as its closed states: prereqs-resolution, collapse-implemented-steps, artifact-analysis, documentation-review, plan-generation, validation, plus terminal done. The STEPS list, STAGE_FILES mapping, DONE_STAGE marker, and initialState with empty done set SHALL match the coordinator plan with no extra states.

#### Scenario: First unmarked state drives routing
- **WHEN** the sidecar holds a done set with earlier steps marked
- **THEN** the active stage SHALL be the first unmarked id in canonical order

### Requirement: Minimal boot with just-in-time follow loads
The standalone run SHALL boot from the nucleus only, worker contract plus steps/common.md, with prereqs-resolution carrying follow none. Each of the five step files under sai/commands/implement/steps/ SHALL load only when next.follow names it, and the initial dispatch SHALL bear no Active step line with the first pointer targeting collapse-implemented-steps.

#### Scenario: Step file loads at its point of use
- **WHEN** the sidecar emits next.follow naming a step file
- **THEN** the coordinator SHALL fetch that single file at that point and at no earlier point

### Requirement: No-whitelist follow-load with stop-on-failure
After each emit the coordinator SHALL fetch whatever next.follow names with no file whitelist. A machine-named unknown file or a path outside the steps directory SHALL stop with an error and fetch nothing. A follow-load failure SHALL stop, show the error, and wait with nothing guessed and never routed through Bounded Recovery.

#### Scenario: Unknown follow target stops without fetching
- **WHEN** the machine names an unknown file or a path outside the steps directory
- **THEN** the run SHALL stop with an error and fetch nothing

### Requirement: Minimal wire with mandatory machine identity
Every emit SHALL travel as stage plus next only, with mandatory machineId on the request and no snapshots or state in the request. A malformed machineId SHALL answer INVALID_EVENT or UNKNOWN_MACHINE with no fallback. The signal SHALL be step_ids with completedIds as tolerant alias, and anything else SHALL advance nothing.

#### Scenario: Minimal emit carries stage and pointer only
- **WHEN** the sidecar emits after applying reported ids
- **THEN** the wire SHALL carry only stage and next with the machine identity and no snapshot

### Requirement: Silent ignore of undeclared ids with authoritative re-steer
Newly completed declared ids SHALL be added in canonical STEPS order with marks monotonic and never reopened. Missing, empty, or only-undeclared ids SHALL be ignored silently with no notification channel and no state change, and the coordinator SHALL re-emit the authoritative pointer which re-steers the worker.

#### Scenario: Undeclared ids leave state unchanged
- **WHEN** the signal carries only ids outside the six declared states
- **THEN** the state SHALL stay unchanged with no rejection marker

### Requirement: Loaded-set skip via hint wording
An already-loaded follow path SHALL not be re-fetched. The next hint SHALL carry the loaded-set skip wording so the coordinator skips fetching when the path is already loaded, and re-emitting the same state SHALL not reload the file.

#### Scenario: Already-loaded path is skipped
- **WHEN** the next follow path is already in the loaded set
- **THEN** the coordinator SHALL skip the re-fetch per the hint wording

### Requirement: Replacement re-resolution from surviving session
The project function SHALL derive the active step from the surviving session done set via first-unmarked, so a replacement first continuation carries the correct pointer even when the cached stage is stale.

#### Scenario: Replacement resumes at first unmarked step
- **WHEN** a replacement resolves from a surviving done set
- **THEN** the projected stage and next follow SHALL target the first unmarked step

### Requirement: Fail-closed operation without sidecar
Without a reachable sidecar the process SHALL stop, notify the user, and wait for new instructions. It SHALL NOT continue degraded or advance on local judgment.

#### Scenario: Missing sidecar stops the run
- **WHEN** the sidecar is unreachable at emit time
- **THEN** the run SHALL stop with a user notification and wait for instructions

### Requirement: Registry registration as fourth machine
The registry SHALL register implement-standalone@1 alongside explore-idea@1, explore-slice@1, and spec-standalone@1, requiring a module with initialState plus transition and project functions.

#### Scenario: Registry lists four machines
- **WHEN** the registry is listed after this change
- **THEN** it SHALL include implement-standalone@1 with the three existing machines

### Requirement: Every-activation scope with parked machine lifecycle

The machine SHALL govern the implement adapter for every activation — direct (`/sai-3-implement`) and chained (as part of `/sai-build`). Feedback and recovery continuations SHALL carry no pointer and never consult the machine; parking and pointer behavior follow `@sai/policies/stage-machine.md` § Step machines. The machine resets per-machine at segment start and resets (not closes) at run-closing. Every activation opens a session that does not reuse prior marks.

#### Scenario: Direct activation consults the machine

- **WHEN** `/sai-3-implement` is invoked directly
- **THEN** the machine arbitrates step routing via the coordinator's declared `step_machine: implement-standalone@1` throughout the run

#### Scenario: Chained activation consults the same machine

- **WHEN** the implement adapter runs as position 0 of `/sai-build`
- **THEN** the same machine arbitrates step routing with identical pointer derivation as the direct path, and the coordinator never falls back to supervised transition

#### Scenario: Store failure during chained segment stops the chain

- **WHEN** the machine emits and the store reports a failure during a chained `/sai-build` segment
- **THEN** the run stops per stage-machine.md, and `/sai-build` does not proceed to the next segment


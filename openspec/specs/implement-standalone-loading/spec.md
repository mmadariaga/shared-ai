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

Live implementation planning SHALL load the coordinator's common baseline and fetch each common-work step file only when its work begins. Category workers SHALL load their common baseline and plan-generation rules for a complete assigned-Step task, not machine-delivered active-step pointers. The retained implement-standalone machine's next.follow behavior SHALL remain compatibility data rather than live scheduling.

#### Scenario: Step file loads at its point of use

- **WHEN** the live coordinator enters a common-work milestone
- **THEN** it loads that milestone's instruction file at entry without sending a machine pointer to category workers.

### Requirement: No-whitelist follow-load with stop-on-failure
After each emit the coordinator SHALL fetch whatever next.follow names with no file whitelist. A machine-named unknown file or a path outside the steps directory SHALL stop with an error and fetch nothing. A follow-load failure SHALL stop, show the error, and wait with nothing guessed and never routed through Bounded Recovery.

#### Scenario: Unknown follow target stops without fetching
- **WHEN** the machine names an unknown file or a path outside the steps directory
- **THEN** the run SHALL stop with an error and fetch nothing

### Requirement: Minimal wire with mandatory machine identity
Every emit SHALL travel as stage plus next only, with mandatory machineId on the request and no snapshots or state in the request or on the wire. A step-machine progress emit (`emit <id> <machineId> --progress -`) SHALL additionally carry its `validation` verdict block, and SHALL carry no other field. A malformed machineId SHALL answer INVALID_EVENT or UNKNOWN_MACHINE with no fallback. The signal SHALL be step_ids with completedIds as tolerant alias, and anything else SHALL advance nothing.

#### Scenario: Minimal emit carries stage and pointer only
- **WHEN** the sidecar emits after applying reported ids
- **THEN** the wire SHALL carry only stage and next with the machine identity and no snapshot, plus the `validation` verdict block when the emit is a progress emit

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

Direct sai-3, chained sai-build, and Plan - Unattended implementation activations SHALL use the same category-planning coordinator without declaring a worker implement-standalone step machine. The existing machine definition SHALL remain registered as compatibility data only. Its store, pointer, parking, and wire contracts SHALL not arbitrate live category tasks or final publication.

#### Scenario: Direct activation consults the machine

- **WHEN** sai-3 is invoked directly
- **THEN** the coordinator executes common work and complete category tasks without consulting implement-standalone as a live schedule.

#### Scenario: Chained activation consults the same machine

- **WHEN** implementation runs as sai-build position zero
- **THEN** it uses the same category coordinator as direct activation without machine rebinding or worker pointer delivery.

#### Scenario: Store failure during chained segment stops the chain

- **WHEN** an unrelated compatibility-machine store fails during a chained category-planning segment
- **THEN** that inactive machine does not advance or govern the segment, while actual planning failures still block publication and the apply transition.

# explore-slice-machine Specification

## Purpose
TBD - created by archiving change explore-slice-machine. Update Purpose after archive.

## Requirements

### Requirement: Combined slice inventory and Direct Build TODO

The store CLI tool SHALL host `explore-slice@1` as the post-crystallization machine. The machine SHALL keep slice inventory (`set`, `active`, `done`), parked steps, and Plan / Direct Build TODO (`mode` plus `stage` cursor) in CLI-owned state (persisted in the session file, not sidecar in-memory state). A `recordedList` event SHALL replace `set` with the emitted change names without moving a running slice's Direct Build or Plan cursor, and SHALL discard every parked step so a re-crystallized slice restarts at its route's first step. Inventory, active, done, parked steps, and mode SHALL NOT appear on the wire.

#### Scenario: Recording inventory does not move the cursor

- **WHEN** the caller invokes `emit` with `recordedList` while `explore-slice@1` is at `idle`
- **THEN** `set` is replaced with the supplied list in the session file, `stage` stays `idle`, and the response carries no `set`, `active`, `done`, or `mode` fields (unchanged from prior behavior, CLI-invoked)

#### Scenario: Re-crystallization discards parked steps

- **WHEN** the caller emits `recordedList` while a slice is parked on `sai-2`
- **THEN** no parked step remains, and a later `plan` for that slice starts at `sai-1`

### Requirement: Direct Build cursor travels in stage
Selecting Direct Build SHALL emit intent direct-build with no pick and no slice name to explore-slice. The machine SHALL set active to the first pending inventory name, set mode to direct-build, and set stage to build-implement. Completing each route item SHALL emit intent complete and advance stage build-implement to backfill to archive. The wire SHALL keep stage as the cursor and SHALL NOT add response fields beyond stage, next, rejected, and warnings.

#### Scenario: Direct Build walks build-implement then backfill then archive
- **WHEN** the caller emits direct-build and then two complete intents against explore-slice
- **THEN** stage is build-implement, then backfill, then archive, and each response stays pointer-only plus optional rejected and warnings

#### Scenario: Direct Build starts first pending without pick
- **WHEN** the caller emits direct-build with a legacy pick value against a non-empty pending set
- **THEN** active is the first pending name regardless of that pick value.

### Requirement: Archive completion marks the slice done

Completing Archive SHALL mark the active slice done, clear `active`, clear `mode`, and return `stage` to `idle`. Direct Build SHALL NEVER treat `next-slice` as that done signal.

#### Scenario: Completing Archive clears active and records done

- **WHEN** the caller emits `complete` while `explore-slice@1` is at `archive` with an active slice
- **THEN** `stage` is `idle`, `active` is null, `mode` is null, and the former active name is in `done`

### Requirement: Fail, cancel, already-running, and next-slice do not mark done
A fail or cancel intent SHALL park the active slice at its current Direct Build or Plan step, clear active and mode, return stage to idle, and SHALL NOT mark the slice done. A parked first slice SHALL block later slices until it resumes in its own mode at the parked step; selecting it in the other mode SHALL reject with ALREADY_RUNNING. A second direct-build or plan while active is set SHALL reject with ALREADY_RUNNING. A next-slice intent SHALL reject with READINESS_IS_NOT_INTENT except when Plan is at implement. Direct Build SHALL NEVER treat next-slice as a done signal.

#### Scenario: Already-running rejects a second Direct Build
- **WHEN** the caller emits direct-build while explore-slice already has active set
- **THEN** the response carries rejected: ALREADY_RUNNING, stage stays on the pending Direct Build step, and done is unchanged

#### Scenario: Already-running rejects Plan while Direct Build is active
- **WHEN** the caller emits plan while explore-slice already has active set in direct-build mode
- **THEN** the response carries rejected: ALREADY_RUNNING, mode stays direct-build, and done is unchanged

#### Scenario: Fail leaves the active step pending
- **WHEN** the caller emits fail during an active Direct Build
- **THEN** stage returns to idle, active is null, the slice is parked at its current step, and the slice is not appended to done

#### Scenario: A parked slice resumes at its parked step
- **WHEN** a Plan slice parked on sai-2 is selected again with plan
- **THEN** active is that slice, stage is sai-2, and no parked step remains for it

#### Scenario: A parked slice rejects the other mode
- **WHEN** a Plan slice parked on sai-2 is selected with direct-build
- **THEN** the response carries rejected: ALREADY_RUNNING, stage stays idle, and the slice stays parked on sai-2

#### Scenario: next-slice does not complete Direct Build Archive
- **WHEN** the caller emits next-slice while explore-slice is at archive
- **THEN** the response carries rejected: READINESS_IS_NOT_INTENT, stage stays archive, and active is not cleared

#### Scenario: Parked first slice blocks a later slice
- **WHEN** a first slice is parked and a route start is emitted while it remains first pending
- **THEN** the response carries ALREADY_RUNNING and no later pending slice starts.

### Requirement: Anonymous active slice when inventory is empty
When Direct Build or Plan starts and no pending inventory name exists, the machine SHALL reject with NO_PENDING_SLICE with stage idle, active null, and mode null and SHALL dispatch nothing. A non-empty pending set SHALL start with pending[0] and SHALL ignore any legacy pick value, even one outside the pending set, with no rejection on that basis. An active run SHALL keep ALREADY_RUNNING precedence over NO_PENDING_SLICE. An exhausted set SHALL reject like the empty case. Store or panel failure SHALL keep degraded mode with no blind selector.

#### Scenario: Empty inventory uses current as active
- **WHEN** the caller emits direct-build while set is empty or every name is already in done under the prior behavior
- **THEN** the prior active-is-current behavior is superseded by NO_PENDING_SLICE rejection with stage idle, active null, mode null, and no dispatch

#### Scenario: Empty inventory rejects without dispatch
- **WHEN** the caller emits direct-build while set is empty or every name is already in done
- **THEN** the response carries rejected NO_PENDING_SLICE with stage idle, active null, mode null, and unchanged set and done and no dispatch

### Requirement: Required machineId with no first-machine fallback

Every `/emit` and `/restore` targeting `explore-slice@1` SHALL name `machineId: "explore-slice@1"`. An omitted `machineId` SHALL be `INVALID_EVENT`. A mistyped or unknown id SHALL be `UNKNOWN_MACHINE`. Nothing SHALL fall back to the first persisted machine.

#### Scenario: Restore without machineId is INVALID_EVENT

- **WHEN** the caller POSTs `/restore` with no `machineId`
- **THEN** the response is `INVALID_EVENT` and does not restore the first persisted machine

### Requirement: Plan cursor travels in stage
Selecting Plan SHALL emit intent plan with no pick and no slice name to explore-slice. The machine SHALL set active to the first pending inventory name, set mode to plan, and set stage to sai-1. Completing sai-1 then sai-2 SHALL emit intent complete and advance stage sai-1 to sai-2 to implement. Pipeline-plan-unattended SHALL be next.follow for all three Plan stages. Last idle is rest and SHALL NOT restart Plan.

#### Scenario: Plan walks sai-1 then sai-2 then implement
- **WHEN** the caller emits plan and then two complete intents against explore-slice
- **THEN** stage is sai-1, then sai-2, then implement, mode is plan, and next.follow remains the Plan pipeline path

#### Scenario: Plan starts first pending without pick
- **WHEN** the caller emits plan with a legacy pick value against a non-empty pending set
- **THEN** active is the first pending name regardless of that pick value.

### Requirement: Plan implement completes only on next-slice

A `complete` intent while Plan is at `implement` SHALL reject with `READINESS_IS_NOT_INTENT` and SHALL NOT mark the slice done. A `next-slice` intent while Plan is at `implement` SHALL mark the active slice done, clear `active`, clear `mode`, and return `stage` to `idle`. A `next-slice` intent while Plan is at `sai-1` or `sai-2` SHALL reject with `READINESS_IS_NOT_INTENT` and SHALL NOT move the cursor.

#### Scenario: next-slice on implement marks the slice done

- **WHEN** the caller emits `next-slice` while `explore-slice@1` is at `implement` with an active Plan slice
- **THEN** `stage` is `idle`, `active` is null, `mode` is null, and the former active name is in `done`

#### Scenario: next-slice on sai-1 stays put

- **WHEN** the caller emits `next-slice` while `explore-slice@1` is at `sai-1`
- **THEN** the response carries `rejected: READINESS_IS_NOT_INTENT` and `stage` stays `sai-1`

### Requirement: Next-slice close ownership lives in slice
`sai/commands/explore/steps/slice.md` SHALL own the Plan and Manual next-slice close with bare-token and dominant-intent recognition, and Direct Build SHALL never use next-slice with Archive completion marking the slice done.

#### Scenario: Slice close resolves in slice step
- **WHEN** a Plan or Manual slice closes
- **THEN** the slice ownership rules govern completion with no Direct Build next-slice

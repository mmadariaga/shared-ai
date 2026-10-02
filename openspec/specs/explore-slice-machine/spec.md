# explore-slice-machine Specification

## Purpose
TBD - created by archiving change explore-slice-machine. Update Purpose after archive.

## Requirements

### Requirement: Combined slice inventory and Direct Build TODO

The store CLI tool SHALL host `explore-slice@1` as the post-crystallization machine. The machine SHALL keep slice inventory readiness (`inventoryReady`, `set`, `active`, `done`), inventory version, block-emission closure, parked steps, and Plan / Direct Build TODO in CLI-owned state. A successful `recordedList` event SHALL replace `set`, mark the new inventory ready, increment its version, clear `done`, discard every parked step, and preserve a running route cursor. When no slice is active, it SHALL return `next.follow: sai/commands/explore/steps/route-selector.md` so the selector can present the native picker. `blockEmissionTurnClosed` SHALL remain true until the coordinator receives one valid picker answer and emits `route-choice`; Plan and Direct Build intents SHALL reject while that gate is true. Inventory, active, done, parked steps, mode, and the new control fields SHALL not appear on the wire.

#### Scenario: Recording inventory does not move the cursor

- **WHEN** the caller invokes `emit` with `recordedList` while `explore-slice@1` is at `idle` with no active slice
- **THEN** `set` is replaced with the supplied list, the machine enters `waiting`, and the response returns the selector pointer while route intents remain rejected until picker answer activation

#### Scenario: Re-crystallization discards parked steps

- **WHEN** the caller emits `recordedList` while a slice is parked on `sai-2`
- **THEN** no parked step remains, the new inventory starts in waiting with the selector pointer available when no route is active, and a later valid picker answer applies only to the first pending slice

### Requirement: Direct Build cursor travels in stage

Selecting Direct Build SHALL require a complete inventory and a later `route-choice` activation. The machine SHALL set active to the first pending inventory name, set mode to direct-build, and set stage to build-implement. Completing each route item SHALL emit intent complete and advance stage build-implement to backfill to archive. The wire SHALL keep stage as the cursor and SHALL not add response fields beyond stage, next, rejected, and warnings.

#### Scenario: Direct Build walks build-implement then backfill then archive

- **WHEN** the caller emits `direct-build` after route-choice activation and then two complete intents against explore-slice
- **THEN** stage is build-implement, then backfill, then archive, and each response stays pointer-only plus optional rejected and warnings

#### Scenario: Direct Build starts first pending without pick

- **WHEN** the caller emits direct-build after route-choice activation with a legacy pick value against a non-empty pending set
- **THEN** active is the first pending name regardless of that pick value

### Requirement: Archive completion marks the slice done

Completing Archive SHALL mark the active slice done, clear `active`, clear `mode`, and return `stage` to `waiting`. Direct Build SHALL never treat `next-slice` as that done signal.

#### Scenario: Completing Archive clears active and records done

- **WHEN** the caller emits `complete` while `explore-slice@1` is at `archive` with an active slice
- **THEN** `stage` is `waiting`, `active` is null, `mode` is null, and the former active name is in `done`

### Requirement: Fail, cancel, already-running, and next-slice do not mark done

A fail or cancel intent SHALL park the active slice at its current Direct Build or Plan step, clear active and mode, return stage to `waiting`, and SHALL not mark the slice done. A parked first slice SHALL block later slices until it resumes in its own mode at the parked step; selecting it in the other mode SHALL reject with PARKED_IN_OTHER_MODE. A second Direct Build or Plan while active is set, or a route-choice activation while active is set, SHALL reject with ALREADY_RUNNING. A next-slice intent SHALL reject with READINESS_IS_NOT_INTENT except when Plan is at implement.

#### Scenario: Already-running rejects a second Direct Build

- **WHEN** the caller emits direct-build while explore-slice already has active set
- **THEN** the response carries rejected: ALREADY_RUNNING, stage stays on the pending Direct Build step, and done is unchanged

#### Scenario: Already-running rejects Plan while Direct Build is active

- **WHEN** the caller emits plan while explore-slice already has active set in direct-build mode
- **THEN** the response carries rejected: ALREADY_RUNNING, mode stays direct-build, and done is unchanged

#### Scenario: Fail leaves the active step pending

- **WHEN** the caller emits fail during an active Direct Build
- **THEN** stage returns to waiting, active is null, the slice is parked at its current step, and the slice is not appended to done

#### Scenario: A parked slice resumes at its parked step

- **WHEN** a Plan slice parked on sai-2 is selected again with plan after route-choice activation
- **THEN** active is that slice, stage is sai-2, and no parked step remains for it

#### Scenario: A parked slice rejects the other mode

- **WHEN** a Plan slice parked on sai-2 is selected with direct-build after route-choice activation
- **THEN** the response carries rejected: PARKED_IN_OTHER_MODE, stage stays waiting, and the slice stays parked on sai-2

#### Scenario: next-slice does not complete Direct Build Archive

- **WHEN** the caller emits next-slice while explore-slice is at archive
- **THEN** the response carries rejected: READINESS_IS_NOT_INTENT, stage stays archive, and active is not cleared

#### Scenario: Parked first slice blocks a later slice

- **WHEN** a first slice is parked and a route start is emitted while it remains first pending
- **THEN** the response carries PARKED_IN_OTHER_MODE and no later pending slice starts

### Requirement: Every slice close re-locks the route gate

Completing a slice (Archive for Direct Build, `next-slice` for Plan) and parking a slice (`fail` or `cancel`) SHALL set `blockEmissionTurnClosed` back to true, so a later Plan or Direct Build intent SHALL reject with ROUTE_CHOICE_REQUIRED until a fresh `route-choice`. The machine SHALL keep an `autoContinueReady` flag that only a clean Direct Build finish sets. An `auto-continue` intent SHALL start the first pending slice as Direct Build only while that flag is set; otherwise it SHALL reject with ROUTE_CHOICE_REQUIRED, or ALREADY_RUNNING while a slice is active, or NO_PENDING_SLICE on an exhausted set. Starting any slice, parking, `route-choice`, and `recordedList` SHALL clear the flag.

#### Scenario: A finished slice needs a fresh picker answer

- **WHEN** a slice finishes or is parked and the caller emits plan or direct-build without a new route-choice
- **THEN** the response carries rejected: ROUTE_CHOICE_REQUIRED and no slice starts

#### Scenario: Auto-continue follows only a clean Direct Build finish

- **WHEN** a Direct Build slice completes Archive and the caller emits auto-continue with pending slices remaining
- **THEN** the first pending slice starts in direct-build mode at build-implement

#### Scenario: Auto-continue after Plan is refused

- **WHEN** a Plan slice closes with next-slice and the caller emits auto-continue
- **THEN** the response carries rejected: ROUTE_CHOICE_REQUIRED

### Requirement: Anonymous active slice when inventory is empty

Before a complete inventory exists, Direct Build or Plan SHALL reject with INVENTORY_NOT_READY. After an explicitly recorded empty inventory, the machine SHALL reject with NO_PENDING_SLICE. An exhausted set SHALL reject like the empty case. A non-empty pending set SHALL start with its first pending name, and an active run SHALL keep ALREADY_RUNNING precedence.

#### Scenario: Empty inventory uses current as active

- **WHEN** the caller emits direct-build before inventory recording or after recording an empty or exhausted inventory
- **THEN** the machine returns INVENTORY_NOT_READY before recording and NO_PENDING_SLICE afterward, with stage and active unchanged

#### Scenario: Empty inventory rejects without dispatch

- **WHEN** the caller emits direct-build after recording an empty inventory or after every name is done
- **THEN** the response carries rejected NO_PENDING_SLICE with stage waiting, active null, and unchanged set and done

### Requirement: Required machineId with no first-machine fallback

Every `/emit` and `/restore` targeting `explore-slice@1` SHALL name `machineId: "explore-slice@1"`. An omitted `machineId` SHALL be `INVALID_EVENT`. A mistyped or unknown id SHALL be `UNKNOWN_MACHINE`. Nothing SHALL fall back to the first persisted machine.

#### Scenario: Restore without machineId is INVALID_EVENT

- **WHEN** the caller POSTs `/restore` with no `machineId`
- **THEN** the response is `INVALID_EVENT` and does not restore the first persisted machine

### Requirement: Plan cursor travels in stage

Selecting Plan SHALL require later route-choice activation, then set active to the first pending inventory name, set mode to plan, and set stage to sai-1. Completing sai-1 then sai-2 SHALL emit intent complete and advance stage sai-1 to sai-2 to implement. Pipeline-plan-unattended SHALL be next.follow for all three Plan stages. The route returns to waiting after Plan closes.

#### Scenario: Plan walks sai-1 then sai-2 then implement

- **WHEN** the caller emits plan after route-choice activation and then two complete intents against explore-slice
- **THEN** stage is sai-1, then sai-2, then implement, mode is plan, and next.follow remains the Plan pipeline path

#### Scenario: Plan starts first pending without pick

- **WHEN** the caller emits plan after route-choice activation with a legacy pick value against a non-empty pending set
- **THEN** active is the first pending name regardless of that pick value

### Requirement: Plan implement completes only on next-slice

A `complete` intent while Plan is at `implement` SHALL reject with `READINESS_IS_NOT_INTENT` and SHALL not mark the slice done. A `next-slice` intent while Plan is at `implement` SHALL mark the active slice done, clear `active`, clear `mode`, and return `stage` to `waiting`. A `next-slice` intent while Plan is at `sai-1` or `sai-2` SHALL reject with `READINESS_IS_NOT_INTENT` and SHALL not move the cursor.

#### Scenario: next-slice on implement marks the slice done

- **WHEN** the caller emits `next-slice` while `explore-slice@1` is at `implement` with an active Plan slice
- **THEN** stage is `waiting`, active is null, mode is null, and the former active name is in done

#### Scenario: next-slice on sai-1 stays put

- **WHEN** the caller emits `next-slice` while `explore-slice@1` is at `sai-1`
- **THEN** the response carries rejected: READINESS_IS_NOT_INTENT and stage stays `sai-1`

### Requirement: Next-slice close ownership lives in slice
`sai/commands/explore/steps/slice.md` SHALL own the Plan and Manual next-slice close with bare-token and dominant-intent recognition, and Direct Build SHALL never use next-slice with Archive completion marking the slice done.

#### Scenario: Slice close resolves in slice step
- **WHEN** a Plan or Manual slice closes
- **THEN** the slice ownership rules govern completion with no Direct Build next-slice

### Requirement: Slice inventory is derived from validated Ready to Propose blocks

The explore crystallization close SHALL record the `explore-slice@1` inventory only through the block emit, which derives the `recordedList` from the `**Change name**` values extracted from the validated block set, in display order. The close SHALL never compose a `recordedList` by hand. The derived event SHALL keep the existing `recordedList` semantics: it replaces `set` atomically, preserves a running cursor, and discards parked steps, and a later block emit replaces the inventory and the pending route choice. When a slice is active, the block emit SHALL return that slice's pointer rather than the route-selector pointer.

#### Scenario: Multi-slice set records names in display order

- **WHEN** the block emit receives a valid set of several blocks with header text between them
- **THEN** the inventory records every change name in display order and ignores the header text

#### Scenario: Later block emit replaces the inventory

- **WHEN** a second valid block emit arrives in the same session
- **THEN** its names replace the earlier inventory and the pending route choice

#### Scenario: Active slice keeps its pointer

- **WHEN** a valid block emit arrives while a slice route is active
- **THEN** the inventory is replaced and the response returns the active slice's pointer instead of `route-selector.md`

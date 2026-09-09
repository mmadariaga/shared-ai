## ADDED Requirements

### Requirement: Combined slice inventory and Direct Build TODO

The sidecar SHALL host `explore-slice@1` as the post-crystallization machine. The machine SHALL keep slice inventory (`set`, `active`, `done`) and Direct Build TODO (`mode` plus `stage` cursor) in sidecar-owned state. A `recordedList` event SHALL replace `set` without moving the Direct Build cursor. Inventory, active, done, and mode SHALL NOT appear on the wire.

#### Scenario: Recording inventory does not move the cursor

- **WHEN** the caller emits `recordedList` while `explore-slice@1` is at `idle`
- **THEN** `set` is replaced with the supplied list, `stage` stays `idle`, and the response carries no `set`, `active`, `done`, or `mode` fields

### Requirement: Direct Build cursor travels in stage

Selecting Direct Build SHALL emit `{intent: "direct-build"}` to `explore-slice@1`. The machine SHALL set `active` to the first pending inventory name, set `mode` to `direct-build`, and set `stage` to `build-implement`. Completing each route item SHALL emit `{intent: "complete"}` and advance `stage` `build-implement` → `backfill` → `archive`. The wire SHALL keep `stage` as the cursor and SHALL NOT add response fields beyond the existing `{stage, next, rejected?, warnings?}`.

#### Scenario: Direct Build walks build-implement then backfill then archive

- **WHEN** the caller emits `direct-build` and then two `complete` intents against `explore-slice@1`
- **THEN** `stage` is `build-implement`, then `backfill`, then `archive`, and each response stays pointer-only `{stage, next}` plus optional `rejected` and `warnings`

### Requirement: Archive completion marks the slice done

Completing Archive SHALL mark the active slice done, clear `active`, clear `mode`, and return `stage` to `idle`. Direct Build SHALL NEVER treat `next-slice` as that done signal.

#### Scenario: Completing Archive clears active and records done

- **WHEN** the caller emits `complete` while `explore-slice@1` is at `archive` with an active slice
- **THEN** `stage` is `idle`, `active` is null, `mode` is null, and the former active name is in `done`

### Requirement: Fail, cancel, already-running, and next-slice do not mark done

A `fail` or `cancel` intent SHALL leave the active Direct Build step pending and SHALL NOT mark the slice done. A second `direct-build` while `active` is set SHALL reject with `ALREADY_RUNNING` and dispatch nothing. A `next-slice` intent on this machine SHALL reject with `READINESS_IS_NOT_INTENT` and SHALL NOT complete Archive or mark the slice done.

#### Scenario: Already-running rejects a second Direct Build

- **WHEN** the caller emits `direct-build` while `explore-slice@1` already has `active` set
- **THEN** the response carries `rejected: ALREADY_RUNNING`, `stage` stays on the pending Direct Build step, and `done` is unchanged

#### Scenario: Fail leaves the active step pending

- **WHEN** the caller emits `fail` during an active Direct Build
- **THEN** `stage` and `active` stay unchanged and the slice is not appended to `done`

#### Scenario: next-slice does not complete Direct Build Archive

- **WHEN** the caller emits `next-slice` while `explore-slice@1` is at `archive`
- **THEN** the response carries `rejected: READINESS_IS_NOT_INTENT`, `stage` stays `archive`, and `active` is not cleared

### Requirement: Anonymous active slice when inventory is empty

When Direct Build starts and no pending inventory name exists, the machine SHALL set `active` to `current`.

#### Scenario: Empty inventory uses current as active

- **WHEN** the caller emits `direct-build` while `set` is empty or every name is already in `done`
- **THEN** `active` is `current` and `stage` is `build-implement`

### Requirement: Required machineId with no first-machine fallback

Every `/emit` and `/restore` targeting `explore-slice@1` SHALL name `machineId: "explore-slice@1"`. An omitted `machineId` SHALL be `INVALID_EVENT`. A mistyped or unknown id SHALL be `UNKNOWN_MACHINE`. Nothing SHALL fall back to the first persisted machine.

#### Scenario: Restore without machineId is INVALID_EVENT

- **WHEN** the caller POSTs `/restore` with no `machineId`
- **THEN** the response is `INVALID_EVENT` and does not restore the first persisted machine

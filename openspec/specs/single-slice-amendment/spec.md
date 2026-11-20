# single-slice-amendment Specification

## Purpose
Define how one pending or stopped slice of a recorded crystallization set is corrected through a validated re-emission that replaces only that slice's stored block.

## Requirements

### Requirement: Amend emit validates one block for the named slice

`sai-state emit <id> explore-slice@1 --ready-to-propose --amend <change-name>` SHALL accept either the existing stdin `-` form or paired `--block-file <path> --verdicts-file <path>` options. The file form SHALL use the shared composer before session reads or changes. Composition failure SHALL answer `INVALID_EVENT` with `reason: "BLOCK_COMPOSITION_FAILED"`, exit 1, and store nothing. Both forms SHALL validate exactly one block with the dispatchable profile and validate the resulting multi-slice set when applicable. Non-dispatchable content SHALL replace nothing. Wrong block count SHALL report `AMEND_BLOCK_COUNT`; wrong change name SHALL report `AMEND_NAME_MISMATCH`, each with exit 1 and no transition. Missing amend name or use outside the supported block emit SHALL remain usage errors with exit 2.

#### Scenario: Invalid amended text replaces nothing

- **WHEN** an amended block duplicates an implementation item, carries an unjudged flagged line, or is cut off before its `---` line
- **THEN** the emit exits non-zero and the slice's stored block stays unchanged

#### Scenario: A slice of a multi-slice set cannot be amended to None

- **WHEN** one slice of a stored two-slice set is amended to carry `**Implementation Details**` as `- None`
- **THEN** the resulting-set validation reports `NO_IMPLEMENTATION_ITEM`, the emit exits 1, and the stored blocks stay unchanged

#### Scenario: A single stored slice can be amended to None

- **WHEN** the only stored slice is amended to carry `**Implementation Details**` as `- None`
- **THEN** the emit exits 0 and the stored text is the amended block

#### Scenario: Wrong block count or name is rejected

- **WHEN** the amend emit receives two blocks, or one block whose change name differs from the amended slice
- **THEN** the response carries `INVALID_EVENT` with `AMEND_BLOCK_COUNT` or `AMEND_NAME_MISMATCH`, exits 1, and nothing is stored

#### Scenario: Misuse is a usage error

- **WHEN** `--amend` is given without a change name or on another machine
- **THEN** the process exits 2 with no transition

#### Scenario: File amendment composes before storage

- **WHEN** separate block and verdict files describe a valid pending-slice amendment
- **THEN** the same amendment validation applies and only that slice is replaced; invalid composition changes no stored bytes.

### Requirement: An accepted amendment replaces only its slice's stored entry

An accepted amendment SHALL replace only that slice's stored text, hash, and verdicts in the session file, in the same session-file write as the machine outcome. The inventory order, the other slices' stored entries and parked cursors, and the completed slices SHALL stay unchanged; the amended slice's own cursor follows its `amend_kind`. The CLI SHALL compare the stored and the new block field by field and SHALL return `amend_kind` together with the block emit's `validation` block and the ordinary emit fields. An accepted amendment SHALL remove its slice from the session file's `staleBlocks` list. When that write fails, the response SHALL be the store failure (`STORE_WRITE_FAILED` or `STORE_CONFLICT`) with exit 1, and the previous entry SHALL remain stored. A rejected amendment SHALL store nothing.

#### Scenario: Pending slice is replaced alone

- **WHEN** a pending slice of a recorded two-slice set is amended
- **THEN** only that slice's stored text, hash, and verdicts change, and the inventory and the other slice's entry are unchanged

#### Scenario: Amended block carries its own verdicts

- **WHEN** an amended block with a flagged line is emitted with a `context` verdict for that line
- **THEN** the stored entry holds the amended block's verdicts

### Requirement: A pending, stopped, or running slice is amendable

`explore-slice@1` SHALL accept an amendment for a pending, stopped (parked), or running slice of the recorded inventory. A completed slice SHALL be rejected with `rejected: "SLICE_COMPLETED"` and a name not in the recorded inventory with `rejected: "UNKNOWN_SLICE"`. Each rejection SHALL exit 0 and store nothing.

#### Scenario: Stopped slice keeps its cursor

- **WHEN** a stopped slice with a saved cursor receives a metadata amendment
- **THEN** the amendment is accepted and the slice keeps its saved cursor

#### Scenario: Running slice is amendable

- **WHEN** an amendment names the slice whose route is running
- **THEN** the amendment is accepted and the stored block is replaced

#### Scenario: Completed slice is rejected

- **WHEN** an amendment names a completed slice
- **THEN** the response carries `rejected: "SLICE_COMPLETED"` and the stored block stays unchanged

#### Scenario: Unknown slice is rejected

- **WHEN** an amendment names a change that is not in the recorded inventory
- **THEN** the response carries `rejected: "UNKNOWN_SLICE"` and nothing is stored

### Requirement: A metadata amendment keeps the route and a content amendment re-opens the route selector

`amend_kind` SHALL be `metadata` when only block metadata (`Backlog origin`, `Explore origin`) changed and `content` when any other field changed. A `metadata` amendment SHALL keep the route authorization: a running slice SHALL be amended in place, a parked cursor SHALL stay, no route intent SHALL be emitted, and no picker SHALL re-open; a stopped slice SHALL resume at its cursor over a fresh export of the amended block paired with its new hash. A `content` amendment, or any unknown kind, SHALL void that slice's authorization: the slice SHALL return to pending without a cursor, a running slice SHALL be released after its workers are disposed, the route gate SHALL close, and Explore SHALL present the route selector again in the same conversation with the corrected block visible, while the other slices keep their state. Explore SHALL display and validate the corrected block with bounded judgment and submit it using separate block and verdict files and the shared composer.

#### Scenario: Stopped slice resumes over the amended block

- **WHEN** a stopped Direct Build slice receives a metadata amendment and is then resumed
- **THEN** it resumes at its saved cursor and its next dispatch carries a fresh private-file reference and paired hash for the amended stored block

#### Scenario: Content amendment returns the slice to pending

- **WHEN** a running or parked slice is amended with a changed `What`, scope, or `E`/`I` item
- **THEN** the slice is pending without a cursor, the route gate is closed, and the route selector is presented again

#### Scenario: Metadata amendment of a running slice keeps the route

- **WHEN** a running slice is amended with only a changed `Backlog origin`
- **THEN** the slice keeps running at its current step and no route question is asked

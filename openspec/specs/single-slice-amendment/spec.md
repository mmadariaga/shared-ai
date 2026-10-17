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

### Requirement: Only a pending or stopped slice is amendable

`explore-slice@1` SHALL accept an amendment only for a pending or stopped (parked) slice of the recorded inventory and SHALL leave the machine state unchanged. A completed slice SHALL be rejected with `rejected: "SLICE_COMPLETED"`, the running slice with `rejected: "SLICE_RUNNING"`, and a name not in the recorded inventory with `rejected: "UNKNOWN_SLICE"`. Each rejection SHALL exit 0 and store nothing.

#### Scenario: Stopped slice keeps its cursor

- **WHEN** a stopped slice with a saved cursor is amended
- **THEN** the amendment is accepted and the slice keeps its saved cursor

#### Scenario: Running slice is rejected

- **WHEN** an amendment names the slice whose worker is running
- **THEN** the response carries `rejected: "SLICE_RUNNING"` and the stored block stays unchanged

#### Scenario: Completed slice is rejected

- **WHEN** an amendment names a completed slice
- **THEN** the response carries `rejected: "SLICE_COMPLETED"` and the stored block stays unchanged

#### Scenario: Unknown slice is rejected

- **WHEN** an amendment names a change that is not in the recorded inventory
- **THEN** the response carries `rejected: "UNKNOWN_SLICE"` and nothing is stored

### Requirement: An accepted amendment replaces only its slice's stored entry

An accepted amendment SHALL replace only that slice's stored text, hash, and verdicts in the session file. The inventory order, the other slices' stored entries, the completed slices, and every parked cursor SHALL stay unchanged. The response SHALL carry the block emit's `validation` block plus the ordinary emit fields, and SHALL add the `BLOCKS_NOT_STORED` warning when the replacement cannot be confirmed after one retry, in which case the previous entry remains stored.

#### Scenario: Pending slice is replaced alone

- **WHEN** a pending slice of a recorded two-slice set is amended
- **THEN** only that slice's stored text, hash, and verdicts change, and the inventory and the other slice's entry are unchanged

#### Scenario: Amended block carries its own verdicts

- **WHEN** an amended block with a flagged line is emitted with a `context` verdict for that line
- **THEN** the stored entry holds the amended block's verdicts

### Requirement: Amendment re-opens no route

Explore SHALL display and validate the corrected block with bounded judgment and submit its amendment using separate block and verdict files and the shared composer. An accepted amendment SHALL emit no route intent and reopen no picker. A stopped slice SHALL retain its cursor and resume over a fresh export of the amended block paired with its new hash. Running or completed slice rejections SHALL change nothing and wait until the slice stops or the set is re-crystallized.

#### Scenario: Stopped slice resumes over the amended block

- **WHEN** a stopped Direct Build slice is amended and then resumed
- **THEN** it resumes at its saved cursor and its next dispatch carries a fresh private-file reference and paired hash for the amended stored block

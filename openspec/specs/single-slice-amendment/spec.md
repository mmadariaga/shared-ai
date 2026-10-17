# single-slice-amendment Specification

## Purpose
Define how one pending or stopped slice of a recorded crystallization set is corrected through a validated re-emission that replaces only that slice's stored block.

## Requirements

### Requirement: Amend emit validates one block for the named slice

`sai-state emit <id> explore-slice@1 --ready-to-propose --amend <change-name> -` SHALL read one `Ready to Propose` block as text from stdin, in the block emit's delivery form and with the same optional `<<<VERDICTS>>>` suffix, and SHALL validate it with the `dispatchable` profile exactly as the block emit does. When the stored inventory holds more than one slice, the emit SHALL also validate the resulting set — the stored blocks with the named slice replaced by the amended block — with the `dispatchable` profile, so that every slice keeps an in-scope `I` and no `I` is duplicated or left without a slice. A non-dispatchable block or resulting set SHALL return `validation` alone, exit 1, and replace nothing. Stdin carrying more than one block SHALL answer `INVALID_EVENT` with `reason: "AMEND_BLOCK_COUNT"`, and a block whose `**Change name**` differs from `<change-name>` SHALL answer `INVALID_EVENT` with `reason: "AMEND_NAME_MISMATCH"`. Each of these answers SHALL exit 1 with no transition. `--amend` without a non-empty change name, or outside `--ready-to-propose` on `explore-slice@1`, SHALL be a usage error with exit 2.

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

To correct one slice of the recorded set without re-crystallizing the whole set, Explore SHALL display the corrected block, validate it with the same bounded judgment as the block emit, and emit it with `--amend <change-name>` instead of a new block emit. An accepted amendment SHALL emit no route intent and re-open no picker, and a stopped slice SHALL resume at its saved cursor over the amended block. A `SLICE_COMPLETED` or `SLICE_RUNNING` rejection SHALL change nothing, and the correction SHALL wait until the slice stops or the set is re-crystallized.

#### Scenario: Stopped slice resumes over the amended block

- **WHEN** a stopped Direct Build slice is amended and then resumed
- **THEN** it resumes at its saved cursor and its next dispatch carries the amended block and hash from the store

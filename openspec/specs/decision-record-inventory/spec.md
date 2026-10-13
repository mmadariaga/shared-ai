# decision-record-inventory Specification

## Purpose
Report the facts of one decision-record family (ADR or DDR) deterministically from disk: whether its index exists, which records exist, the next free number, and duplicates. Consumers read these facts from the tool instead of inferring them from a file search, so the answer is the same on every harness and for folders ignored in git.

## Requirements

### Requirement: The inventory reports one decision-record family from disk

`sai/tools/decision-records.js inventory --family <adr|ddr> [--json] [--cwd <dir>]` SHALL read `docs/<family>/` and `docs/<family>/archive/` with the filesystem and SHALL print exactly one JSON object with `family`, `index_exists`, `records`, `next_number`, and `duplicates`, exiting 0. The result SHALL NOT depend on whether git ignores the folder. `--json` SHALL be accepted and change nothing. The tool SHALL only report: it MUST NOT rename, move, create, or repair any file.

#### Scenario: Family folder ignored in git

- **WHEN** `docs/ddr/` is ignored in git and holds `0000-INDEX.md` and `0041-last-decision.md`
- **THEN** the inventory reports `index_exists: true`, lists that record, and returns `next_number` `0042`

#### Scenario: Family folder does not exist

- **WHEN** the inventory runs for a family whose `docs/<family>/` folder is missing
- **THEN** it reports `index_exists: false`, an empty `records` list, `next_number` `0001`, and an empty `duplicates` list

#### Scenario: Each family is read from its own folder

- **WHEN** only `docs/adr/` holds an index and records and the inventory runs with `--family ddr`
- **THEN** it reports `index_exists: false` and an empty `records` list

### Requirement: Index existence reads only the family index file

`index_exists` SHALL be true if and only if `docs/<family>/0000-INDEX.md` is a file. Records in the family and an `0000-INDEX.md` under `archive/` MUST NOT make it true.

#### Scenario: Records exist without an index

- **WHEN** `docs/ddr/` holds `0003-third.md` and `0007-seventh.md` and no `0000-INDEX.md`
- **THEN** the inventory reports `index_exists: false`, lists both records, and returns `next_number` `0008`

#### Scenario: An archived index is not the index

- **WHEN** `docs/ddr/archive/0000-INDEX.md` exists and `docs/ddr/0000-INDEX.md` does not
- **THEN** the inventory reports `index_exists: false`

### Requirement: Only numbered record files are records

A record SHALL be a file named `NNNN-slug.md` or letter-suffixed `NNNNx-slug.md` directly under `docs/<family>/` or `docs/<family>/archive/`. Every other entry MUST be ignored, `0000-INDEX.md` and nested folders included. Each record SHALL be reported as `number` (four digits), `suffix` (empty when absent), root-relative `path` with `/` separators, and `archived` (true only under `archive/`), ordered by number, suffix, then path.

#### Scenario: Non-record files are ignored

- **WHEN** `docs/adr/` holds `0174-plain.md`, `0175a-first-half.md`, `0175b-second-half.md`, `README.md`, `0200-not-markdown.txt`, `999-short-number.md`, `0300.md`, and a nested folder containing a record-named file
- **THEN** `records` lists only `0174-plain.md`, `0175a-first-half.md`, and `0175b-second-half.md`, with suffixes ``, `a`, and `b`

#### Scenario: Archived records are listed as archived

- **WHEN** `docs/ddr/` holds `0002-live.md` and `docs/ddr/archive/` holds `0009-retired.md`
- **THEN** `records` lists both, with `archived: false` for the first and `archived: true` for the second

### Requirement: The next number is the highest record number plus one

`next_number` SHALL be the highest record number across the family folder and its `archive/`, plus one, zero-padded to four digits, and SHALL be `0001` when the family has no record. A letter-suffixed record SHALL count under its number, and an archived record SHALL count, so a retired number is never reused.

#### Scenario: Suffixed records count under their number

- **WHEN** `0175a` and `0175b` are the highest records of the family
- **THEN** `next_number` is `0176`

#### Scenario: Archived records count toward the next number

- **WHEN** the highest live record is `0002` and `archive/` holds `0009-retired.md`
- **THEN** `next_number` is `0010`

### Requirement: Files sharing number and suffix are reported as duplicates

`duplicates` SHALL carry one `{ number, suffix, paths }` entry for every number-and-suffix pair held by more than one file, and SHALL be empty otherwise. Records that share a number but differ in suffix MUST NOT be duplicates. Duplicates SHALL NOT change how `next_number` is computed.

#### Scenario: Two files share number and suffix

- **WHEN** `docs/adr/` holds `0004-first-slug.md`, `0004-second-slug.md`, `0005a-one.md`, `0005a-two.md`, and `0005b-other.md`
- **THEN** `duplicates` lists the `0004` pair and the `0005a` pair, `0005b` is not a duplicate, and `next_number` is `0006`

### Requirement: Invalid inventory invocations are usage errors

The tool SHALL exit 2 without printing an inventory when the `inventory` sub-command is missing, when `--family` is missing or is not `adr` or `ddr`, when a flag is unknown, or when the `--cwd` directory does not exist.

#### Scenario: Unknown family

- **WHEN** the tool runs with `inventory --family rfc`
- **THEN** it exits 2

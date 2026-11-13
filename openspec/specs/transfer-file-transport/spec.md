# transfer-file-transport Specification

## Purpose
TBD - created by archiving change transfer-file-references-backfill. Update Purpose after archive.

## Requirements

### Requirement: Harness temp root resolution

`sai/tools/transfer.js` SHALL place every transfer directory under the SAI temp root that the shared module `sai/tools/temp-root.js` resolves: `/tmp/opencode/sai` for opencode and `/tmp/claude-{uid}/sai` for Claude Code on Linux, and `<os.tmpdir()>/<harness>/sai` on Windows and macOS. It SHALL reject any harness other than `claude` or `opencode` and SHALL keep no root logic of its own. On Linux a missing harness root SHALL NOT be created and SHALL be reported as a concrete blocker; the harness root and `sai/` MUST be existing directories that are not symbolic links.

#### Scenario: opencode on Linux uses its fixed root

- **WHEN** the root is resolved for opencode on Linux
- **THEN** transfer directories live under `/tmp/opencode/sai`, and Claude Code on Linux uses `/tmp/claude-{uid}/sai`

#### Scenario: A missing root is never created

- **WHEN** the harness root does not exist on Linux
- **THEN** the module raises a blocker naming the root and creates nothing

#### Scenario: A symbolic-link or file root is rejected

- **WHEN** the harness root or its `sai/` folder is a symbolic link or a regular file
- **THEN** the module rejects it as not an existing non-link directory

### Requirement: Open creates one private per-invocation transfer directory

`transfer.js open --harness <claude|opencode>` SHALL create one unique directory named `sai-transfer-XXXXXX` under the SAI temp root through `temp-root.js`, set its mode to `0700` on POSIX, write a `.sai-transfer` marker file inside it, and return its absolute real path as `dir`. When the temp root is missing or unusable, `open` SHALL exit 2 with the blocker message and create nothing.

#### Scenario: Open returns a private directory

- **WHEN** `open` runs with an existing temp root on POSIX
- **THEN** it returns the absolute path of a new `sai-transfer-` directory under the SAI temp root with mode `0700` that contains the marker file

#### Scenario: Open stops on a missing root

- **WHEN** `open` runs and the Linux harness temp root is missing
- **THEN** it exits 2 with the blocker message and no directory is created

### Requirement: Transfer directory identity

`put`, `verify`, `materialize`, and `close` SHALL accept a directory only when it is an absolute path to an existing non-link directory whose name matches `sai-transfer-XXXXXX`, that contains the `.sai-transfer` marker file, and that is owned by the current user on POSIX; any other directory SHALL fail the check with exit 1.

#### Scenario: A foreign directory is refused

- **WHEN** `put` or `verify` names a directory that lacks the transfer name or marker
- **THEN** the helper exits 1 and reads or writes nothing in it

### Requirement: Put writes standard input inside the transfer directory

`transfer.js put --dir <dir> --path <relative> [--exclusive] [--input-file <path>]` SHALL write the bytes read from the input file, or from standard input when no input file is given, to the forward-slash relative path inside the transfer directory, creating intermediate plain directories, and SHALL return the absolute `path` and the `sha256` of the written bytes. The input file SHALL be read through the shared input reader, so a missing, unreadable, or empty input file fails naming the path and writes nothing. Without `--exclusive`, writing the same path again SHALL replace the file. With `--exclusive`, the file SHALL be created by one exclusive-create open, so an existing name (a file, a symbolic link, anything) fails atomically with exit 1 and leaves the existing entry and its sha256 unchanged, and a failed write leaves no partial file. An absolute path, a path with an empty, `.`, or `..` segment, a backslash or colon, or a reserved name (the marker `.sai-transfer` or the ledger `.sai-accepted`) SHALL be rejected, and an existing intermediate entry that is not a plain directory, or a target that is not a regular file, SHALL fail the check.

#### Scenario: Put returns path and hash

- **WHEN** a worker passes content to `put` with a valid relative path, as an input file or on standard input
- **THEN** the file holds exactly those bytes and the result carries its absolute path and sha256

#### Scenario: An escaping path is rejected

- **WHEN** `put` receives an absolute path, a `..` segment, a backslash, the marker name, or the ledger name
- **THEN** it exits with a failure and writes nothing

#### Scenario: An exclusive put never replaces a file

- **WHEN** `put --exclusive` targets a name that already exists in the transfer directory
- **THEN** it fails and the existing file and its sha256 stay unchanged

#### Scenario: A put without the flag still replaces

- **WHEN** `put` without `--exclusive` targets a name that already exists
- **THEN** the file holds the new bytes and the result carries their sha256

### Requirement: Verify checks location, links, and hash

`transfer.js verify --dir <dir> --path <absolute> --sha256 <hex>` SHALL succeed only when the path lies inside the transfer directory and is neither the marker file nor the ledger file, no path component below the directory is a symbolic link, the target is a readable regular file, the sha256 is 64 lowercase hexadecimal characters, and the file's sha256 equals it. Any other case SHALL exit 1, including a missing file, a repository path, and a `..` traversal that resolves outside the directory.

#### Scenario: A matching reference verifies

- **WHEN** `verify` receives the path and sha256 returned by `put`
- **THEN** it exits 0

#### Scenario: A changed or misplaced file fails

- **WHEN** the file content no longer matches the sha256, or the path lies outside the directory or passes through a symbolic link
- **THEN** `verify` exits 1 with a check failure

### Requirement: Materialize copies only verified bytes

`transfer.js materialize --dir <dir> --path <absolute> --sha256 <hex> --destination <path> [--cwd <root>]` SHALL verify the reference and write exactly the verified bytes to the destination resolved against `--cwd` (default the working directory), creating missing parent directories. The destination MUST stay inside that root, including through symbolic-linked ancestors, and an existing destination that is not a regular file SHALL be refused. On any check failure `materialize` SHALL write nothing.

#### Scenario: Materialized content is byte-identical

- **WHEN** `materialize` runs on a verified reference
- **THEN** the destination holds bytes identical to the transfer file, with parent directories created as needed

#### Scenario: Content changed after validation is not written

- **WHEN** the transfer file changed after its reference was recorded
- **THEN** `materialize` exits 1 and the destination is not written

#### Scenario: An escaping destination is refused

- **WHEN** the destination lies outside the `--cwd` root or reaches outside it through a symbolic link
- **THEN** `materialize` exits 1 and writes nothing

### Requirement: Close removes only its own transfer directory

`transfer.js close --dir <dir>` SHALL remove only the named transfer directory after its identity check, SHALL NOT follow a symbolic link planted at the directory name, and SHALL succeed without removal when a directory with a transfer name is already gone.

#### Scenario: Close leaves other directories intact

- **WHEN** `close` runs on one transfer directory while another transfer directory exists
- **THEN** only the named directory is removed and a repeated `close` succeeds with nothing removed

### Requirement: JSON output and SAI exit codes

Every `transfer.js` call SHALL print one JSON object on standard output and SHALL exit 0 on success, 1 on a check failure, and 2 on a usage error or IO failure, including an unknown sub-command, an unknown flag, a missing required flag, or a missing harness temp root.

#### Scenario: Usage errors exit 2

- **WHEN** `transfer.js` runs with an unknown sub-command or a missing required flag
- **THEN** it prints a JSON object with `ok: false` and exits 2

### Requirement: Worker reports are saved exclusively

Every worker report save SHALL use `transfer.js put --exclusive`: `sai/policies/worker-report-transport.md` § Author boundary and every worker card that spells the report `put` command SHALL carry the flag. Block export and backfill drafts SHALL keep the replacing default.

#### Scenario: Worker cards spell the exclusive save

- **WHEN** a worker card or the transport policy spells the command that saves a worker report
- **THEN** that command carries `--exclusive`

### Requirement: Accept records processed references in a ledger

`transfer.js accept --dir <dir> --path <absolute> --sha256 <hex>` SHALL verify the reference as `verify` does and SHALL record it in the reserved ledger file `.sai-accepted` inside the transfer directory, one JSON line per reference. Recording a reference that is already in the ledger SHALL change nothing. The result SHALL carry `already` (the reference was recorded before this call) and `recorded` (this call recorded it). With `--check`, the call SHALL only look the reference up in the ledger: it SHALL read no report, record nothing, and answer `already`. A torn ledger line SHALL NOT count as a reference.

#### Scenario: A processed reference is recorded once

- **WHEN** `accept` runs twice on the same verified path and sha256
- **THEN** the first call answers `recorded: true` and the second answers `already: true` and adds no ledger line

#### Scenario: Check mode records nothing

- **WHEN** `accept --check` runs on a reference that is not in the ledger
- **THEN** it answers `already: false`, reads no report, and leaves the ledger unchanged

#### Scenario: A reference that fails verification is not recorded

- **WHEN** `accept` runs on a path outside the directory or with a sha256 that does not match the file
- **THEN** it exits 1 and records nothing

### Requirement: Watch reports undelivered reports

`transfer.js watch --dir <dir> [--settle <duration>] [--max <duration>] [--poll <duration>]` SHALL poll the transfer directory inside its own process, every `--poll` (default 5s), until the directory holds at least one report that is not in the ledger and whose file has not changed for at least the settle delay (default 60s). It SHALL then print those reports as `reports`, each `{path, sha256}` with the sha256 computed by the tool, in creation order, and exit 0. When `--max` (default 30m) passes first, it SHALL print an empty `reports` list and exit 0. A duration SHALL be a whole number followed by `ms`, `s`, `m`, or `h`, and any other value SHALL be a usage error. Draft files (a name that contains `.draft.`), symbolic links, the transfer marker, and the ledger SHALL never be reported. A directory that disappears during the watch SHALL end it with an empty list.

#### Scenario: A settled unaccepted report is found

- **WHEN** the directory holds a report that is not in the ledger and has been on disk for the settle delay
- **THEN** `watch` exits with that report's path and sha256 in `reports`

#### Scenario: Reports come out in creation order

- **WHEN** several unaccepted settled reports exist
- **THEN** `watch` lists them in the order they were created

#### Scenario: An accepted or unsettled report is not reported

- **WHEN** the only reports in the directory are in the ledger or changed less than the settle delay ago
- **THEN** `watch` keeps polling and does not report them

#### Scenario: The maximum ends the watch with an empty list

- **WHEN** no qualifying report appears before `--max`
- **THEN** `watch` exits 0 with an empty `reports` list

#### Scenario: Drafts are never reports

- **WHEN** the directory holds a file whose name contains `.draft.`
- **THEN** `watch` never lists it

### Requirement: Transfer CLI rejects repeated single-value flags

`transfer.js` SHALL reject any of its single-value flags given more than once as a usage error: it SHALL print a JSON object with `ok: false` and an error naming the flag (`<flag> accepts one value`), exit 2, and change nothing. It SHALL NOT silently keep the last value of a repeated flag.

#### Scenario: Repeated --dir on close
- **WHEN** `close --dir <dir> --dir <dir>` runs on an existing transfer directory
- **THEN** it exits 2, the error says `--dir accepts one value`, and the directory still exists

#### Scenario: Repeated --path on put
- **WHEN** `put` runs with `--path` given twice
- **THEN** it exits 2 and writes no file

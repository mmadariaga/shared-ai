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

`transfer.js put --dir <dir> --path <relative>` SHALL write the bytes read from standard input to the forward-slash relative path inside the transfer directory, creating intermediate plain directories, and SHALL return the absolute `path` and the `sha256` of the written bytes. Writing the same path again SHALL replace the file. An absolute path, a path with an empty, `.`, or `..` segment, a backslash or colon, or the reserved marker name SHALL be rejected, and an existing intermediate entry that is not a plain directory, or a target that is not a regular file, SHALL fail the check.

#### Scenario: Put returns path and hash

- **WHEN** a worker pipes content to `put` with a valid relative path
- **THEN** the file holds exactly those bytes and the result carries its absolute path and sha256

#### Scenario: An escaping path is rejected

- **WHEN** `put` receives an absolute path, a `..` segment, a backslash, or the marker name
- **THEN** it exits with a failure and writes nothing

### Requirement: Verify checks location, links, and hash

`transfer.js verify --dir <dir> --path <absolute> --sha256 <hex>` SHALL succeed only when the path lies inside the transfer directory and is not the marker file, no path component below the directory is a symbolic link, the target is a readable regular file, the sha256 is 64 lowercase hexadecimal characters, and the file's sha256 equals it. Any other case SHALL exit 1, including a missing file, a repository path, and a `..` traversal that resolves outside the directory.

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

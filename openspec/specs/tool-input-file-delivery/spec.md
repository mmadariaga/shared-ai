# tool-input-file-delivery Specification

## Purpose
TBD - created by archiving change structured-input-file-delivery. Update Purpose after archive.

## Requirements

### Requirement: Shared input reader for structured tool input

The repository SHALL provide one shared reader, `sai/tools/input-reader.js`, that every SAI tool reading structured input uses. The reader SHALL resolve `--input-file <path>` (or `--input-file=<path>`) first and SHALL fall back to standard input only when no input file is given. It SHALL reject the flag without a path and the flag given more than once. The tools that read structured input through it SHALL include `bin/sai-state.js` `emit` (event, `--progress`, and `--ready-to-propose` forms), `worker-report-validator.js`, `validate-backfill-drafts.js`, `tool-access.js`, `ready-to-propose.js` (`check`, `hash`, `dependencies`, `attach-origin`, and `convert`), `commit.js apply`, `from-backlog.js`, `from-next-backlog-item.js select`, `to-backlog.js`, `to-pr.js`, `new-change-branch.js`, `transfer.js put`, `merge.js` (`valid`, `collision`, and `correction`), and `skills/universal/sai-cache-warmer/wait.js` (`prepare`, `wait`, and the JSON form of `warm`).

#### Scenario: Input file wins over stdin
- **WHEN** a converted tool is run with `--input-file <path>`
- **THEN** it reads its structured input from that file and does not read standard input

#### Scenario: Flag misuse is rejected
- **WHEN** `--input-file` is given without a path or more than once
- **THEN** the reader raises an input-file error instead of choosing an input

### Requirement: Stdin input stays accepted

Every tool converted to the input file SHALL still accept its structured input on standard input (the `-` form or no input file), so instructions installed before the input file existed keep working. The same payload SHALL produce the same result through either channel.

#### Scenario: Same payload through both channels
- **WHEN** `worker-report-validator.js validate` receives the same payload once from an input file and once on standard input
- **THEN** both runs return the same validation result

### Requirement: Input file bytes arrive unchanged

The reader SHALL read the input file as raw bytes and decode them as UTF-8 without normalization, so quotes, braces, and non-ASCII characters reach the tool exactly as written. `transfer.js put --input-file <path>` SHALL store the input file's bytes exactly.

#### Scenario: Shell-sensitive and non-ASCII content
- **WHEN** an input file holds JSON with quotes, braces, and non-ASCII characters
- **THEN** the tool receives exactly those characters

#### Scenario: Transfer put keeps the bytes
- **WHEN** `transfer.js put --dir <dir> --path <relative> --input-file <path>` runs
- **THEN** the stored file has the same bytes and sha256 as the input file

### Requirement: Unusable input file fails without state change

A missing, unreadable, or empty input file SHALL make the tool fail with a usage error whose message names the path, and the tool SHALL change no state. `sai-state emit` SHALL exit 2 and report that no transition occurred; `commit.js apply` SHALL create no commit.

#### Scenario: Missing input file for an emit
- **WHEN** `sai-state emit <id> <machineId> --input-file <path>` names a file that does not exist
- **THEN** it exits 2, names the path, and records no transition

#### Scenario: Empty input file
- **WHEN** the input file exists but is empty
- **THEN** the reader fails with an error that names the path and says the file is empty

#### Scenario: Missing commit message file
- **WHEN** `commit.js apply --input-file <path>` names a missing file
- **THEN** no commit is created

### Requirement: Instructions prescribe the input-file form

Every instruction that hands structured input (JSON, a message, a block, a report, or an issue description) to a SAI tool SHALL prescribe the input-file form and SHALL NOT prescribe a stdin pipe, heredoc, here-string, or command argument for it. The agent SHALL open a private directory with `transfer.js open --harness <claude|opencode>`, write the input as UTF-8 to a unique file in that directory with the harness-native file-write tool (`Write` on Claude Code, `write` on opencode), pass that absolute path with `--input-file`, and close the directory with `transfer.js close --dir <dir>` when the work no longer needs it. Each call SHALL use its own file, and input files SHALL stay inside the SAI temp root, outside the repository. `sai/policies/tool-resolution.md` § Invocation SHALL state this rule once for every tool, and `sai/policies/stage-machine.md`, `sai/policies/command-execution.md`, `sai/policies/worker-report-transport.md`, `sai/commands/backfill/worker.md`, `sai/commands/merge/mechanics.md`, and the from-backlog, from-next-backlog-item, to-backlog, to-pr, new-change-branch, and sai-cache-warmer skills SHALL use it.

#### Scenario: Agent hands JSON to a tool
- **WHEN** an instruction tells an agent to pass JSON to a SAI tool
- **THEN** the agent writes the JSON to a unique file in a `transfer.js open` directory with its native write tool and runs the tool with `--input-file <path>`

#### Scenario: Parallel calls do not share a file
- **WHEN** two structured-input calls run in parallel
- **THEN** each call writes and passes its own input file

#### Scenario: Direct Build report is saved from an input file
- **WHEN** a full Direct Build worker saves its report
- **THEN** it writes the report with the native file-write tool inside the SAI temp root and saves it with `transfer.js put --dir <report-dir> --path <name>.json --input-file <that file>`

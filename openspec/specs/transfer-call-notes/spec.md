# transfer-call-notes Specification

## Purpose

TBD - created by archiving change transfer-call-notes. Update Purpose after archive.

## Requirements

### Requirement: Every transfer.js subcommand accepts a display-only note
`sai/tools/transfer.js` SHALL accept an optional `--note <text>` value flag on each of its eleven subcommands: `open`, `put`, `verify`, `materialize`, `accept`, `receive`, `status`, `watch`, `retire-handle`, `live`, and `close`. The parser SHALL consume the note and the subcommand dispatch SHALL ignore it, so the note changes no JSON response, transferred file, report reference, ledger line, retired-handle record, or exit code.

#### Scenario: A noted subcommand returns the same response as an unnoted one
- **WHEN** a `transfer.js` subcommand runs with `--note "<short English action label>"` immediately after the subcommand
- **THEN** it returns the same output shape, values, and exit code as the same call without the note

#### Scenario: A noted live check reports the worker state unchanged
- **WHEN** `node <transfer-path> live --note "check the worker is live" --dir <report-dir>` runs against a live worker's report directory
- **THEN** it reports the same worker state as the same call without the note and records nothing about the note

### Requirement: The note follows the subcommand and matches the per-subcommand permission rule
The note SHALL be a separate, double-quoted argument placed immediately after the subcommand and before every other flag, so the generated per-subcommand shell rule for `transfer.js` keeps matching on both harnesses.

#### Scenario: A noted call still matches the generated rule
- **WHEN** an agent runs `node <transfer-path> put --note "save the worker report" --dir <report-dir> --path <relative> --exclusive --input-file <draft>`
- **THEN** the generated permission rule for `transfer.js put` matches the command line on Claude Code and on opencode

### Requirement: A well-formed call without a note succeeds unchanged
`transfer.js` SHALL accept every well-formed call that omits `--note` with no error, no warning, and no retry.

#### Scenario: An omission is not a failure
- **WHEN** a `transfer.js` subcommand runs with no `--note`
- **THEN** the call succeeds and behaves exactly as it did before the note existed

### Requirement: A malformed note is a usage error
`transfer.js` SHALL reject a note whose value is missing, a note whose value starts with `--`, and a repeated `--note` with a usage error that exits with code 2 and performs no operation. Every other flag SHALL keep its current parsing.

#### Scenario: A note swallows the next flag
- **WHEN** a `transfer.js` call passes `--note --dir <dir>`
- **THEN** the call exits with a usage error and never stores `--dir` as the note value

#### Scenario: A repeated note
- **WHEN** a `transfer.js` call passes `--note "first" --note "second"`
- **THEN** the call exits with a usage error and performs no operation

### Requirement: The CLI imposes no content rules beyond the leading-dash rejection
`transfer.js` SHALL accept any single argument that does not start with `--` as a note value. It SHALL NOT validate the note's length, language, or characters; the short-English one-line form and its character restrictions are a prompt convention, not runtime validation.

#### Scenario: An unusual but single-value note is accepted
- **WHEN** a `transfer.js` call passes a note that is one argument not starting with `--`
- **THEN** the call accepts it and behaves as if no note were given

### Requirement: The usage help of every subcommand declares the optional note
Each `transfer.js` subcommand SHALL list `--note` as an optional flag in its usage entry, SHALL carry `--note` in the parser's shared flag map, and SHALL NOT change the shared usage renderer.

#### Scenario: The help of a subcommand names the note
- **WHEN** a caller prints the help of `transfer.js put`
- **THEN** the usage line shows `[--note <text>]` and the example carries a note

### Requirement: The note is never persisted
`transfer.js` SHALL keep the note out of its JSON responses, the `.sai-accepted` ledger, the `.sai-retired` retired-handle record, every transferred file, and every report reference.

#### Scenario: A noted save records no note
- **WHEN** `transfer.js put` runs with a note and saves a report
- **THEN** the returned `{path, sha256}` and the ledger line contain no note text

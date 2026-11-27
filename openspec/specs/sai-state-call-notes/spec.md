# sai-state-call-notes Specification

## Purpose

TBD - created by archiving change transfer-call-notes. Update Purpose after archive.

## Requirements

### Requirement: Every sai-state verb accepts a display-only note
`bin/sai-state.js` SHALL accept an optional `--note <text>` value flag on every verb (`spawn`, `emit`, `reset`, `block`, and `close`) and on every live form of `emit`: the flag form (`--set`, `--add`, `--set-path`), `--input-file`, `--progress`, and `--document-file` with `--amend`. The verb handler SHALL never read the note, so it changes no event, report reference, machine state, session state, JSON response, or exit code.

#### Scenario: A noted emit advances the machine exactly as before
- **WHEN** `sai-state emit` runs with a note and a valid event
- **THEN** the machine advances to the same state and returns the same response as the same emit without the note

#### Scenario: A noted progress emit verifies the same reference
- **WHEN** `sai-state emit` runs with a note and a valid `--progress` report reference
- **THEN** it verifies and validates the same bytes and advances the machine as it would without the note

### Requirement: The note never becomes an argument
`sai-state` SHALL consume `--note` as a value flag before positional parsing and SHALL never treat the note as a positional, an event field, a report reference, or a path.

#### Scenario: A noted reset reads its two positionals
- **WHEN** `node <sai-state-path> reset --note "reset the machine" <id> <machineId>` runs
- **THEN** it resets the given machine of the given session and reports the reset machine id

### Requirement: Every verb rejects extra positionals
`spawn`, `reset`, `block`, and `close` SHALL reject an extra positional with a usage error, as `emit` already does, so an unquoted note cannot shift a required argument.

#### Scenario: An unquoted note adds a positional to spawn
- **WHEN** `sai-state spawn` receives `--key <stable-key>` plus a second positional
- **THEN** the call exits with a usage error and opens no session

#### Scenario: An unquoted note adds a positional to close
- **WHEN** `sai-state close <id>` receives a second positional
- **THEN** the call exits with a usage error and closes no session

### Requirement: A well-formed call without a note succeeds unchanged
`sai-state` SHALL accept every well-formed call that omits `--note` with no error, no warning, and no retry.

#### Scenario: An omission is not a failure
- **WHEN** any `sai-state` verb runs with no `--note`
- **THEN** the call succeeds and behaves exactly as it did before the note existed

### Requirement: A malformed note is a usage error
`sai-state` SHALL reject a missing note value, a note value that starts with `--`, and a repeated `--note` with a usage error that exits with code 2 and changes no state.

#### Scenario: A missing note value
- **WHEN** a `sai-state` verb receives `--note` with no following value
- **THEN** the call exits with a usage error and changes no state

#### Scenario: A note swallows the next flag
- **WHEN** a `sai-state` verb receives `--note --key <stable-key>`
- **THEN** the call exits with a usage error and never stores `--key` as the note value

### Requirement: Retired emit forms stay usage errors
The retired `--ready-to-propose` and `--block-file` forms of `emit` SHALL remain usage errors, and `--note` SHALL change neither their rejection nor the parsing of any other flag.

#### Scenario: A retired form with a note is still rejected
- **WHEN** `sai-state emit` runs with `--note` and `--ready-to-propose`
- **THEN** the call still fails with the retired-format usage error and changes no state

### Requirement: The usage help of every verb declares the optional note
Each `sai-state` verb SHALL declare `--note` in its usage flags and SHALL describe it as optional and display-only in its help text.

#### Scenario: The help of a verb names the note
- **WHEN** a caller prints the help of `sai-state close`
- **THEN** the help text states that `--note` is optional and display-only and the example carries a note

### Requirement: The note keeps the generated shell rule matching
The note SHALL keep the generated `sai-state` shell rule matching on both harnesses. That rule is verb-agnostic, so a noted call matches in any flag position; the prompt convention still places the note immediately after the verb.

#### Scenario: A noted call matches the verb-agnostic rule
- **WHEN** an agent runs `node <sai-state-path> emit --note "record the step result" <id> <machineId> --set stage=green`
- **THEN** the generated `sai-state` shell rule matches the command line on Claude Code and on opencode

### Requirement: The note is never persisted
`sai-state` SHALL keep the note out of the event, the report reference, the `.sai-accepted` ledger, the machine state, the session file, and every JSON response.

#### Scenario: A noted emit stores no note
- **WHEN** any `sai-state` verb runs with a note and its response is inspected
- **THEN** neither the response nor the stored session or machine state contains the note text

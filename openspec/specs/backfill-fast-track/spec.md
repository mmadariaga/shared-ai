# backfill-fast-track Specification

## Purpose

TBD — created by archive sync of change unattended-backfill. Describe: sai-backfill as the fifth fast-track opt-in command and its fixed opt-out set.

## Requirements

### Requirement: sai-backfill is the fifth fast-track opt-in command

`sai-backfill` SHALL accept the positional token `--fast-track`, parsed by its worker card from `arguments_value` alongside the diff-source tokens into worker-derived `fast_track_active` session state, emitting no banner. The opt-out set SHALL be exactly: generated reconciliation questions are not asked and remaining `stated-but-unevidenced` items stay non-normative for that run; the spec-conflict decision auto-proceeds after the conflict report is carried verbatim; and a crystallized-block `**Change name**` is accepted directly without the yes/no confirmation.

#### Scenario: Complete envelope yields zero needs_input results
- **WHEN** `/sai-backfill <name> --fast-track` runs with a detected crystallized block, a diff-source token, and every consumed field derivable
- **THEN** no reconciliation question, conflict decision, or name confirmation is presented and the run closes with zero needs_input results

#### Scenario: Safe operations and hard stops remain in force
- **WHEN** a fast-track backfill reaches a safe-operations confirmation, the empty-staged halt, or the MANDATORY STOP literal
- **THEN** that gate or stop executes exactly as it does without the flag

#### Scenario: Flag never suppresses an input question
- **WHEN** a fast-track run carries no diff-source token or leaves a fixed interview question unresolved by the block chain
- **THEN** that question's ordinary ask channel fires normally

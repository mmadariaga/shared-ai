# backfill-diff-source-token Specification

## Purpose

TBD — created by archive sync of change unattended-backfill. Describe: worker-side diff-source tokens (--staged | --unstaged | --diff <sha>) that replace the interactive Phase 1 picker when supplied.

## Requirements

### Requirement: Diff-source tokens are parsed worker-side from arguments_value

The worker SHALL parse the tokens `--staged`, `--unstaged`, and `--diff <sha>` from `arguments_value` itself, in any position, stripping every recognized token (and the SHA value with `--diff`) before reading the trimmed remainder as the request body; wrappers and the coordinator SHALL NOT split the envelope on the command's behalf. A resolved token SHALL select the matching option directly: `--staged` computes the staged diff, `--unstaged` combines unstaged modifications and untracked files, and `--diff <sha>` computes `<sha>..HEAD` with no base-commit ask.

#### Scenario: Staged token computes the staged diff
- **WHEN** the envelope contains `--staged`
- **THEN** the command runs `git diff --staged` without presenting the diff-source ask

#### Scenario: SHA token skips the base-commit ask
- **WHEN** the envelope contains `--diff abc123`
- **THEN** the command computes `abc123..HEAD` directly and never returns "Provide the base commit SHA:"

#### Scenario: Absent token restores the interactive ask
- **WHEN** the envelope carries no diff-source token, including any fast-track run
- **THEN** the diff-source ask "Which diff should I analyze?" fires normally with its three options

### Requirement: Empty staged input is broken input, not absent input

On the `--staged` path with an empty staging area, the run SHALL halt with a terminal payload whose summary is exactly `Staged diff is empty — stage the implementation before invoking backfill.` The command SHALL NOT fall back to another diff source or to the interactive ask.

#### Scenario: Empty staging area halts the run
- **WHEN** `--staged` is supplied and `git diff --staged` produces no output
- **THEN** the run closes with the remediation literal and writes no files

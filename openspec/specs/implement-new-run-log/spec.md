# implement-new-run-log Specification

## Purpose
TBD - created by archiving change sai-build-new-resilience. Update Purpose after archive.

## Requirements

### Requirement: Learnings promotion at run close

At every run close, before printing the closing report, the `/sai-3-implement` coordinator SHALL promote learnings from the entries of the run's `deviations.md`. A deviation SHALL qualify only when it is a project fact that fits Stack, Conventions, Avoid, or Test Command: it names a repository-level artifact (a package, build target, command, configuration file, compiler or linter rule, or framework version constraint), not a symbol or file the change introduced or renamed. Deviations that start `SAI_LEARNINGS.md contradiction:` or `SAI_LEARNINGS.md stale:` SHALL NOT be promotion candidates. For each `SAI_LEARNINGS.md stale:` deviation, the coordinator SHALL correct the named entry by key with the alternative that worked, or delete it when no durable fact remains, and SHALL write each correction or deletion to a `## Learnings Corrections` section at the end of the change's `design.md` (section, key, previous value, new value or `deleted`, and the evidence), creating the section when absent; when `design.md` does not exist, the closing report alone SHALL carry them. When no deviation qualifies and no `stale:` deviation names an entry, the coordinator SHALL leave `SAI_LEARNINGS.md` untouched and create no file. Otherwise it SHALL fetch `sai/policies/sai-learnings-format.md` and write only the project-root `SAI_LEARNINGS.md` as that format directs: key, append, supersede, correct, delete, and bootstrap. Only the coordinator SHALL promote, correct, or delete; no worker SHALL write `SAI_LEARNINGS.md`. The run SHALL NOT stage or commit the file or the corrections section. When the coordinator wrote the file, the closing report SHALL name its path, the entries added and superseded per section, each correction or deletion with its evidence, and that the file is uncommitted; otherwise the report SHALL carry no learnings line. The closing report SHALL also carry one line per `SAI_LEARNINGS.md contradiction:` deviation with the file's path and the entry's key.

#### Scenario: A qualifying deviation is promoted

- **WHEN** the run closes and `deviations.md` records a project fact about a repository-level artifact that fits Stack, Conventions, Avoid, or Test Command
- **THEN** the coordinator writes that fact into the project-root `SAI_LEARNINGS.md` per `sai/policies/sai-learnings-format.md`, leaves the file unstaged and uncommitted, and names the path and the entries added and superseded per section in the closing report

#### Scenario: No deviation qualifies

- **WHEN** the run closes, no deviation is a project fact fitting Stack, Conventions, Avoid, or Test Command, and no `SAI_LEARNINGS.md stale:` deviation names an entry
- **THEN** `SAI_LEARNINGS.md` is left untouched, no file is created, and the closing report carries no learnings line

#### Scenario: A deviation about the change's own symbols

- **WHEN** a deviation names a symbol or file this change introduced or renamed
- **THEN** it does not qualify and is not promoted

#### Scenario: A stale entry is corrected

- **WHEN** the run closes with a `SAI_LEARNINGS.md stale:` deviation naming an entry, its failure, and the alternative that worked
- **THEN** the coordinator corrects or deletes that entry, writes the change to `## Learnings Corrections` in the change's `design.md`, and lists it with its evidence in the closing report

### Requirement: Closing report at run close

The `/sai-3-implement` run SHALL close when every task is checked, every open fixable audit finding is fixed or carries a deviation, and the suites show no new failure, when the user answers an escalation with stop, or when the escalation question is dismissed without an answer. In each case the coordinator SHALL first promote learnings per the learnings promotion at run close, then read the run directory files the report needs (including the `Pre-existing` findings of the step review round files) and print a closing report holding the steps committed (the subject of each), the deviations each with its reason, the suite result against the baseline, the findings still pending after the third fix round, the `Pre-existing` findings (reported once, never fixed by the run), the audit findings fixed, and whatever remains open, open Questions included; when the run did not complete, the report SHALL add the blocker with the options offered and the answer. The report SHALL always list the deviations and the pending findings and SHALL say so explicitly when there are none. The report SHALL list the `Pre-existing` findings only when there are some. The coordinator SHALL then emit `close` with the outcome `completed`, `stopped`, or `escalated` for a dismissed question.

#### Scenario: The user stops at an escalation

- **WHEN** the user answers an escalation with stop
- **THEN** the closing report lists the work done, the deviations with their reasons, and the blocker with the options offered, and the coordinator emits `close` with the outcome `stopped`.

#### Scenario: A run with no deviations and no pending findings

- **WHEN** a run closes with no deviation recorded and no finding pending after the third fix round
- **THEN** the closing report states explicitly that there are no deviations and no pending findings.

#### Scenario: A run with Pre-existing findings

- **WHEN** a step review marked at least one finding `Pre-existing`
- **THEN** the closing report lists each such finding once, apart from the pending findings

### Requirement: No run record is persisted

The `/sai-3-implement` coordinator SHALL NOT write the deviations, the overrides, or the pending findings to any file in the change directory or elsewhere in the repository; the closing report SHALL be their only record. Two writes are not run records and SHALL remain allowed: the `## Learnings Corrections` section of the change's `design.md`, and a decision record that cites a deviation from the decision it records. The coordinator SHALL NOT compose `openspec/changes/{name}/build-log.md`, and a `build-log.md` that already exists in a change SHALL stay untouched: the run SHALL NOT read, remove, or regenerate it.

#### Scenario: A change with an earlier build log

- **WHEN** a run closes on a change that already holds a `build-log.md` from an earlier run
- **THEN** that file is left byte-identical and the run writes no new run record file.

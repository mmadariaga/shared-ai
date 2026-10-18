# implement-new-run-log Specification

## Purpose
TBD - created by archiving change sai-build-new-resilience. Update Purpose after archive.

## Requirements

### Requirement: Build log composed at run close

The `/sai-3-implement` run SHALL close when every task is checked, every open fixable audit finding is fixed or carries a deviation, and the suites show no new failure, when the user answers an escalation with stop, or when the escalation question is dismissed without an answer. In each case the coordinator SHALL first promote learnings per the learnings promotion at run close, then compose `openspec/changes/{name}/build-log.md` from the run directory files, holding the work done (each committed step with its subject and the tasks it completed), the deviations, the overrides, the suite result against the baseline, the pending findings, the audit findings fixed, the learnings promoted, the open Questions and the findings left open with their reasons, and, when the run did not complete, the blocker with the options offered and the answer. The coordinator SHALL then print the closing report naming `build-log.md`, and emit `close` with the outcome `completed`, `stopped`, or `escalated` for a dismissed question.

#### Scenario: The user stops at an escalation

- **WHEN** the user answers an escalation with stop
- **THEN** the coordinator writes `build-log.md` with the work done, the deviations, and the blocker with the options offered, and emits `close` with the outcome `stopped`.

#### Scenario: A dismissed escalation question

- **WHEN** the escalation question is dismissed without an answer
- **THEN** the coordinator writes `build-log.md` and emits `close` with the outcome `escalated`.

#### Scenario: Audit findings in the build log

- **WHEN** a run that fixed audit findings and left a Question open closes
- **THEN** `build-log.md` lists the fixed findings, the open Question, and each finding left open with its reason

#### Scenario: Learnings promoted in the build log

- **WHEN** a run that promoted learnings closes
- **THEN** the promotion happens before `build-log.md` is composed, and `build-log.md` lists the learnings promoted

### Requirement: Build log stays out of commits

`build-log.md` SHALL stay on disk beside the change artifacts as the durable record for a later review, which may run in another session after the run directory is gone, and SHALL be part of no commit of the run.

#### Scenario: Run close after the last step commit

- **WHEN** the run closes after its last step commit
- **THEN** `openspec/changes/{name}/build-log.md` exists on disk and no commit of the run contains it.

### Requirement: Learnings promotion at run close

At every run close, before composing `build-log.md` and printing the closing report, the `/sai-3-implement` coordinator SHALL promote learnings from the entries of the run's `deviations.md`. A deviation SHALL qualify only when it is a project fact that fits Stack, Conventions, Avoid, or Test Command: it names a repository-level artifact (a package, build target, command, configuration file, compiler or linter rule, or framework version constraint), not a symbol or file the change introduced or renamed. When no deviation qualifies, the coordinator SHALL leave `SAI_LEARNINGS.md` untouched and create no file. Otherwise it SHALL fetch `sai/policies/sai-learnings-format.md` and write only the project-root `SAI_LEARNINGS.md` as that format directs: key, append, supersede, and bootstrap. Only the coordinator SHALL promote; no worker SHALL write `SAI_LEARNINGS.md`. The run SHALL NOT stage or commit the file. When the coordinator wrote the file, the closing report SHALL name its path, the entries added and superseded per section, and that the file is uncommitted; otherwise the report SHALL carry no learnings line.

#### Scenario: A qualifying deviation is promoted

- **WHEN** the run closes and `deviations.md` records a project fact about a repository-level artifact that fits Stack, Conventions, Avoid, or Test Command
- **THEN** the coordinator writes that fact into the project-root `SAI_LEARNINGS.md` per `sai/policies/sai-learnings-format.md`, leaves the file unstaged and uncommitted, and names the path and the entries added and superseded per section in the closing report

#### Scenario: No deviation qualifies

- **WHEN** the run closes and no deviation is a project fact fitting Stack, Conventions, Avoid, or Test Command
- **THEN** `SAI_LEARNINGS.md` is left untouched, no file is created, and the closing report carries no learnings line

#### Scenario: A deviation about the change's own symbols

- **WHEN** a deviation names a symbol or file this change introduced or renamed
- **THEN** it does not qualify and is not promoted

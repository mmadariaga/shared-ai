# implement-new-run-log Specification

## Purpose
TBD - created by archiving change sai-build-new-resilience. Update Purpose after archive.

## Requirements

### Requirement: Build log composed at run close

The `/sai-3-implement-new` run SHALL close when every task is checked, every open fixable audit finding is fixed or carries a deviation, and the suites show no new failure, when the user answers an escalation with stop, or when the escalation question is dismissed without an answer. In each case the coordinator SHALL compose `openspec/changes/{name}/build-log.md` from the run directory files, holding the work done (each committed step with its subject and the tasks it completed), the deviations, the overrides, the suite result against the baseline, the pending findings, the audit findings fixed, the open Questions and the findings left open with their reasons, and, when the run did not complete, the blocker with the options offered and the answer. The coordinator SHALL then print the closing report naming `build-log.md`, and emit `close` with the outcome `completed`, `stopped`, or `escalated` for a dismissed question.

#### Scenario: The user stops at an escalation

- **WHEN** the user answers an escalation with stop
- **THEN** the coordinator writes `build-log.md` with the work done, the deviations, and the blocker with the options offered, and emits `close` with the outcome `stopped`.

#### Scenario: A dismissed escalation question

- **WHEN** the escalation question is dismissed without an answer
- **THEN** the coordinator writes `build-log.md` and emits `close` with the outcome `escalated`.

#### Scenario: Audit findings in the build log

- **WHEN** a run that fixed audit findings and left a Question open closes
- **THEN** `build-log.md` lists the fixed findings, the open Question, and each finding left open with its reason

### Requirement: Build log stays out of commits

`build-log.md` SHALL stay on disk beside the change artifacts as the durable record for a later review, which may run in another session after the run directory is gone, and SHALL be part of no commit of the run.

#### Scenario: Run close after the last step commit

- **WHEN** the run closes after its last step commit
- **THEN** `openspec/changes/{name}/build-log.md` exists on disk and no commit of the run contains it.

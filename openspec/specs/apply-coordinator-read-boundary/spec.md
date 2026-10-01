# apply-coordinator-read-boundary Specification

## Purpose

TBD - created by syncing change clarify-apply-coordinator-contract.

## Requirements

### Requirement: Apply coordinators SHALL distinguish coordination reads from technical write-preparation reads

The Apply coordinator SHALL be allowed to inspect artifacts required for prerequisites, change resolution, the run-start Step Projection, checklist verification, reporting, and gate decisions. The coordinator MUST NOT perform technical reads whose purpose is to prepare the contents of a RED or GREEN worker write, and MUST NOT perform RED/GREEN verification runs or production and test edits.

#### Scenario: Coordinator performs a coordination read

- **WHEN** the coordinator reads an artifact to resolve, project, route, verify, report, or gate the current Apply step
- **THEN** the read is permitted, while technical reads preparing a worker write remain prohibited

### Requirement: Happy-path apply coordinator reads no project source or test file

On the happy path of a Step, where every `apply-step.js verify` passes and the `close` status letter is `OK`, the apply coordinator SHALL read no project source or test file. It SHALL read such files only after a failed verify, to write the recovery diagnosis.

#### Scenario: Step passes verification
- **WHEN** a Step's verifies all pass and `close` returns status letter `OK`
- **THEN** the coordinator has read no project source or test file for that Step

#### Scenario: Verify fails
- **WHEN** a `verify` call returns `ok: false`
- **THEN** the coordinator may read project source or test files, only to write the recovery diagnosis

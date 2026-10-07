# auto-fast-backfill-execution Specification

## Purpose
TBD - created by archiving change worker-owned-autofast-mutations. Update Purpose after archive.

## Requirements

### Requirement: Attribute backfill execution to Direct Build

Direct Build (unattended) SHALL use the existing backfill worker's read-only preparation followed by coordinator validation and one explicit execute continuation. The backfill worker SHALL write only the validated draft set during that continuation.

#### Scenario: Direct Build prepares backfill drafts

- **WHEN** Direct Build reaches backfill preparation
- **THEN** the existing backfill prepare and validated execute boundaries remain unchanged under the Direct Build route.

### Requirement: Coordinator-authorized backfill execution

The Direct Build backfill worker SHALL keep preparation read-only and SHALL execute only a coordinator-authorized closed order containing the validated change name, destination paths, and exact draft contents.

#### Scenario:

- **WHEN** the worker receives the prepare envelope
- **THEN** it SHALL compose and return drafts without writing files or running state-changing git commands

### Requirement: Exact backfill draft writes

The execution continuation SHALL write only the validated `.openspec.yaml`, `proposal.md`, and capability specification paths represented in the prepared draft set.

#### Scenario:

- **WHEN** the coordinator forwards a valid execution order
- **THEN** the worker SHALL write the named contents byte-for-byte and report an ordered duplicate-free `changed_files` union

### Requirement: Backfill execution is one-shot

The worker MUST reject a repeated execution continuation carrying the same closed order after successful execution. A write or parent-directory failure SHALL return a closed failed result with the exact completed and uncompleted state, SHALL set unrecoverable true only when the evidence establishes that continuation is unsafe, and SHALL end the order there: the worker leaves the state as it is for the coordinator to verify. The worker SHALL accept a new execute order only after an order that failed before its first write; the coordinator issues one under `sai/policies/unattended-runtime-recovery.md` § Execute orders, after the no-effect check passes. Otherwise the coordinator SHALL report the worker's concrete partial state and stop, and SHALL never fall back to coordinator-side writes.

#### Scenario:

- **WHEN** an execution continuation or replacement attempts to repeat a completed mutation
- **THEN** the worker SHALL reject it without another write

#### Scenario: Partial-mutation failure reports without refire

- **WHEN** a write or parent-directory failure leaves a partial mutation
- **THEN** the worker SHALL report the exact completed and uncompleted state and end the order there, and no new order is issued onto that state

#### Scenario: A new order follows a failure before the first write

- **WHEN** an execute order failed before its first write and the coordinator's no-effect check passes
- **THEN** the worker SHALL accept the new execute order the coordinator issues

### Requirement: Backfill correction feedback after execution

The worker SHALL accept same-run correction feedback carrying the verbatim archive failure plus the named draft sections to recompose. The worker SHALL recompose only those named sections from the staged diff, the block grounding, and the CLI error, SHALL rewrite only those draft files, SHALL report every rewritten path in the invocation-scoped changed_files union, and SHALL carry no commit authorization. A defect that repeats without progress after correction SHALL end this worker's corrections: the worker returns `failed` with the verbatim failure.

#### Scenario: Archive failure routes to same-worker correction

- **WHEN** the same run continues this worker with the verbatim archive failure plus named draft sections to recompose
- **THEN** the worker SHALL recompose only those named sections and rewrite only those draft files with no commit authorization

#### Scenario: A defect repeats after correction

- **WHEN** the same defect is reported without progress after a correction
- **THEN** the worker SHALL return `failed` with the verbatim failure

## ADDED Requirements

### Requirement: Coordinator-authorized backfill execution

The Auto-fast backfill worker SHALL keep preparation read-only and SHALL execute only a coordinator-authorized closed order containing the validated change name, destination paths, and exact draft contents.

#### Scenario:

- **WHEN** the worker receives the prepare envelope
- **THEN** it SHALL compose and return drafts without writing files or running state-changing git commands

### Requirement: Exact backfill draft writes

The execution continuation SHALL write only the validated `.openspec.yaml`, `proposal.md`, and capability specification paths represented in the prepared draft set.

#### Scenario:

- **WHEN** the coordinator forwards a valid execution order
- **THEN** the worker SHALL write the named contents byte-for-byte and report an ordered duplicate-free `changed_files` union

### Requirement: Backfill execution is one-shot

The worker MUST reject a repeated execution continuation after successful execution and MUST report exact completed and uncompleted state after a partial failure without retrying.

#### Scenario:

- **WHEN** an execution continuation or replacement attempts to repeat a completed mutation
- **THEN** the worker SHALL reject it without another write

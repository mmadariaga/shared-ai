## ADDED Requirements

### Requirement: Validated archive execution continuation

The Auto-fast archive worker SHALL perform classification, completion, delta-sync, unchecked-item, and collision checks during preparation before accepting an execution order.

#### Scenario:

- **WHEN** the archive worker prepares an Auto-fast operation
- **THEN** it SHALL return the validated mutation plan without mutating files, archive directories, staging, or commits

### Requirement: Ordered archive mutations

Authorized archive execution SHALL perform synchronization and verification, archive-directory movement, owned-path staging, and one local commit in that order.

#### Scenario:

- **WHEN** the coordinator forwards a validated and authorized archive execution order
- **THEN** the worker SHALL execute only that order and SHALL never push, amend, stage unrelated files, or commit twice

### Requirement: Archive execution failure is explicit

The worker MUST stop after a failed mutation, report exact completed and uncompleted state, and MUST NOT silently retry or continue to later actions.

#### Scenario:

- **WHEN** synchronization, movement, staging, or commit fails
- **THEN** the worker SHALL return a closed failure result describing the partial state

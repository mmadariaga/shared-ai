# auto-fast-archive-execution Specification

## Purpose
TBD - created by archiving change worker-owned-autofast-mutations. Update Purpose after archive.

## Requirements

### Requirement: Attribute archive execution to Build

Build (unattended) SHALL use the existing archive worker's read-only preparation followed by one validated sync, archive move, owned staging, and pre-authorized local commit continuation.

#### Scenario: Build completes archive execution

- **WHEN** Build reaches archive execution
- **THEN** the existing archive order and one-commit boundary remain unchanged under `build-unattended`.

### Requirement: Validated archive execution continuation

The Auto-fast archive worker SHALL perform classification, completion, delta-sync, unchecked-item, and collision checks during preparation before accepting an execution order.

#### Scenario:

- **WHEN** the archive worker prepares an Auto-fast operation
- **THEN** it SHALL return the validated mutation plan without mutating files, archive directories, staging, or commits

### Requirement: Ordered archive mutations

Authorized archive execution SHALL perform synchronization and verification, archive-directory movement, classification of every supplied approved path using deletion-aware trackedness and ignore checks before staging, exact-path staging of tracked paths, tracked deletions, and untracked non-ignored paths, and one local commit in that order. Untracked ignored paths SHALL be omitted with a warning. Force-add and broad staging commands MUST NOT be used. When eligible paths remain staged, execution SHALL create only the authorized local HEREDOC commit from staged state.

#### Scenario:

- **WHEN** the coordinator forwards a validated and authorized archive execution order
- **THEN** the worker SHALL execute only that order and SHALL never push, amend, stage unrelated files, or commit twice

#### Scenario: Mixed approved paths

- **WHEN** approved paths include tracked files, tracked deletions, untracked non-ignored files, and untracked ignored files
- **THEN** the first three categories are staged through the exact allowlist, the ignored files are omitted with warnings, and archive execution continues

#### Scenario: All approved paths are ignored

- **WHEN** every approved path is untracked and ignored
- **THEN** no path is force-added, the index remains empty, and no commit message or commit is created

### Requirement: Archive execution failure is explicit

The worker MUST stop after a failed mutation, report exact completed and uncompleted state, and MUST NOT silently retry or continue to later actions. A classification or staging error unrelated to an ignored untracked path MUST terminate execution without message authoring or commit.

#### Scenario:

- **WHEN** synchronization, movement, staging, or commit fails
- **THEN** the worker SHALL return a closed failure result describing the partial state

#### Scenario: Non-ignore staging failure

- **WHEN** classification or exact-path staging fails for a reason other than an ignored untracked path
- **THEN** execution terminates without retrying, authoring a message, or creating a commit

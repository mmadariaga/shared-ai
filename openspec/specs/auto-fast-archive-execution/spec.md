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

### Requirement: Archive worker names Bash as its mutation vehicle in Build execution

In the Build (unattended) execution continuation, `sai/commands/archive/worker.md` SHALL state that the worker holds no Write or Edit tool and SHALL name the Bash tool as its write vehicle. The worker SHALL perform the delta-spec sync writes, the archive directory move, exact-path staging, and the HEREDOC local commit through Bash shell commands, and SHALL never attempt a Write or Edit tool call in that continuation. When Bash is unavailable, the worker SHALL return a closed `failed` result rather than simulating a write through another channel.

#### Scenario: Build execution mutations run through Bash

- **WHEN** the archive worker executes its validated Build execution order
- **THEN** every mutation — sync writes, the archive move, staging, and the local commit — runs through the Bash tool, which the binding already grants, and no Write or Edit tool call is attempted

#### Scenario: Bash is unavailable during Build execution

- **WHEN** the worker's Bash tool is unavailable in the Build execution continuation
- **THEN** the worker returns a closed `failed` result and performs no mutation through another channel

### Requirement: MODIFIED delta completeness is verified before sync

Before any delta-spec sync, the archive worker SHALL run a MODIFIED-delta completeness check over every capability delta spec: for each `## MODIFIED Requirements` entry, read the existing main spec at `openspec/specs/{capability}/spec.md` (when present) and compare the scenario headings the delta's MODIFIED entry carries against the scenario headings the main spec already holds for that requirement. A MODIFIED entry that drops an existing main-spec scenario is a net-loss candidate: the exact dropped scenario names SHALL be carried in the combined delta-sync summary, the low-risk-by-construction fast-track auto-proceed rule SHALL NOT cover it (it blocks the sync), and the sync SHALL never produce a main spec with fewer scenarios for a MODIFIED requirement than it had before the sync.

#### Scenario: A MODIFIED delta omits an existing scenario

- **WHEN** a delta's MODIFIED requirement omits a scenario the main spec already holds for that requirement
- **THEN** the worker carries the exact dropped scenario names in the combined delta-sync summary, treats the delta as a net-loss candidate, and the sync does not proceed under fast-track auto-proceed

#### Scenario: Sync verification confirms scenario survival

- **WHEN** the post-sync verification or the Build execution sync step re-reads the affected main specs
- **THEN** the worker confirms every scenario the main spec held before the sync still survives
- **AND** when any scenario was lost, the worker reports exactly what differs, including the dropped scenario names, and the archive stops before moving anything


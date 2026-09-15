# cheap-reentry Specification

## Purpose
TBD - created by archiving change coordinator-led-unblock. Update Purpose after archive.
## Requirements
### Requirement: Unchanged plan reuses implementation and worktree state
The pipeline SHALL reuse the current implementation.md and worktree state without a full implement collapse on a human-authorized retry only when the plan contents are unchanged and the on-disk checkbox state is preserved.

#### Scenario: Unchanged plan skips collapse
- **WHEN** a human authorizes a retry with identical plan contents and preserved checkbox state
- **THEN** re-entry reuses the current implementation.md and worktree state without a full collapse

### Requirement: Changed plan collapses normally
The pipeline SHALL run the normal implement collapse including Step 1b plan-state classification when the plan contents changed or the on-disk checkbox state was not preserved.

#### Scenario: Changed plan collapses
- **WHEN** the plan contents changed since the prior attempt
- **THEN** re-entry collapses through implement re-planning instead of reusing prior state


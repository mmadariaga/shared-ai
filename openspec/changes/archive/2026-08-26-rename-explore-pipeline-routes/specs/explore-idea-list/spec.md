## MODIFIED Requirements

### Requirement: Project the renamed route identities

The coordinator-owned idea-list route projection SHALL use `plan-unattended`, `build-unattended`, and `manual`. The Plan projection SHALL contain sai-1 and sai-2; the Build projection SHALL contain Build/Implement, Backfill, and Archive; the Manual projection SHALL contain Manual handoff.

#### Scenario: route projection follows selection

- **WHEN** a selector route resolves for a slice
- **THEN** the selected slice displays only the corresponding fixed route steps without changing baseline evidence state.

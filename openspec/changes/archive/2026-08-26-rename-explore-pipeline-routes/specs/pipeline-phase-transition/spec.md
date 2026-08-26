## MODIFIED Requirements

### Requirement: Name the supervised phase transition route

The existing two-phase supervised transition SHALL use Plan (unattended) and `plan-unattended` while preserving active state, phase ordering, clean completion, and retry behavior.

#### Scenario: supervised phases transition

- **WHEN** the Plan spec phase reaches its existing transition condition
- **THEN** the design phase starts with the same state and worker boundaries.

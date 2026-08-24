## MODIFIED Requirements

### Requirement: Separate canonical policy from written STOP contracts

The verified-precondition rule SHALL live in its own policy file. Every existing routed command card under `sai/commands/` SHALL reference that policy unconditionally, including `coordinator.md`, `worker.md`, and any retained `invocation.md`. A routed phase without an invocation card SHALL remain covered by its existing coordinator and worker cards.

#### Scenario: Implement policy coverage follows the active cards

- **WHEN** the routed command-card inventory is audited
- **THEN** the implementation phase is validated through `coordinator.md` and `worker.md` without requiring a deleted invocation card.

# Worker Lifecycle Protocol Specification

## MODIFIED Requirements

### Requirement: Contextual continuation uses the existing worker lifecycle

A contextual merge decision SHALL use the existing `needs_input` lifecycle status. A `more-context` response SHALL continue the same worker with pending alternatives and SHALL not introduce a new status, progress event, continuation field, or mutation channel.

#### Scenario: More-context continues the same worker

- **WHEN** the user requests more context for a pending semantic merge decision
- **THEN** the coordinator forwards the exact answer to the same worker and the worker returns another contextual decision without writing or staging

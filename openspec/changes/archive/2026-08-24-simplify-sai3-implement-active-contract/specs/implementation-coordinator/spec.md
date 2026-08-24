## MODIFIED Requirements

### Requirement: Lifecycle-only implementation coordinator

The routed implementation coordinator SHALL own adapter routing, progress rendering, pointer delivery, result validation, and terminal navigation only. It SHALL NOT perform technical planning, read implementation artifacts, run git or OpenSpec checks, or write planning files.

#### Scenario: Coordinator processes a worker result

- **WHEN** the implementation worker returns a lifecycle result
- **THEN** the coordinator validates and routes the result without performing technical planning or artifact I/O.

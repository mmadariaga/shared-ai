## MODIFIED Requirements

### Requirement: Single-source technical instruction ownership

The coordinator cards SHALL retain only routing and adapter responsibilities, while `worker.md`, `steps/common.md`, and the coordinator-selected step file SHALL provide the authoritative technical instruction surface without duplicated lifecycle or planning guidance.

#### Scenario: Active worker instruction surface is loaded

- **WHEN** the routed implementation worker begins technical execution
- **THEN** it follows the common baseline and selected step instructions while the coordinator handles lifecycle routing separately.

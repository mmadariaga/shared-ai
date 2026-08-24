## MODIFIED Requirements

### Requirement: Validation owns durable implementation-plan verification

The implementation worker SHALL execute the canonical `validation` step as the sole technical source for pre-delivery verification of `implementation.md` invariants and the audit-derived step-append check. A failed validation SHALL produce a non-completed lifecycle result.

#### Scenario: Durable validation fails

- **WHEN** a required implementation-plan or audit-step check fails during `validation`
- **THEN** the worker returns a failed result and does not claim planning completion.

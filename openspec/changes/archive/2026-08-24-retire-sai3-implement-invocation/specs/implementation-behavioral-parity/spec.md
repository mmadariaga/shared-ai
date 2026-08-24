## MODIFIED Requirements

### Requirement: Direct and build implementation behavior remains compatible

Retirement of the inactive invocation source SHALL preserve direct `/sai-3-implement` and `/sai-build` implementation-planning behavior, including planning, verification, no-execution, lifecycle completion, and continuation semantics. Neither route SHALL require the deleted invocation source.

#### Scenario: Both implementation entry paths remain routed

- **WHEN** direct `/sai-3-implement` or the `/sai-build` implementation segment executes
- **THEN** it preserves the existing implementation-planning behavior through the coordinator, worker, and step surfaces without runtime-code, wrapper, or build-routing changes.

## MODIFIED Requirements

### Requirement: Direct and build implementation behavior remains compatible

The active instruction-surface refactor SHALL preserve direct `/sai-3-implement` and `/sai-build` implementation-planning behavior, including planning, verification, no-execution, lifecycle completion, and continuation semantics.

#### Scenario: Both implementation entry paths run

- **WHEN** direct `/sai-3-implement` or the `/sai-build` implementation segment executes the refactored instruction surface
- **THEN** it preserves the existing implementation-planning behavior without runtime-code, wrapper, or build-routing changes.

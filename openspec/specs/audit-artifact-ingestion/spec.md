# audit-artifact-ingestion Specification

## Purpose
Turn review, security, performance, and accessibility findings into judged, dedicated steps of `implementation.md`.

## Requirements

### Requirement: Audit artifact steps MUST NOT be merged with existing implementation steps.

Each audit artifact produces its own dedicated step. Findings from different artifacts are kept separate and appended after all steps derived from `design.md` and `tasks.md`.

#### Scenario: two audit artifacts produce two steps

- **WHEN** `review.md` and `security.md` both exist for the change
- **THEN** the plan gains one dedicated review step and one dedicated security step after every `tasks.md`-derived step, and neither is merged into an existing step

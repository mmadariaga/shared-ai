## MODIFIED Requirements

### Requirement: question-content-compliance-at-source

Compliance with the question-context anatomy SHALL remain authored at the source of the worker question. A coordinator MAY render a worker-authored exact question and ordered options together with an adjacent decision-oriented summary that supplies current state context, provided it does not rephrase the question, alter option values, or change continuation semantics.

#### Scenario: Merge question stays exact beside its summary

- **WHEN** the merge coordinator renders `¿Qué rama quieres mergear?` with date-bearing branch options
- **THEN** it preserves the exact question and option values while presenting branch timestamps and merge rationale in the adjacent summary

## MODIFIED Requirements

### Requirement: design-gate-surfaces-reference-policy
The active design step-owned instruction at `sai/commands/design/steps/design.md` SHALL reference the question-context policy (`@sai/policies/question-context.md`) at its fixed decision surfaces. The specs approval gate is no longer such a surface: it presents no question, so it SHALL NOT reference the policy and SHALL NOT carry question anatomy. The Open Questions gate presentation remains a fixed decision surface and SHALL continue to reference the policy and comply with its anatomy — stating what is being decided, why it matters, the plain-language options, and the essential state context — preserving the unresolved question with its context.

#### Scenario: specs approval gate presents no question
- **WHEN** `sai/commands/design/steps/design.md` is read at its `## Approval gate` section
- **THEN** the section contains no approval question, no `yes`/`no` option ordering, no notes semantics, and no reference to the question-context policy

#### Scenario: Open Questions gate complies
- **WHEN** `sai/commands/design/steps/design.md` presents an unresolved Open Question to the user
- **THEN** the presentation references the question-context policy and carries the question's essential state context in plain wording

#### Scenario: design-step-gate-references-policy
- **WHEN** a design step presents a fixed decision surface
- **THEN** it references the question-context policy from the active step-local contract and preserves the required context anatomy.


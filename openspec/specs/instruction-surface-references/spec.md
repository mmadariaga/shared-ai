# instruction-surface-references Specification

## Purpose

Requires the fixed decision surfaces in the shared instructions (`design.md`, `apply.md`, `explore.md`) to reference the question-context policy and comply with its anatomy, while preserving each gate's pinned semantics and the exact wording downstream tests assert.

## Requirements

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

### Requirement: apply-gate-surfaces-reference-policy

`sai/commands/apply/steps/routing-split-flow.md` SHALL reference the question-context policy at apply's fixed human decision surface: the GREEN-conflict halt presentation. The prompt SHALL comply with the anatomy while preserving the halt semantics. (The per-Step Human Verification gate no longer exists; see ADR 0186.)

#### Scenario: GREEN-conflict halt complies

- **WHEN** the apply coordinator surfaces a GREEN-conflict halt to the user
- **THEN** the presentation references the question-context policy and states what is being decided (implementation, test, or interface fault), why it matters, the essential state context of the conflict, and the plain-language options, preserving the halt semantics

### Requirement: explore-slicing-question-references-policy

`sai/commands/explore/instructions.md` SHALL reference the question-context policy at its slicing clarifying-question surface. When a clarifying question is asked, it SHALL comply with the anatomy — stating what is being decided (where the cuts fall), why it matters, and the essential state context of the candidate idea — while preserving the existing rule that the question is asked only when the answer would change where the cuts fall.

#### Scenario: slicing clarifying question complies

- **WHEN** `sai-explore` asks a clarifying question about slicing cuts
- **THEN** the question references the question-context policy and states what is being decided, why it matters, and the essential state context of the idea being sliced, in plain wording

### Requirement: fixed-gate-pinned-semantics-preserved

Adding the policy references SHALL NOT alter the gates' pinned semantics: option labels, option ordering, invalid-input handling, and the exact existing wording that downstream tests assert.

#### Scenario: asserted strings survive

- **WHEN** the instruction surfaces are edited to reference the policy
- **THEN** the wording asserted by the surfaces' contract tests remains present and the gates' option semantics are unchanged

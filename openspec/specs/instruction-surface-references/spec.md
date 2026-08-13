# instruction-surface-references Specification

## Purpose

Requires the fixed decision surfaces in the shared instructions (`design.md`, `apply.md`, `explore.md`) to reference the question-context policy and comply with its anatomy, while preserving each gate's pinned semantics and the exact wording downstream tests assert.

## Requirements

### Requirement: design-gate-surfaces-reference-policy

`sai/commands/design/instructions.md` SHALL reference the question-context policy (`@sai/policies/question-context.md`) at its two fixed decision surfaces: the specs approval gate question and the Open Questions gate presentation. Both prompts SHALL comply with the anatomy — stating what is being decided, why it matters, the plain-language options, and the essential state context — while preserving the gates' pinned option labels, ordering, and semantics (for the approval gate: `yes` first, then `no`, with notes; for Open Questions: the unresolved question with its context).

#### Scenario: specs approval gate complies

- **WHEN** `sai/commands/design/instructions.md` asks the user to approve the specs
- **THEN** the gate references the question-context policy and the prompt states the decision, why it matters, the options, and the artifacts under review, preserving the `yes`/`no` ordering and notes semantics

#### Scenario: Open Questions gate complies

- **WHEN** `sai/commands/design/instructions.md` presents an unresolved Open Question to the user
- **THEN** the presentation references the question-context policy and carries the question's essential state context in plain wording

### Requirement: apply-gate-surfaces-reference-policy

`sai/commands/apply/instructions.md` SHALL reference the question-context policy at its two fixed decision surfaces: the Human Verification gate presentation and the GREEN-conflict halt presentation. Both prompts SHALL comply with the anatomy while preserving the gate's existing mechanics (checkbox-keyed gate, `Human Verification` wording, and the halt semantics).

#### Scenario: Human Verification gate complies

- **WHEN** the apply coordinator presents a Step's Human Verification checks to the user
- **THEN** the presentation references the question-context policy and states what is being confirmed, why it matters, and the checks under review, preserving the checkbox-keyed gate mechanics

#### Scenario: GREEN-conflict halt complies

- **WHEN** the apply coordinator surfaces a GREEN-conflict halt to the user
- **THEN** the presentation references the question-context policy and states what is being decided (implementation, test, or interface fault), why it matters, the essential state context of the conflict, and the plain-language options, preserving the halt semantics

### Requirement: explore-slicing-question-references-policy

`sai/commands/explore/instructions.md` SHALL reference the question-context policy at its slicing clarifying-question surface. When a clarifying question is asked, it SHALL comply with the anatomy — stating what is being decided (where the cuts fall), why it matters, and the essential state context of the candidate idea — while preserving the existing rule that the question is asked only when the answer would change where the cuts fall.

#### Scenario: slicing clarifying question complies

- **WHEN** `sai-explore` asks a clarifying question about slicing cuts
- **THEN** the question references the question-context policy and states what is being decided, why it matters, and the essential state context of the idea being sliced, in plain wording

### Requirement: fixed-gate-pinned-semantics-preserved

Adding the policy references SHALL NOT alter the gates' pinned semantics: option labels, option ordering, invalid-input handling, gate keying (checkbox count for Human Verification), and the exact existing wording that downstream tests assert (for example `Human Verification`).

#### Scenario: asserted strings survive

- **WHEN** the instruction surfaces are edited to reference the policy
- **THEN** the `Human Verification` wording asserted by `test/apply-coordinator-verification.test.js` remains present and the gates' option semantics are unchanged

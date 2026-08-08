# worker-contract-references Specification

## Purpose

Requires the spec-proposal, design, and implementation worker contracts to explicitly require their planning questions to comply with the question-context policy (and the design notice with its informational-notice subset), without altering the contracts' pinned change-selection strings.

## Requirements

### Requirement: worker-contracts-require-question-context

The spec-proposal worker contract (`sai/orchestration/workers/sai-1-spec-proposal-worker.md`), the design worker contract (`sai/orchestration/workers/sai-2-design-worker.md`), and the implementation worker contract (`sai/orchestration/workers/sai-3-implementation-worker.md`) SHALL each explicitly require that their planning questions comply with the question-context policy (`@sai/policies/question-context.md`). The design worker contract SHALL additionally require the design notice `message` to comply with the policy's informational-notice subset.

#### Scenario: spec worker contract requires the anatomy

- **WHEN** the spec-proposal worker contract's planning-question sentence is inspected
- **THEN** it requires planning questions to comply with `@sai/policies/question-context.md`

#### Scenario: design worker contract requires the anatomy for questions and notices

- **WHEN** the design worker contract's planning and notice handling is inspected
- **THEN** it requires planning questions to comply with `@sai/policies/question-context.md`
- **AND** it requires the design notice `message` to comply with the policy's informational-notice subset

#### Scenario: implementation worker contract requires the anatomy

- **WHEN** the implementation worker contract's planning-question sentence is inspected
- **THEN** it requires planning questions to comply with `@sai/policies/question-context.md`

### Requirement: worker-contract-pinned-strings-preserved

The anatomy requirement SHALL be added without removing or altering the worker contracts' pinned selection strings — `Use change '{name}'?` and `Which change?` — or their option labels, ordering, and invalid-input semantics. The exemption of these pinned prompts from the full anatomy SHALL be defined in `sai/policies/question-context.md` (the single source), not restated in this spec.

#### Scenario: picker strings remain intact

- **WHEN** the worker contracts are edited to add the anatomy requirement
- **THEN** the pinned `Use change '{name}'?` and `Which change?` strings and their ordered options remain unchanged
- **AND** the exemption of those pinned prompts from the full anatomy is stated in the policy, not in this spec

## ADDED Requirements

### Requirement: design agent SHALL gate tasks.md on resolved Open Questions

After writing `design.md`, the agent MUST review the Open Questions section. If any questions remain unresolved, the agent SHALL present them to the user, collect answers, and incorporate those answers into `design.md` before proceeding to write `tasks.md`.

#### Scenario: unresolved questions block tasks.md

- **WHEN** `design.md` is written and its Open Questions section contains one or more unresolved questions
- **THEN** the agent presents each unresolved question to the user
- **THEN** the agent waits for answers before writing `tasks.md`
- **THEN** answers are incorporated into `design.md`

#### Scenario: no unresolved questions — proceed immediately

- **WHEN** `design.md` is written and the Open Questions section is empty or all questions are marked resolved
- **THEN** the agent proceeds directly to generating `tasks.md` without user prompt

#### Scenario: tasks.md not written until gate clears

- **WHEN** the agent has written `design.md` but has not yet received answers to open questions
- **THEN** `tasks.md` MUST NOT be created

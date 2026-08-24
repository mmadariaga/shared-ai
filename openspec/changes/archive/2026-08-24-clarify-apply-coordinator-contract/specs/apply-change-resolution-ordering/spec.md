## MODIFIED Requirements

### Requirement: Apply invocation SHALL validate implementation plans only after change resolution

The Apply invocation SHALL complete global OpenSpec prerequisite checks, parse the fast-track token, resolve the change, and then validate `openspec/changes/{change-name}/implementation.md`. A missing implementation plan after resolution MUST stop with the existing literal: `implementation.md not found for '{change-name}'. Run /sai-3-implement first.`

#### Scenario: Apply starts with an unresolved request

- **WHEN** the Apply invocation begins before a change name has been resolved
- **THEN** it performs global prerequisites and fast-track parsing before change resolution, and performs the implementation-plan check only against the resolved change

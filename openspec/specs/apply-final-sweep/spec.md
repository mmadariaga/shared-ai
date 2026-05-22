# apply-final-sweep Specification

## Purpose
TBD - created by archiving change enhanced-apply-steps. Update Purpose after archive.
## Requirements
### Requirement: Agent SHALL perform a final checkbox sweep after all steps complete

When all steps in `implementation.md` are complete, the apply agent MUST scan the entire file and verify that every checkbox that should be checked is marked `[x]`. Any unchecked items MUST be reported to the user before the implementation is declared done.

#### Scenario: All checkboxes marked
- **WHEN** all steps are complete and every checkbox in `implementation.md` is `[x]`
- **THEN** the agent declares the implementation done without additional output

#### Scenario: Unchecked items remain
- **WHEN** all steps are complete but one or more checkboxes remain `[ ]`
- **THEN** the agent reports the unchecked items to the user and does NOT declare the implementation done until the user resolves them


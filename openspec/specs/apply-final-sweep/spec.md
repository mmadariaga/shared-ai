# apply-final-sweep Specification

## Purpose
TBD - created by archiving change enhanced-apply-steps. Update Purpose after archive.

## Requirements

### Requirement: Agent SHALL perform a final checkbox sweep after all steps complete
When all Steps in `implementation.md` are complete, the apply agent MUST scan the entire file and verify that every **Automated** checkbox is marked `[x]`. Any unchecked Automated item MUST be reported and MUST block entry into the terminal lifecycle. Unmarked **Functional** checkboxes MUST be reported as pending human review and MUST NOT block the sweep.

#### Scenario: All checkboxes marked
- **WHEN** all Steps are complete and every Automated checkbox in `implementation.md` is `[x]`
- **THEN** the sweep passes and the run enters the terminal lifecycle

#### Scenario: Unchecked items remain
- **WHEN** all Steps are complete but one or more Automated checkboxes remain `[ ]`
- **THEN** the agent reports the unchecked Automated items to the user and does NOT declare the implementation done until they are resolved

#### Scenario: Unmarked Functional checks do not block
- **WHEN** the sweep finds unmarked Functional checkboxes and no unmarked Automated checkbox
- **THEN** the agent reports those checks as pending human review and the sweep passes

## ADDED Requirements

### Requirement: empty bootstrap handoff
An intentionally empty command bootstrap SHALL explicitly state that it is not missing and that execution continues with the card selected by the harness boot adapter.

#### Scenario: empty bootstrap is loaded
- **WHEN** a command with no command-specific bootstrap loads is invoked
- **THEN** its `command-bootstrap.md` states that it is intentionally empty and hands execution to the boot-selected card

## ADDED Requirements

### Requirement: Checkbox progress tracking

The Copilot harness instructions (`sai/instructions/harness/copilot.md`) SHALL include a rule that instructs the agent to mark task checkboxes (convert `- [ ]` to `- [x]`) as each task is completed.

#### Scenario: Agent completes a checkbox task

- **WHEN** the agent finishes a task that is represented as a checkbox item in a task list
- **THEN** the agent MUST update the checkbox from `- [ ]` to `- [x]` immediately after completing that task

#### Scenario: Agent receives prompt without manual checkbox reminder

- **WHEN** the user invokes a sai command that involves a task list with checkboxes and does NOT include an explicit reminder to mark checkboxes
- **THEN** the Copilot harness instructions MUST still cause the agent to mark checkboxes as tasks are completed

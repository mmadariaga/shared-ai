# budget-subagent-file-editing

## MODIFIED Requirements

### Requirement: The budget-subagent SHALL use `edit/createDirectory`, `edit/createFile`, and `edit/editFiles` for file operations

The tool bindings for file editing were replaced: `edit/insertCodeBlock` and `edit/replaceSelection` were removed; `edit/createDirectory`, `edit/createFile`, and `edit/editFiles` were added to match the Copilot tool registry.

#### Scenario: Directory creation
- **WHEN** the budget-subagent needs to create a directory
- **THEN** it SHALL invoke the `edit/createDirectory` tool

#### Scenario: File creation
- **WHEN** the budget-subagent needs to create a new file
- **THEN** it SHALL invoke the `edit/createFile` tool

#### Scenario: File editing
- **WHEN** the budget-subagent needs to modify an existing file
- **THEN** it SHALL invoke the `edit/editFiles` tool

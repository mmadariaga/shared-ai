# budget-subagent-file-reading

## MODIFIED Requirements

### Requirement: The budget-subagent SHALL use `read/readFile` for reading file contents

The tool binding for file reading was updated from `read/fileContents` to `read/readFile` to match the Copilot tool registry.

#### Scenario: File content reading
- **WHEN** the budget-subagent needs to read the contents of a file
- **THEN** it SHALL invoke the `read/readFile` tool

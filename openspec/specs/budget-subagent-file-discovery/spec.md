# budget-subagent-file-discovery

## MODIFIED Requirements

### Requirement: The budget-subagent SHALL use `search/listDirectory` for directory listing

The tool binding for directory listing was updated from `read/directory` to `search/listDirectory` to match the Copilot tool registry.

#### Scenario: Directory listing request
- **WHEN** the budget-subagent needs to list files in a directory
- **THEN** it SHALL invoke the `search/listDirectory` tool

# budget-explorer-file-discovery Specification

## Purpose
Governs how the budget-explorer agent performs directory discovery, including the `search/listDirectory` tool binding.

## Requirements

### Requirement: The budget-explorer agent SHALL use `search/listDirectory` for directory listing

The tool binding for directory listing was updated from `read/directory` to `search/listDirectory` to match the Copilot tool registry.

#### Scenario: Directory listing request
- **WHEN** the budget-explorer agent needs to list files in a directory
- **THEN** it SHALL invoke the `search/listDirectory` tool

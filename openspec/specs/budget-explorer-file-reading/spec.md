# budget-explorer-file-reading Specification

## Purpose
Governs how the budget-explorer agent reads file contents, including the `read/readFile` tool binding.

## Requirements

### Requirement: The budget-explorer agent SHALL use `read/readFile` for reading file contents

The tool binding for file reading was updated from `read/fileContents` to `read/readFile` to match the Copilot tool registry.

#### Scenario: File content reading
- **WHEN** the budget-explorer agent needs to read the contents of a file
- **THEN** it SHALL invoke the `read/readFile` tool

# budget-executor-file-discovery Specification

## Purpose
TBD - created by archiving change copilot-fixes. Update Purpose after archive.
## Requirements
### Requirement: The budget-executor agent SHALL have access to `search/listDirectory`

`agents/copilot/budget-executor.agent.md` MUST include `search/listDirectory` in its tools list so the executor can list directory contents in addition to running terminal commands.

#### Scenario: Directory listing needed during execution
- **WHEN** the budget-executor agent needs to list files in a directory
- **THEN** it can invoke the `search/listDirectory` tool without falling back to terminal commands


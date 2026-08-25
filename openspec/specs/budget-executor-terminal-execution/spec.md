# budget-executor-terminal-execution

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: The budget-executor agent SHALL use `execute/runInTerminal` for terminal command execution

The tool binding for terminal commands was updated from `run/terminalCommand` to `execute/runInTerminal` to match the Copilot tool registry.

#### Scenario: Terminal command invocation
- **WHEN** the budget-executor agent needs to run a terminal command
- **THEN** it SHALL invoke the `execute/runInTerminal` tool

# budget-executor-terminal-execution

## MODIFIED Requirements

### Requirement: The budget-executor agent SHALL use `execute/runInTerminal` for terminal command execution

The tool binding for terminal commands was updated from `run/terminalCommand` to `execute/runInTerminal` to match the Copilot tool registry.

#### Scenario: Terminal command invocation
- **WHEN** the budget-executor agent needs to run a terminal command
- **THEN** it SHALL invoke the `execute/runInTerminal` tool

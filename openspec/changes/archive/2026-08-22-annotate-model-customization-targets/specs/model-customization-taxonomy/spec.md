## MODIFIED Requirements

### Requirement: Customization scopes classify targets by family
The setup model-customization flow SHALL offer `Workers`, `Agents`, `Commands`, `Utilities`, and `All`. Workers SHALL contain only Worker Matrix routed workers. Agents SHALL contain the generic delegation agents for the selected harness. Utilities SHALL contain `sai-commit`, `sai-pr`, `sai-status`, and `sai-worktree`; Commands SHALL contain the remaining model-customizable commands; All SHALL include every family.

#### Scenario: OpenCode families are derived
- **WHEN** OpenCode customization targets are enumerated
- **THEN** `budget`, `executor`, and `explore` SHALL be Agents, nine Worker Matrix identities SHALL be Workers, the four named utility commands SHALL be Utilities, and the remaining commands SHALL be Commands

#### Scenario: Claude families are derived
- **WHEN** Claude Code customization targets are enumerated
- **THEN** `budget-explorer`, `budget-executor`, and `budget-subagent` SHALL be Agents, nine Worker Matrix identities SHALL be Workers, the four named utility commands SHALL be Utilities, and the remaining commands SHALL be Commands

### Requirement: Target identities remain stable
Each selectable target SHALL use a family-prefixed identity with the `worker:`, `agent:`, `command:`, or `utility:` prefix. Display labels SHALL be separate from those selection values, and parsing and persistence SHALL use the stable identity's family and name.

#### Scenario: Family identity selects the correct target
- **WHEN** `utility:sai-pr` is confirmed
- **THEN** the flow SHALL parse it as the `sai-pr` utility and persist under the selected harness's commands override directory

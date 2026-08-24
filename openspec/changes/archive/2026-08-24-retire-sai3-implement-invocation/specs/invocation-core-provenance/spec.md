## MODIFIED Requirements

### Requirement: Shared invocation cores name their routed worker consumers

The active invocation-core inventory SHALL consist only of existing files matching `sai/commands/*/invocation.md`. The deleted `sai/commands/implement/invocation.md` SHALL not be treated as an active invocation core or as a current implementation consumer. Every remaining active invocation core SHALL identify its corresponding routed phase worker and SHALL not describe a retired inline caller or deleted adapter as active.

#### Scenario: Retired implementation invocation is absent from the active inventory

- **WHEN** the invocation-core inventory is audited
- **THEN** `sai/commands/implement/invocation.md` is absent and the guard covers only the remaining existing invocation cores.

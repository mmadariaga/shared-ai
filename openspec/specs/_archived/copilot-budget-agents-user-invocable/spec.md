## MODIFIED Requirements

### Requirement: Copilot budget agent descriptors SHALL be user-invocable

`agents/copilot/budget-executor.agent.md`, `agents/copilot/budget-explorer.agent.md`, and `agents/copilot/budget-subagent.agent.md` MUST have `user-invocable: true` in their frontmatter. Descriptions MUST NOT state that these agents are not intended for direct user selection.

#### Scenario: User selects a budget agent in Copilot

- **WHEN** a user opens the Copilot agent picker
- **THEN** budget-executor, budget-explorer, and budget-subagent appear as selectable agents

#### Scenario: Programmatic invocation still works

- **WHEN** the main agent spawns a budget subagent programmatically
- **THEN** behavior is unchanged — `user-invocable: true` does not restrict programmatic use

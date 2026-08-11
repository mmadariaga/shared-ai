## MODIFIED Requirements

### Requirement: The Copilot budget-subagent agent SHALL use the updated model identifier

The budget-subagent agent frontmatter SHALL identify `GPT-5.6 Luna (copilot)` as its model.

#### Scenario: Budget-subagent metadata is loaded
- **WHEN** the Copilot budget-subagent agent definition is read
- **THEN** its `model` field is `GPT-5.6 Luna (copilot)`

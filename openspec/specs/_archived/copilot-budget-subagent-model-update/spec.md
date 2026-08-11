# copilot-budget-subagent-model-update Specification

## Purpose
TBD - created by archiving change minor-copilot-changes. Update Purpose after archive.
## Requirements
### Requirement: The budget-subagent agent file SHALL reference the current Copilot model identifier

The `model` field in `agents/copilot/budget-subagent.agent.md` MUST reflect the current GPT-5.4 mini model available through Copilot.

#### Scenario: Budget subagent model is resolved via Copilot
- **WHEN** the budget-subagent agent is loaded for a Copilot-based subagent invocation
- **THEN** the model field specifies `GPT-5.4 mini (copilot)`


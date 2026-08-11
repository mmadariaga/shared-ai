# copilot-budget-agent-models Specification

## Purpose
Define the model identity used by Copilot budget agents and their skill bindings.
## Requirements
### Requirement: Copilot budget agents and skill bindings SHALL identify GPT-5.6 Luna

The Copilot `budget-explorer`, `budget-executor`, and `budget-subagent` agent definitions SHALL use `GPT-5.6 Luna (copilot)` as their model, and the corresponding Copilot budget skill metadata SHALL describe the same model.

#### Scenario: Budget agent metadata is loaded
- **WHEN** a Copilot budget agent definition is read
- **THEN** its `model` field is `GPT-5.6 Luna (copilot)`

#### Scenario: Budget skill metadata is loaded
- **WHEN** a corresponding Copilot budget skill is read
- **THEN** its model description identifies `GPT-5.6 Luna (copilot)`


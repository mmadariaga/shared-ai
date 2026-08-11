# copilot-model-reference-documentation Specification

## Purpose
Keep Copilot model reference documentation aligned with active command and budget-agent assignments.
## Requirements
### Requirement: Copilot model reference documentation SHALL mirror active assignments

The Copilot model tables and routing references in `README.md` and `AGENTS.md` SHALL identify the updated model for every command and budget-agent assignment changed by this implementation.

#### Scenario: README model matrix is consulted
- **WHEN** a user reads the Copilot columns in the README model matrix
- **THEN** the listed models match the corresponding Copilot command prompt and budget-agent metadata

#### Scenario: AGENTS model guidance is consulted
- **WHEN** an agent reads the Copilot model guidance in AGENTS.md
- **THEN** the listed budget-agent and phase assignments match the implemented metadata


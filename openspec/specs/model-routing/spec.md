## MODIFIED Requirements

### Requirement: The system SHALL maintain up-to-date model assignments in all command wrappers

Each command wrapper's YAML frontmatter `model` field SHALL reflect the currently recommended model for that command and harness. Model assignments are reviewed and updated as provider offerings change.

#### Scenario: Copilot explore wrapper uses current model

- **WHEN** the Copilot `sai-explore` wrapper is invoked
- **THEN** the system SHALL use `GPT-5.4 (copilot)` as the model

#### Scenario: Copilot backfill wrapper uses current model

- **WHEN** the Copilot `sai-backfill` wrapper is invoked
- **THEN** the system SHALL use `GPT-5.4 (copilot)` as the model

#### Scenario: Opencode design wrapper uses current model

- **WHEN** the opencode `sai-2-design` wrapper is invoked
- **THEN** the system SHALL use `opencode-go/glm-5.2` as the model

#### Scenario: Opencode spec wrapper uses current model

- **WHEN** the opencode `sai-1-spec` wrapper is invoked
- **THEN** the system SHALL use `opencode-go/minimax-m3` as the model

#### Scenario: Opencode backfill wrapper uses current model

- **WHEN** the opencode `sai-backfill` wrapper is invoked
- **THEN** the system SHALL use `opencode-go/minimax-m3` as the model

#### Scenario: README model reference table reflects current assignments

- **WHEN** a user consults the model reference table in `README.md`
- **THEN** the `spec (1)` and `backfill` rows SHALL show `opencode-go/minimax-m3` for the Opencode column

#### Scenario: Command registry lists all active wrappers

- **WHEN** the `sai-commands` SKILL.md registry is loaded
- **THEN** it SHALL include entries for all active command wrappers, including `sai-3-implement-low` and `sai-3-implement-high`

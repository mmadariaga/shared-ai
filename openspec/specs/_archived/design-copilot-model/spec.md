# Design Copilot Model

## Requirements

### Requirement: The design phase Copilot prompt SHALL use Claude Opus 4.8 as the model identifier

The `commands/copilot/sai-2-design.prompt.md` frontmatter `model` field MUST be set to `Claude Opus 4.8 (copilot)`.

#### Scenario: Frontmatter model value
- **WHEN** the sai-2-design.prompt.md file is read
- **THEN** the `model` field in the YAML frontmatter is `Claude Opus 4.8 (copilot)`

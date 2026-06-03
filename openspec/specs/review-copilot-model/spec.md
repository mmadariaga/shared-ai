# Review Copilot Model

## Requirements

### Requirement: The review phase Copilot prompt SHALL use GPT-5.4 as the model identifier

The `commands/copilot/sai-5-review.prompt.md` frontmatter `model` field MUST be set to `GPT-5.4 (copilot)`.

#### Scenario: Frontmatter model value
- **WHEN** the sai-5-review.prompt.md file is read
- **THEN** the `model` field in the YAML frontmatter is `GPT-5.4 (copilot)`

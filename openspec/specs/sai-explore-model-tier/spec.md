## MODIFIED Requirements

### Requirement: The `sai-explore` command MUST use `claude-sonnet-4-6` at `medium` effort.

Previously configured as `claude-opus-4-7` / `high`. Downgraded to match the task class of an exploration/thinking-partner command.

#### Scenario: sai-explore command frontmatter
- **WHEN** the `commands/claude/sai-explore.md` frontmatter is read
- **THEN** `model` SHALL be `claude-sonnet-4-6`
- **THEN** `effort` SHALL be `medium`

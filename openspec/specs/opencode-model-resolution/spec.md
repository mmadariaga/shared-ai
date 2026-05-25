## ADDED Requirements

### Requirement: opencode sai-explore model namespace

The `commands/opencode/sai-explore.md` wrapper SHALL declare `model: opencode-go/qwen3.6-plus` in its YAML frontmatter. The namespace `opencode/qwen3.6-plus` SHALL NOT be used.

#### Scenario: correct model namespace in frontmatter
- **WHEN** `commands/opencode/sai-explore.md` is read
- **THEN** its frontmatter contains `model: opencode-go/qwen3.6-plus`

#### Scenario: old namespace absent
- **WHEN** `commands/opencode/sai-explore.md` is read
- **THEN** it does not contain `model: opencode/qwen3.6-plus`

## MODIFIED Requirements

## REMOVED Requirements

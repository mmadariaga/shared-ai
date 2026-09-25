# sai-explore-model-tier Specification

## Purpose

Keep the `sai-explore` coordinator's model tier declared once, in its harness wrappers.

## Requirements
### Requirement: The `sai-explore` wrappers declare their model tier

The `commands/claude/sai-explore.md` wrapper SHALL declare `model` and `effort`, and the `commands/opencode/sai-explore.md` wrapper SHALL declare `model` and `variant`, in their frontmatter. That frontmatter is the sole authority for the explore tier; no spec pins its values.

#### Scenario: sai-explore command frontmatter
- **WHEN** either `sai-explore` wrapper's frontmatter is read
- **THEN** it SHALL contain a `model` line and the harness's reasoning line (`effort` for Claude Code, `variant` for opencode)

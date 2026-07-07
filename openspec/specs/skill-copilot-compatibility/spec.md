# skill-copilot-compatibility Specification

## Purpose
Define how skills declare Copilot compatibility in their metadata, so the harness-loader installs universal skills on all three compat targets.

## Requirements

### Requirement: Skills declare copilot in their compatibility metadata

A skill that works on all three supported harnesses (Claude Code, opencode, GitHub Copilot) MUST declare `copilot` in its YAML `compatibility:` frontmatter field, alongside `claude` and `opencode`. The value is a comma-separated list, and the order SHALL be `opencode, claude, copilot` to match the order harnesses are listed in AGENTS.md.

#### Scenario: safe-operations compatibility field
- **WHEN** a reader inspects `skills/universal/safe-operations/SKILL.md`
- **THEN** the YAML `compatibility:` field reads `opencode, claude, copilot`

#### Scenario: sai-commands compatibility field
- **WHEN** a reader inspects `skills/universal/sai-commands/SKILL.md`
- **THEN** the YAML `compatibility:` field reads `opencode, claude, copilot`

#### Scenario: Harness-agnostic skills also declare copilot
- **WHEN** a skill's behavior is identical across all three harnesses (no per-harness fork)
- **THEN** the skill MUST still declare all three harnesses in `compatibility:`, so the harness-loader installs it on all three targets

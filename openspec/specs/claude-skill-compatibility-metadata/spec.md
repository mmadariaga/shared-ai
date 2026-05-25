## ADDED Requirements

### Requirement: Claude-only skills declare compatibility metadata

SKILL.md files that are exclusive to Claude Code SHALL include a `compatibility: claude` field in YAML frontmatter and append "Claude Code only — NOT compatible with opencode." to the `description` field.

#### Scenario: budget-executor compatibility declared
- **WHEN** `skills/claude/budget-executor/SKILL.md` is authored
- **THEN** frontmatter contains `compatibility: claude` and description ends with "Claude Code only — NOT compatible with opencode."

#### Scenario: budget-explorer compatibility declared
- **WHEN** `skills/claude/budget-explorer/SKILL.md` is authored
- **THEN** frontmatter contains `compatibility: claude` and description ends with "Claude Code only — NOT compatible with opencode."

#### Scenario: fetch compatibility declared
- **WHEN** `skills/claude/fetch/SKILL.md` is authored
- **THEN** description includes "Claude Code only — NOT compatible with opencode." clarification

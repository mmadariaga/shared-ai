# budget-skill-name-normalization Specification

## MODIFIED Requirements

### Requirement: Budget skill `name:` frontmatter fields SHALL use platform-agnostic slugs

The `name:` field in budget skill `SKILL.md` frontmatter SHALL use the plain slug (`budget-executor`, `budget-explorer`) regardless of whether the file resides under `skills/claude/` or `skills/opencode/`. Platform-prefixed names (`claude-budget-executor`, `opencode-budget-explorer`, etc.) SHALL NOT be used.

#### Scenario: Claude budget-executor uses plain name
- **WHEN** `skills/claude/budget-executor/SKILL.md` is read
- **THEN** the frontmatter contains `name: budget-executor`

#### Scenario: Claude budget-explorer uses plain name
- **WHEN** `skills/claude/budget-explorer/SKILL.md` is read
- **THEN** the frontmatter contains `name: budget-explorer`

#### Scenario: OpenCode budget-executor uses plain name
- **WHEN** `skills/opencode/budget-executor/SKILL.md` is read
- **THEN** the frontmatter contains `name: budget-executor`

#### Scenario: OpenCode budget-explorer uses plain name
- **WHEN** `skills/opencode/budget-explorer/SKILL.md` is read
- **THEN** the frontmatter contains `name: budget-explorer`

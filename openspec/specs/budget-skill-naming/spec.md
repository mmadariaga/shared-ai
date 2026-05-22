# budget-skill-naming Specification

## ADDED Requirements

### Requirement: Budget skill `name:` fields SHALL use platform-agnostic slugs

The `name:` frontmatter field in budget skill SKILL.md files SHALL use the plain slug (`budget-executor`, `budget-explorer`) without a platform prefix, regardless of whether the file lives under `skills/claude/` or `skills/opencode/`.

#### Scenario: Claude budget-executor name field

- **WHEN** `skills/claude/budget-executor/SKILL.md` is read
- **THEN** the frontmatter contains `name: budget-executor` (not `claude-budget-executor`)

#### Scenario: Claude budget-explorer name field

- **WHEN** `skills/claude/budget-explorer/SKILL.md` is read
- **THEN** the frontmatter contains `name: budget-explorer` (not `claude-budget-explorer`)

#### Scenario: OpenCode budget-executor name field

- **WHEN** `skills/opencode/budget-executor/SKILL.md` is read
- **THEN** the frontmatter contains `name: budget-executor` (not `opencode-budget-executor`)

#### Scenario: OpenCode budget-explorer name field

- **WHEN** `skills/opencode/budget-explorer/SKILL.md` is read
- **THEN** the frontmatter contains `name: budget-explorer` (not `opencode-budget-explorer`)

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

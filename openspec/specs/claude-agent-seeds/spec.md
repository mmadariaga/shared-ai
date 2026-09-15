# claude-agent-seeds Specification

## Purpose
TBD - created by archiving change update-claude-factory-models-efforts. Update Purpose after archive.
## Requirements
### Requirement: Executor agent uses haiku without effort
The Claude budget-executor agent seed SHALL declare model haiku with no effort line, removing the prior effort low line.
#### Scenario: Executor factory seed is observed
- **WHEN** a fresh install materializes agents/claude/budget-executor.md
- **THEN** its frontmatter declares model haiku with no effort line

### Requirement: Explorer and task agents use sonnet with catalog effort
The Claude budget-explorer and budget-subagent seeds SHALL declare model sonnet with a catalog effort. Explorer uses effort low and subagent uses effort medium.
#### Scenario: Explorer factory seed is observed
- **WHEN** a fresh install materializes agents/claude/budget-explorer.md
- **THEN** its frontmatter declares model sonnet with effort low

#### Scenario: Task agent factory seed is observed
- **WHEN** a fresh install materializes agents/claude/budget-subagent.md
- **THEN** its frontmatter declares model sonnet with effort medium


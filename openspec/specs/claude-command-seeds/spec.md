# claude-command-seeds Specification

## Purpose
TBD - created by archiving change update-claude-factory-models-efforts. Update Purpose after archive.
## Requirements
### Requirement: Orchestrator command seeds use opus with medium effort
The Claude orchestrator command wrappers SHALL declare model opus with effort medium as factory defaults. This covers wrappers that supervise routed workers and previously used opus/low, sonnet/low, sonnet/medium, opus/xhigh, or haiku without effort.
#### Scenario: Orchestrator factory seed is observed
- **WHEN** a fresh install materializes commands/claude/sai-3-implement.md
- **THEN** its frontmatter declares model opus with effort medium

### Requirement: Utility command seeds use sonnet with medium effort
The Claude utility command wrappers SHALL declare model sonnet with effort medium as factory defaults. This covers commit, pr, status, and worktree wrappers previously seeded as haiku without effort.
#### Scenario: Utility factory seed is observed
- **WHEN** a fresh install materializes commands/claude/sai-commit.md
- **THEN** its frontmatter declares model sonnet with effort medium

### Requirement: Security command seed normalizes to opus medium
The Claude security command wrapper SHALL declare model opus with effort medium, replacing the prior opus/xhigh seed.
#### Scenario: Security factory seed is observed
- **WHEN** a fresh install materializes commands/claude/sai-6-security.md
- **THEN** its frontmatter declares model opus with effort medium


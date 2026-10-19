# claude-agent-seeds Specification

## Purpose
TBD - created by archiving change update-claude-factory-models-efforts. Update Purpose after archive.

## Requirements

### Requirement: Executor agent seed defaults

The Claude Code budget-executor agent seed SHALL declare model haiku and an explicit effort medium line, matching `agent:budget-executor` in `sai/presets/claude/[sai-default]-OPUS.json`.

#### Scenario: Executor factory seed is observed
- **WHEN** a fresh install materializes the Claude Code budget-executor agent
- **THEN** its frontmatter declares model haiku with effort medium

### Requirement: Explorer and task agent seed defaults

The Claude Code budget-explorer and budget-subagent seeds SHALL each declare model haiku with explicit effort medium, matching their entries in `sai/presets/claude/[sai-default]-OPUS.json`.

#### Scenario: Explorer factory seed is observed
- **WHEN** a fresh install materializes the Claude Code budget-explorer agent
- **THEN** its frontmatter declares model haiku with effort medium

#### Scenario: Task agent factory seed is observed
- **WHEN** a fresh install materializes the Claude Code budget-subagent agent
- **THEN** its frontmatter declares model haiku with effort medium

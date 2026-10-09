# claude-command-seeds Specification

## Purpose
TBD - created by archiving change update-claude-factory-models-efforts. Update Purpose after archive.

## Requirements

### Requirement: Orchestrator command seed defaults

The Claude Code command wrapper defaults SHALL match each corresponding command entry in `sai/presets/claude/[sai-default]-OPUS.json`. The `sai-1-spec`, `sai-2-design`, `sai-3-implement`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-backfill`, and `sai-archive` wrappers SHALL declare model sonnet with effort high. The `sai-explore`, `sai-build`, `sai-4-apply`, `sai-review`, and `sai-merge` wrappers SHALL declare model opus with effort medium.

#### Scenario: Orchestrator factory seed is observed
- **WHEN** a fresh install materializes the Claude Code sai-3-implement command wrapper
- **THEN** its frontmatter declares model sonnet with effort high

#### Scenario: Preset retains an opus command default
- **WHEN** a fresh install materializes the Claude Code sai-build command wrapper
- **THEN** its frontmatter declares model opus with effort medium

### Requirement: Utility command seed defaults

The Claude Code sai-commit wrapper SHALL declare model sonnet with effort high. The sai-status and sai-worktree wrappers SHALL declare model haiku with effort medium. The sai-retire-docs wrapper SHALL declare model opus with effort medium. These shipped defaults SHALL match their command or utility entries in `sai/presets/claude/[sai-default]-OPUS.json`.

#### Scenario: Utility factory seed is observed
- **WHEN** a fresh install materializes the Claude Code sai-commit command wrapper
- **THEN** its frontmatter declares model sonnet with effort high

#### Scenario: Status and worktree factory seeds are observed
- **WHEN** a fresh install materializes the Claude Code sai-status and sai-worktree command wrappers
- **THEN** both wrappers declare model haiku with effort medium

#### Scenario: Documentation retirement factory seed is observed
- **WHEN** a fresh install materializes the Claude Code sai-retire-docs command wrapper
- **THEN** its frontmatter declares model opus with effort medium

### Requirement: Security command seed defaults

The Claude Code sai-6-security command wrapper SHALL declare model sonnet with effort high, matching `command:sai-6-security` in `sai/presets/claude/[sai-default]-OPUS.json`.

#### Scenario: Security factory seed is observed
- **WHEN** a fresh install materializes the Claude Code sai-6-security command wrapper
- **THEN** its frontmatter declares model sonnet with effort high

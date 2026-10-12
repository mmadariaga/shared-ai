# planning-documentation Specification

## Purpose
Explain category planning and its customization and failure boundaries consistently across both supported harnesses.

## Requirements

### Requirement: Planning guides document the complete functional route

README.md, docs/commands/sai-3-implement.md, docs/models.md, and AGENTS.md SHALL document five planning agents, category mapping, concurrent complete tasks, temporary parts, failure isolation, coordinator-owned common work and integration, identical defaults, and project-local overrides for Claude Code and opencode. They SHALL state that sai-4, RED/GREEN routing, and the final plan format remain unchanged.

#### Scenario: A user reads the planning guide

- **WHEN** the user consults the command guide and model reference
- **THEN** the documents explain category routing, independent model configuration, project-local model/skill overrides, named unavailable resources, and successful-only owned-file cleanup.

#### Scenario: A user compares harness configuration

- **WHEN** the user follows configuration instructions
- **THEN** Claude Code uses .claude/agents definitions with model/effort and opencode uses .opencode/agents definitions with model/optional variant, with neither harness assigned specialty defaults.

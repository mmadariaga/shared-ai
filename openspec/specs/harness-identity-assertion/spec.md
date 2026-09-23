# Harness Identity Assertion Specification

## Purpose
Make each per-harness fetch skill declare its harness identity and resolution roots before it interprets any fetch directive.

## Requirements

### Requirement: Fetch skills declare the active harness and resolution roots

Each per-harness fetch skill SHALL positively declare its canonical harness identity and the project and user roots it resolves under. The canonical identities SHALL be `claude` and `opencode`; the corresponding roots SHALL remain the Claude `.claude/` then `~/.claude/` roots and the opencode `.opencode/` then `~/.config/opencode/` roots.

#### Scenario: Claude Code fetch skill establishes identity
- **WHEN** the Claude Code fetch skill is loaded before a fetch directive
- **THEN** it states `claude` as the active harness and states that project-local `.claude/` resolution precedes user-global `~/.claude/` resolution

#### Scenario: opencode fetch skill establishes identity
- **WHEN** the opencode fetch skill is loaded before a fetch directive
- **THEN** it states `opencode` as the active harness and states that project-local `.opencode/` resolution precedes user-global `~/.config/opencode/` resolution

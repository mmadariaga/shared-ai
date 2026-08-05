# Harness Identity Assertion Specification

## Purpose
TBD

## Requirements

### Requirement: Fetch skills declare the active harness and resolution roots

Each per-harness fetch skill SHALL positively declare its canonical harness identity and the project and user roots it resolves under. The canonical identities SHALL be `claude`, `opencode`, and `copilot`; the corresponding roots SHALL remain the existing Claude `.claude/` then `~/.claude/` roots, opencode `.opencode/` then `~/.config/opencode/` roots, and Copilot `.github/sai/` then the VS Code SAI root defined by the OS-specific table in `skills/copilot/fetch/SKILL.md`.

#### Scenario: Claude Code fetch skill establishes identity
- **WHEN** the Claude Code fetch skill is loaded before a fetch directive
- **THEN** it states `claude` as the active harness and states that project-local `.claude/` resolution precedes user-global `~/.claude/` resolution

#### Scenario: opencode fetch skill establishes identity
- **WHEN** the opencode fetch skill is loaded before a fetch directive
- **THEN** it states `opencode` as the active harness and states that project-local `.opencode/` resolution precedes user-global `~/.config/opencode/` resolution

#### Scenario: GitHub Copilot fetch skill establishes identity
- **WHEN** the GitHub Copilot fetch skill is loaded before a fetch directive
- **THEN** it states `copilot` as the active harness and states that project-local `.github/sai/` resolution precedes the VS Code SAI root

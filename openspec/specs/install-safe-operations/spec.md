# Spec: install-safe-operations

## ADDED Requirements

### Requirement: Install scripts SHALL copy safe-operations skill to user directories

The install scripts and INSTALL documentation SHALL include steps to copy `skills/universal/safe-operations/SKILL.md` to the user-level skills directory for both Claude Code and OpenCode.

#### Scenario: Claude Code install includes safe-operations
- **WHEN** user follows INSTALL.claude.md or runs the install script for Claude Code
- **THEN** `skills/universal/safe-operations/SKILL.md` is copied to `~/.claude/skills/safe-operations/SKILL.md`

#### Scenario: OpenCode install includes safe-operations
- **WHEN** user follows INSTALL.opencode.md or runs the install script for OpenCode
- **THEN** `skills/universal/safe-operations/SKILL.md` is copied to `~/.config/opencode/skills/safe-operations/SKILL.md`

#### Scenario: Programmatic install includes safe-operations
- **WHEN** `bin/install-flow.js` runs `installClaude()` or `installOpencode()`
- **THEN** `copyWithWarn()` is called for `skills/universal/safe-operations/SKILL.md` to the appropriate target skills directory

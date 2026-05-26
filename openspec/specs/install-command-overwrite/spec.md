## ADDED Requirements

### Requirement: install script overwrites command wrappers on reinstall with warning

The install script SHALL use `copyWithWarn` (not `copySkipIfExists`) when copying command wrapper files from `commands/claude/` and `commands/opencode/` to their respective user-level destinations, so that reinstalls update stale wrappers while alerting the user.

#### Scenario: Claude Code command reinstall
- **WHEN** `installClaude()` runs and a wrapper file already exists in `~/.claude/commands/`
- **THEN** the file is overwritten with the repo version and a warning is printed

#### Scenario: OpenCode command reinstall
- **WHEN** `installOpencode()` runs and a wrapper file already exists in `~/.config/opencode/commands/`
- **THEN** the file is overwritten with the repo version and a warning is printed

### Requirement: universal skill copy order is consistent

Both `installClaude()` and `installOpencode()` SHALL copy universal skills (`budget/SKILL.md`, `caveman/SKILL.md`, `sai-commands/SKILL.md`, `token-efficient-languages/SKILL.md`) in the same relative order, with `budget/SKILL.md` and `sai-commands/SKILL.md` appearing before `caveman/SKILL.md`.

#### Scenario: installClaude skill ordering
- **WHEN** `installClaude()` executes
- **THEN** `budget/SKILL.md` and `sai-commands/SKILL.md` are copied before `caveman/SKILL.md`

#### Scenario: installOpencode skill ordering
- **WHEN** `installOpencode()` executes
- **THEN** `budget/SKILL.md` and `sai-commands/SKILL.md` are copied before `caveman/SKILL.md`

### Requirement: INSTALL.opencode.md documents per-project override pattern

`INSTALL.opencode.md` SHALL document a per-project override workflow that copies selected commands into `.opencode/commands/` before editing, so user customizations survive reinstalls.

#### Scenario: user reads per-project override section
- **WHEN** user reads the Post Install section of `INSTALL.opencode.md`
- **THEN** they see `cp` commands to copy `sai-1-spec.md` and `sai-2-design.md` into `.opencode/commands/`
- **THEN** they see a warning that editing global commands directly will be overwritten on future updates

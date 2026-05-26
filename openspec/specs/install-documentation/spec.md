# spec: install-documentation

## MODIFIED Requirements

### Requirement: INSTALL.claude.md includes sai-commands skill copy step

`INSTALL.claude.md` SHALL include `mkdir` and `cp`/`Copy-Item` commands to install `skills/universal/sai-commands/SKILL.md` into `~/.claude/skills/sai-commands/`, following the same pattern as other universal skill install steps.

#### Scenario: bash install executed
- **WHEN** a user follows the bash install steps in INSTALL.claude.md
- **THEN** `mkdir -p ~/.claude/skills/sai-commands` and `cp skills/universal/sai-commands/SKILL.md ~/.claude/skills/sai-commands/SKILL.md` are executed

#### Scenario: PowerShell install executed
- **WHEN** a user follows the PowerShell install steps in INSTALL.claude.md
- **THEN** `New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\sai-commands"` and `Copy-Item skills\universal\sai-commands\SKILL.md "$env:USERPROFILE\.claude\skills\sai-commands\SKILL.md"` are executed

### Requirement: INSTALL.opencode.md includes sai-commands skill copy step

`INSTALL.opencode.md` SHALL include `mkdir` and `cp`/`Copy-Item` commands to install `skills/universal/sai-commands/SKILL.md` into `~/.config/opencode/skills/sai-commands/`, following the same pattern as other universal skill install steps.

#### Scenario: bash install executed
- **WHEN** a user follows the bash install steps in INSTALL.opencode.md
- **THEN** `mkdir -p ~/.config/opencode/skills/sai-commands` and `cp skills/universal/sai-commands/SKILL.md ~/.config/opencode/skills/sai-commands/SKILL.md` are executed

#### Scenario: PowerShell install executed
- **WHEN** a user follows the PowerShell install steps in INSTALL.opencode.md
- **THEN** `New-Item -ItemType Directory -Force -Path "$configDir\skills\sai-commands"` and `Copy-Item skills\universal\sai-commands\SKILL.md "$configDir\skills\sai-commands\SKILL.md"` are executed

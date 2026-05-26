## MODIFIED Requirements

### Requirement: INSTALL.claude.md — add copy step for Claude Code

`INSTALL.claude.md` SHALL gain a `cp` line that installs the universal skill into the Claude Code skills directory, following the same pattern as the budget skill copy step.

The line SHALL be:
```
cp skills/universal/token-efficient-languages/SKILL.md ~/.claude/skills/token-efficient-languages/SKILL.md
```

It SHALL be placed immediately after the budget copy step (currently line 46) and before the budget-explorer copy step.

#### Scenario: INSTALL.claude.md executed

- **WHEN** a user follows the install steps in INSTALL.claude.md
- **THEN** `~/.claude/skills/token-efficient-languages/SKILL.md` is created from the repo source

### Requirement: README.md bash section — add copy step for OpenCode

The bash installation section of `README.md` (around line 247–254) SHALL gain a `cp` line for the token-efficient-languages skill, following the same pattern as the budget skill:

```
cp skills/universal/token-efficient-languages/SKILL.md ~/.config/opencode/skills/token-efficient-languages/SKILL.md
```

It SHALL be placed immediately after the budget copy step and before the budget-explorer copy step.

#### Scenario: README bash script executed

- **WHEN** a user follows the bash install steps in README.md
- **THEN** `~/.config/opencode/skills/token-efficient-languages/SKILL.md` is created from the repo source

### Requirement: README.md PowerShell section — add copy step for OpenCode

The PowerShell installation section of `README.md` (around line 293–300) SHALL gain a `Copy-Item` line for the token-efficient-languages skill, following the same pattern as the budget skill:

```
Copy-Item skills\universal\token-efficient-languages\SKILL.md "$configDir\skills\token-efficient-languages\SKILL.md"
```

It SHALL be placed immediately after the budget `Copy-Item` step and before the budget-explorer `Copy-Item` step.

#### Scenario: README PowerShell script executed

- **WHEN** a user follows the PowerShell install steps in README.md
- **THEN** `$configDir\skills\token-efficient-languages\SKILL.md` is created from the repo source

### Requirement: Destination directory creation

If the bash and PowerShell install scripts already create the skills subdirectory with a `mkdir -p` (or `New-Item -ItemType Directory`) step, no additional mkdir step is needed for `token-efficient-languages` — the parent directory `~/.claude/skills/` and `~/.config/opencode/skills/` are already created by earlier steps.

#### Scenario: Directory already created

- **WHEN** the install script runs token-efficient-languages copy step
- **THEN** no separate `mkdir` for the skill's parent directory is required (the parent exists from budget steps above)

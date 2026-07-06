## ADDED Requirements

### Requirement: sai-backfill skill SHALL be installed from canonical repo source

`INSTALL.claude.md` (and equivalent PowerShell section) MUST copy the sai-backfill skill from `skills/claude/sai-backfill/SKILL.md` — the canonical repo source path — not from any local installation directory such as `.claude/skills/`.

#### Scenario: bash install executed
- **WHEN** a user runs the bash install steps in `INSTALL.claude.md`
- **THEN** `~/.claude/skills/sai-backfill/SKILL.md` SHALL be created from `skills/claude/sai-backfill/SKILL.md`

#### Scenario: PowerShell install executed
- **WHEN** a user runs the PowerShell install steps in `INSTALL.claude.md`
- **THEN** `$env:USERPROFILE\.claude\skills\sai-backfill\SKILL.md` SHALL be created from `skills\claude\sai-backfill\SKILL.md`

### Requirement: no SKILL.md under .claude/skills/ in repo source

The repository SHALL NOT contain `.claude/skills/sai-backfill/SKILL.md`. That path is a local installation target, not a source file.

#### Scenario: repo checked for misplaced skill file
- **WHEN** `git ls-files .claude/skills/sai-backfill/SKILL.md` is run
- **THEN** the output SHALL be empty

## MODIFIED Requirements

## REMOVED Requirements

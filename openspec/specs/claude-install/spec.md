## MODIFIED Requirements

### Requirement: INSTALL.claude.md includes fetch skill copy step
`INSTALL.claude.md` SHALL include instructions to copy `skills/claude/fetch/SKILL.md` to `~/.claude/skills/fetch/SKILL.md` in both the Linux/macOS bash section and the Windows PowerShell section.

The copy step MUST follow the same pattern as the existing budget-explorer and budget-executor skill copy steps (mkdir + copy, no skip-if-exists guard since this skill is always overwritten on reinstall).

#### Scenario: Linux/macOS install step present
- **WHEN** a user follows the Linux/macOS install section
- **THEN** the script includes:
    mkdir -p ~/.claude/skills/fetch
    cp skills/claude/fetch/SKILL.md ~/.claude/skills/fetch/SKILL.md

#### Scenario: Windows PowerShell install step present
- **WHEN** a user follows the Windows PowerShell install section
- **THEN** the script includes:
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\fetch" | Out-Null
    Copy-Item skills\claude\fetch\SKILL.md "$env:USERPROFILE\.claude\skills\fetch\SKILL.md"

#### Scenario: skill not installed — commands break
- **WHEN** a user installs shared-AI without the fetch skill copy step
- **THEN** `Fetch @skills/fetch/SKILL.md` in command wrappers fails because the skill file does not exist at `~/.claude/skills/fetch/SKILL.md`

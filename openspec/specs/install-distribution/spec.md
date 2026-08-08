# install-distribution Specification

## Purpose

Define how the budget-subagent skill and the opencode configuration guidance are distributed through the automated and manual install flows.

## Requirements

### Requirement: install-claude-copy-steps
`INSTALL.claude.md` SHALL include copy steps for `skills/claude/budget-subagent/SKILL.md` in both the Linux/macOS bash block and the Windows PowerShell block, immediately after the existing `budget-executor` copy steps.

Linux/macOS pattern (to be inserted after the budget-executor block):

    mkdir -p ~/.claude/skills/budget-subagent
    cp skills/claude/budget-subagent/SKILL.md ~/.claude/skills/budget-subagent/SKILL.md

Windows PowerShell pattern:

    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\budget-subagent" | Out-Null
    Copy-Item skills\claude\budget-subagent\SKILL.md "$env:USERPROFILE\.claude\skills\budget-subagent\SKILL.md"

#### Scenario: install step present in bash block
- **WHEN** a user follows the Linux/macOS manual installation
- **THEN** the bash block contains the `budget-subagent` mkdir + cp lines after `budget-executor`

#### Scenario: install step present in powershell block
- **WHEN** a user follows the Windows manual installation
- **THEN** the PowerShell block contains the `budget-subagent` New-Item + Copy-Item lines after `budget-executor`

---

### Requirement: install-opencode-copy-steps
`INSTALL.opencode.md` SHALL include copy steps for `skills/opencode/budget-subagent/SKILL.md` in both the Linux/macOS bash block and the Windows PowerShell block, immediately after the existing `budget-executor` copy steps.

Linux/macOS pattern:

    mkdir -p ~/.config/opencode/skills/budget-subagent
    cp skills/opencode/budget-subagent/SKILL.md ~/.config/opencode/skills/budget-subagent/SKILL.md

Windows PowerShell pattern:

    New-Item -ItemType Directory -Force -Path "$configDir\skills\budget-subagent" | Out-Null
    Copy-Item skills\opencode\budget-subagent\SKILL.md "$configDir\skills\budget-subagent\SKILL.md"

#### Scenario: install step present in opencode bash block
- **WHEN** a user follows the Linux/macOS Opencode manual installation
- **THEN** the bash block contains the `budget-subagent` mkdir + cp lines after `budget-executor`

---

### Requirement: install-opencode-config-documentation
`INSTALL.opencode.md` SHALL NOT show an `opencode.jsonc` `agent` block snippet — it SHALL document that the generic agent files (`explore`, `executor`, `budget`) are installed under `~/.config/opencode/agents/` by the agent-files copy step, that the shipped config carries no `agent` block, and that the configuration merge covers only the SAI external-directory permission.

#### Scenario: user guided to the agent files, not a config block
- **WHEN** a user already has opencode.jsonc and follows the post-install instructions
- **THEN** the install doc does not show an `"agent"` block to add to their existing config
- **AND** it points at `~/.config/opencode/agents/explore.md`, `executor.md`, and `budget.md` as the agent definitions, with the model tunable in each file's frontmatter

---

### Requirement: install-flow-claude
The `installClaude()` function in `bin/install-flow.js` SHALL include a `copyWithWarn` call for `budget-subagent`, immediately after the existing `budget-executor` call (around line 153). The call MUST follow the same pattern as the executor entry:

    copyWithWarn(
      path.join(REPOSITORY_ROOT, 'skills', 'claude', 'budget-subagent', 'SKILL.md'),
      path.join(targetPath, 'skills', 'budget-subagent', 'SKILL.md')
    );

#### Scenario: automated install copies budget-subagent for claude
- **WHEN** `npx github:mmadariaga/shared-ai` runs and the user selects Claude Code
- **THEN** `~/.claude/skills/budget-subagent/SKILL.md` is created

---

### Requirement: install-flow-opencode
The `installOpencode()` function in `bin/install-flow.js` SHALL include a `copyWithWarn` call for `budget-subagent`, immediately after the existing `budget-executor` call (around line 198). The call MUST follow the same pattern as the executor entry:

    copyWithWarn(
      path.join(REPOSITORY_ROOT, 'skills', 'opencode', 'budget-subagent', 'SKILL.md'),
      path.join(targetPath, 'skills', 'budget-subagent', 'SKILL.md')
    );

#### Scenario: automated install copies budget-subagent for opencode
- **WHEN** `npx github:mmadariaga/shared-ai` runs and the user selects Opencode
- **THEN** `~/.config/opencode/skills/budget-subagent/SKILL.md` is created

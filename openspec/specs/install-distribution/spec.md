## ADDED Requirements

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
`INSTALL.opencode.md` SHALL document the new `"subagent"` agent entry. In the section that shows the `opencode.jsonc` `agent` block snippet (the block that already shows `executor`), the `subagent` entry MUST appear alongside it.

#### Scenario: user guided on subagent config
- **WHEN** a user already has opencode.jsonc and follows the post-install instructions
- **THEN** the install doc shows the `"subagent"` block they need to add alongside `"executor"` in their existing config

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

---

### Requirement: install-flow-opencode-config-snippet
The `copyOpencodeConfig()` function in `bin/install-flow.js` SHALL include `"subagent"` in the agent block it prints when an existing config is detected. The printed snippet MUST show `subagent` as a sibling of `executor`, following the same shape:

    console.log('    "subagent": {');
    console.log('      "mode": "subagent",');
    console.log('      // Your trusted low-cost model below');
    console.log('      "model": "opencode-go/deepseek-v4-flash"');
    console.log('    }');

The `subagent` block MUST appear after the closing brace of `executor` and before the outer closing brace.

#### Scenario: existing config user sees subagent guidance
- **WHEN** `copyOpencodeConfig()` detects an existing opencode.json(c) and prints the guidance block
- **THEN** the output includes the `"subagent"` block alongside `"executor"`

## ADDED Requirements

### Requirement: INSTALL.claude.md contains no caveman copy instructions
`INSTALL.claude.md` SHALL NOT contain any block that copies the caveman skill file for bash (lines 50–52) or PowerShell (lines 84–86).

The bash block to remove:
    if [ ! -f ~/.claude/skills/caveman/SKILL.md ]; then
      mkdir -p ~/.claude/skills/caveman
      cp skills/universal/caveman/SKILL.md ~/.claude/skills/caveman/SKILL.md
    fi

The PowerShell block to remove:
    if (-not (Test-Path "$env:USERPROFILE\.claude\skills\caveman\SKILL.md")) {
      New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills\caveman" | Out-Null
      Copy-Item skills\universal\caveman\SKILL.md "$env:USERPROFILE\.claude\skills\caveman\SKILL.md"
    }

#### Scenario: INSTALL.claude.md read
- **WHEN** `INSTALL.claude.md` is read
- **THEN** no line contains "caveman"

### Requirement: INSTALL.opencode.md contains no caveman copy instructions
`INSTALL.opencode.md` SHALL NOT contain any block that copies the caveman skill file for bash (lines 53–55) or PowerShell (lines 110–112).

The bash block to remove:
    if [ ! -f ~/.config/opencode/skills/caveman/SKILL.md ]; then
      mkdir -p ~/.config/opencode/skills/caveman
      cp skills/universal/caveman/SKILL.md ~/.config/opencode/skills/caveman/SKILL.md
    fi

The PowerShell block to remove:
    if (-not (Test-Path "$configDir\skills\caveman\SKILL.md")) {
      New-Item -ItemType Directory -Force -Path "$configDir\skills\caveman" | Out-Null
      Copy-Item skills\universal\caveman\SKILL.md "$configDir\skills\caveman\SKILL.md"
    }

#### Scenario: INSTALL.opencode.md read
- **WHEN** `INSTALL.opencode.md` is read
- **THEN** no line contains "caveman"

### Requirement: bin/install-flow.js contains no caveman skill copy operations
`bin/install-flow.js` SHALL NOT contain path references to `skills/universal/caveman/SKILL.md` or `skills/caveman/SKILL.md`.

Specific removals:
- Lines 140–141: The array entry pairing `path.join(REPOSITORY_ROOT, 'skills', 'universal', 'caveman', 'SKILL.md')` with `path.join(targetPath, 'skills', 'caveman', 'SKILL.md')` in the Claude install function.
- Lines 190–191: The equivalent entry in the OpenCode install function.

#### Scenario: install-flow.js read
- **WHEN** `bin/install-flow.js` is read
- **THEN** no line contains "'caveman'"

### Requirement: install test for Claude Code contains no caveman assertions
`test/install-claude.test.js` SHALL NOT contain any assertion or test referencing the caveman skill.

Specific removals:
- Line 48: Remove `assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'caveman', 'SKILL.md')), 'skills/caveman/SKILL.md')`.
- Lines 67, 77: Test named "installClaude overwrites existing non-caveman skill files and logs" references caveman as a contrasting example. Either rename the test to remove "non-caveman" or update the test to use a different non-overwrite example.
- Line 84: Remove `const skillDest = path.join(tmpDir, 'skills', 'caveman', 'SKILL.md')` and all code dependent on it.

#### Scenario: install-claude test read
- **WHEN** `test/install-claude.test.js` is read
- **THEN** no line contains "caveman"

### Requirement: install test for OpenCode contains no caveman assertions
`test/install-opencode.test.js` SHALL NOT contain any assertion or test referencing the caveman skill.

Specific removals:
- Line 35: Remove `assert.ok(fs.existsSync(path.join(tmpDir, 'skills', 'caveman', 'SKILL.md')), 'skills/caveman/SKILL.md')`.
- Lines 86, 96: Test named "installOpencode overwrites existing non-caveman skill files and logs" references caveman. Rename or update as appropriate.

#### Scenario: install-opencode test read
- **WHEN** `test/install-opencode.test.js` is read
- **THEN** no line contains "caveman"

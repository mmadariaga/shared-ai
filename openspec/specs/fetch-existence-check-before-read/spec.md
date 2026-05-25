## ADDED Requirements

### Requirement: Check file existence before Read in fetch resolution

When resolving `Fetch @<subpath>` directives, the fetch skill SHALL use glob/LS to verify file existence before attempting Read. This prevents runtime errors when project-local paths are absent.

For Claude Code: Check `.claude/<subpath>` with glob/LS. If it exists, Read it. Otherwise, Read `~/.claude/<subpath>` directly. If that read fails, stop and report: "File not found: <subpath> (checked .claude/ and ~/.claude/)".

For OpenCode: Check `.opencode/<subpath>` with glob/LS. If it exists, Read it. Otherwise, Read `~/.config/opencode/<subpath>` directly. If that read fails, stop and report: "File not found: <subpath> (checked .opencode/ and ~/.config/opencode/)".

#### Scenario: project-local file exists
- **WHEN** `Fetch @sai/instructions/prereqs.md` is executed and `.claude/sai/instructions/prereqs.md` exists
- **THEN** glob/LS confirms existence, file is Read from project-local path

#### Scenario: project-local file absent, global file exists
- **WHEN** `Fetch @sai/instructions/prereqs.md` is executed and `.claude/sai/instructions/prereqs.md` does not exist
- **THEN** glob/LS returns no match, file is Read directly from `~/.claude/sai/instructions/prereqs.md` without error

#### Scenario: file missing in both locations
- **WHEN** `Fetch @sai/instructions/prereqs.md` is executed and neither project-local nor global path exists
- **THEN** glob/LS returns no match, Read of global path fails, skill reports: "File not found: sai/instructions/prereqs.md (checked .claude/ and ~/.claude/)"

### Requirement: Skills path resolution unchanged

`Fetch @skills/<name>/SKILL.md` SHALL continue to invoke the `skill` tool with skill name `<name>`. The existence-check-before-read behavior SHALL NOT apply to skills paths.

#### Scenario: skills path triggers skill tool
- **WHEN** `Fetch @skills/budget/SKILL.md` is encountered
- **THEN** the `skill` tool is invoked with name `budget`, no glob/LS check is performed

## MODIFIED Requirements

## REMOVED Requirements

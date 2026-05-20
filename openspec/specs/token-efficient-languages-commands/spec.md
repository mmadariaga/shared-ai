## ADDED Requirements

### Requirement: Claude Code command file

`claude/commands/token-efficient-languages.md` SHALL be created with:
- A YAML frontmatter `description:` field explaining the command's purpose
- A single `Fetch` directive pointing to the installed skill path: `@~/.claude/skills/token-efficient-languages/SKILL.md`

The file structure SHALL follow the same pattern as other single-skill command files (e.g., the caveman skill command files in the sai suite).

#### Scenario: Claude Code command invocation

- **WHEN** a user runs `/token-efficient-languages` in Claude Code
- **THEN** the skill at `~/.claude/skills/token-efficient-languages/SKILL.md` is loaded into the session

### Requirement: OpenCode command file

`opencode/commands/token-efficient-languages.md` SHALL be created with:
- A YAML frontmatter `description:` field explaining the command's purpose
- A single `Fetch` directive pointing to the installed skill path: `@~/.config/opencode/skills/token-efficient-languages/SKILL.md`

#### Scenario: OpenCode command invocation

- **WHEN** a user runs `/token-efficient-languages` in OpenCode
- **THEN** the skill at `~/.config/opencode/skills/token-efficient-languages/SKILL.md` is loaded into the session

### Requirement: Description field content

Both command files' `description:` field SHALL state that the command loads the token-efficient-languages skill and activates the 3-rule language contract.

#### Scenario: Command description

- **WHEN** the command is listed in a help view
- **THEN** the description communicates the language contract being activated, not just a generic "load skill" message

## MODIFIED Requirements

### Requirement: install script declares openspec as prerequisite
The install script and INSTALL.*.md documentation SHALL list OpenSpec CLI as a required dependency and provide installation instructions before the copy commands.

#### Scenario: INSTALL.claude.md shows prerequisites
- **WHEN** user reads INSTALL.claude.md
- **THEN** a Prerequisites section appears before installation steps
- **THEN** it lists: openspec CLI install command and `openspec init` as required steps

#### Scenario: INSTALL script succeeds without copying skills
- **WHEN** user runs the install script
- **THEN** `claude/commands/*.md` are copied to `~/.claude/commands/`
- **THEN** `instructions/sai/*.md` are copied to `~/.claude/instructions/sai/`
- **THEN** NO files are copied to `~/.claude/skills/`
- **THEN** script prints reminder to run `openspec init` in each project

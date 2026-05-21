# Install Script Specification

## Purpose
Defines installation behavior for the shared-AI toolkit, including documented prerequisites and what is (and is not) copied to user-level directories.
## Requirements
### Requirement: install script declares openspec as prerequisite
The install script and INSTALL.*.md documentation SHALL list OpenSpec CLI as a required dependency and provide installation instructions before the copy commands.

#### Scenario: INSTALL.claude.md shows prerequisites
- **WHEN** user reads INSTALL.claude.md
- **THEN** a Prerequisites section appears before installation steps
- **THEN** it lists: openspec CLI install command and `openspec init` as required steps

#### Scenario: sai commands use new install paths
- **WHEN** user runs the install script or follows install steps
- **THEN** sai command bodies SHALL be copied from `sai/commands/` to `~/.claude/sai/commands/` (Claude Code) or `~/.config/opencode/sai/commands/` (OpenCode)
- **THEN** previous paths (`commands/sai/` source, `~/.claude/commands/sai/` destination) SHALL NOT be used

#### Scenario: sai instructions use new install paths
- **WHEN** user runs the install script or follows install steps
- **THEN** sai instructions SHALL be copied from `sai/instructions/` to `~/.claude/sai/instructions/` (Claude Code) or `~/.config/opencode/sai/instructions/` (OpenCode)
- **THEN** previous paths (`instructions/sai/` source, `~/.claude/instructions/sai/` destination) SHALL NOT be used

#### Scenario: claude wrappers install from updated source directory
- **WHEN** user installs Claude Code wrappers
- **THEN** the copy command SHALL read from `commands/claude/` (previously `claude/commands/`)
- **THEN** wrappers SHALL install to `~/.claude/commands/` (unchanged)

#### Scenario: opencode wrappers install from updated source directory
- **WHEN** user installs OpenCode wrappers
- **THEN** the copy command SHALL read from `commands/opencode/` (previously `opencode/commands/`)
- **THEN** wrappers SHALL install to `~/.config/opencode/commands/` (unchanged)

#### Scenario: config file install from updated source directory
- **WHEN** user installs the opencode config
- **THEN** the copy command SHALL read from `configs/opencode.jsonc` (previously `opencode/opencode.jsonc`)
- **THEN** the destination `~/.config/opencode/opencode.jsonc` is unchanged

#### Scenario: skills directory unchanged
- **WHEN** user runs the install script
- **THEN** NO files are copied to `~/.claude/skills/`
- **THEN** script prints reminder to run `openspec init` in each project


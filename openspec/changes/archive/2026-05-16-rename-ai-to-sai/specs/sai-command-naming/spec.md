## ADDED Requirements

### Requirement: Commands use /sai-* prefix
All shared AI workflow commands SHALL use the `/sai-` prefix across all supported integrations (Claude Code, GitHub Copilot, OpenCode).

#### Scenario: Claude Code command invocation
- **WHEN** a user types `/sai-1-spec` in Claude Code
- **THEN** the spec planning command executes

#### Scenario: GitHub Copilot prompt file naming
- **WHEN** a GitHub Copilot prompt file is referenced
- **THEN** the file is named `sai-*.prompt.md` (e.g., `sai-1-spec.prompt.md`)

#### Scenario: OpenCode command invocation
- **WHEN** a user types `/sai-1-spec` in OpenCode
- **THEN** the spec planning command executes

### Requirement: No /ai-* command files exist
The repository SHALL NOT contain any `ai-*.md` or `ai-*.prompt.md` command files after the rename.

#### Scenario: Old prefix absent from command dirs
- **WHEN** `claude/commands/`, `github/prompts/`, or `opencode/commands/` is listed
- **THEN** no file matching `ai-*` is present

### Requirement: Documentation references /sai-* prefix
All documentation files (README.md, AGENTS.md, INSTALL.claude.md, INSTALL.copilot.md) SHALL reference commands using the `/sai-*` prefix.

#### Scenario: README command references
- **WHEN** a user reads the README
- **THEN** all command examples show `/sai-*` syntax, not `/ai-*`

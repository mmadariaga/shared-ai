## Requirements

### Requirement: Commands use /sai-* prefix
All shared AI workflow commands SHALL use the `/sai-` prefix across all supported integrations (Claude Code, OpenCode).

#### Scenario: Claude Code command invocation
- **WHEN** a user types `/sai-1-spec` in Claude Code
- **THEN** the spec planning command executes

#### Scenario: OpenCode command invocation
- **WHEN** a user types `/sai-1-spec` in OpenCode
- **THEN** the spec planning command executes

### Requirement: No /ai-* command files exist
The repository SHALL NOT contain any `ai-*.md` or `ai-*.prompt.md` command files after the rename.

#### Scenario: Old prefix absent from command dirs
- **WHEN** `commands/claude/` or `commands/opencode/` is listed
- **THEN** no file matching `ai-*` is present

### Requirement: Documentation references /sai-* prefix
All documentation files (README.md, AGENTS.md, INSTALL.claude.md) SHALL reference commands using the `/sai-*` prefix.

#### Scenario: README command references
- **WHEN** a user reads the README
- **THEN** all command examples show `/sai-*` syntax, not `/ai-*`

### Requirement: Command numbering reflects the two-phase spec/design split
The numbered sai-* commands SHALL use the following mapping, with `sai-2-design` inserted between spec and implement:

| Number | Command | Generates |
|--------|---------|-----------|
| 1 | sai-1-spec | proposal.md + specs/ |
| 2 | sai-2-design | design.md + tasks.md |
| 3 | sai-3-implement | implementation.md |
| 4 | sai-4-apply | executes tasks |
| 5 | sai-5-review | review.md |
| 6 | sai-6-security | security.md |
| 7 | sai-7-performance | performance.md |
| 8 | sai-8-accessibility | accessibility.md |

Un-numbered commands (sai-commit, sai-pr, sai-archive, sai-explore, sai-backfill) retain their names unchanged.

#### Scenario: sai-2-design command exists
- **WHEN** `commands/claude/` is listed
- **THEN** `sai-2-design.md` is present and `sai-2-implement.md` is absent

#### Scenario: renumbered commands exist with new numbers
- **WHEN** `commands/claude/` is listed
- **THEN** files `sai-3-implement.md`, `sai-4-apply.md`, `sai-5-review.md`, `sai-6-security.md`, `sai-7-performance.md`, `sai-8-accessibility.md` are present

#### Scenario: old numbered commands absent
- **WHEN** `commands/claude/` is listed
- **THEN** no files named `sai-2-implement.md`, `sai-3-apply.md`, `sai-4-review.md`, `sai-5-security.md`, `sai-6-performance.md`, `sai-7-accessibility.md` are present

#### Scenario: opencode mirrors the same numbering
- **WHEN** `commands/opencode/` is listed
- **THEN** the same set of numbered command files exists as in `commands/claude/`

#### Scenario: sai-backfill command exists as un-numbered auxiliary
- **WHEN** `commands/claude/` is listed
- **THEN** `sai-backfill.md` is present alongside other un-numbered commands (`sai-commit.md`, `sai-pr.md`, `sai-archive.md`, `sai-explore.md`)

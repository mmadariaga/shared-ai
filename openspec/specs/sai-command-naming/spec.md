## Purpose

This capability standardizes the `/sai-*` command namespace and numbered phase sequence across Claude Code and opencode.

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
All documentation files (README.md, AGENTS.md) SHALL reference commands using the `/sai-*` prefix.

#### Scenario: README command references
- **WHEN** a user reads the README
- **THEN** all command examples show `/sai-*` syntax, not `/ai-*`

### Requirement: Command numbering reflects the two-phase spec/design split

The numbered commands SHALL form the continuous 1–7 sequence in Claude Code and opencode, with the same mapping in public wrappers, associated worker identities, live routing, status recommendations, current documentation, and shipped presets.

| Number | Command | Generates |
|--------|---------|-----------|
| 1 | sai-1-spec | proposal.md + specs/ |
| 2 | sai-2-design | design.md + tasks.md |
| 3 | sai-3-implement | executes the RED→GREEN steps of tasks.md |
| 4 | sai-4-review | review.md |
| 5 | sai-5-security | security.md |
| 6 | sai-6-performance | performance.md |
| 7 | sai-7-accessibility | accessibility.md |

The associated audit workers SHALL be `sai-5-security-worker`, `sai-6-performance-worker`, and `sai-7-accessibility-worker`. The former audit names SHALL be retired without aliases. Audit functions, accepted options, report names, execution conditions, unnumbered commands, and unrelated numbered commands SHALL remain unchanged. The internal security, performance, and accessibility directories and unnumbered identifiers SHALL retain their identities. Archived changes and historical decision records SHALL NOT be rewritten for this renaming.

#### Scenario: sai-2-design command exists
- **WHEN** `commands/claude/` is listed
- **THEN** `sai-2-design.md` is present and `sai-2-implement.md` is absent

#### Scenario: renumbered commands exist with new numbers
- **WHEN** `commands/claude/` is listed
- **THEN** files `sai-3-implement.md`, `sai-4-review.md`, `sai-5-security.md`, `sai-6-performance.md`, and `sai-7-accessibility.md` are present

#### Scenario: old numbered commands absent
- **WHEN** `commands/claude/` is listed
- **THEN** no files named `sai-2-implement.md`, `sai-4-apply.md`, `sai-5-review.md`, `sai-6-security.md`, `sai-7-performance.md`, or `sai-8-accessibility.md` are present

#### Scenario: opencode mirrors the same numbering
- **WHEN** `commands/opencode/` is listed
- **THEN** the same set of numbered command files exists as in `commands/claude/`

#### Scenario: sai-backfill command exists as un-numbered auxiliary
- **WHEN** `commands/claude/` is listed
- **THEN** `sai-backfill.md` remains alongside the unchanged unnumbered commands

#### Scenario: sai-build command exists as un-numbered auxiliary
- **WHEN** `commands/claude/` is listed
- **THEN** `sai-build.md` is present without a numbered build wrapper

#### Scenario: opencode includes sai-build
- **WHEN** `commands/opencode/` is listed
- **THEN** `sai-build.md` remains unnumbered with the same status as in Claude Code

#### Scenario: Former security number does not select performance
- **WHEN** live instructions or installed command and worker inventories identify a security audit
- **THEN** they use `sai-5-security` and `sai-5-security-worker`, never the performance command or worker now numbered 6

#### Scenario: Historical records retain the original audit names
- **WHEN** the audit renaming updates current usage documentation and live instructions
- **THEN** archived changes and historical ADR/DDR records retain their existing bytes

### Requirement: The retirement utility uses the canonical command name

The utility SHALL use the `/sai-retire-docs` name in both harness wrappers, registry references, and user-facing command documentation.

#### Scenario: Command references remain mirrored

- **WHEN** a command surface refers to the retirement utility
- **THEN** it SHALL use `/sai-retire-docs` rather than a numbered phase name or a harness-specific alias

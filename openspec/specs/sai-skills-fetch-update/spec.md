# sai-skills-fetch-update Specification

## Purpose
TBD - created by archiving change sai-explorer-harness-context. Update Purpose after archive.
## Requirements
### Requirement: sai-1-explorer-fetch
`~/.claude/commands/sai-1-spec.md` SHALL include `Fetch @~/.claude/instructions/sai/explorer.claude.md` as the first entry in its `## Load behaviors (in order)` block.

#### Scenario: fetch order in sai-1-spec
- **WHEN** sai-1-spec is invoked
- **THEN** explorer.claude.md is loaded before caveman.md, glossary-format.md, and spec.propose.md

#### Scenario: fetch line exact syntax
- **WHEN** the modified sai-1-spec.md is read
- **THEN** the line reads exactly: `Fetch @~/.claude/instructions/sai/explorer.claude.md`

### Requirement: sai-2-explorer-fetch
`~/.claude/commands/sai-2-design.md` SHALL include `Fetch @~/.claude/instructions/sai/explorer.claude.md` as the first entry in its `## Load behaviors (in order)` block.

#### Scenario: fetch order in sai-2-design
- **WHEN** sai-2-design is invoked
- **THEN** explorer.claude.md is loaded before caveman.md and glossary-format.md

### Requirement: sai-3-explorer-fetch
`~/.claude/commands/sai-3-implement.md` SHALL include `Fetch @~/.claude/instructions/sai/explorer.claude.md` as the first entry in its `## Load behaviors (in order)` block.

#### Scenario: fetch order in sai-3-implement
- **WHEN** sai-3-implement is invoked
- **THEN** explorer.claude.md is loaded before caveman.md and glossary-format.md

### Requirement: fetch-position-within-load-behaviors
In all three skills, the `Fetch @~/.claude/instructions/sai/explorer.claude.md` line SHALL appear as the first `Fetch` statement inside the `## Load behaviors (in order)` section, before any other instruction fetches.

#### Scenario: not in prereqs block
- **WHEN** the prereqs block of any modified skill file is read
- **THEN** it contains no reference to explorer.claude.md; the fetch lives only in Load behaviors

### Requirement: no-opencode-fetch-in-claude-skills
The Claude Code skill command files (`sai-1-spec.md`, `sai-2-design.md`, `sai-3-implement.md`) SHALL NOT fetch `explorer.opencode.md`.

#### Scenario: only claude harness file fetched
- **WHEN** any of the three modified Claude Code skill command files is read
- **THEN** it references explorer.claude.md, not explorer.opencode.md

### Requirement: no-other-skill-modifications
Skills outside the scope of this change (sai-4-apply, sai-5-review, sai-6-security, sai-7-performance, sai-8-accessibility, sai-archive, sai-commit, sai-pr, sai-explore) SHALL NOT be modified.

#### Scenario: out-of-scope skills unchanged
- **WHEN** any skill not in {sai-1-spec, sai-2-design, sai-3-implement} is read
- **THEN** it contains no new explorer.claude.md or explorer.opencode.md fetch line


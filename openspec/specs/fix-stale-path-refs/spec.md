# fix-stale-path-refs Specification

## Purpose
TBD - created by archiving change retire-stale-specs. Update Purpose after archive.
## Requirements
### Requirement: path-mapping-table

All 7 stale specs listed below MUST replace pre-restructure path strings with their current equivalents according to the following mapping:

    Old string                      →  New string
    ─────────────────────────────────────────────────────────────
    claude/commands/                →  commands/claude/
    opencode/commands/              →  commands/opencode/
    instructions/sai/               →  sai/instructions/
    .claude/commands/sai/           →  commands/claude/ (or commands/opencode/ per context)
    instructions/sai/plan.md        →  sai/instructions/implement.md
    instructions/sai/implement.md   →  sai/instructions/apply.md

No other content in these specs SHALL be changed beyond the path strings.

#### Scenario: path refs updated in dedup-numbered-wrappers

- **WHEN** `openspec/specs/dedup-numbered-wrappers/spec.md` is processed
- **THEN** all occurrences of `instructions/sai/plan.md` are replaced with `sai/instructions/implement.md`
- **THEN** no other lines in the file are modified

#### Scenario: path refs updated in fix-remember-omissions

- **WHEN** `openspec/specs/fix-remember-omissions/spec.md` is processed
- **THEN** all occurrences of `opencode/commands/` are replaced with `commands/opencode/`
- **THEN** all occurrences of `instructions/sai/` are replaced with `sai/instructions/`

#### Scenario: path refs updated in sai-instructions-dedup

- **WHEN** `openspec/specs/sai-instructions-dedup/spec.md` is processed
- **THEN** all occurrences of `instructions/sai/` are replaced with `sai/instructions/`
- **THEN** occurrences of `instructions/sai/implement.md` are replaced with `sai/instructions/apply.md`

#### Scenario: path refs updated in move-isolation-block

- **WHEN** `openspec/specs/move-isolation-block/spec.md` is processed
- **THEN** all occurrences of `.claude/commands/sai/` are replaced with `commands/claude/` (for Claude Code references) or `commands/opencode/` (for OpenCode references) per surrounding context
- **THEN** all occurrences of `claude/commands/` are replaced with `commands/claude/`
- **THEN** all occurrences of `opencode/commands/` are replaced with `commands/opencode/`

#### Scenario: path refs updated in dedup-nonnumbered-wrappers

- **WHEN** `openspec/specs/dedup-nonnumbered-wrappers/spec.md` is processed
- **THEN** any occurrences of pre-restructure paths are replaced (file may require no changes if already clean)

#### Scenario: path refs updated in explorer-opencode

- **WHEN** `openspec/specs/explorer-opencode/spec.md` is processed
- **THEN** any occurrences of `~/.config/opencode/instructions/sai/` or `opencode/commands/` are replaced with current paths

#### Scenario: path refs updated in explorer-claude

- **WHEN** `openspec/specs/explorer-claude/spec.md` is processed
- **THEN** any occurrences of `claude/commands/` or `instructions/sai/` are replaced with current paths

### Requirement: no-content-drift

Updating path references MUST NOT alter the normative intent or the scope of any spec. If a path substitution would change the semantic meaning of a requirement (not just its syntax), the implementer MUST flag it for human review rather than applying it automatically.

#### Scenario: ambiguous substitution flagged

- **WHEN** a path string maps to more than one possible current path (e.g., `.claude/commands/sai/` could map to either `commands/claude/` or `commands/opencode/`)
- **THEN** the implementer applies the substitution that matches the surrounding context (Claude Code vs OpenCode)
- **THEN** if context is insufficient to disambiguate, a `<!-- TODO: verify path -->` comment is inserted at that line


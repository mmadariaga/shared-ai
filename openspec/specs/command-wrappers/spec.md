# Command Wrappers Specification

## Requirements
### Requirement: ai-* commands wrap opsx skills additively
Each sai-* command that maps to an opsx skill SHALL load the skill content via `Fetch` and prepend shared-AI behaviors (isolation mode, model routing, relevant instructions) from `~/.claude/sai/instructions/` paths. The skill SKILL.md files SHALL NOT be modified.

#### Scenario: sai-1-spec executes with full enrichment but stops before design
- **WHEN** user invokes `sai-1-spec`
- **THEN** command loads `~/.claude/sai/instructions/glossary-format.md`, `~/.claude/sai/instructions/spec.propose.md`, then fetches the openspec skill to generate only proposal.md and specs/ — it does NOT proceed to design.md or tasks.md

#### Scenario: sai-2-design executes with enrichment and approval check
- **WHEN** user invokes `sai-2-design`
- **THEN** command loads `~/.claude/sai/instructions/glossary-format.md`, verifies specs approval in `.openspec.yaml`, then generates design.md and tasks.md

#### Scenario: all wrappers use sai/ instruction paths
- **WHEN** any `commands/claude/sai-*.md` wrapper is executed
- **THEN** all `Fetch` directives pointing to `~/.claude/sai/instructions/` use the `~/.claude/sai/instructions/` prefix

### Requirement: opsx commands are never invoked directly by users
The project documentation and pipeline descriptions SHALL indicate that opsx:* commands are internal — users MUST use sai-* wrappers exclusively.

#### Scenario: documentation reflects wrapper-only usage
- **WHEN** AGENTS.md and README.md describe the pipeline
- **THEN** only sai-* commands appear in workflow examples — no opsx:* commands shown as user-facing steps

### Requirement: model routing preserved per command
Each sai-* wrapper SHALL declare the appropriate model in frontmatter, matching the values in the live Claude Code wrappers at the time of writing and consistent with the `command-wrappers` spec's own canonical list and the `README.md` model reference table. The canonical Claude Code assignments are: `claude-sonnet-4-6` for `sai-1-spec` (`effort: medium`), `sai-3-implement` (`effort: high`), `sai-5-review` (`effort: high`), `sai-7-performance` (`effort: high`), `sai-8-accessibility` (`effort: high`), `sai-explore` (`effort: medium`), and `sai-backfill` (`effort: medium`); `claude-opus-4-8` for `sai-2-design` (`effort: high`) and `sai-6-security` (`effort: high`); `claude-haiku-4-5` for `sai-4-apply`, `sai-archive`, `sai-commit`, and `sai-pr` (no `effort` field). The model identifiers and effort levels track the live wrapper frontmatter; the spec is the description of those values, not the prescription.

#### Scenario: sai-1-spec uses Sonnet
- **WHEN** sai-1-spec is invoked on Claude Code
- **THEN** it runs on `claude-sonnet-4-6` (`effort: medium`) as declared in the wrapper frontmatter

#### Scenario: sai-2-design uses Opus
- **WHEN** sai-2-design is invoked on Claude Code
- **THEN** it runs on `claude-opus-4-8` (`effort: high`) as declared in the wrapper frontmatter

#### Scenario: sai-3-implement uses Sonnet
- **WHEN** sai-3-implement is invoked on Claude Code
- **THEN** it runs on `claude-sonnet-4-6` (`effort: high`) as declared in the wrapper frontmatter

#### Scenario: sai-4-apply uses Haiku
- **WHEN** sai-4-apply is invoked on Claude Code
- **THEN** it runs on `claude-haiku-4-5` (no `effort` field) as declared in the wrapper frontmatter

#### Scenario: sai-5-review uses Sonnet
- **WHEN** sai-5-review is invoked on Claude Code
- **THEN** it runs on `claude-sonnet-4-6` (`effort: high`) as declared in the wrapper frontmatter

#### Scenario: sai-6-security uses Opus
- **WHEN** sai-6-security is invoked on Claude Code
- **THEN** it runs on `claude-opus-4-8` (`effort: high`) as declared in the wrapper frontmatter

#### Scenario: sai-7-performance uses Sonnet
- **WHEN** sai-7-performance is invoked on Claude Code
- **THEN** it runs on `claude-sonnet-4-6` (`effort: high`) as declared in the wrapper frontmatter

#### Scenario: sai-8-accessibility uses Sonnet
- **WHEN** sai-8-accessibility is invoked on Claude Code
- **THEN** it runs on `claude-sonnet-4-6` (`effort: high`) as declared in the wrapper frontmatter

#### Scenario: sai-explore uses Sonnet
- **WHEN** sai-explore is invoked on Claude Code
- **THEN** it runs on `claude-sonnet-4-6` (`effort: medium`) as declared in the wrapper frontmatter

#### Scenario: sai-backfill uses Sonnet
- **WHEN** sai-backfill is invoked on Claude Code
- **THEN** it runs on `claude-sonnet-4-6` (`effort: medium`) as declared in the wrapper frontmatter

#### Scenario: sai-archive uses Haiku
- **WHEN** sai-archive is invoked on Claude Code
- **THEN** it runs on `claude-haiku-4-5` (no `effort` field) as declared in the wrapper frontmatter

#### Scenario: sai-commit uses Haiku
- **WHEN** sai-commit is invoked on Claude Code
- **THEN** it runs on `claude-haiku-4-5` (no `effort` field) as declared in the wrapper frontmatter

#### Scenario: sai-pr uses Haiku
- **WHEN** sai-pr is invoked on Claude Code
- **THEN** it runs on `claude-haiku-4-5` (no `effort` field) as declared in the wrapper frontmatter

#### Scenario: README model table is consistent with wrappers
- **WHEN** the `README.md` model reference table is read
- **THEN** every `Claude Code` cell in the table contains the same model identifier and effort suffix as the corresponding wrapper frontmatter (or its absence for the Haiku wrappers that have no `effort` field)

### Requirement: spec.propose.md is the sole spec instruction source
The `sai-1-spec` wrappers SHALL fetch `sai/instructions/spec.propose.md` (installed at `~/.claude/sai/instructions/spec.propose.md`) and no other spec instruction file.

#### Scenario: claude wrapper fetches only spec.propose.md
- **WHEN** `commands/claude/sai-1-spec.md` is executed
- **THEN** the only fetched spec instruction file is `~/.claude/sai/instructions/spec.propose.md`

#### Scenario: opencode wrapper fetches only spec.propose.md
- **WHEN** `commands/opencode/sai-1-spec.md` is executed
- **THEN** the only fetched spec instruction file is `~/.config/opencode/sai/instructions/spec.propose.md`

### Requirement: single canonical wrapper per command per harness
Each supported harness SHALL provide exactly one wrapper per sai-* command. Model-variant duplicates SHALL NOT exist.

#### Scenario: opencode has one wrapper per command
- **WHEN** `commands/opencode/` is listed
- **THEN** exactly one file exists per command name (no `-gemini`, `-gpt`, or `-opus` suffix variants)

# Command Wrappers Specification

## Requirements
### Requirement: ai-* commands wrap opsx skills additively
Each sai-* command that maps to an opsx skill SHALL load the skill content via `Fetch` and prepend shared-AI behaviors (caveman mode, isolation mode, model routing, relevant instructions) from `~/.claude/sai/instructions/` paths. The skill SKILL.md files SHALL NOT be modified.

#### Scenario: sai-1-spec executes with full enrichment but stops before design
- **WHEN** user invokes `sai-1-spec`
- **THEN** command loads `~/.claude/sai/instructions/caveman.md`, `~/.claude/sai/instructions/glossary-format.md`, `~/.claude/sai/instructions/spec.propose.md`, then fetches the openspec skill to generate only proposal.md and specs/ — it does NOT proceed to design.md or tasks.md

#### Scenario: sai-2-design executes with enrichment and approval check
- **WHEN** user invokes `sai-2-design`
- **THEN** command loads `~/.claude/sai/instructions/caveman.md` and `~/.claude/sai/instructions/glossary-format.md`, verifies specs approval in `.openspec.yaml`, then generates design.md and tasks.md

#### Scenario: all wrappers use sai/ instruction paths
- **WHEN** any `commands/claude/sai-*.md` wrapper is executed
- **THEN** all `Fetch` directives pointing to `~/.claude/sai/instructions/` use the `~/.claude/sai/instructions/` prefix

### Requirement: opsx commands are never invoked directly by users
The project documentation and pipeline descriptions SHALL indicate that opsx:* commands are internal — users MUST use sai-* wrappers exclusively.

#### Scenario: documentation reflects wrapper-only usage
- **WHEN** AGENTS.md and README.md describe the pipeline
- **THEN** only sai-* commands appear in workflow examples — no opsx:* commands shown as user-facing steps

### Requirement: model routing preserved per command
Each sai-* wrapper SHALL declare the appropriate model in frontmatter: opus for sai-1-spec and sai-2-design; sonnet for sai-3-implement, sai-5-review, sai-7-performance, sai-8-accessibility; opus for sai-6-security; haiku for sai-4-apply, sai-commit, sai-pr.

#### Scenario: sai-1-spec uses high-capability model
- **WHEN** sai-1-spec is invoked
- **THEN** it runs on claude-opus-4-7 as declared in frontmatter

#### Scenario: sai-2-design uses high-capability model
- **WHEN** sai-2-design is invoked
- **THEN** it runs on claude-opus-4-7 as declared in frontmatter

#### Scenario: sai-4-apply uses cheap model
- **WHEN** sai-4-apply is invoked
- **THEN** it runs on claude-haiku-4-5 as declared in frontmatter

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

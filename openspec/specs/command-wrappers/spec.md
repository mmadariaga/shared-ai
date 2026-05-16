# Command Wrappers Specification

## Purpose
Defines how `ai-*` commands wrap `opsx:*` skills additively, preserving model routing and shielding users from internal opsx commands.

## Requirements

### Requirement: ai-* commands wrap opsx skills additively
Each ai-* command that maps to an opsx skill SHALL load the skill content via `Fetch` and prepend shared-AI behaviors (caveman mode, isolation mode, model routing, relevant instructions). The skill SKILL.md files SHALL NOT be modified. Wrappers SHALL exist only for the Claude Code and OpenCode harnesses; the GitHub Copilot harness is no longer supported.

#### Scenario: ai-1-spec executes with full enrichment
- **WHEN** user invokes `ai-1-spec`
- **THEN** command loads caveman.md, glossary-format.md, spec.propose.md, then fetches openspec-propose SKILL.md, then remember.md — in that order

#### Scenario: ai-explore enters explore mode
- **WHEN** user invokes `ai-explore` with or without arguments
- **THEN** command loads caveman.md, then fetches openspec-explore SKILL.md behavior

#### Scenario: ai-2-implement produces implementation artifact
- **WHEN** user invokes `ai-2-implement` with a change name
- **THEN** command reads `openspec/changes/{name}/proposal.md`, `design.md`, `tasks.md` and writes a granular `implementation.md` to the same directory

#### Scenario: ai-3-apply executes from implementation artifact
- **WHEN** user invokes `ai-3-apply` with a change name
- **THEN** command reads `openspec/changes/{name}/implementation.md` as primary guide, uses openspec CLI for status context, executes mechanically with cheap model

#### Scenario: ai-archive wraps opsx archive
- **WHEN** user invokes `ai-archive` with a change name
- **THEN** command delegates to opsx:archive behavior via Fetch

#### Scenario: no Copilot wrappers exist
- **WHEN** the repository is inspected
- **THEN** no `github/prompts/` directory or `instructions/spec.copilot.md` is present, and no documentation references the Copilot harness as a supported target

### Requirement: opsx commands are never invoked directly by users
The project documentation and pipeline descriptions SHALL indicate that opsx:* commands are internal — users MUST use ai-* wrappers exclusively.

#### Scenario: documentation reflects wrapper-only usage
- **WHEN** AGENTS.md and README.md describe the pipeline
- **THEN** only ai-* commands appear in workflow examples — no opsx:* commands shown as user-facing steps

### Requirement: model routing preserved per command
Each ai-* wrapper SHALL declare the appropriate model in frontmatter, consistent with current assignments (opus for spec, sonnet for review/plan, haiku for apply/commit/pr).

#### Scenario: ai-1-spec uses high-capability model
- **WHEN** ai-1-spec is invoked
- **THEN** it runs on claude-opus-4-7 as declared in frontmatter

#### Scenario: ai-3-apply uses cheap model
- **WHEN** ai-3-apply is invoked
- **THEN** it runs on claude-haiku-4-5 as declared in frontmatter

### Requirement: spec.propose.md is the sole spec instruction source
The `ai-1-spec` wrappers SHALL fetch `instructions/spec.propose.md` and no other spec instruction file. Legacy chains (`spec.common.md`, `spec.claude.md`, `spec.opencode.md`, `spec.copilot.md`) SHALL NOT exist in the repository.

#### Scenario: claude wrapper fetches only spec.propose.md
- **WHEN** `claude/commands/sai-1-spec.md` is executed
- **THEN** the only fetched spec instruction file is `~/.claude/instructions/spec.propose.md`

#### Scenario: opencode wrapper fetches only spec.propose.md
- **WHEN** `opencode/commands/sai-1-spec.md` is executed
- **THEN** the only fetched spec instruction file is `~/.config/opencode/instructions/spec.propose.md`

#### Scenario: legacy spec instruction files removed
- **WHEN** the `instructions/` directory is listed
- **THEN** no `spec.common.md`, `spec.claude.md`, `spec.opencode.md`, or `spec.copilot.md` is present

### Requirement: single canonical sai-1-spec wrapper per harness
Each supported harness SHALL provide exactly one `sai-1-spec` wrapper. Model-variant duplicates (gemini, gpt, opus) SHALL NOT exist; model selection is configured via wrapper frontmatter or local overrides.

#### Scenario: opencode has one sai-1-spec wrapper
- **WHEN** `opencode/commands/` is listed
- **THEN** only `sai-1-spec.md` exists (no `sai-1-spec-gemini.md`, `sai-1-spec-gpt.md`, or `sai-1-spec-opus.md`)

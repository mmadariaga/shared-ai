## MODIFIED Requirements

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

## ADDED Requirements

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

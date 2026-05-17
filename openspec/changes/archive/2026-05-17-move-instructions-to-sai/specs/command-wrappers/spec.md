## MODIFIED Requirements

### Requirement: spec.propose.md is the sole spec instruction source
The `sai-1-spec` wrappers SHALL fetch `instructions/sai/spec.propose.md` (installed at `~/.claude/instructions/sai/spec.propose.md`) and no other spec instruction file. Legacy chains (`spec.common.md`, `spec.claude.md`, `spec.opencode.md`, `spec.copilot.md`) SHALL NOT exist in the repository.

#### Scenario: claude wrapper fetches only spec.propose.md
- **WHEN** `claude/commands/sai-1-spec.md` is executed
- **THEN** the only fetched spec instruction file is `~/.claude/instructions/sai/spec.propose.md`

#### Scenario: opencode wrapper fetches only spec.propose.md
- **WHEN** `opencode/commands/sai-1-spec.md` is executed
- **THEN** the only fetched spec instruction file is `~/.config/opencode/instructions/sai/spec.propose.md`

#### Scenario: legacy spec instruction files removed
- **WHEN** the `instructions/sai/` directory is listed
- **THEN** no `spec.common.md`, `spec.claude.md`, `spec.opencode.md`, or `spec.copilot.md` is present

### Requirement: ai-* commands wrap opsx skills additively
Each sai-* command that maps to an opsx skill SHALL load the skill content via `Fetch` and prepend shared-AI behaviors (caveman mode, isolation mode, model routing, relevant instructions) from `~/.claude/instructions/sai/` paths. The skill SKILL.md files SHALL NOT be modified.

#### Scenario: sai-1-spec executes with full enrichment
- **WHEN** user invokes `sai-1-spec`
- **THEN** command loads `~/.claude/instructions/sai/caveman.md`, `~/.claude/instructions/sai/glossary-format.md`, `~/.claude/instructions/sai/spec.propose.md`, then fetches openspec-propose SKILL.md, then `~/.claude/instructions/sai/remember.md` — in that order

#### Scenario: all wrappers use sai/ instruction paths
- **WHEN** any `claude/commands/sai-*.md` wrapper is executed
- **THEN** all `Fetch` directives pointing to `~/.claude/instructions/` use the `~/.claude/instructions/sai/` prefix

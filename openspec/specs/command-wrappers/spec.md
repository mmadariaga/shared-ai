# Command Wrappers Specification

## Purpose

Define the thin `sai-*` wrappers for Claude Code and opencode: what each one loads, how it routes, and where its model routing is declared.

## Requirements

### Requirement: ai-* commands wrap opsx skills additively

Each sai-* command that maps to an opsx skill SHALL load the skill content via `Fetch` and prepend shared-AI behaviors (isolation mode, model routing, relevant instructions) from installed `sai/` paths. The skill SKILL.md files SHALL NOT be modified.

#### Scenario: sai-1-spec executes with full enrichment but stops before design

- **WHEN** user invokes `sai-1-spec` with a `Ready to Propose` block (creation) or an existing change name plus feedback (refinement)
- **THEN** the command loads the fetch skill, fetches `@sai/commands/spec/coordinator.md` directly, and generates only proposal.md and specs/ without proceeding to design.md or tasks.md

#### Scenario: sai-2-design executes with enrichment and approval stamp

- **WHEN** user invokes `sai-2-design`
- **THEN** invoking it is the specs approval: the phase stamps `approval.specs` in `.openspec.yaml`, then generates design.md, tasks.md, and interfaces.md

#### Scenario: all wrappers use harness-resolved fetch paths

- **WHEN** any `commands/claude/sai-*.md` or `commands/opencode/sai-*.md` wrapper is executed
- **THEN** its `Fetch` directives after the fetch-skill load use `@sai/` and `@skills/` paths resolved by the harness fetch skill

### Requirement: opsx commands are never invoked directly by users
The project documentation and pipeline descriptions SHALL indicate that opsx:* commands are internal — users MUST use sai-* wrappers exclusively.

#### Scenario: documentation reflects wrapper-only usage
- **WHEN** AGENTS.md and README.md describe the pipeline
- **THEN** only sai-* commands appear in workflow examples — no opsx:* commands shown as user-facing steps

### Requirement: model routing preserved per command
Each sai-* wrapper SHALL declare its model in frontmatter: `model` plus `effort` on Claude Code, `model` plus `variant` on opencode where the command uses a non-default variant. The wrapper frontmatter is the single source of truth for command model routing; specs and docs SHALL NOT restate per-command model values except the README's default opencode models block, which SHALL match the opencode wrappers.

#### Scenario: Claude Code wrapper declares its model
- **WHEN** any `commands/claude/sai-*.md` wrapper is inspected
- **THEN** its frontmatter declares `model`, and `effort` when the command runs at a non-default effort

#### Scenario: opencode wrapper declares its model
- **WHEN** any `commands/opencode/sai-*.md` wrapper is inspected
- **THEN** its frontmatter declares `model`, and `variant` when the command runs at a non-default variant

#### Scenario: README opencode defaults are consistent with wrappers
- **WHEN** the README's default opencode models block is read
- **THEN** every ORCHESTRATOR row shows the same model and variant as the corresponding `commands/opencode/sai-*.md` frontmatter

### Requirement: single canonical wrapper per command per harness
Each supported harness SHALL provide exactly one wrapper per sai-* command. Model-variant duplicates SHALL NOT exist.

#### Scenario: opencode has one wrapper per command
- **WHEN** `commands/opencode/` is listed
- **THEN** exactly one file exists per command name (no `-gemini`, `-gpt`, or `-opus` suffix variants)

### Requirement: One canonical utility wrapper exists per harness

The repository SHALL provide exactly one canonical `/sai-retire-docs` wrapper for Claude Code and exactly one for opencode. Each wrapper SHALL fetch `sai/commands/retire-docs/body.md` directly, with no boot adapter and no command bootstrap, and forward the invocation arguments without reinterpretation.

#### Scenario: Both wrappers select the utility body

- **WHEN** `/sai-retire-docs` is invoked through either supported harness
- **THEN** the corresponding wrapper SHALL route to the shared retire-docs command card with the original arguments

### Requirement: Utility model routing is declared per harness

The Claude Code wrapper SHALL declare its utility model and the opencode wrapper SHALL declare its opencode model routing without introducing a routed worker lifecycle.

#### Scenario: Utility execution remains main-session work

- **WHEN** the retirement utility is launched
- **THEN** the selected wrapper SHALL execute the main-session utility card rather than dispatching a managed phase worker

### Requirement: spec-command-routes-through-coordinator-and-steps

The `sai-1-spec` wrapper SHALL fetch the harness `fetch` skill and `@sai/commands/spec/coordinator.md` directly, with no boot adapter and no `command-bootstrap.md`; the coordinator SHALL dispatch the spec worker, which loads `@sai/commands/spec/steps/common.md` at dispatch and later steps through coordinator pointers. No static spec-generation instruction file SHALL be the command's primary phase instruction, and the coordinator SHALL fetch no artifact feedback gate.

#### Scenario: claude wrapper routes through coordinator and steps

- **WHEN** `commands/claude/sai-1-spec.md` is executed
- **THEN** it fetches `@sai/commands/spec/coordinator.md` directly, and the coordinator routes to the worker which loads `@sai/commands/spec/steps/common.md`

#### Scenario: opencode wrapper routes through coordinator and steps

- **WHEN** `commands/opencode/sai-1-spec.md` is executed
- **THEN** it fetches `@sai/commands/spec/coordinator.md` directly, and the coordinator routes to the worker which loads `@sai/commands/spec/steps/common.md`

#### Scenario: completion gate fetch is permitted

- **WHEN** the spec coordinator reaches its close
- **THEN** it fetches no artifact feedback gate, and its fetches of the shared cycle and the worker binding do not count as spec-generation instructions

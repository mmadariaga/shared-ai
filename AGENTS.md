# shared-ai — AGENTS.md

## What is this repository

A prompt and instruction library for orchestrating a **structured AI-assisted development pipeline** built on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec).

It contains no application code. It is prompt infrastructure installed as global commands in Claude Code and opencode.

The `sai-*` commands are **wrappers over OpenSpec skills**. OpenSpec owns the change lifecycle and artifact schema; shared-AI owns the quality layer (isolation mode, model routing, glossary, cost discipline, RED→GREEN) and adds a granular implementation phase optimized for cheap-model execution.

## Main pipeline

```
explore (optional) → spec(1) → design(2) → implement(3) → apply(4) → review(5) → [security(6) | performance(7) | accessibility(8)]
                                    ↑                                    ↓
                             approval gate                       commit / pr (on-demand)
                          (specs → .openspec.yaml)                       ↓
                                                                     archive
```

Each phase reads from and writes to **`openspec/changes/{change-name}/`** — single source of truth per change. Runs in **Isolation Mode**: every command starts with no inherited context, reading only the artifacts it needs.

`opsx:*` skills (`opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive`) are **internal building blocks** owned by the OpenSpec CLI. Users invoke the `sai-*` wrappers exclusively — they layer shared-AI quality behaviors on top of the skills.


## Repo structure

```
sai/instructions/                ← actual content for each agent (plain markdown, Isolation Mode + TASK)
sai/instructions/spec.propose.md ← spec quality layer prepended to the openspec-propose skill
sai/instructions/glossary-format.md ← canonical GLOSSARY.md format used by spec/plan/review
sai/instructions/remember.md     ← consolidated reminders appended by wrappers
sai/instructions/prereqs.md      ← universal prereq check fetched by all openspec-dependent sai-* wrappers
sai/commands/              ← sai command body files (fetched by wrappers at runtime)
commands/claude/           ← wrappers for Claude Code (model + effort + fetch to sai/commands/)
commands/opencode/         ← wrappers for opencode (model + fetch to sai/commands/)
configs/                   ← config samples (opencode.jsonc)
openspec/schemas/sai-workflow/  ← custom OpenSpec schema (schema.yaml + 9 templates)
```

## Prerequisites

The pipeline depends on the OpenSpec CLI:
1. Install the `openspec` binary globally (see https://github.com/Fission-AI/OpenSpec).
2. Run `openspec init` in each project that will use shared-AI.

The openspec-dependent `ai-*` commands halt with a clear error if either is missing. Skills are installed by `openspec init` (per project), never bundled by the shared-AI install script.

## Repository structure

| Directory | Purpose |
|-----------|---------|
| `sai/instructions/` | Phase content (Isolation Mode + TASK block). Fetched by wrappers. |
| `sai/instructions/spec.propose.md` | Quality layer prepended to the `openspec-propose` skill by `ai-1-spec`. Collaboration style, cost discipline, research guide, scope reminder. |
| `sai/instructions/remember.md` | Consolidated reminders appended by wrappers. |
| `sai/instructions/prereqs.md` | Universal prerequisite check + OpenSpec path resolution guidance, fetched first by all openspec-dependent sai-* wrappers. `sai-commit` is the only exception. |
| `sai/commands/` | Sai command body files fetched by wrappers at runtime. |
| `skills/` | Universal skills installed globally (not project-local). Fetched by wrappers via `~/.claude/skills/` or `~/.config/opencode/skills/`. |
| `skills/universal/sai-commands/SKILL.md` | SAI command registry — lists all /sai-* commands and enforces fetch-before-execute discipline. Loaded to prevent LLM from skipping command files. |
| `skills/universal/safe-operations/SKILL.md` | Safe operations skill — enforces reversibility and impact awareness, requires user confirmation before destructive/hard-to-reverse/shared-system operations. Loaded by 7 sai-* command wrappers. |
| `skills/universal/` | Universal skills (no vendor). Fetched by all wrappers. |
| `skills/claude/` | Claude Code-specific skills (subagent dispatch rules, etc.). Fetched by wrappers that spawn subagents. |
| `skills/opencode/` | Opencode-specific skills (subagent dispatch rules, etc.). Fetched by wrappers that spawn subagents. |
| `skills/claude/budget-explorer/SKILL.md` | Subagent dispatch rules for Claude Code — model tiers, task classification, tool-call caps, output contracts. Fetched by wrappers that spawn subagents. |
| `skills/claude/budget-executor/SKILL.md` | Executor subagent rules for Claude Code — subagent_type: General, model: haiku, execute-only discipline. Fetched by wrappers that spawn executor subagents. |
| `skills/opencode/budget-explorer/SKILL.md` | Subagent dispatch rules for opencode — explore keyword binding, cap rules, output contracts. Model resolved via opencode.jsonc. |
| `skills/opencode/budget-executor/SKILL.md` | Executor subagent rules for opencode — executor keyword binding, execute-only discipline. Model resolved via opencode.jsonc. |
| `skills/opencode/fetch/SKILL.md` | Fetch @ path resolver for opencode — replicates Claude Code's built-in Fetch @ mechanism. Loaded first by all opencode wrappers to enable `@sai/` and `@skills/` path resolution. |
| `commands/claude/` | Wrappers for Claude Code. YAML frontmatter (`description`, `argument-hint`, `model`, `effort`) + fetch to `sai/commands/` + fetch to project-local skill files. |
| `commands/opencode/` | Wrappers for opencode. YAML frontmatter (`description`, `model`) + fetch to `sai/commands/` + fetch to project-local skill files. |
| `configs/` | Config samples. `opencode.jsonc`: sub-agent explore configuration (mode + trusted low-cost model). Required for cost-effective research delegation. |

Wrappers are **thin** — they specify the model, fetch the markdown from `instructions/`, and (for openspec-dependent commands) fetch the relevant skill from the project's `.claude/skills/` or `.opencode/skills/` directory.

## Critical conventions

### Wrappers, never skills
sai-* commands prepend shared-AI behaviors (glossary-format, spec.propose) and then `Fetch` the OpenSpec skill content. The skill `SKILL.md` files are **never modified** — the OpenSpec CLI regenerates them on update.

### Single artifact home
All sai-* artifacts (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, `pr.md`) write to `openspec/changes/{change-name}/`. The legacy `plans/` directory is **not used** by the new pipeline.

### Prerequisite check
All openspec-dependent sai-* commands (`sai-explore`, `sai-1-spec`, `sai-2-design`, `sai-3-implement` (plus its opencode-only `-low`/`-high` variants), `sai-4-apply`, `sai-archive`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-pr`) perform three checks via `Fetch @~/.claude/sai/instructions/prereqs.md` (Claude) or `Fetch @~/.config/opencode/sai/instructions/prereqs.md` (OpenCode): (1) `openspec` binary in PATH, (2) `openspec/` directory exists, (3) `openspec/config.yaml` declares `schema: sai-workflow`. `sai-commit` is the only exception — it operates on git state only and works in projects without openspec.

### Isolation Mode
Every `sai/commands/sai-*.md` body file starts with:
```
# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".
```
Never remove or modify this block.

### Safe Operations
Loaded by 7 sai-* command wrappers (`sai-1-spec`, `sai-4-apply`, `sai-archive`, `sai-backfill`, `sai-commit`, `sai-explore`, `sai-pr`) via `Fetch @skills/safe-operations/SKILL.md`. The skill enforces:
- **Reversibility assessment**: agent MUST evaluate whether an operation is hard to reverse, destructive, or affects shared systems before executing.
- **Confirmation gate**: agent MUST ask user before: deleting files/branches, `rm -rf`, `git push --force`, `git reset --hard`, amending published commits, pushing code, commenting on PRs/issues, modifying shared infrastructure.
- **No destructive shortcuts**: agent MUST NOT bypass safety checks (`--no-verify`) or discard unfamiliar files that may be in-progress work.

### Language Policy
All agents MUST think and reason internally in English, regardless of the user's input language.

- **User-facing chat:** respond in the language the user writes in (default English if unclear).
- **Generated artifacts** (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, commit messages, PR bodies, code, technical explanations): written in English unless the user explicitly requests otherwise.

### Cost Discipline (research subagents)
Wrappers that spawn subagents fetch `skills/claude/budget-explorer/SKILL.md` (Claude) or `skills/opencode/budget-explorer/SKILL.md` (opencode). The main agent reasons and synthesizes. Subagents do I/O. Key rules:
- Default research subagent is the **cheap** tier (haiku/Explore+haiku/explorer custom agent). Escalated tier only for multi-step synthesis.
- Every subagent call declares an **output contract** (exact fields, length cap, no raw content).
- Main agent never calls WebFetch directly.
- Speculative exploration ("look around") allowed only in the cheap tier.
- Tool-call caps per tier: cheap ≤30, escalated ≤15, fallback/general ≤10.

### GLOSSARY.md
- `sai-1-spec` reads `GLOSSARY.md`, updates it inline, challenges ambiguous terms.
- `sai-3-implement` uses canonical glossary terms for identifiers.
- `sai-5-review` validates language consistency in new code.
- Format: `instructions/glossary-format.md`, pre-loaded at startup by each wrapper.

### RED → GREEN
Integrated in `plan.md` (loaded by `sai-3-implement`) and `implement.md` (loaded by `sai-4-apply`):
- `implementation.md` includes a RED block (failing test) before GREEN (minimal implementation).
- `sai-4-apply` runs RED, verifies failure, writes GREEN, verifies pass.

### ADR/DDR Proposal Check
Evaluated by `sai-3-implement` against three criteria:
1. **Hard to reverse**
2. **Surprising without context**
3. **Real trade-off**

Only proposes creating an ADR/DDR if the project already has an ADR culture or the user explicitly approves.

### Triage in review
`sai-5-review` does not perform SAST/profiling/axe. It detects the touched surface and recommends audits:
- Security surface → `sai-6-security`
- Performance surface → `sai-7-performance`
- Accessibility surface (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`) → `sai-8-accessibility`

## Installation

Commands are **user globals**, not per-project.

- **Claude Code**: `~/.claude/commands/`
- **opencode**: `~/.config/opencode/commands/`

Supported harnesses: Claude Code and opencode only.

Project-local commands (`.claude/commands/` or `.opencode/commands/` at repo root) override by name. OpenSpec skills are always **project-local** (installed by `openspec init`) — never copied to user globals.

## Generated artifacts

```
openspec/changes/{change-name}/
├── proposal.md         # sai-1-spec  (via opsx:propose — specs phase)
├── specs/**/*.md       # sai-1-spec  (via opsx:propose — specs phase)
├── design.md           # sai-2-design (via opsx:continue — gated on specs approval)
├── tasks.md            # sai-2-design (via opsx:continue — gated on specs approval)
├── implementation.md   # sai-3-implement (granular plan; opencode-only -low/-high variants)
├── review.md           # sai-5-review
├── security.md         # sai-6-security      (required; N/A justification if not applicable)
├── performance.md      # sai-7-performance   (required; N/A justification if not applicable)
├── accessibility.md    # sai-8-accessibility (required; N/A justification if not applicable)
└── pr.md               # sai-pr
```

Once the change is finished, `sai-archive` (wrapping `opsx:archive`) moves the directory to `openspec/changes/archive/YYYY-MM-DD-{change-name}/`.

## Migration from the legacy `plans/` pipeline

Existing projects with `plans/{feature-name}/` artifacts are **not migrated automatically** — that is a deliberate breaking change. Options:
- Keep finishing the in-flight change with older command versions from git history.
- Manually copy/move artifacts into `openspec/changes/{name}/` and rename `plan.md` → `implementation.md`, `spec.md` → `proposal.md`.

## How to modify this repo

### Add / modify an instruction
1. Edit the file in `sai/instructions/`.
2. If it changes a per-phase artifact path, update the corresponding wrapper REPLACEMENT block (`sai-3-implement.md`, `sai-4-apply.md`) and the AGENTS.md artifact table above.
3. If the recommended model changes, update the wrappers in `commands/claude/` and `commands/opencode/`.

### Add a new command
1. Create the instruction in `sai/instructions/{name}.md` with Isolation Mode + TASK block (or, for openspec-backed commands, write a wrapper that fetches a skill).
2. Create wrappers in `commands/claude/sai-{name}.md` and `commands/opencode/sai-{name}.md`.
3. Update README.md with the phase in the corresponding table.

### Specs approval gate
`sai-1-spec` stops after generating `proposal.md` and `specs/`. It asks the user to review and confirm approval, then writes `approval.specs.approved_at` + `approval.specs.notes` to `.openspec.yaml`. `sai-2-design` reads this key before proceeding. Bypassing `sai-2-design` (e.g. calling `opsx:continue` directly) skips this check — `opsx:*` commands are internal, document this accordingly.

### Mirror discipline
Any change to `commands/claude/` MUST be mirrored to `commands/opencode/` in the same commit (and vice versa). Enforce via PR checklist.

**Exception — model variants:** a harness may offer extra wrappers for the same command at different model tiers (e.g. `commands/opencode/sai-3-implement-low.md`, `sai-3-implement-high.md`). These are not mirrored to other harnesses; they exist only where the provider ecosystem justifies them. The canonical wrapper (`sai-3-implement.md`) stays mirrored.

### Format conventions
- Never use `any` in TypeScript (even though there is no TS here, it applies to code examples in instructions).
- Generated artifacts are in English unless the user explicitly requests otherwise.
- Fetch URLs point to `@~/.config/opencode/sai/instructions/...` (opencode) or `@~/.claude/sai/instructions/...` (claude).
- Skill fetches use project-local paths (`.claude/skills/...` or `.opencode/skills/...`).
- `TODO-ENHANCEMENTS.md` tracks future enhancement ideas (not part of the pipeline).

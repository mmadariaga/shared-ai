# shared-ai — AGENTS.md

## What is this repository

A prompt and instruction library for orchestrating a **structured AI-assisted development pipeline** built on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec).

It contains no application code. It is prompt infrastructure installed as global commands in Claude Code and opencode.

The `ai-*` commands are **wrappers over OpenSpec skills**. OpenSpec owns the change lifecycle and artifact schema; shared-AI owns the quality layer (caveman, isolation mode, model routing, glossary, cost discipline, RED→GREEN) and adds a granular implementation phase optimized for cheap-model execution.

## Main pipeline

```
explore (optional) → spec(1) → implement(2) → apply(3) → review(4) → [security(5) | performance(6) | accessibility(7)]
                                                          ↓
                                                  commit / pr (on-demand)
                                                          ↓
                                                      archive
```

Each phase reads from and writes to **`openspec/changes/{change-name}/`** — single source of truth per change. Runs in **Isolation Mode**: every command starts with no inherited context, reading only the artifacts it needs.

`opsx:*` skills (`opsx:explore`, `opsx:propose`, `opsx:apply`, `opsx:archive`) are **internal building blocks** owned by the OpenSpec CLI. Users invoke the `ai-*` wrappers exclusively — they layer shared-AI quality behaviors on top of the skills.

## Prerequisites

The pipeline depends on the OpenSpec CLI:
1. Install the `openspec` binary globally (see https://github.com/Fission-AI/OpenSpec).
2. Run `openspec init` in each project that will use shared-AI.

The openspec-dependent `ai-*` commands halt with a clear error if either is missing. Skills are installed by `openspec init` (per project), never bundled by the shared-AI install script.

## Repository structure

| Directory | Purpose |
|-----------|---------|
| `instructions/` | Phase content (Isolation Mode + TASK block). Fetched by wrappers. |
| `instructions/spec.propose.md` | Quality layer prepended to the `openspec-propose` skill by `ai-1-spec`. Collaboration style, cost discipline, research guide, scope reminder. |
| `instructions/remember.md` | Consolidated reminders appended by wrappers. |
| `claude/commands/` | Wrappers for Claude Code. YAML frontmatter (`description`, `argument-hint`, `model`, `effort`) + fetch to `instructions/` + fetch to project-local skill files. |
| `opencode/commands/` | Wrappers for opencode. YAML frontmatter (`description`, `model`) + fetch to `instructions/` + fetch to project-local skill files. |
| `opencode/opencode.jsonc` | Sub-agent explore configuration (mode + trusted low-cost model). Required for cost-effective research delegation. |

Wrappers are **thin** — they specify the model, fetch the markdown from `instructions/`, and (for openspec-dependent commands) fetch the relevant skill from the project's `.claude/skills/` or `.opencode/skills/` directory.

## Critical conventions

### Wrappers, never skills
ai-* commands prepend shared-AI behaviors (caveman, glossary-format, spec.propose) and then `Fetch` the OpenSpec skill content. The skill `SKILL.md` files are **never modified** — the OpenSpec CLI regenerates them on update.

### Single artifact home
All ai-* artifacts (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, `pr.md`) write to `openspec/changes/{change-name}/`. The legacy `plans/` directory is **not used** by the new pipeline.

### Prerequisite check
Openspec-dependent commands (`ai-explore`, `ai-1-spec`, `ai-2-implement`, `ai-3-apply`, `ai-archive`) verify the `openspec` binary and `openspec/` directory before doing anything. `ai-4-review`, `ai-5-security`, `ai-6-performance`, `ai-7-accessibility`, `ai-commit`, `ai-pr` skip the check — they only read artifacts by path.

### Isolation Mode
Every file in `instructions/` starts with:
```
# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".
```
Never remove or modify this block.

### Language Policy
All agents MUST think and reason internally in English, regardless of the user's input language.

- **User-facing chat:** respond in the language the user writes in (default English if unclear).
- **Generated artifacts** (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, commit messages, PR bodies, code, technical explanations): written in English unless the user explicitly requests otherwise.
- **Chinese thinking mode:** adding `--tacaño` or `--stingy` switches internal reasoning to Chinese.

### Caveman Communication Mode
All wrappers fetch `instructions/caveman.md`. Default is **lite**. Flag `--full-caveman` in `$ARGUMENTS` activates full mode.

### Cost Discipline (research subagents)
The main agent reasons and synthesizes. Subagents do I/O. Key rules:
- Default research subagent is the **cheap** tier (haiku/Explore+haiku/explorer custom agent). Escalated tier only for multi-step synthesis.
- Every subagent call declares an **output contract** (exact fields, length cap, no raw content).
- Main agent never calls WebFetch directly.
- Speculative exploration ("look around") allowed only in the cheap tier.
- Tool-call caps per tier: cheap ≤30, escalated ≤15, fallback/general ≤10.

### GLOSSARY.md
- `ai-1-spec` reads `GLOSSARY.md`, updates it inline, challenges ambiguous terms.
- `ai-2-implement` uses canonical glossary terms for identifiers.
- `ai-4-review` validates language consistency in new code.
- Format: `instructions/glossary-format.md`, pre-loaded at startup by each wrapper.

### RED → GREEN
Integrated in `plan.md` (loaded by `ai-2-implement`) and `implement.md` (loaded by `ai-3-apply`):
- `implementation.md` includes a RED block (failing test) before GREEN (minimal implementation).
- `ai-3-apply` runs RED, verifies failure, writes GREEN, verifies pass.

### ADR/DDR Proposal Check
Evaluated by `ai-2-implement` against three criteria:
1. **Hard to reverse**
2. **Surprising without context**
3. **Real trade-off**

Only proposes creating an ADR/DDR if the project already has an ADR culture or the user explicitly approves.

### Triage in review
`ai-4-review` does not perform SAST/profiling/axe. It detects the touched surface and recommends audits:
- Security surface → `ai-5-security`
- Performance surface → `ai-6-performance`
- Accessibility surface (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`) → `ai-7-accessibility`

## Installation

Commands are **user globals**, not per-project.

- **Claude Code**: `~/.claude/commands/`
- **opencode**: `~/.config/opencode/commands/`

Supported harnesses: Claude Code and opencode only.

Project-local commands (`.claude/commands/` or `.opencode/commands/` at repo root) override by name. OpenSpec skills are always **project-local** (installed by `openspec init`) — never copied to user globals.

## Generated artifacts

```
openspec/changes/{change-name}/
├── proposal.md         # ai-1-spec   (via opsx:propose)
├── design.md           # ai-1-spec   (via opsx:propose)
├── tasks.md            # ai-1-spec   (via opsx:propose)
├── specs/**/*.md       # ai-1-spec   (via opsx:propose)
├── implementation.md   # ai-2-implement (granular plan; ignored by openspec status)
├── review.md           # ai-4-review
├── security.md         # ai-5-security      (if applicable)
├── performance.md      # ai-6-performance   (if applicable)
├── accessibility.md    # ai-7-accessibility (if applicable)
└── pr.md               # ai-pr
```

Once the change is finished, `ai-archive` (wrapping `opsx:archive`) moves the directory to `openspec/changes/archive/YYYY-MM-DD-{change-name}/`.

## Migration from the legacy `plans/` pipeline

Existing projects with `plans/{feature-name}/` artifacts are **not migrated automatically** — that is a deliberate breaking change. Options:
- Keep finishing the in-flight change with older command versions from git history.
- Manually copy/move artifacts into `openspec/changes/{name}/` and rename `plan.md` → `implementation.md`, `spec.md` → `proposal.md`.

## How to modify this repo

### Add / modify an instruction
1. Edit the file in `instructions/`.
2. If it changes a per-phase artifact path, update the corresponding wrapper REPLACEMENT block (`ai-2-implement.md`, `ai-3-apply.md`) and the AGENTS.md artifact table above.
3. If the recommended model changes, update the wrappers in `claude/commands/` and `opencode/commands/`.

### Add a new command
1. Create the instruction in `instructions/{name}.md` with Isolation Mode + TASK block (or, for openspec-backed commands, write a wrapper that fetches a skill).
2. Create wrappers in `claude/commands/sai-{name}.md` and `opencode/commands/sai-{name}.md`.
3. Update README.md with the phase in the corresponding table.

### Mirror discipline
Any change to `claude/commands/` MUST be mirrored to `opencode/commands/` in the same commit (and vice versa). Enforce via PR checklist.

### Format conventions
- Never use `any` in TypeScript (even though there is no TS here, it applies to code examples in instructions).
- Generated artifacts are in English unless the user explicitly requests otherwise.
- Fetch URLs point to `@~/.config/opencode/instructions/...` (opencode) or `@~/.claude/instructions/...` (claude).
- Skill fetches use project-local paths (`.claude/skills/...` or `.opencode/skills/...`).
- `TODO-ENHANCEMENTS.md` tracks future enhancement ideas (not part of the pipeline).

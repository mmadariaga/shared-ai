# shared-ai — AGENTS.md

## What is this repository

A prompt and instruction library for orchestrating a **structured AI-assisted development pipeline**.

It contains no application code. It is prompt infrastructure installed as global commands in Claude Code, opencode, and GitHub Copilot.

## Main pipeline

```
spec(1) → plan(2) → implement(3) → review(4) → [security(5) | performance(6) | accessibility(7)]
                                    ↓
                            commit / pr (on-demand)
```

Each phase produces an artifact in `plans/{feature-name}/` that feeds the next. `ai-commit` and `ai-pr` are on-demand commands. Runs in **Isolation Mode**: every command starts with no inherited context, reading only the artifact it needs.

## Repository structure

| Directory | Purpose |
|-----------|---------|
| `instructions/` | Actual content for each phase. Plain markdown with Isolation Mode + TASK block. Fetched by wrappers. |
| `instructions/spec.common.md` | Shared spec body fetched at runtime by per-harness wrappers (`spec.claude.md`, `spec.opencode.md`, `spec.copilot.md`). Contains collaboration style, workflow, output template, research guide, and cost discipline rules. |
| `instructions/remember.md` | Consolidated reminders (language policy, cost discipline, completion rule) appended by wrappers. |
| `instructions/remember.chinese.md` | Variant with Chinese thinking mode (`--tacaño`/`--stingy`) for token-efficient reasoning on Chinese-origin models. |
| `claude/commands/` | Wrappers for Claude Code. YAML frontmatter (`description`, `argument-hint`, `model`, `effort`) + fetch to `instructions/`. |
| `opencode/commands/` | Wrappers for opencode. YAML frontmatter (`description`, `model`) + fetch to `instructions/`. Includes model-specific spec variants (`ai-1-spec-gpt`, `ai-1-spec-opus`). |
| `opencode/opencode.jsonc` | Sub-agent explore configuration (mode + trusted low-cost model). Required for cost-effective research delegation. |
| `github/prompts/` | Prompts for GitHub Copilot. Equivalent to the commands above. |

Wrappers are **thin** — they only specify the model and fetch the markdown from `instructions/`. The logic lives in `instructions/`.

## Critical conventions

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
All agents MUST think and reason internally in English, regardless of the user's input language. This reduces token consumption (English is more token-efficient than Spanish and most other languages) and ensures consistent reasoning quality.

- **User-facing chat:** respond in the language the user writes in (default to English if unclear).
- **Generated artifacts** (`spec.md`, `plan.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, commit messages, PR bodies, code, technical explanations): written in English unless the user explicitly requests otherwise.
- **Chinese thinking mode:** adding `--tacaño` or `--stingy` to the prompt switches internal reasoning to Chinese (more token-efficient on Chinese-origin models) while keeping artifacts and user-facing responses in English/user's language.

### Caveman Communication Mode
All instructions include `instructions/caveman.md`. Default is **lite**: no filler, pleasantries, or hedging. Fragments allowed in `full` only for internal reasoning.
Flag `--full-caveman` in `$ARGUMENTS` activates full mode.

### Spec Common Body Pattern
The spec instruction uses a **common body + harness context** architecture:
- `instructions/spec.common.md` contains the shared logic (collaboration style, workflow, output template, research guide, cost discipline).
- Per-harness wrappers (`spec.claude.md`, `spec.opencode.md`, `spec.copilot.md`) supply only the **Harness Context** (subagent naming, model routing, tool-call caps) and fetch the common body at runtime.
- This avoids tripling maintenance on the ~300-line spec body across 3 platforms.

### Cost Discipline (research subagents)
The main agent reasons and synthesizes. Subagents do I/O. Key rules:
- Default research subagent is the **cheap** tier (haiku/Explore+haiku/explorer custom agent). Escalated tier only for multi-step synthesis.
- Every subagent call declares an **output contract** (exact fields, length cap, no raw content).
- Main agent never calls WebFetch directly; all external doc lookups go through the research subagent.
- Speculative exploration ("look around") allowed only in the cheap tier.
- Tool-call caps per tier: cheap ≤30, escalated ≤15, fallback/general ≤10.

### GLOSSARY.md
- `spec.md`: reads `GLOSSARY.md`, updates it inline, challenges ambiguous terms.
- `plan.md`: uses glossary terms for identifiers.
- `review.md`: validates language consistency in new code.
- If it does not exist, bootstraps it with the first resolved term.
- Format: `instructions/glossary-format.md`, pre-loaded at startup by each harness wrapper (same pattern as caveman).

### RED → GREEN
Integrated in `plan.md` and `implement.md`:
- Plan includes a RED block (failing test) before GREEN (minimal implementation).
- Implement runs RED, verifies failure, writes GREEN, verifies pass.
Not pure TDD; it is test quality verification.

### ADR/DDR Proposal Check
In `plan.md`. Evaluates 3 criteria before generating the plan:
1. **Hard to reverse** — the cost of changing later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.
Only proposes creating an ADR/DDR if the project already has an ADR culture or the user approves.

### Triage in review
`ai-4-review` does not perform SAST/profiling/axe. It detects the touched surface and recommends audits:
- Security surface → `ai-5-security`
- Performance surface → `ai-6-performance`
- Accessibility surface (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`) → `ai-7-accessibility`

## Installation

Commands are **user globals**, not per-project.

- **Claude Code**: `~/.claude/commands/`
- **opencode**: `~/.config/opencode/commands/`

Project-local commands (`.claude/commands/` or `.opencode/commands/` at repo root) override by name.

## Generated artifacts

```
plans/{feature-name}/
├── spec.md          # ai-1-spec
├── plan.md          # ai-2-plan
├── review.md        # ai-4-review
├── security.md      # ai-5-security (if applicable)
├── performance.md   # ai-6-performance (if applicable)
└── accessibility.md # ai-7-accessibility (if applicable)
```

## How to modify this repo

### Add / modify an instruction
1. Edit the file in `instructions/`.
2. If the change is in the spec, edit `instructions/spec.common.md` (shared body) or the relevant harness wrapper (`spec.claude.md`, `spec.opencode.md`, `spec.copilot.md`) if the change is platform-specific.
3. If the recommended model changes, update the wrappers in `claude/commands/` and `opencode/commands/`.
4. Keep `github/prompts/` in sync if the change affects the base prompt.

### Add a new command
1. Create the instruction in `instructions/{name}.md` with Isolation Mode + TASK block.
2. Create wrappers in `claude/commands/ai-{name}.md` and `opencode/commands/ai-{name}.md`.
3. Optional: create prompt in `github/prompts/ai-{name}.prompt.md`.
4. Update README.md with the phase in the corresponding table.

### Format conventions
- Never use `any` in TypeScript (even though there is no TS here, it applies to code examples in instructions).
- Generated artifacts (`spec.md`, `plan.md`, etc.) are in English unless the user explicitly requests otherwise.
- Fetch URLs point to `@~/.config/opencode/instructions/...` (`experimental` branch).
- `TODO-ENHANCEMENTS.md` tracks future enhancement ideas (not part of the pipeline).

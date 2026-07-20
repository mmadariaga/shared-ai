# shared-ai — AGENTS.md

## What is this repository

A prompt and instruction library for orchestrating a **structured AI-assisted development pipeline** built on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec).

It contains no application code. It is prompt infrastructure installed as global commands in Claude Code, opencode, and GitHub Copilot.

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
commands/copilot/          ← wrappers for GitHub Copilot (model + fetch to sai/commands/ via the fetch skill)
configs/                   ← config samples (opencode.jsonc)
openspec/schemas/sai-workflow/  ← custom OpenSpec schema (schema.yaml + 9 templates)
```

## Prerequisites

The pipeline depends on the OpenSpec CLI:
1. Install the `openspec` binary globally (see https://github.com/Fission-AI/OpenSpec).
2. Run `openspec init` in each project that will use shared-AI.

The openspec-dependent `sai-*` commands halt with a clear error if either is missing. Skills are installed by `openspec init` (per project), never bundled by the shared-AI install script.

## Repository structure

| Directory | Purpose |
|-----------|---------|
| `sai/instructions/` | Phase content (Isolation Mode + TASK block). Fetched by wrappers. |
| `sai/instructions/spec.propose.md` | Quality layer prepended to the `openspec-propose` skill by `sai-1-spec`. Collaboration style, cost discipline, research guide, scope reminder. |
| `sai/instructions/remember.md` | Consolidated reminders appended by wrappers. |
| `sai/instructions/prereqs.md` | Universal prerequisite check + OpenSpec path resolution guidance, fetched first by all openspec-dependent sai-* wrappers. `sai-commit` is the only exception. |
| `sai/commands/` | Sai command body files fetched by wrappers at runtime. |
| `skills/` | Universal skills installed globally (not project-local). Fetched by wrappers via `~/.claude/skills/`, `~/.config/opencode/skills/`, or `~/.copilot/skills/`. |
| `skills/universal/sai-commands/SKILL.md` | SAI command registry — lists all /sai-* commands and enforces fetch-before-execute discipline. Loaded to prevent LLM from skipping command files. |
| `skills/universal/safe-operations/SKILL.md` | Safe operations skill — enforces reversibility and impact awareness, requires user confirmation before destructive/hard-to-reverse/shared-system operations. Loaded by 7 sai-* command wrappers. |
| `skills/universal/` | Universal skills (no vendor). Fetched by all wrappers. |
| `skills/claude/` | Claude Code-specific skills (subagent dispatch rules, etc.). Fetched by wrappers that spawn subagents. |
| `skills/opencode/` | Opencode-specific skills (subagent dispatch rules, etc.). Fetched by wrappers that spawn subagents. |
| `skills/copilot/` | Copilot-specific skills (subagent dispatch rules, fetch path resolver, etc.). Fetched by wrappers that spawn subagents. |
| `skills/claude/budget-explorer/SKILL.md` | Subagent dispatch rules for Claude Code — model tiers, task classification, tool-call caps, output contracts. Fetched by wrappers that spawn subagents. |
| `skills/claude/budget-executor/SKILL.md` | Executor subagent rules for Claude Code — subagent_type: General, model: haiku, execute-only discipline. Fetched by wrappers that spawn executor subagents. |
| `skills/opencode/budget-explorer/SKILL.md` | Subagent dispatch rules for opencode — explore keyword binding, cap rules, output contracts. Model resolved via opencode.jsonc. |
| `skills/opencode/budget-executor/SKILL.md` | Executor subagent rules for opencode — executor keyword binding, execute-only discipline. Model resolved via opencode.jsonc. |
| `skills/opencode/fetch/SKILL.md` | Fetch @ path resolver for opencode — replicates Claude Code's built-in Fetch @ mechanism. Loaded first by all opencode wrappers to enable `@sai/` and `@skills/` path resolution. |
| `skills/copilot/budget-explorer/SKILL.md` | Subagent dispatch rules for Copilot — `budget-explorer` custom agent binding, GPT-5 mini, read-only, tool-call caps, output contracts. |
| `skills/copilot/budget-executor/SKILL.md` | Executor subagent rules for Copilot — `budget-executor` custom agent, GPT-5 mini, execute-only discipline. No tool-call cap. |
| `skills/copilot/budget-subagent/SKILL.md` | Task subagent rules for Copilot — `budget-subagent` custom agent, GPT-5 mini, ~30-call soft cap, structured completion report. |
| `skills/copilot/fetch/SKILL.md` | Fetch @ path resolver for Copilot — maps `@<subpath>` to `.github/sai/<subpath>` then the VS Code SAI folder. Loaded first by all Copilot wrappers to enable `@sai/` and `@skills/` path resolution. |
| `agents/copilot/` | Copilot custom agent definitions (`budget-explorer`, `budget-executor`, `budget-subagent`). Installed to `~/.copilot/agents/`, hidden from the agent picker, invoked programmatically by the main agent when the `budget` skill is active. |
| `commands/claude/` | Wrappers for Claude Code. YAML frontmatter (`description`, `argument-hint`, `model`, `effort`) + fetch to `sai/commands/` + fetch to project-local skill files. |
| `commands/opencode/` | Wrappers for opencode. YAML frontmatter (`description`, `model`) + fetch to `sai/commands/` + fetch to project-local skill files. |
| `commands/copilot/` | Wrappers for GitHub Copilot. YAML frontmatter (`description`, `argument-hint`, `agent`, `model`) + fetch to `sai/commands/` via the copilot fetch skill. |
| `configs/` | Config samples. `opencode.jsonc`: sub-agent explore configuration (mode + trusted low-cost model). Required for cost-effective research delegation. |

Wrappers are **thin** — they specify the model, fetch the markdown from `instructions/`, and (for openspec-dependent commands) fetch the relevant skill from the project's `.claude/skills/`, `.opencode/skills/`, or `.github/skills/` directory.

## Critical conventions

### Wrappers, never skills
sai-* commands prepend shared-AI behaviors (glossary-format, spec.propose) and then `Fetch` the OpenSpec skill content. The skill `SKILL.md` files are **never modified** — the OpenSpec CLI regenerates them on update.

### Harness universality
The pipeline supports three harnesses: **Claude Code**, **opencode**, and **GitHub Copilot**. Every change — to a wrapper (`commands/{claude,opencode,copilot}/`), a shared instruction (`sai/instructions/`), a skill, an installer, or this AGENTS.md — MUST consider all three. Harness-agnostic content stays harness-agnostic (no harness named at all); the moment one harness is named, all three are named, each with its own mechanism. This rule is upstream of Mirror discipline and also governs instruction prose (e.g. closed-choice prompts must cover Claude Code's `AskUserQuestion`, opencode's `question` tool, and Copilot's plain-text fallback — see `remember.md`), installer scripts, model tables, and docs. Before finishing any change, scan the diff for a harness name; if one appears, verify the other two are addressed or explicitly marked N/A.

### Single artifact home
All sai-* artifacts (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, `pr.md`) write to `openspec/changes/{change-name}/`. The legacy `plans/` directory is **not used** by the new pipeline.

### Checkboxes are actions, notes are explanations
In `implementation.md`, a **checkbox** (`- [ ]`) is an **action** — something `/sai-4-apply` runs or the user verifies, then marks `[x]`; every `- [ ]` is a task a downstream consumer (`sai-4-apply`, `sai-archive`, `sai-pr`) acts on. An **italic note** (`*(...)*`) is an **explanation** — context for the reader that is never marked or acted on. A step with no observable human check therefore encodes that absence as an italic note, never as a placeholder `- [ ] No human check required` checkbox.

### Prerequisite check
All openspec-dependent sai-* commands (`sai-explore`, `sai-1-spec`, `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-archive`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-pr`) perform three checks by fetching `@sai/instructions/prereqs.md` (resolved per harness: Claude Code via `~/.claude/sai/`, opencode via `~/.config/opencode/sai/`, Copilot via the copilot fetch skill): (1) `openspec` binary in PATH, (2) `openspec/` directory exists, (3) `openspec/config.yaml` declares `schema: sai-workflow`. `sai-commit` is the only exception — it operates on git state only and works in projects without openspec.

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

### Explore-mode read-only enforcement
`sai-explore`'s explore-mode "No file writes" guarantee (`sai/instructions/explore.md`) is **enforced**, not merely conventional, in the two harnesses whose command frontmatter supports tool restriction: **Claude Code** via `allowed-tools` (scoped to read/search/dispatch tools — `Edit`, `Write`, and bare `Bash` omitted; shell limited to the prefix-scoped globs `Bash(openspec:*)` and `Bash(git:*)`) and **GitHub Copilot** via `tools:` (terminal `execute` dropped, the broad `vscode` category narrowed to `vscode/askQuestions`). **opencode** has no per-command tool-restriction frontmatter field, so `commands/opencode/sai-explore.md` is intentionally left unchanged and its read-only guarantee stays model-discipline-only; routing opencode's `sai-explore` to a read-only sub-agent was rejected because it breaks the main-session interactivity the command requires.

### Language Policy
All agents MUST think and reason internally in English, regardless of the user's input language.

- **User-facing chat:** respond in the language the user writes in (default English if unclear).
- **Generated artifacts** (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, commit messages, PR bodies, code, technical explanations): written in English unless the user explicitly requests otherwise.

### Cost Discipline (research subagents)
Wrappers that spawn subagents fetch `skills/claude/budget-explorer/SKILL.md` (Claude), `skills/opencode/budget-explorer/SKILL.md` (opencode), or `skills/copilot/budget-explorer/SKILL.md` (Copilot). The main agent reasons and synthesizes. Subagents do I/O. Key rules:
- Default research subagent is the **cheap** tier — Claude Code (`subagent_type: Explore`, model haiku/sonnet), opencode (`explore` keyword, model via `opencode.jsonc`), Copilot (`budget-explorer` custom agent, GPT-5 mini). Escalated tier only for multi-step synthesis.
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

### Fast-track flag (`--fast-track`)

A per-invocation opt-in on `sai-explore`, `sai-2-design`, `sai-4-apply`, and `sai-archive` that trades a fixed, audited set of gates for a single end-of-run checkpoint. Parsed in the shared body file (not the wrappers) so behavior is identical across Claude Code, opencode, and GitHub Copilot. Each command's opt-out set is fixed:
- `sai-explore` — skips both language gates (artifact review and crystallization).
- `sai-2-design` — auto-approves the specs approval gate.
- `sai-4-apply` — pre-activates session commit authorization and defers Human Verification to end-of-run.
- `sai-archive` — auto-proceeds the unchecked-items gate (always) and the delta-spec sync gate (conditional: implementation applied or change backfilled).

Safe-operations confirmations and all unnamed gates remain in force.

## Installation

Commands are **user globals**, not per-project.

- **Claude Code**: `~/.claude/commands/`
- **opencode**: `~/.config/opencode/commands/`
- **GitHub Copilot**: VS Code user prompts folder (see `INSTALL.copilot.md`)

Supported harnesses: Claude Code, opencode, and GitHub Copilot.

Project-local commands override user-global ones by filename in Claude Code (`.claude/commands/`) and opencode (`.opencode/commands/`). GitHub Copilot (VS Code) is **excepted**: VS Code discovers `.github/prompts/` (workspace) and `%APPDATA%\Code\User\prompts\` (user) as two independent scopes, so a project-local `.prompt.md` with the same name as a user-global one does **not** shadow it — both remain visible as separate prompts (distinguished only by a source tooltip in `Chat: Configure Prompt Files`). See `INSTALL.copilot.md#customizing-models` for supported VS Code workarounds (renamed variant, edit-in-place, or removing the global). OpenSpec skills are always **project-local** (installed by `openspec init`) — never copied to user globals.

## Generated artifacts

```
openspec/changes/{change-name}/
├── proposal.md         # sai-1-spec  (via opsx:propose — specs phase)
├── specs/**/*.md       # sai-1-spec  (via opsx:propose — specs phase)
├── design.md           # sai-2-design (via opsx:continue — gated on specs approval)
├── tasks.md            # sai-2-design (via opsx:continue — gated on specs approval)
├── implementation.md   # sai-3-implement (granular plan)
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
3. If the recommended model changes, update the wrappers in `commands/claude/`, `commands/opencode/`, and `commands/copilot/`.

### Change picker
Nine `sai-*` commands consume an OpenSpec change name via `$ARGUMENTS`: `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`. Resolution follows a two-step precedence: (1) scan the conversation history for a wrapper-echo line emitted by the 9 opencode change-consuming wrappers; when present and non-empty, treat its value as the resolved change name. (2) If the echo line is absent or empty, fall back to the existing `$ARGUMENTS` check and the 0/1/N picker logic. The echo line is an opencode-only harness-specific adapter (per the `harness-universality` "Harness-specific adapter carve-out" requirement) and is not mirrored to Claude Code or GitHub Copilot, where `$ARGUMENTS` is substituted into the body file directly. `sai-1-spec` is excluded (it creates a new change, not consumes one).

Placement depends on command shape:
- **7 commands** (`sai-2-design`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`): fetch it as the first line under `## Load instructions (in order)`, before the first existing fetch.
- **2 commands** (`sai-3-implement`, `sai-4-apply`): fetch it at the very top of the `<TASK>` block, before `## Prerequisite checks` — because their own "Also verify" block dereferences `{change-name}` inside `## Prerequisite checks`, which runs before `## Load instructions`.

When adding a new change-consuming command, check whether it dereferences `{change-name}` inside its own `## Prerequisite checks` before picking a placement.

### Add a new command
1. Create the instruction in `sai/instructions/{name}.md` with Isolation Mode + TASK block (or, for openspec-backed commands, write a wrapper that fetches a skill).
2. Create wrappers in `commands/claude/sai-{name}.md`, `commands/opencode/sai-{name}.md`, and `commands/copilot/sai-{name}.prompt.md`.
3. Update README.md with the phase in the corresponding table.

### Specs approval gate
`sai-1-spec` stops after generating `proposal.md` and `specs/`. It asks the user to review and confirm approval, then writes `approval.specs.approved_at` + `approval.specs.notes` to `.openspec.yaml`. `sai-2-design` reads this key before proceeding. Bypassing `sai-2-design` (e.g. calling `opsx:continue` directly) skips this check — `opsx:*` commands are internal, document this accordingly.

### Mirror discipline
Any change to `commands/claude/` MUST be mirrored to `commands/opencode/` and `commands/copilot/` in the same commit (and vice versa — all three stay in sync). Enforce via PR checklist. This is one consequence of the "Harness universality" convention above, which also covers shared instructions, installers, and docs.

### Format conventions
- Never use `any` in TypeScript (even though there is no TS here, it applies to code examples in instructions).
- Generated artifacts are in English unless the user explicitly requests otherwise.
- Fetch URLs point to `@~/.claude/sai/instructions/...` (claude), `@~/.config/opencode/sai/instructions/...` (opencode), or the Copilot SAI folder resolved by the copilot fetch skill (see `INSTALL.copilot.md`).
- Skill fetches use project-local paths (`.claude/skills/...`, `.opencode/skills/...`, or `.github/skills/...`).
- `TODO-ENHANCEMENTS.md` tracks future enhancement ideas (not part of the pipeline).

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
 sai/command-runner.md            ← neutral command-runner protocol (loaded by every boot adapter before card selection)
 sai/worker-core.md               ← neutral worker lifecycle protocol (loaded by the routed worker cards)
 sai/commands/                    ← command cards — routed cards per phase and utility cards per command (fetched by boot adapters at runtime)
 sai/commands/{spec,design,implement,review,security,performance,accessibility}/  ← routed cards: coordinator.md, worker.md, and invocation.md where retained
 sai/commands/{apply,archive,backfill,commit,explore,pr,status,worktree}/          ← utility cards: body.md only
 sai/commands/{name}/instructions.md   ← command-local phase content (Isolation Mode + TASK block) folded into each command card
 sai/commands/{name}/*.template.md     ← neighboring co-located report/plan template files beside each card
 sai/change-overview.md                ← root exception: shared overview-generation instruction
 sai/adr-index.template.md             ← root exception: canonical project-agnostic ADR index template
 sai/ddr-index.template.md             ← root exception: canonical project-agnostic DDR index template
  sai/adapters/claude/             ← Claude Code boot adapter and paired non-worker idea-list runtime glue
  sai/adapters/opencode/           ← opencode boot adapter and paired non-worker idea-list runtime glue
  sai/orchestration/               ← matrix worker-binding templates (no flat coordinator/worker contracts)
  sai/orchestration/workers/bindings/ ← neutral installed routed worker bindings (seven phases only)
 sai/policies/                    ← canonical reusable policies and prerequisite rules
 sai/compat/                      ← caller-neutral compatibility-only assets
 sai/install-manifest.json        ← deterministic harness projection manifest for install, doctor, and uninstall
 commands/claude/                 ← Claude Code wrappers (model + effort + fetch to sai/adapters/claude/boot.md)
 commands/opencode/               ← opencode wrappers (model + fetch to sai/adapters/opencode/boot.md)
 agents/claude/                   ← Claude Code managed worker agents
 skills/claude/                   ← Claude Code harness skills
 skills/opencode/                 ← opencode harness skills
 configs/                         ← config samples (opencode.jsonc)
 openspec/schemas/sai-workflow/   ← custom OpenSpec schema (schema.yaml + 9 templates)
```

## Prerequisites

The pipeline depends on the OpenSpec CLI:
1. Install the `openspec` binary globally (see https://github.com/Fission-AI/OpenSpec).
2. Run `openspec init` in each project that will use shared-AI.

The openspec-dependent `sai-*` commands halt with a clear error if either is missing. Skills are installed by `openspec init` (per project), never bundled by the shared-AI install script. Global installer projections are expanded deterministically from `sai/install-manifest.json`; the same manifest drives install, doctor, and uninstall.

## Repository structure

| Directory | Purpose |
|-----------|---------|
| `sai/commands/{name}/instructions.md` | Command-local phase content (Isolation Mode + TASK block) folded into each command card, fetched by the card that owns it. |
| `sai/commands/{name}/*.template.md` | Co-located report/plan templates beside their owning card — e.g. `sai/commands/review/review-report.template.md`, `sai/commands/implement/implementation-plan.template.md`, `sai/commands/pr/pr-body.template.md`. |
| `sai/change-overview.md` | Root exception — shared overview-generation instruction executed by the budget-routed subagent, the single source of the `change-overview.md` generation contract for every generation and regeneration. |
| `sai/adr-index.template.md`, `sai/ddr-index.template.md` | Root exceptions — the canonical project-agnostic ADR/DDR index templates consumed by the Step 3 index-maintenance cold build. |
| `sai/command-runner.md` | Neutral command-runner protocol (result loop, coordinator routing, no phase branches). Loaded by every boot adapter before card selection. |
| `sai/worker-core.md` | Neutral worker lifecycle protocol (worker journal, envelope, changed-files union, reconstruction). Loaded by the routed worker cards. |
| `sai/commands/` | Command cards — routed cards per phase and utility cards per command, fetched by boot adapters at runtime. |
| `sai/commands/{spec,design,implement,review,security,performance,accessibility}/` | Routed cards: `coordinator.md`, `worker.md`, and `invocation.md` where retained. |
| `sai/commands/{apply,archive,backfill,commit,explore,pr,status,worktree}/` | Utility cards: `body.md` only — the complete command body for utility commands. |
| `sai/adapters/claude/boot.md` | Claude Code boot adapter — loads `@sai/command-runner.md`, selects the requested card, owns Claude fetch/dispatch; paired non-worker runtime glue also lives under `sai/adapters/claude/`, including `idea-list-render.md`. |
| `sai/adapters/opencode/boot.md` | Opencode boot adapter — loads `@sai/command-runner.md`, selects the requested card, owns opencode fetch/dispatch; paired non-worker runtime glue also lives under `sai/adapters/opencode/`, including `idea-list-render.md`. |
| `sai/orchestration/` | Matrix worker-binding templates (`bindings/{claude,opencode}/worker-template.md`); no flat coordinator/worker contracts remain. |
| `sai/orchestration/workers/bindings/` | Neutral installed routed worker bindings for the seven phases (`spec/design/implementation/review/security/performance/accessibility-worker.md`) projected for both harnesses; non-worker idea-list runtime glue is owned by the adapter seam. |
| `sai/policies/` | Canonical glossary, prerequisite, picker, commit, status, and feedback policies. `sai/policies/artifact-review-contract.md`: shared artifact review finding contract — closed severity vocabulary and assignment criteria, finding shape, severity-prefixed identifier scheme, and closing `Summary:` tally line — single-sourced and referenced by every artifact review surface. |
| `sai/compat/` | Caller-neutral spec/design/implementation invocation cores and shared compatibility assets. The ADR index template is not owned here. |
| `sai/commands/spec/invocation.md`, `sai/commands/design/invocation.md`, and `sai/commands/implement/invocation.md` | Caller-neutral invocation bodies shared by the routed paths; `review`, `security`, `performance`, and `accessibility` keep equivalent invocation bodies. |
| `sai/install-manifest.json` | Deterministic source-to-destination projection rules consumed by installer, doctor, and uninstall. |
| `sai/SAI_AGENTS.md` | Project-agnostic orientation index over the SAI documentation surfaces; installed at each harness root (`SAI_AGENTS.md`) by the `sai-agents-index` root-class projection. |
| `agents/claude/` | Claude Code managed worker agents. |
| `agents/claude/sai-1-spec-proposal-worker.md` | Claude Code custom agent for the medium-effort spec proposal worker. |
| `agents/claude/sai-3-implementation-worker.md` | Claude Code custom agent for the high-effort implementation-planning worker. |
| `agents/claude/sai-2-design-worker.md` | Claude Code custom agent for the high-effort design-planning worker. |
| `skills/claude/` | Claude Code harness skills. |
| `skills/opencode/` | opencode harness skills. |
| `skills/` | Universal skills installed globally (not project-local). Fetched by wrappers via `~/.claude/skills/` or `~/.config/opencode/skills/`. |
| `skills/universal/sai-commands/SKILL.md` | SAI command registry — lists all /sai-* commands and enforces fetch-before-execute discipline. Loaded to prevent LLM from skipping command files. |
| `skills/universal/safe-operations/SKILL.md` | Safe operations skill — enforces reversibility and impact awareness, requires user confirmation before destructive/hard-to-reverse/shared-system operations. Loaded by 8 sai-* command wrappers. |
| `skills/universal/` | Universal skills (no vendor). Fetched by all wrappers. |
| `skills/claude/` | Claude Code-specific skills (subagent dispatch rules, etc.). Fetched by wrappers that spawn subagents. Routed workers load neutral bindings directly from installed `sai/orchestration/workers/bindings/` paths. |
| `skills/opencode/` | Opencode-specific skills (subagent dispatch rules, etc.). Fetched by wrappers that spawn subagents. Routed workers load neutral bindings directly from installed `sai/orchestration/workers/bindings/` paths. |
| `skills/claude/budget-explorer/SKILL.md` | Subagent dispatch rules for Claude Code — model tiers, task classification, tool-call caps, output contracts. Fetched by wrappers that spawn subagents. |
| `skills/claude/budget-executor/SKILL.md` | Executor subagent rules for Claude Code — subagent_type: General, model: haiku, execute-only discipline. Fetched by wrappers that spawn executor subagents. |
| `skills/opencode/budget-explorer/SKILL.md` | Subagent dispatch rules for opencode — explore keyword binding, cap rules, output contracts. Model resolved from the explore agent file's `model` frontmatter (`~/.config/opencode/agents/explore.md`). |
| `skills/opencode/budget-executor/SKILL.md` | Executor subagent rules for opencode — executor keyword binding, execute-only discipline. Model resolved from the executor agent file's `model` frontmatter (`~/.config/opencode/agents/executor.md`). |
| `skills/opencode/fetch/SKILL.md` | Fetch @ path resolver for opencode — replicates Claude Code's built-in Fetch @ mechanism. Loaded first by all opencode wrappers to enable `@sai/` and `@skills/` path resolution. |
| `agents/claude/sai-1-spec-proposal-worker.md` | Claude Code custom agent for the medium-effort spec proposal worker. |
| `agents/claude/sai-3-implementation-worker.md` | Claude Code custom agent for the high-effort implementation-planning worker. |
| `agents/claude/sai-2-design-worker.md` | Claude Code custom agent for the high-effort design-planning worker. |
| `commands/claude/` | Wrappers for Claude Code. YAML frontmatter (`description`, `argument-hint`, `model`, `effort`) + fetch to `sai/adapters/claude/boot.md` + fetch to project-local skill files. |
| `commands/opencode/` | Wrappers for opencode. YAML frontmatter (`description`, `model`) + fetch to `sai/adapters/opencode/boot.md` + fetch to project-local skill files. |
| `configs/` | Config samples. `opencode.jsonc`: `$schema` + `subagent_depth` + the SAI external-directory permission; no agent definitions (the agents ship as managed agent files). |

Wrappers are **thin** — they specify the model, route through their harness boot adapter, and (for openspec-dependent commands) fetch policies, compatibility assets, and relevant project-local skills. Each wrapper enters its own `sai/adapters/{claude,opencode}/boot.md`; the boot loads `@sai/command-runner.md`, selects the requested command card, and owns only the harness-specific fetch and dispatch mechanics. Claude Code and opencode load harness-selected routed bindings directly from the neutral installed SAI paths. The manifest determines which source files are installed for both harnesses.

## Critical conventions

### Wrappers, never skills
sai-* commands prepend shared-AI behaviors (glossary-format, spec.propose) and then `Fetch` the OpenSpec skill content. The skill `SKILL.md` files are **never modified** — the OpenSpec CLI regenerates them on update.

### Harness universality
The pipeline supports two harnesses: **Claude Code** and **opencode**. Every change to a wrapper, shared instruction, skill, installer, or this AGENTS.md MUST consider both. Harness-agnostic content stays harness-agnostic; the moment one harness is named, both are named with their own mechanism. This rule is upstream of Mirror discipline and also governs instruction prose, installer scripts, model tables, and docs. Before finishing any change, scan the diff for a harness name and verify both supported harnesses are addressed.

### Implementation coordinator and worker
Claude Code and opencode route `/sai-3-implement` through the shared orchestration core and their respective worker binding. Both preserve the same `implementation.md` artifact contract and MANDATORY STOP. The routed coordinator performs no technical I/O and only the worker owns routed planning writes.

### Design coordinator and worker
Claude Code and opencode route `/sai-2-design` through the shared orchestration core and their respective design-worker binding; Claude uses a low-effort coordinator and high-effort worker, while opencode declares `model: opencode-go/glm-5.2` and `variant: high` on the wrapper and uses `sai-2-design-worker`. Fixed notices are acknowledged with `continue_after_notice`; `/sai-2-design` ends at design completion, and `/sai-3-implement {name}` is separate in a new chat. The opencode routed phases run under your active primary agent; it must permit native question and task dispatch to the numbered SAI workers. The stock build agent satisfies this. If a restrictive primary agent is active, switch to a permissive one (e.g. build) — do not reintroduce a managed coordinator profile. Both paths preserve `openspec/changes/{change-name}/design.md`, `tasks.md`, and `interfaces.md`; Proposal Complexity remains descriptive.

### Spec coordinator and worker
Claude Code and opencode route `/sai-1-spec` through the shared spec core `sai/commands/spec/invocation.md` and their respective spec worker bindings. Claude Code preserves the `opus`/medium wrapper and uses the medium-effort `sai-1-spec-proposal-worker`; opencode uses `opencode-go/minimax-m3` and `sai-1-spec-proposal-worker`. The worker owns prerequisites, resolution, proposal/spec artifacts, summary, and feedback; both paths create only proposal/spec artifacts plus permitted glossary updates, preserve the same summary/feedback/stop contract, and require same-harness parity evidence.

### Audit coordinators and workers
Claude Code and opencode route `/sai-5-review`, `/sai-6-security`, `/sai-7-performance`, and `/sai-8-accessibility` through the shared orchestration core and their respective audit-worker bindings. Each audit adapter declares the canonical five-step `progress_plan` (resolution, scope/discovery, primary analysis, gated analysis, report verification) and its worker reports completed milestones through additive progress events; the optional gated stages (review Pass 11 mutation analysis, security SCA, performance diagnostics, accessibility runtime checks) complete when their applicability gates resolve, whether the work runs or is legitimately skipped, and empty-diff/no-UI early outcomes report their completed milestones before the existing terminal result. Both harnesses render the plans through `@sai/policies/todo-structure.md` with coordinator-only emission and no `Milestone Stamp` annotations.

### Single artifact home
All sai-* artifacts (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, `pr.md`) write to `openspec/changes/{change-name}/`. The legacy `plans/` directory is **not used** by the new pipeline.

### Checkboxes are actions, notes are explanations
In `implementation.md`, a **checkbox** (`- [ ]`) is an **action** — something `/sai-4-apply` runs or the user verifies, then marks `[x]`; every `- [ ]` is a task a downstream consumer (`sai-4-apply`, `sai-archive`, `sai-pr`) acts on. An **italic note** (`*(...)*`) is an **explanation** — context for the reader that is never marked or acted on. A step with no observable human check therefore encodes that absence as an italic note, never as a placeholder `- [ ] No human check required` checkbox.

### Prerequisite check
All openspec-dependent sai-* commands (`sai-explore`, `sai-1-spec`, `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-archive`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-pr`) perform three checks by fetching `@sai/policies/prereqs.md` (resolved per harness: Claude Code via `~/.claude/sai/`, opencode via `~/.config/opencode/sai/`): (1) `openspec` binary in PATH, (2) `openspec/` directory exists, (3) `openspec/config.yaml` declares `schema: sai-workflow`. `sai-commit` and `/sai-worktree` are the only exceptions — they operate on git state only and work in projects without openspec.

### Isolation Mode
Every `sai/commands/` command card (routed `coordinator.md`/`invocation.md` and utility `body.md`) starts with:
```
# Isolation Mode
- Ignore all previous conversation.
- Use only the data inside <TASK>.
- If required information is missing, ask for it.
- If you are about to use external or prior context, STOP and say: "Potential context pollution detected, stopping, open a new chat".
```
Never remove or modify this block.

### Safe Operations
Loaded by 8 sai-* command wrappers (`sai-1-spec`, `sai-4-apply`, `sai-archive`, `sai-backfill`, `sai-commit`, `sai-explore`, `sai-pr`, `sai-worktree`) via `Fetch @skills/safe-operations/SKILL.md`. The skill enforces:
- **Reversibility assessment**: agent MUST evaluate whether an operation is hard to reverse, destructive, or affects shared systems before executing.
- **Confirmation gate**: agent MUST ask user before: deleting files/branches, `rm -rf`, `git push --force`, `git reset --hard`, amending published commits, pushing code, commenting on PRs/issues, modifying shared infrastructure.
- **No destructive shortcuts**: agent MUST NOT bypass safety checks (`--no-verify`) or discard unfamiliar files that may be in-progress work.

### Explore-mode read-only enforcement
`sai-explore`'s explore-mode "No file writes" guarantee (`sai/commands/explore/instructions.md`) is **enforced**, not merely conventional, in Claude Code via `allowed-tools` (scoped to read/search/dispatch tools — `Edit`, `Write`, and bare `Bash` omitted; shell limited to the prefix-scoped globs `Bash(openspec:*)` and `Bash(git:*)`). **opencode** has no per-command tool-restriction frontmatter field, so `commands/opencode/sai-explore.md` is intentionally left unchanged and its read-only guarantee stays model-discipline-only; routing opencode's `sai-explore` to a read-only sub-agent was rejected because it breaks the main-session interactivity the command requires.

### Language Policy
All agents MUST think and reason internally in English, regardless of the user's input language.

- **User-facing chat:** respond in the language the user writes in (default English if unclear).
- **Generated artifacts** (`implementation.md`, `review.md`, `security.md`, `performance.md`, `accessibility.md`, commit messages, PR bodies, code, technical explanations): written in English unless the user explicitly requests otherwise.

### Cost Discipline (research subagents)
Wrappers that spawn subagents fetch `skills/claude/budget-explorer/SKILL.md` (Claude) or `skills/opencode/budget-explorer/SKILL.md` (opencode). The main agent reasons and synthesizes. Subagents do I/O. Key rules:
- Default research subagent is the **cheap** tier — Claude Code (`subagent_type: Explore`, model haiku/sonnet) or opencode (`explore` keyword, model from the explore agent file's `model` frontmatter). Escalated tier only for multi-step synthesis.
- Every subagent call declares an **output contract** (exact fields, length cap, no raw content).
- Main agent never calls WebFetch directly.
- Speculative exploration ("look around") allowed only in the cheap tier.
- Tool-call caps per tier: cheap ≤30, escalated ≤15, fallback/general ≤10.

### Budget-subagent hang containment

`CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` is unset in this project's configuration and is not active by default; a probe with the variable unset ran for roughly 600 seconds of complete silence without triggering termination. opencode exposes no equivalent mechanism.

The configured case (a non-zero value of `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` set explicitly) is an open question that this change did not probe. No design or task in this change may depend on a stall watchdog firing in its current default-off configuration — the rule is scoped to "this change" and to "default-off configuration", not to the future possibility of an activated watchdog.

The only containment layer this change adopts is background dispatch on Claude Code, which keeps a hung child reachable for reaping but does not terminate it automatically, and no wall-clock bound is assumed to fire. The opencode half of this change is documentation parity only, since opencode's `task` tool has no `run_in_background` parameter.

### GLOSSARY.md
- `sai-1-spec` reads `GLOSSARY.md`, updates it inline, challenges ambiguous terms.
- `sai-3-implement` uses canonical glossary terms for identifiers.
- `sai-5-review` validates language consistency in new code.
- Format: `sai/policies/glossary-format.md`, pre-loaded at startup by each wrapper.

### RED → GREEN
Integrated in `implementation.md` (loaded by `sai-3-implement`) and `sai/commands/implement/instructions.md` (loaded by `sai-4-apply`):
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

A per-invocation opt-in on `sai-explore`, `sai-2-design`, `sai-4-apply`, and `sai-archive` that trades a fixed, audited set of gates for a single end-of-run checkpoint. Parsed in the shared body file (not the wrappers) so behavior is identical across Claude Code and opencode. Each command's opt-out set is fixed:
- `sai-explore` — skips both language gates (artifact review and crystallization).
- `sai-2-design` — auto-approves the specs approval gate.
- `sai-4-apply` — pre-activates session commit authorization and defers Human Verification to end-of-run.
- `sai-archive` — auto-proceeds the unchecked-items gate (always) and the delta-spec sync gate (conditional: implementation applied or change backfilled).

Safe-operations confirmations and all unnamed gates remain in force.

## Installation

Commands are **user globals**, not per-project. The manifest-driven installer expands `sai/install-manifest.json` into deterministic harness projections, and the same projections are used by `doctor` for missing/drift checks and by `uninstall` for safe removal. Claude Code and opencode receive mirrored routed spec, design, and implementation bindings from the shared Orchestration Core. The canonical project-agnostic ADR and DDR index templates are `sai/adr-index.template.md` and `sai/ddr-index.template.md`; the recursive `sai-commands` projection installs command-local instructions and co-located `.template.md` files for both supported harnesses, while the three root exceptions — `sai/change-overview.md`, `sai/adr-index.template.md`, and `sai/ddr-index.template.md` — install through their own `sai` root-class projections.

The `sai-agents-index` root-class projection additionally writes `SAI_AGENTS.md` — the orientation index over the four SAI documentation surfaces — to each harness root, inheriting doctor missing-file detection, drift detection, and uninstall cleanup.

- **Claude Code**: `~/.claude/commands/`
- **opencode**: `~/.config/opencode/commands/`

Supported harnesses: Claude Code and opencode.

Project-local commands override user-global ones by filename in Claude Code (`.claude/commands/`) and opencode (`.opencode/commands/`). OpenSpec skills are always **project-local** (installed by `openspec init`) — never copied to user globals.

## Generated artifacts

```
openspec/changes/{change-name}/
├── proposal.md         # sai-1-spec  (via opsx:propose — specs phase)
├── specs/**/*.md       # sai-1-spec  (via opsx:propose — specs phase)
├── design.md           # sai-2-design (via opsx:continue — gated on specs approval)
├── tasks.md            # sai-2-design (via opsx:continue — gated on specs approval)
├── change-overview.md   # sai-2-design (generated after the feedback loop closes; materialized by a budget-routed subagent — not a new phase; `overview.state` persisted in `.openspec.yaml`)
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
1. Edit the canonical file in `sai/commands/{name}/`, `sai/policies/`, `sai/compat/`, or `sai/orchestration/` as appropriate. The ADR index template belongs at `sai/adr-index.template.md` (and the DDR index template at `sai/ddr-index.template.md`); `sai/compat/` remains for compatibility-only assets.
2. If it changes a per-phase artifact path, update the corresponding wrapper REPLACEMENT block (`sai-3-implement.md`, `sai-4-apply.md`) and the AGENTS.md artifact table above.
3. If it changes an installable surface, update `sai/install-manifest.json` and keep Claude Code and opencode projections explicit. Their routed bindings must remain mirrored.
4. If the recommended model changes, update the wrappers in `commands/claude/` and `commands/opencode/`.

### Change picker
Ten `sai-*` commands consume an OpenSpec change name via `$ARGUMENTS`: `sai-2-design`, `sai-3-implement`, `sai-4-apply`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`, `sai-status`. Resolution follows a two-step precedence: (1) scan the conversation history for a wrapper-echo line emitted by the 10 opencode change-consuming wrappers; when present and non-empty, treat its value as the resolved change name. (2) If the echo line is absent or empty, fall back to the existing `$ARGUMENTS` check and the 0/1/N picker logic. The echo line is an opencode-only harness-specific adapter and is not mirrored to Claude Code, where `$ARGUMENTS` is substituted into the body file directly. `sai-1-spec` is excluded (it creates a new change, not consumes one).

Placement depends on command shape:
- **7 commands** (`sai-2-design`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-archive`, `sai-pr`): fetch it as the first line under `## Load instructions (in order)`, before the first existing fetch.
- **2 commands** (`sai-3-implement`, `sai-4-apply`): fetch it at the very top of the `<TASK>` block, before `## Prerequisite checks` — because their own "Also verify" block dereferences `{change-name}` inside `## Prerequisite checks`, which runs before `## Load instructions`.

When adding a new change-consuming command, check whether it dereferences `{change-name}` inside its own `## Prerequisite checks` before picking a placement.

### Add a new command
1. Create the instruction in `sai/commands/{name}/instructions.md` with Isolation Mode + TASK block (or, for openspec-backed commands, write a wrapper that fetches a skill).
2. Create wrappers in `commands/claude/sai-{name}.md` and `commands/opencode/sai-{name}.md`.
3. Update README.md with the phase in the corresponding table.

### Specs approval gate
`sai-1-spec` stops after generating `proposal.md` and `specs/`. It asks the user to review and confirm approval, then writes `approval.specs.approved_at` + `approval.specs.notes` to `.openspec.yaml`. `sai-2-design` reads this key before proceeding. Bypassing `sai-2-design` (e.g. calling `opsx:continue` directly) skips this check — `opsx:*` commands are internal, document this accordingly.

### Mirror discipline
Any change to `commands/claude/` MUST be mirrored to `commands/opencode/` in the same commit (and vice versa — both stay in sync). Enforce via PR checklist. This is one consequence of the "Harness universality" convention above, which also covers shared instructions, installers, and docs.

### Format conventions
- Never use `any` in TypeScript (even though there is no TS here, it applies to code examples in instructions).
- Generated artifacts are in English unless the user explicitly requests otherwise.
- Fetch URLs point to `@~/.claude/sai/{commands,policies,compat,orchestration}/...` (Claude Code) or `@~/.config/opencode/sai/{commands,policies,compat,orchestration}/...` (opencode).
- Skill fetches use project-local paths (`.claude/skills/...` or `.opencode/skills/...`).
- `TODO-ENHANCEMENTS.md` tracks future enhancement ideas (not part of the pipeline).

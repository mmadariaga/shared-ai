# Shared-AI

AI commands for reliable, cost-efficient software development, designed and tested to work well with budget models.

Start with one command: **`/sai-explore`**. It helps you clarify the idea and choose the right path through the remaining phases.

Built on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec): OpenSpec owns the lifecycle and artifact structure. Shared-AI owns the code, quality and cost efficiency layers.

Works great on **opencode v2** with an **opencode-go** subscription + any frontier model provider sub (Anthropic / OpenAI / OpenCode Zen). Can also run on **Claude Code**.

## TL;DR

Spec-driven: agree on purpose and acceptance criteria before development. For urgent or small changes that start in code, **`/sai-backfill`** can reconstruct the specification afterward.

Structured as a flexible framework rather than a collection of standalone skills (such as Matt Pocock's).

Install the commands globally, then set up each project:

```bash
# 1. Install shared-AI commands globally
npx --allow-git=all github:mmadariaga/shared-ai
# 2. In each project where you want to use shared-AI:
npx github:mmadariaga/shared-ai setup /path/to/your/project
```

In the configured project, start with `/sai-explore`. See [Installation](#installation) for details.

## Index

- [Why use this](#why-use-this)
- [How to use it](#how-to-use-it)
  - [Divide and conquer](#divide-and-conquer)
  - [Choose your implementation strategy](#choose-your-implementation-strategy)
- [Main commands](#main-commands)
- [Utility commands](#utility-commands)
- [Cost-Effective Strategies](#cost-effective-strategies)
- [Project highlights](#project-highlights)
- [Installation](#installation)
- [Post Install](#post-install)
- [Model defaults](#default-opencode-models)
- [Third Party Tools](#third-party-tools)
- [Uninstall](#uninstall)

## Why use this

**You stay in control.** The AI is a peer, not a decision-maker. Choose how much to delegate: take manual control to validate direction phase by phase, use unattended routes to review only at selected checkpoints, or fully delegate once the change is clear.

**Spec-driven.** The planned route captures what, why, and the acceptance criteria before code is written, then derives the implementation plan from those contracts. Direct Build and Backfill provide an explicit code-first exception for small changes while still leaving the project documented. Acceptance criteria remain as durable project documentation alongside ADRs and DDRs, giving future changes the context and behavioral contracts they need to add one feature without silently breaking another.

**Knowledge stays in the project.** Each phase writes its own artifact under `openspec/changes/{change-name}/` and `openspec/specs`. When you come back months later — or hand it off to someone else — the reasoning is already there, organized by concern instead of buried in chat history.

**[Cost-effective by design.](#cost-effective-strategies)**

- Each task runs on the cheapest model that can do the job. A CLI tool lets you customize models and effort levels for each project.
- The YAGNI philosophy (You Aren't Gonna Need It) focuses work on what the change actually requires, so tokens aren't wasted on unnecessary scope.
- For codebase research, the research agent prefers CodeGraph for structural questions and `git grep` for text searches, reading specific files directly when needed.
- Framework advantage: SAI already writes specs, ADRs, and DDRs and maintains their indexes, so research counts on it and knows where to start.

**Testing is not optional.**

- Documentation can say something is done; tests demonstrate it. There is no better documentation.
- The workflow enforces RED → GREEN: test assertions are defined beforehand during design, tests are written first, and production code follows.
- Different agents own the tests and the implementation: the implementation agent cannot weaken, rewrite, or delete a failing test just to make the suite pass. It has to fix the code instead — no moving the goalposts.
- When tests cannot check something, such as visual or end-to-end behavior, SAI asks you to verify it as soon as you can see it working — or defers the check if you choose an unattended implementation.

**Adversarial review out of the box.**

- Because the workflow starts by refining the idea with `/sai-explore`, that same agent uses its context to adversarially review what comes next: the planning artifacts on the planned route, or the implementation on the Direct Build route.
- After implementation, dedicated commands offer a deeper review focused on bugs, weak tests, maintainability, and resilience, plus security, performance, and accessibility audits. Run `/sai-review` to coordinate the review process.

## How to use it

```
/sai-explore                      # discuss the idea, edge cases, and implementation details
                                  # then choose a path:
                                  # ↪ unattended plan, direct build, or manual control
                                  # If you choose direct build, wait for it to finish

                                  # If you choose unattended plan, review it, give feedback, and then:
/sai-build <change-name>          # implement → apply in one run

/sai-review <change-name>         # review bugs, resilience, maintainability, and test quality;
                                  # coordinate security, performance, and accessibility audits

# If review findings need fixes, run sai-build again, then repeat review

/sai-archive <change-name>
```

### Divide and conquer

When a change is too large to implement and review safely as one unit, `/sai-explore` breaks it into smaller, dependency-ordered slices:

- **Slice 0 can be a behavior-preserving refactor** when the current design has no clean extension point for the feature.
- **Slice 1 can be a Walking Skeleton** that establishes a thin end-to-end path, allowing the remaining independent slices to proceed in parallel.
- **A throwaway POC can run first** when technical viability is unproven or a bug has competing root-cause theories, running an experiment that discriminates between the candidates you agreed on before the project commits to one.

### Choose your implementation strategy

After `/sai-explore` displays every `Ready to Propose` block for a crystallized idea, it closes the turn with a picker offering three routes. Nothing is dispatched before you answer it; your choice authorizes delegated writes.

| Option | What happens |
|--------|--------------|
| **Plan - Unattended** | Runs `/sai-1-spec` and `/sai-2-design` back to back. After each phase, `/sai-explore` uses the change context it already holds to run an automatic agent-to-agent feedback loop: it reviews the worker's output and sends corrections back to the same worker. It then stops for your final pre-implementation review. Bounded auto-answering handles routine worker questions; anything ambiguous escalates to you, and every auto-answer is announced inline. This path and the commands that follow it provide the most technically rigorous workflow, but also consume the most tokens. |
| **Direct Build - Unattended** | Code first, specs after: implements the change directly, then the main agent runs a bounded adversarial review-and-fix loop. It reconstructs `proposal.md` and the capability specs from both the diff and the previous discussion about the change in `/sai-explore`. Ideal for fixes and simple changes. |
| **Manual** | Dispatches nothing. Hands you the `Ready to Propose` block to paste into a new chat with `/sai-1-spec`. Full control over every command — see [docs/sequential-pipeline.md](docs/sequential-pipeline.md). |

If the idea was sliced, the selector reappears after each slice completes — a per-slice authorization gate rather than one blanket approval.

## Main commands

| Command | Role | Output |
|---------|------|--------|
| `/sai-explore` | Discover, crystallize, and choose an implementation route | Ready-to-propose plan or completed Direct Build |
| `/sai-build` | Chain `sai-3-implement` → `sai-4-apply` | Tests and production code |
| `/sai-review` | Coordinate code review and specialized audits | `review.md` and audit reports (`security.md`, `performance.md`, `accessibility.md`) |
| `/sai-archive` | Sync specs and archive the completed change | Archived change and optional local commit |

The core planning, build, and review phases are also exposed as eight numbered commands — full reference in [docs/sequential-pipeline.md](docs/sequential-pipeline.md). Review audit triage lives in [docs/review-triage.md](docs/review-triage.md).

Claude Code and opencode route these core phases through a coordinator and a managed worker. In the spec phase, the worker creates only the proposal and capability specs (plus permitted glossary updates); later phases own design and implementation artifacts.

## Utility commands

| Command | Purpose |
|---------|---------|
| `/sai-merge` | Integrate a local branch into the current branch with `Merge`, `Rebase`, or `Rebase with squash` — conflict resolution, ADR/DDR collision repair, and explicit final authorization. |
| `/sai-worktree` | Interactive git worktree manager — inventory, create, and delete linked worktrees. Attempts to initialize CodeGraph in new worktrees when available. |
| `/sai-status` | Read-only progress panel — single change or table over every active change. Never writes anything. |
| `/sai-retire-docs` | Read-only, index-driven analysis of active ADRs, DDRs, and related specs. Asks for explicit per-candidate confirmation before any archival move. |

Full unnumbered reference in [docs/on-demand-commands.md](docs/on-demand-commands.md).

## Cost-Effective Strategies

Every phase in this pipeline is optimized to minimize token consumption without sacrificing quality.

### Token-Efficient Languages

Agents reason internally in English to reduce token costs, but respond to you in your language. Generated documents and code default to English unless you request another language.

### Task-Matched Model Selection
SAI uses different models for different kinds of work, balancing quality and cost. You can customize them per project during setup; see the [default opencode models](#default-opencode-models).

### Explore Sub-Agent
Research and documentation lookup can run on lower-cost agents that return concise findings instead of filling the main conversation with raw material. This keeps the focus on decisions while reducing cost.

### Executor Sub-Agent

A lower-cost agent can run tests, builds, and linters and report the result briefly, without flooding the main conversation with logs.

### Budget Sub-Agent

Small, well-scoped tasks can go to a lower-cost agent while the main agent handles decisions and synthesis. See [docs/skills.md](docs/skills.md).

## Project highlights

### Spec-Driven Development
Alongside code and tests, SAI records each change's purpose and acceptance criteria. That context helps future developers and AI agents understand why the change was made, instead of leaving the reasoning only in the original requester's head.

### Built-In Code Quality
SAI favors focused changes, clear names, and tests tied to acceptance criteria. When something cannot be checked automatically, it asks you to verify it yourself. The goal is code that's easier to understand, change, and trust.

### Multi-Pass Review
The change is checked for bugs, weak tests, maintainability, and alignment with the project's requirements. Security, performance, and accessibility audits are part of the review toolkit.

### RED → GREEN
For every testable step, the test is written first (RED) and run against the not-yet-implemented function — so it fails because the behavior is missing, not because of a setup bug. A separate agent then writes the implementation to make the test pass (GREEN), with **no permission to modify the tests** — no cheating. The production code ends up validated against an assertion it never touched.

### ADR Proposals
Proposes creating an ADR/DDR if all 3 criteria below are met:
1. **Hard to reverse** — the cost of changing later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.

### Fresh context for each command
Each command starts fresh and reads the project artifacts it needs instead of relying on earlier chat context. That makes runs easier to reproduce and lets you switch models between phases.

### Ubiquitous Language via GLOSSARY.md
Project terms live in `GLOSSARY.md`. Planning reuses them in names, and review checks that new code stays consistent with the project's language.

## Installation

Install the commands once for Claude Code, opencode, or both; then run setup in each project you want to use. A read-only `doctor` command checks the installation, and `uninstall` removes managed files.

The installer projects both harnesses from `sai/install-manifest.json`, including the shared `sai/policies/` and shared Orchestration Core files plus each harness's routed worker bindings; `doctor` and `uninstall` use the same projection.

### npx installer

```bash
# 1. Install shared-AI commands globally
npx --allow-git=all github:mmadariaga/shared-ai
```

Presents an interactive checklist to select Claude Code and/or opencode as targets. If you pick opencode and its CLI isn't on PATH, the installer offers to install it for you. It also offers (once, editor-agnostic) to install the **CodeGraph** CLI and wire its MCP server — see [Third Party Tools](#third-party-tools).

```bash
# 2. In each project where you want to use shared-AI:
npx github:mmadariaga/shared-ai setup /path/to/your/project
```

- Asks to install the openspec CLI if missing
- Runs `openspec init` if needed
- Sets `schema: sai-workflow` in `openspec/config.yaml`
- Copies the schema templates into the project
- Builds the project index with `codegraph init` when the CodeGraph CLI is available
- Ends with interactive CLI menus to customize command and agent models per project — any model available in opencode can be selected; on Claude Code it works with Anthropic models

If something looks off after install or setup, run a read-only health check — full reference in [docs/doctor.md](docs/doctor.md).

## Post Install

`npx github:mmadariaga/shared-ai setup` ends with an interactive **Customize models** menu. Choose models for individual commands and agents, or save and load presets, without editing configuration files by hand. On opencode you can select any available model; Claude Code supports Anthropic models.

The menu's model tables show two estimates per target to guide your choice, on both Claude Code and opencode:

- `CONTEXT` — how much the task typically accumulates (instructions, documents, results, history): `Small` for isolated tasks, `Medium` for several documents or continuations, `Large` for substantial accumulated state. It describes the task, not the model's context window.
- `DIFFICULTY` — reasoning demand, from `↑` to `↑↑↑`.

Targets without an estimate show `Unknown`.

### Per project installation / override

Per-project commands and agents are still possible: a file placed in a supported harness's project-local folder at the repo root overrides the user-global file of the same name. Globals act as a base; project-local files override them by filename.

| Harness | Commands | Agents |
|---------|----------|--------|
| opencode | `.opencode/commands/` | `.opencode/agents/` |
| Claude Code | `.claude/commands/` | `.claude/agents/` |

The **Customize models** menu in `setup` creates project-local model overrides for you. You can edit those overrides to add instructions or invoke skills; just keep the original `Fetch @` imports intact so future updates remain compatible. Later model customizations preserve your other edits to these overrides.

### Default opencode models

These opencode defaults were chosen for good results at reasonable cost. Feel free to use the setup model menu to replace them with models you know work better for your projects.

```
      TYPE          TARGET                       CONTEXT  DIFFICULTY  SETTING
      ────────────  ───────────────────────────  ───────  ──────────  ─────────────────────────────────────────────────
> [x] AGENT         budget                       Medium   ↑           opencode/muse-spark-1.3-contributor-free (xhigh)
  [x] AGENT         executor                     Small    ↑           opencode/muse-spark-1.3-contributor-free (xhigh)
  [x] AGENT         explore                      Medium   ↑           opencode/muse-spark-1.3-contributor-free (xhigh)

  [x] ORCHESTRATOR  sai-explore                  Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-direct-build-worker      Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
  [x] ORCHESTRATOR  sai-1-spec                   Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-1-spec-proposal-worker   Medium   ↑↑          opencode-go/deepseek-v4.1-flash (max)
  [x] ORCHESTRATOR  sai-2-design                 Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-2-design-worker          Large    ↑↑↑         opencode-go/deepseek-v4.1-flash (max)

  [x] ORCHESTRATOR  sai-build                    Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] ORCHESTRATOR  sai-3-implement              Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-3-implementation-worker  Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
  [x] ORCHESTRATOR  sai-4-apply                  Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-4-red-worker             Medium   ↑           opencode-go/deepseek-v4.1-flash (max)
  [x] WORKER        sai-4-green-worker           Medium   ↑↑          opencode-go/deepseek-v4.1-flash (max)

  [x] ORCHESTRATOR  sai-review                   Large    ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] ORCHESTRATOR  sai-5-review                 Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-5-review-worker          Large    ↑↑          opencode-go/gpt-5.6-luna (max)
  [x] WORKER        sai-review-fix-worker        Medium   ↑↑          opencode-go/deepseek-v4.1-flash (max)
  [x] ORCHESTRATOR  sai-6-security               Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-6-security-worker        Large    ↑↑↑         opencode-go/deepseek-v4.1-flash (max)
  [x] ORCHESTRATOR  sai-7-performance            Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-7-performance-worker     Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
  [x] ORCHESTRATOR  sai-8-accessibility          Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-8-accessibility-worker   Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)

  [x] ORCHESTRATOR  sai-backfill                 Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-backfill-worker          Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
  [x] ORCHESTRATOR  sai-archive                  Medium   ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-archive-worker           Medium   ↑           opencode-go/muse-spark-1.3-contributor (high)
  [x] ORCHESTRATOR  sai-merge                    Large    ↑↑↑         opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-merge-worker             Large    ↑↑          opencode-go/deepseek-v4.1-flash (max)
  [x] ORCHESTRATOR  sai-commit                   Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-commit-worker            Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)

  [x] UTILITY       sai-pr                       Medium   ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] UTILITY       sai-retire-docs              Large    ↑↑          opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] UTILITY       sai-status                   Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] UTILITY       sai-worktree                 Small    ↑           opencode-go/muse-spark-1.3-contributor (xhigh)
```

### Example presets

The installer includes four SAI default presets for OpenCode and one for Claude Code. Their filenames start with the reserved prefix `[sai-default]-`. Every installation replaces these distributed files, including any direct edits, but does not apply them to projects or change project model selections. Older unprefixed files, personal presets, and other files not distributed by SAI remain untouched.

Save changes under a separate personal preset name to retain them. **Save preset** rejects the reserved prefix case-insensitively and asks for another name; loading SAI defaults and existing presets remains supported.

| Preset | Model mix |
|--------|-----------|
| `[sai-default]-Go.json` | OpenCode Go models throughout: Muse Spark for commands and helper subagents, DeepSeek Flash for most workers, and GPT Luna for the review worker. |
| `[sai-default]-Go+Zen.json` | OpenCode Go models: Muse Spark for commands and utilities, DeepSeek Flash for most workers, and GPT Luna for the review worker; free `opencode` models for the `budget`, `executor`, and `explore` subagents. |
| `[sai-default]-oAI-LUNA+Zen.json` | OpenAI Luna models for most commands and workers, with free `opencode` models for the `budget`, `executor`, and `explore` subagents. |
| `[sai-default]-oAI-SOL+Zen.json` | OpenAI models: GPT-6.1 Sol for the planning, build, and merge pipeline, GPT-6 Luna for the audit coordinators, commit, and utilities, and GPT-5.6 Luna for the review and audit workers; free `opencode` models for the `budget`, `executor`, and `explore` subagents. |
| `[sai-default]-OPUS.json` | Claude Code: Opus for the heavy workers and the explore, build, apply, review, and merge coordinators; Sonnet for the remaining coordinators, the RED/GREEN, fix, archive, and commit workers, and most utilities; Haiku for `budget-executor`. |

Load a preset with `npx github:mmadariaga/shared-ai setup` → **Customize models** → **Load preset** → **OpenCode** or **Claude Code** → preset name.

### Choosing your models

This chart may help you identify which models to test. The intelligence axis is highly task-type-dependent — do not rely on it without running your own tests tailored to your project and specific use case.

The x-axis (cost) is usually more reliable, but again, do your own tests. Note that costs can vary depending on the provider — the same model may be priced differently across API providers, subscriptions, and regions.

![Intelligence vs Cost (Sep 2026)](Intelligence-vs-Cost-(29-Sep-'26).png)
[+ Info](https://artificialanalysis.ai/?models=claude-sonnet-5-5-medium%2Cgpt-6-1-sol-xhigh%2Cmimo-v2-6-flash%2Cglm-5-3-flash%2Cgpt-6-luna-xhigh%2Cmimo-v2-6-pro%2Cclaude-sonnet-5-5-high%2Cclaude-opus-5-5%2Cgpt-6-1-sol-high%2Cgpt-6-luna%2Cqwen3-8-flash-next%2Cgpt-6-1-sol-medium%2Cqwen3-8-27b%2Cgpt-6-1-sol%2Cgrok-4-6%2Cglm-5-3%2Cmuse-spark-1-3-xhigh%2Cdeepseek-v4-1-flash%2Cclaude-opus-5-5-xhigh%2Cgpt-6-1-sol-low%2Cclaude-opus-5-5-medium%2Cclaude-opus-5-5-high%2Ckimi-k3%2Cgrok-4-7&coding-agents=execution-time&intelligence=agentic-index&intelligence-efficiency=cost-per-task&total-cost=intelligence-vs-total-cost&cost=intelligence-vs-cost-per-task)

Other rankings that can help you choose:

- Edge case and code quality focused benchmark: https://aicodingdaily.com/leaderboard
- Bug Hunt Bench (score vs cost): https://bughunt.productcompass.pm/?preset=featured&view=scatter
- Cybersecurity benchmark (CVE rediscovery): https://x.com/pilvar222/status/2102722250264789423
- Front-end web development: https://arena.ai/leaderboard/code/webdev

## Third Party Tools

Consider combining SAI with **[CodeGraph](https://github.com/colbymchenry/codegraph)** — a pre-indexed, 100% local code knowledge graph that exposes your codebase as an MCP server. Instead of scanning files with grep/glob/Read, agents query a SQLite symbol graph directly, cutting costs ~35%, token usage ~57%, and tool calls ~71% on average. Works with Claude Code, opencode, Cursor, Codex CLI, and more.

SAI does not bundle CodeGraph. The global installer can offer (once, editor-agnostic, TTY-only) to install the CodeGraph CLI and wire its MCP server; it never indexes a project. Per-project `setup` is what configures it in a repo: when the CLI is on PATH it runs `codegraph init` to build the index; if CodeGraph isn't installed, that step is skipped and setup never blocks.

## Uninstall

```bash
npx github:mmadariaga/shared-ai uninstall
```

The `uninstall` command reverses the installation process:

- **Interactive mode** — prints the full plan of what will be removed (commands, instructions, skills, configs, agents) and asks for confirmation before touching anything.
- **`--dry-run`** — prints the same plan and exits 0 without modifying anything.
- **`--yes`** — skips the confirmation prompt (use in CI/scripts).

**sha256 override guard**: Files that have been locally edited (their content hash differs from the installed manifest) are **kept in place** and logged to stderr. The uninstaller will not silently delete customized files. A re-run after the override is confirmed will remove them.

**Idempotent re-runs**: Running `uninstall` again after a successful uninstall is safe — it checks what's still present and produces a plan with nothing to do.

**Empty-directory pruning**: After removing tracked files, the uninstaller prunes empty ancestor directories up to the editor base directory (`~/.claude/`, `~/.config/opencode/`). It never removes the base directory itself or files it didn't place.

**Excluded targets**: The following are **never touched** by the uninstaller:
- opencode config merges — `opencode.json` / `opencode.jsonc` are left intact
- Per-project `setup` artifacts — `openspec/config.yaml`, `openspec/schemas/sai-workflow/`
- External CLIs — `openspec`, `opencode-ai`, and `@colbymchenry/codegraph` are never uninstalled

# Shared-AI

AI commands for reliable, cost-efficient software development, designed and tested to work well with budget models.

Start with one command: **`/sai-explore`**. It helps you clarify the idea and choose the right path through the remaining phases.

Built on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec): OpenSpec owns the lifecycle and artifact structure. Shared-AI owns the code, quality and cost efficiency layers.

Works great on **opencode v2** with an **opencode-go** subscription + any frontier model provider sub (Anthropic / OpenAI / OpenCode Zen). Can also run on **Claude Code**.

## TL;DR

Spec-driven: agree on purpose and acceptance criteria before development. For urgent or small changes that start in code, **`/sai-backfill`** can reconstruct the specification afterward.

Structured as a framework, closer to Superpowers than to Matt Pocock-style skills: no loose tips, but still quite flexible.

Try it with the command below:

```bash
npx github:mmadariaga/shared-ai
```

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
- [Model defaults](#default-opencode-models)

## Why use this

**You stay in control.** The AI is a peer, not a decision-maker. Choose how much to delegate: take manual control to validate direction phase by phase, use unattended routes to review only at selected checkpoints, or fully delegate once the change is clear.

**Spec-driven.** The planned route captures what, why, and the acceptance criteria before code is written, then derives the implementation plan from those contracts. Direct Build and Backfill provide an explicit code-first exception for small changes while still leaving the project documented. Acceptance criteria remain as durable project documentation alongside ADRs and DDRs, giving future changes the context and behavioral contracts they need to add one feature without silently breaking another.

**Knowledge stays in the project.** Each phase writes its own artifact under `openspec/changes/{change-name}/` and `openspec/specs`. When you come back months later — or hand it off to someone else — the reasoning is already there, organized by concern instead of buried in chat history.

**[Cost-effective by design.](#cost-effective-strategies)**

- Each task runs on the cheapest model that can do the job. A CLI tool lets you customize models and effort levels for each project.
- The YAGNI philosophy (You Aren't Gonna Need It) focuses work on what the change actually requires, so tokens aren't wasted on unnecessary scope.
- When CodeGraph is available, structural queries use the code graph instead of scanning the tree.
- Framework advantage: SAI already writes specs, ADRs, and DDRs and maintains their indexes, so research counts on it and knows where to start.

**Testing is not optional.**

- Documentation can say something is done; tests demonstrate it. There is no better documentation.
- The workflow enforces RED → GREEN.
- Test assertions are defined during design, and tests are written before production code is applied.
- Different agents own the tests and the implementation, producing higher-quality tests through independent perspectives.
- The implementation agent cannot modify the tests, preventing it from weakening assertions or otherwise cheating to make them pass.
- In the more interactive strategies, behavior that cannot be covered automatically — visual behavior and end-to-end flows — becomes an explicit verification request at the earliest point where you can observe it.

**Adversarial review out of the box.**

- A dedicated review pass checks the change for bugs, weak tests, maintainability, and resilience.
- Security, performance, and accessibility audits run when the diff warrants them.
- Reuses agents that already understand the change — more effective and much cheaper than spawning new reviewers from scratch.

## How to use it

```
/sai-explore                      # discuss the idea, edge cases, and implementation details
                                  # then choose a path:
                                  # ↪ unattended plan, direct build, or manual control
                                  # If you choose direct build, wait for it to finish

                                  # If you choose unattended plan, review it, give feedback, and then:
/sai-build <change-name>          # implement → apply in one run

/sai-review <change-name>         # review bugs, resilience, maintainability, and test quality;
                                  # then run security, performance, and accessibility audits
                                  # when review triage recommends them

# If review findings need fixes, run sai-build again, then repeat review

/sai-archive <change-name>
```

### Divide and conquer

When a change is too large to implement and review safely as one unit, `/sai-explore` breaks it into smaller, dependency-ordered slices:

- **Slice 0 can be a behavior-preserving refactor** when the current design has no clean extension point for the feature.
- **Slice 1 can be a Walking Skeleton** that establishes a thin end-to-end path, allowing the remaining independent slices to proceed in parallel.
- **A throwaway POC can run first** when technical viability is unproven or a bug has competing root-cause theories, running an experiment that discriminates between the candidates you agreed on before the project commits to one.

### Choose your implementation strategy

When `/sai-explore` finishes crystallizing an idea it presents three routes. Nothing is dispatched until you pick one — this selector is the gate that authorizes delegated writes.

| Option | What happens |
|--------|--------------|
| **Plan - Unattended** | Runs `/sai-1-spec` and `/sai-2-design` back to back. After each phase, `/sai-explore` uses the change context it already holds to run an automatic agent-to-agent feedback loop: it reviews the worker's output and sends corrections back to the same worker. It then stops for your final pre-implementation review. Bounded auto-answering handles routine worker questions; anything ambiguous escalates to you, and every auto-answer is announced inline. This path and the commands that follow it provide the most technically rigorous workflow, but also consume the most tokens. |
| **Direct Build - Unattended** | Code first, specs after: implements the change directly, then the main agent runs a bounded adversarial review-and-fix loop. It reconstructs `proposal.md` and the capability specs from both the diff and the previous discussion about the change in `/sai-explore`, validates them against the schema, and archives with one pre-authorized local commit. Never pushes. Ideal for fixes and simple changes. |
| **Manual** | Dispatches nothing. Hands you the `Ready to Propose` block to paste into a new chat with `/sai-1-spec`. Full control. |

If the idea was sliced, the selector reappears after each slice completes — a per-slice authorization gate rather than one blanket approval.

Taking manual control? Run the numbered commands step by step — full reference in [docs/sequential-pipeline.md](docs/sequential-pipeline.md).

## Main commands

| Command | Role | Output |
|---------|------|--------|
| `/sai-explore` | Discover, crystallize, and choose an implementation route | Ready-to-propose plan or completed Direct Build |
| `/sai-build` | Chain `sai-3-implement` → `sai-4-apply` | Implementation plan and code |
| `/sai-review` | Chain `sai-5-review` → audits selected by triage | `review.md` and applicable audit reports |
| `/sai-archive` | Sync specs and archive the completed change | Archived change and optional local commit |

The core planning, build, and review phases are also exposed as eight numbered commands — full reference in [docs/sequential-pipeline.md](docs/sequential-pipeline.md). Review audit triage lives in [docs/review-triage.md](docs/review-triage.md).

Claude Code and opencode route these core phases through a coordinator and a managed worker. In the spec phase, the worker creates only the proposal and capability specs (plus permitted glossary updates); later phases own design and implementation artifacts.

## Utility commands

| Command | Purpose |
|---------|---------|
| `/sai-retire-docs` | Read-only, index-driven analysis of active ADRs, DDRs, and related specs. Asks for explicit per-candidate confirmation before any archival move. |
| `/sai-status` | Read-only progress panel — single change or table over every active change. Never writes anything. |
| `/sai-worktree` | Interactive git worktree manager — inventory, create, and delete linked worktrees. No OpenSpec prerequisites. |
| `/sai-merge` | Integrate a local branch into the current branch with `Merge`, `Rebase`, or `Rebase with squash` — conflict resolution, ADR/DDR collision repair, and explicit final authorization. No OpenSpec prerequisites. |

Full unnumbered reference in [docs/on-demand-commands.md](docs/on-demand-commands.md).

## Cost-Effective Strategies

Every phase in this pipeline is optimized to minimize token consumption without sacrificing quality.

### Token-Efficient Languages

All agents think and reason internally in English, regardless of the user's input language. English tokenizers produce fewer tokens per unit of meaning than most other languages [—non-English languages can cost 2–3× more tokens for the same meaning](https://x.com/arankomatsuzaki/status/2049125048792006965). This keeps reasoning efficient while user-facing chat always responds in the user's own language (Spanish, French, German, etc.). Generated artifacts (`proposal.md`, `design.md`, `implementation.md`, `review.md`, code, commit messages, PRs) are written in English unless the user explicitly requests another language.

### Task-Matched Model Selection
Coordinators and workers can use different models: coordinators handle routing and gates, while managed workers perform the technical work. Defaults balance reasoning quality and cost by role, and every installed agent's model tuning remains user-owned. See the [default opencode models](#default-opencode-models) below.

### Explore Sub-Agent
Research or exploratory tasks are delegated to **sub-agents running cost-effective models** matched to the subtask complexity. By default, sub-agents do not inherit the main session's token window, keeping costs predictable. Each subagent call declares an **output contract** (exact fields, length cap, no raw content) so only distilled signal enters the main context. The main agent never calls WebFetch directly — all external doc lookups go through the cheap explore subagent. Caps: ≤8 research-subagent invocations per audit; in audit mode, ≤15 main-agent reads + ≤30 main-agent `Grep`/`Glob` calls per pass.

In Claude Code, the explorer is a single tier with a **30 tool-call maximum** per spawn, its model selected by the matching `budget-explorer.md` agent file, and multi-step synthesis retained by the main agent. Opencode keeps its own mechanism — the `explore` keyword binding with the model from the explore agent file.

> On I/O-heavy spec tasks — codebase-wide searches, deprecated library audits, doc lookups — this technique can cut costs to a third.

Available as skills for Claude Code and opencode.

### Executor Sub-Agent

Verbose shell commands (tests, builds, lints) are delegated to the **executor sub-agent** (running a cheap model). The executor runs the exact command as instructed — no retrying, no workarounds — and returns a structured failure report (exit code + key reason + file:line). This prevents the main agent from wasting tokens on verbose build logs or test output. Available as skills for Claude Code and opencode.

### Budget Sub-Agent

General-purpose task delegation (file reads, searches, writes, code analysis) is handed off to the **budget sub-agent** (running a cheap model). The budget sub-agent executes exactly one task, returns a structured completion report (`status` / `actions_taken` / `failures`), and aborts on permission blocks rather than waiting. A soft ~30-call cap prevents scope drift on multi-step work. Available as skills for Claude Code and opencode — full reference in [docs/skills.md](docs/skills.md).

## Project highlights

### Spec-Driven Development
The change artifacts are the source of truth for the entire pipeline: `proposal.md` + `specs/**` (from `/sai-1-spec`) capture goals and acceptance criteria; `design.md` captures technical constraints and trade-offs, while `tasks.md` lists the concrete atomic work to do; `interfaces.md` defines the exact public signatures and per-step test assertions; and `implementation.md` is derived from all of them, with code following the plan. The trio of `/sai-1-spec` → `/sai-2-design` → `/sai-3-implement` guarantees every line of generated code is grounded in an explicit contract — no *vibe coding*. This is Spec-Driven Development.

### Built-In Code Quality
The pipeline enforces the same practices experienced developers rely on: build only what you need now, keep each piece focused on one thing, name things so they explain themselves, reuse what already exists, favor extension over modification (the open-closed principle), and ship the smallest change that works. Testable acceptance criteria are backed by tests; behavior that needs visual or end-to-end confirmation becomes an explicit human-verification step. The result is code that's easier to read, easier to change, and easier to trust — no matter your experience level.

### Independent review context
Worker output is reviewed automatically rather than trusted as-is.

### Multi-Pass Review
The review agent runs eleven read-only analysis passes across the full diff: Domain Alignment, Correctness & Bugs, Security triage, Performance triage, Accessibility triage, Maintainability, Testing, Consistency with Codebase, Domain Language Consistency, Documentation & Migrations, and Resilience. A gated twelfth pass runs deterministic mutation analysis when the diff contains testable production code, the repository has tests, and a supported mutation tool is declared. Missing or failed tooling is reported explicitly; mutation results are never inferred.

### RED → GREEN
For every testable step, the test is written first (RED) and run against the not-yet-implemented function — so it fails because the behavior is missing, not because of a setup bug. A separate agent then writes the implementation to make the test pass (GREEN), with **no permission to modify the tests** — no cheating. The production code ends up validated against an assertion it never touched.

### Deferred Human Verification
Human checks (browser/UI behavior, visual confirmation) are deferred to the integration step where the behavior is first observable — the plan asks the user to verify parts of the feature as early as possible, not all at the end. Every deferred check appears exactly once, labeled with its origin step.

### Deterministic tools, not re-derived prose

Decisions that must be identical every run were moved out of prompt prose into small Node tools under `sai/tools/`, projected into both harnesses. The tool decides; the command prose asks the questions and owns the wording. That covers the OpenSpec prerequisite preflight, change-name resolution, the `/sai-status` panel and table, the `/sai-worktree` state machine, `/sai-commit` git mechanics, artifact-format linting, findings-block validation, delta-header checks, and the no-commit guard below. Each exits `0` on success, `1` on refusal, `2` on usage error, and speaks JSON.

### No-commit guard

Worker instructions say "never run a mutating git command", but prose is not enforcement. The guard turns the one invariant true in every project — HEAD must not move while workers run — into a filesystem check: a snapshot when a window opens and a verify before each boundary (a question to you, a git operation the coordinator runs itself, or the end of the run). Consecutive worker dispatches and continuations with no boundary between them share one window, so progress updates cost no guard calls. If HEAD moved without authorization the coordinator captures the evidence, resets back to the recorded base, prints one incident line, and continues. Exactly one flow carries permission for HEAD to move: the archive worker's pre-authorized Direct Build commit.

### ADR Proposals
Proposes creating an ADR/DDR if all 3 criteria below are met:
1. **Hard to reverse** — the cost of changing later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.

### Isolation Mode
Every command starts with zero inherited context — the boot adapter opens each invocation with a clean-session preamble, so a command reads only its instruction cards and the artifacts it needs. This prevents context pollution across phases, makes each run replicable, and enables safe model switching between phases.

### Ubiquitous Language via GLOSSARY.md
Domain terms are captured in a living `GLOSSARY.md` at the project root. Spec reads and appends new terms inline (no batching), Plan uses canonical terms for all new identifiers, and Review validates language consistency in the diff. This enforces a DDD-style ubiquitous language across the entire pipeline — every agent and every artifact speaks the same vocabulary.

## Installation

Commands are designed as **user globals**, not per project. A single copy in the CLI's global directory makes them available in any repo. Maintained phase assets use the grouped `sai/commands/{spec,design,implement,apply}/` command-card trees; the `/sai-build` composition uses `sai/commands/meta-build/command-bootstrap.md` and `coordinator.md`.

The installer projects both harnesses from `sai/install-manifest.json`, including shared `sai/policies/` and shared Orchestration Core files plus each harness's routed worker bindings. `doctor` checks the managed inventory, and `uninstall` uses the same projection rules.

### npx installer

```bash
# 1. Install shared-AI commands globally
npx github:mmadariaga/shared-ai
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

`npx github:mmadariaga/shared-ai setup` ends with an interactive **Customize models** menu. It walks provider → model → variant per target and writes project-local overrides, so you can retune a phase without editing any wrapper by hand. You can also save and load presets. The write is surgical: only `model` and `effort`/`variant` change; the rest of the file is left untouched. On opencode any available model can be selected; on Claude Code it works with Anthropic models.

### Per project installation / override

Per-project commands and agents are still possible: a file placed in a supported harness's project-local folder at the repo root overrides the user-global file of the same name. Globals act as a base; project-local files override them by filename.

| Harness | Commands | Agents |
|---------|----------|--------|
| opencode | `.opencode/commands/` | `.opencode/agents/` |
| Claude Code | `.claude/commands/` | `.claude/agents/` |

Copy the canonical command or agent into your harness's folder above and edit its `model` field, append new instructions, invoke skills, etc. Project-local wins over user-global by filename. Just leave the shipped `Fetch @` imports untouched so the override stays compatible with future updates.

### Default opencode models

Shipped opencode defaults, tunable per project via the setup model menu (`model` + `variant`/`effort` are user-owned). You may find better alternatives for your project.

```
      TYPE          TARGET                       TASK COMPLEXITY  SETTING
      ────────────  ───────────────────────────  ───────────────  ─────────────────────────────────────────────────
> [x] AGENT         budget                       ↑                opencode/muse-spark-1.3-contributor-free (high)
  [x] AGENT         executor                     ↑                opencode/muse-spark-1.3-contributor-free (high)
  [x] AGENT         explore                      ↑                opencode/muse-spark-1.3-contributor-free (high)

  [x] ORCHESTRATOR  sai-explore                  ↑↑               opencode-go/muse-spark-1.3-contributor-free (xhigh)
  [x] WORKER        sai-direct-build-worker      ↑↑               opencode-go/muse-spark-1.3-contributor (high)
  [x] ORCHESTRATOR  sai-1-spec                   ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-1-spec-proposal-worker   ↑↑               opencode-go/muse-spark-1.3-contributor (high)
  [x] ORCHESTRATOR  sai-2-design                 ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-2-design-worker          ↑↑↑              opencode-go/muse-spark-1.3-contributor (high)

  [x] ORCHESTRATOR  sai-build                    ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] ORCHESTRATOR  sai-3-implement              ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-3-implementation-worker  ↑↑               opencode-go/muse-spark-1.3-contributor (high)
  [x] ORCHESTRATOR  sai-4-apply                  ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-4-red-worker             ↑                opencode-go/muse-spark-1.3-contributor (high)
  [x] WORKER        sai-4-green-worker           ↑↑               opencode-go/muse-spark-1.3-contributor (high)

  [x] ORCHESTRATOR  sai-review                   ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] ORCHESTRATOR  sai-5-review                 ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-5-review-worker          ↑↑               opencode-go/gpt-5.6-luna (max)
  [x] ORCHESTRATOR  sai-6-security               ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-6-security-worker        ↑↑↑              opencode-go/deepseek-v4.1-flash (max)
  [x] ORCHESTRATOR  sai-7-performance            ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-7-performance-worker     ↑↑               opencode-go/glm-5.3-flash (max)
  [x] ORCHESTRATOR  sai-8-accessibility          ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-8-accessibility-worker   ↑↑               opencode-go/glm-5.3-flash (max)

  [x] ORCHESTRATOR  sai-backfill                 ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-backfill-worker          ↑↑               opencode-go/muse-spark-1.3-contributor (high)
  [x] ORCHESTRATOR  sai-archive                  ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-archive-worker           ↑                opencode-go/muse-spark-1.3-contributor (high)
  [x] ORCHESTRATOR  sai-merge                    ↑↑               opencode-go/muse-spark-1.3-contributor (xhigh)
  [x] WORKER        sai-merge-worker             ↑↑               opencode-go/muse-spark-1.3-contributor (high)
  [x] ORCHESTRATOR  sai-commit                   ↑                opencode/muse-spark-1.3-contributor-free (high)
  [x] WORKER        sai-commit-worker            ↑                opencode/muse-spark-1.3-contributor-free (high)

  [x] UTILITY       sai-retire-docs              ↑↑               opencode/muse-spark-1.3-contributor-free (high)
  [x] UTILITY       sai-status                   ↑                opencode/muse-spark-1.3-contributor-free (high)
  [x] UTILITY       sai-worktree                 ↑                opencode/muse-spark-1.3-contributor-free (high)
```

### Choosing your models

This chart may help you identify which models to test. The intelligence axis is highly task-type-dependent — do not rely on it without running your own tests tailored to your project and specific use case.

The x-axis (cost) is usually more reliable, but again, do your own tests. Note that costs can vary depending on the provider — the same model may be priced differently across API providers, subscriptions, and regions.

![Intelligence vs Cost (Sep 2026)](Intelligence-vs-Cost-(21-Sep-'26).png)

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

**Version-skew guidance**: If you upgraded shared-AI and some files were updated, run `npx github:mmadariaga/shared-ai install` first to sync the installed files, then `npx github:mmadariaga/shared-ai uninstall` to remove them cleanly.

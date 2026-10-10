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
- [Backlog integration](#backlog-integration)
- [Cost-Effective Strategies](#cost-effective-strategies)
- [Project highlights](#project-highlights)
- [Installation](#installation)
- [Post Install](#post-install)
- [Model defaults](#default-opencode-models)
- [Third Party Tools](#third-party-tools)
- [Upgrades](#upgrades)
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

**Planned builds verify behavior, not just code.**

- Planned builds write tests before implementation: RED → GREEN.
- Separate agents own tests and production code, so the implementer cannot weaken a failing test just to pass.
- Checks that need human judgment remain visible rather than being silently marked complete.

**Adversarial review out of the box.**

- Explore challenges the plan or implementation before handing it back to you.
- Run `/sai-review` for a deeper code review and relevant security, performance, and accessibility audits.

## How to use it

Start with an idea in `/sai-explore`, or import existing work using the
[backlog integration](#backlog-integration) skills before exploring it.

```text
/sai-explore                       # clarify the change and choose a route
# Choose Plan - Unattended, review the plan, then:
/sai-build <change-name>            # write tests and implement
/sai-review <change-name>           # review and choose which findings to fix
/sai-archive <change-name>          # sync specs and archive when ready
```

`/sai-build` authorizes local commits as it works. If you want to approve each
commit, use [`/sai-4-apply`](docs/commands/sai-4-apply.md) after preparing the
[implementation plan](docs/commands/sai-3-implement.md) instead.

Need broader specialized audits? Add `--full` or `--path <dir>` to `/sai-review`.
Use `--runtime` to request performance diagnostics and browser checks (with your
permission), or `--parent-branch <branch>` to choose the comparison branch.
See [review options](docs/review-triage.md) for scope and cost trade-offs.

If you choose to fix findings at the end of review, it makes one local commit
but does **not** run tests before committing; run project checks afterward. For fixes through RED → GREEN,
leave findings open and run `/sai-build`, then review again.

### Divide and conquer

When a change is too large to implement and review safely as one unit, `/sai-explore` breaks it into smaller, dependency-ordered slices:

- **Slice 0 can be a behavior-preserving refactor** when the current design has no clean extension point for the feature.
- **Slice 1 can be a Walking Skeleton** that establishes a thin end-to-end path, allowing the remaining independent slices to proceed in parallel.
- **A throwaway POC can run first** when technical viability is unproven or a bug has competing root-cause theories, running an experiment that discriminates between the candidates you agreed on before the project commits to one.

### Choose your implementation strategy

Once the idea is clear, `/sai-explore` asks you to choose a route. Planning or implementation starts only after your choice.

| Option | Choose it when | What happens |
|--------|----------------|--------------|
| **Plan - Unattended** | The change needs careful design and you want to approve the plan before coding. More rigorous, but uses more tokens. | Prepares and reviews specs and design, then stops for your feedback. Run `/sai-build` when ready. |
| **Direct Build - Unattended** | The change is small and clear, such as a focused fix. Less planning overhead. | Implements and reviews the change, reconstructs specs, archives it, and makes one local commit. No push. |
| **Manual** | You want to review and control each phase separately. More interaction. | Gives you the `Ready to Propose` block for `/sai-1-spec` in a new chat. Follow the [numbered pipeline](docs/sequential-pipeline.md). |

For sliced work, you choose again for each slice. Ambiguous decisions still come back to you on unattended routes.

Choose the planned route when you need tests-first implementation. Direct Build
does not use the same RED → GREEN process; check its results before publishing.

## Main commands

| Command | Role | Output |
|---------|------|--------|
| [`/sai-explore`](docs/commands/sai-explore.md) | Clarify the idea and choose how to build it | Proposal handoff, reviewed plan, or completed Direct Build |
| [`/sai-build`](docs/commands/sai-build.md) | Turn an approved design into a tested implementation | Tests, production code, and local commits |
| [`/sai-review`](docs/commands/sai-review.md) | Coordinate code review and specialized audits, then offer selected fixes | Reports and, if authorized, fixes with one local commit |
| [`/sai-archive`](docs/commands/sai-archive.md) | Sync specs and archive the completed change | Archived change and optional local commit |

For phase-by-phase control, use the eight [numbered commands](docs/sequential-pipeline.md). See [review options and fix selection](docs/review-triage.md) for audit scope and handling findings.

## Utility commands

Use these workflows alongside the main pipeline in Claude Code and opencode.

| Command | Purpose |
|---------|---------|
| [`/sai-commit`](docs/commands/sai-commit.md) | Draft a message for staged changes and commit after approval. |
| [`/sai-backfill`](docs/commands/sai-backfill.md) | Reconstruct proposal/specs from a code-first change. |
| [`/sai-merge`](docs/commands/sai-merge.md) | Merge, rebase, or squash-rebase with conflict resolution and decision-record repair. |
| [`/sai-worktree`](docs/commands/sai-worktree.md) | Create or remove separate Git working folders so you can work on changes in parallel. |
| [`/sai-status`](docs/commands/sai-status.md) | Check progress for one change or all active changes without modifying files. |
| [`/sai-retire-docs`](docs/commands/sai-retire-docs.md) | Find outdated decision records and specs; archive only the candidates you approve. |

See the [utility command reference](docs/on-demand-commands.md) for options.

## Backlog integration

Bring backlog items into the discussion, save ideas for later, create a branch,
and publish completed work for review. These skills
retain the current conversation in Claude Code and opencode and need no OpenSpec.

| Command | Purpose |
|---------|---------|
| [`/from-backlog <reference>`](docs/commands/from-backlog.md) | Read a GitHub/GitLab issue or Azure Boards work item, including its description and comments, into the discussion. |
| [`/from-next-backlog-item`](docs/commands/from-next-backlog-item.md) | Select and import a highest-priority eligible item from a chosen backlog; takes no arguments. |
| [`/to-backlog`](docs/commands/to-backlog.md) | Capture agreed work in a new item, or update the originating item's title and description, after approval. |
| [`/new-change-branch`](docs/commands/new-change-branch.md) | Create and switch to a local change branch from a base you select; reuse the current discussion for its name. |
| [`/to-pr`](docs/commands/to-pr.md) | Create/update a GitHub PR, GitLab MR, or Azure Repos PR from committed changes; publication and push are approved separately. |

Use `/from-backlog` when you already know the item, or `/from-next-backlog-item`
to pick from your backlog. Import is read-only; you decide what to do next.
Use `/to-backlog` to save an agreed idea for later. If the conversation started
from an existing item, it updates that item instead of creating another.

Creating a branch is local; PR publication requires approval, and any push is
approved separately.

Importing or publishing requires Node.js and an authenticated provider CLI: `gh`, `glab`, or Azure CLI
with the azure-devops extension. See [Backlog workflows](docs/backlog.md) for
supported references, destination settings, ordering limits, and recovery.

## Cost-Effective Strategies

Spend stronger models on decisions and cheaper models on routine work.

### Token-Efficient Languages

Agents reason internally in English to reduce token costs, but respond to you in your language. Generated documents and code default to English unless you request another language.

### Task-Matched Model Selection
SAI uses different models for different kinds of work, balancing quality and cost. You can customize them per project during setup; see the [default opencode models](#default-opencode-models).

### CodeGraph Integration

Install [CodeGraph](#third-party-tools) to reduce repeated code searches and
the tokens they consume. Project `setup` builds its index when available;
SAI also works without it.

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
SAI follows existing project conventions and favors focused changes over speculative abstractions, so the result stays easier to maintain.

### Multi-Pass Review
Review looks for bugs, weak tests, maintainability issues, and missed requirements. You choose which findings to fix; resolved findings stay visible with a ` (FIXED)` mark so you can distinguish them from open work.

### RED → GREEN
Tests first demonstrate the missing behavior (RED), then a separate agent implements it (GREEN) without changing the tests. If the tests already pass, you decide whether the behavior exists or the test needs stronger assertions.

### Record important decisions
Architecture and domain decision records (ADRs/DDRs) explain choices that future
changes should not undo casually. SAI proposes one when all three criteria apply:
1. **Hard to reverse** — the cost of changing later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.

### Consistent project terminology
Project terms live in `GLOSSARY.md`. Planning reuses them in names, and review checks that new code stays consistent with the project's language.

## Installation

Requires **Node.js 22 or newer**. Provider workflows additionally need their own authenticated CLIs; SAI does not install or authenticate them.

Install the commands once for Claude Code, opencode, or both; then run setup in each project you want to use. A read-only `doctor` command checks the installation, and `uninstall` removes managed files.

### npx installer

```bash
# 1. Install shared-AI commands globally
npx --allow-git=all github:mmadariaga/shared-ai
```

Choose Claude Code, opencode, or both. The installer offers missing opencode
and the recommended [third-party tools](#third-party-tools).

```bash
# 2. In each project where you want to use shared-AI:
npx github:mmadariaga/shared-ai setup /path/to/your/project
```

- Installs OpenSpec with your approval if missing and configures the project workflow.
- Builds a CodeGraph index when available.
- Offers model customization for the project.

Restart Claude Code or opencode after installation to load the commands and agents.
If something looks wrong, run the read-only health check:

```bash
npx github:mmadariaga/shared-ai doctor
```

See [doctor options](docs/doctor.md) for offline and machine-readable checks.

## Post Install

To change models later, run `setup` again and choose **Customize models**.
Select individual commands and agents, or load a preset. Opencode supports any
available model; Claude Code supports Anthropic models.

Use the menu's estimates to choose:

- `CONTEXT` — how much material the task needs to handle, from Small to Large.
- `DIFFICULTY` — reasoning demand, from `↑` to `↑↑↑`; use stronger models for harder work.

Keep design at least as capable as implementation planning, and planning at
least as capable as GREEN (`sai-2` >= `sai-3` >= `sai-4`). Decisions belong in
the earlier phases; cheaper implementers should execute them, not redesign them.

### Per project installation / override

Use `setup` for project-specific models. For custom instructions, a project-local
command or agent overrides the global file with the same name:

| Harness | Commands | Agents |
|---------|----------|--------|
| opencode | `.opencode/commands/` | `.opencode/agents/` |
| Claude Code | `.claude/commands/` | `.claude/agents/` |

Keep the original `Fetch @` imports when editing overrides so the command still
loads its workflow. Model customization preserves your other edits.

### Default opencode models

The default mix uses Muse Spark for coordination, DeepSeek Flash for most
implementation work, GPT Luna for code review, and free models for helpers.
It aims for reliable results at moderate cost. See the
[full model table](docs/models.md) or replace the mix through `setup`.

### Example presets

Choose a preset matching your subscriptions, then adjust it for your project.
Save custom mixes under your own name: installation refreshes `[sai-default]-`
presets but keeps personal presets and does not change your project's selections.

| Preset | Choose it for |
|--------|---------------|
| `[sai-default]-Go.json` | OpenCode Go models throughout. |
| `[sai-default]-Go+Zen.json` | OpenCode Go with free helper models to reduce cost. |
| `[sai-default]-oAI-LUNA+Zen.json` | OpenAI Luna with free helper models. |
| `[sai-default]-oAI-SOL+Zen.json` | OpenAI Sol for the more demanding planning/build work, with free helpers. |
| `[sai-default]-OPUS.json` | Claude Code: Opus for demanding work, Sonnet and Haiku for lighter tasks. |

Load a preset with `npx github:mmadariaga/shared-ai setup` → **Customize models** → **Load preset** → **OpenCode** or **Claude Code** → preset name.

### Choosing your models

Use benchmarks to shortlist models, then test them on your project: a good
overall ranking does not guarantee good results for your tasks. Compare the
prices available through your own providers and subscriptions.

![Intelligence vs Cost (Oct 2026)](Intelligence-vs-Cost-(8-Oct-'26).png)
[+ Info](https://artificialanalysis.ai/?models=claude-sonnet-5-5-medium%2Cgpt-6-1-sol-xhigh%2Cmimo-v2-6-flash%2Cglm-5-3-flash%2Cgpt-6-luna-xhigh%2Cmimo-v2-6-pro%2Cclaude-sonnet-5-5-high%2Cclaude-opus-5-5%2Cgpt-6-1-sol-high%2Cgpt-6-luna%2Cqwen3-8-flash-next%2Cgpt-6-1-sol-medium%2Cqwen3-8-27b%2Cgpt-6-1-sol%2Cgrok-4-6%2Cglm-5-3%2Cmuse-spark-1-3-xhigh%2Cdeepseek-v4-1-flash%2Cclaude-opus-5-5-xhigh%2Cgpt-6-1-sol-low%2Cclaude-opus-5-5-medium%2Cclaude-opus-5-5-high%2Ckimi-k3%2Cgrok-4-7&coding-agents=execution-time&intelligence=agentic-index&intelligence-efficiency=cost-per-task&total-cost=intelligence-vs-total-cost&cost=intelligence-vs-cost-per-task)

Other rankings that can help you choose:

- Edge case and code quality focused benchmark: https://aicodingdaily.com/leaderboard
- Bug Hunt Bench (score vs cost): https://bughunt.productcompass.pm/?preset=featured&view=scatter
- Cybersecurity benchmark (CVE rediscovery): https://x.com/pilvar222/status/2102722250264789423
- Front-end web development: https://arena.ai/leaderboard/code/webdev

## Third Party Tools

**[CodeGraph](https://github.com/colbymchenry/codegraph)** is offered during
installation. Recommended to reduce code-search overhead and token use; its
index stays local. Project `setup` prepares the index. SAI works without it.

Matt Pocock's **[writing-for-agents](https://github.com/mattpocock/skills)** is offered during installation if it is not already installed. Installing it is recommended because it helps improve `/sai-explore` results.

## Upgrades

Run the installation script again.

## Uninstall

```bash
npx github:mmadariaga/shared-ai uninstall
```

Shows what will be removed and asks for confirmation.

- `--dry-run`: preview without changing anything.
- `--yes`: skip confirmation, for scripts or CI.

Custom instruction overrides, project setup files, opencode configuration, and
external tools are preserved. Removing SAI does not remove your project specs.

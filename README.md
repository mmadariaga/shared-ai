# Shared-AI

Software development oriented AI commands for a cost-efficient, spec-first, structured workflow:

| Phase | Steps |
|-------|-------|
| Idea | explore *(optional)* → spec → validation |
| Code | design → implement → apply |
| Quality | review → audits *(security · performance · accessibility, per review findings)* |
| Ship | archive → PR |

Built on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec): OpenSpec owns the lifecycle and artifact structure, Shared-AI owns the code and quality layers.

Works great on **Opencode** with an opencode-go subscription + any frontier model provider sub (Claude / GPT / Gemini).

Can also run on **Claude Code**, though it is less cost-effective there due to model availability and pricing constraints — you can combine both: use Claude Code for deep thinking phases and switch to opencode after to work around those limitations.

Also supports **GitHub Copilot** natively (only in the VS Code editor window, **not in the agents window (preview) or in Copilot CLI**, since prompt files aren’t supported there yet) — a good fit if you already have a Copilot subscription and prefer to stay inside VS Code without an extra tool.

## Why use this

**You stay in control.** The AI is a peer, not a decision-maker. Every phase is a conversation where you validate direction before anything gets written. You don't delegate to the AI — you collaborate with it.

**Spec first, always.** No code is written without a prior proposal and specs capturing what, why, and the acceptance criteria. The implementation plan is derived from them, and code follows the plan — the difference between AI-assisted development and vibe coding.

**Knowledge stays in the project.** Each phase writes its own artifact under `openspec/changes/{change-name}/`. When you come back months later — or hand it off to someone else — the reasoning is already there, organized by concern instead of buried in chat history.

**Cost-effective by design.** Each phase runs on the cheapest model that can do the job. Cheap models for commits and PRs, mid-range for planning and review, frontier only where reasoning depth actually matters. Agents think in English regardless of your language — English tokenizers produce fewer tokens per unit of meaning, so reasoning is cheaper without losing quality (details in [Token-Efficient Languages](#token-efficient-languages)). Communication is compressed to the minimum. You get the output — not the filler.

**Testing is not optional.** For every step, sai-3 writes the production code in the playbook; test assertions come from `interfaces.md` (produced by sai-2). sai-4 then runs each testable step through two distinct subagents: the **first** writes the test (RED) and confirms it fails by a real assertion — not a setup error; a **separate second** subagent copies the production code into the project (GREEN) and makes the test pass, **without permission to modify the tests** — so the production code is validated against an assertion it never touched. The second agent adjusts code only if compilation or tests fail. What can't be covered by unit tests — visual behavior, end-to-end flows — becomes an explicit verification request to you, placed at the earliest point it can be observed. Nothing ships unverified.

## Typical usage

```
/sai-explore                    # debate the idea before committing to anything
                                # → sai-explore hands you the exact prompts
                                #   to paste into /sai-1-spec
                                # You → keep this chat open: you can lean on it
                                #   to review the artifacts from /sai-1-spec
                                #   and /sai-2-design as you go

/sai-1-spec {prompt}            # creates change "oauth2-auth"
                                # You → review proposal & specs with sai-explore
                                # You → confirm proposal & specs approval

/sai-2-design oauth2-auth       # generates design.md + tasks.md + interfaces.md
                                # You → review design and tasks with sai-explore

/sai-3-implement oauth2-auth    # "On-paper" implementation
/sai-4-apply oauth2-auth        # Real implementation. 
                                # → Asks for permission to commit as it completes each step

###########################################################################################
# Review
###########################################################################################
/sai-5-review oauth2-auth

###########################################################################################
# Audits based on /sai-5-review triage:
###########################################################################################
/sai-6-security oauth2-auth
/sai-7-performance oauth2-auth
/sai-8-accessibility oauth2-auth

###########################################################################################
# ...iterate as needed...
# Usually /sai-3-implement & /sai-4-apply to apply review findings
###########################################################################################

/sai-archive oauth2-auth
/sai-pr oauth2-auth
```

> **Important:** open a new chat between commands:
> - **Token savings** — each phase only inherits the artifact it needs, not the full history.
> - **Clean, replicable context** — each phase starts from scratch (Isolation Mode), making it easy to debug and replay steps in isolation.
> - **Cost efficiency** — each phase uses the most cost-effective model for its task.

## Index

- [Commands](#sequential-pipeline-numbered)
- [Skills](#skills)
- [Cost-Effective Strategies](#cost-effective-strategies)
- [Project highlights](#project-highlights)
- [Installation](#global-installation-multi-project)
- [Model recommendation](#recommended-models-by-command-and-provider)

## Sequential pipeline (numbered)

All artifact paths below resolve under `openspec/changes/{change-name}/` (referred to as `{c}` for brevity).

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `/sai-1-spec` | feature description | `{c}/proposal.md`, `specs/**` | Describe what you want to build. The AI writes a proposal and acceptance criteria for you to review and approve — nothing else happens until you say yes. |
| `/sai-2-design` | {change-name} | `{c}/design.md`, `tasks.md`, `interfaces.md` | Turns approved specs into a technical plan: architecture decisions, trade-offs, a concrete task list, and a per-step interface contract (`interfaces.md`) listing the new/modified public signatures and exact test assertions for each step. Supports `--fast-track` to auto-approve specs. |
| `/sai-3-implement` | {change-name} | `{c}/implementation.md` | Writes the full coding playbook — production code for every step embedded in the playbook, commit points marked. Designed so a cheaper/faster model can copy the code into the project mechanically. Test assertions come from `interfaces.md` (produced by `/sai-2-design`); no code reaches the project at this stage. `/sai-4-apply` follows the playbook and copies each step's code verbatim, adjusting only for compilation errors or test failures. |
| `/sai-4-apply` | {change-name} | code | Follows the playbook step by step as a **coordinator**: each step's work is delegated to a subagent (the coordinator never edits code itself), then the coordinator re-verifies the result, prints a pre-commit files-modified report cross-checked against `tasks.md`, and asks for your approval before each commit. A **testable** step runs through apply twice — first a *blind test-writer* dispatch authors the RED test (from the assertions in `interfaces.md`) and confirms it fails by assertion; then a *separate implementation* dispatch copies the GREEN code from the playbook into the project and makes the test pass, **without permission to modify the tests**, adjusting code only for compilation errors or test failures — so the same step occupies two dispatches, never one subagent doing both. Supports `--fast-track` to auto-commit and defer human checks to end-of-run. |
| `/sai-5-review` | {change-name} + diff | `{c}/review.md` | Reviews the finished code across 11 dimensions (correctness, maintainability, tests, etc.). Also tells you which specialized audits to run next based on what changed. |
| `/sai-6-security` | {change-name} + diff | `{c}/security.md` | Finds security vulnerabilities in the diff — points to exact file and line, explains the risk, and maps findings to known standards (OWASP, CVE). |
| `/sai-7-performance` | {change-name} + diff | `{c}/performance.md` | Flags real performance bottlenecks (slow queries, heavy renders, unbounded loops). Evidence-based — no guesswork. |
| `/sai-8-accessibility` | {change-name} + diff | `{c}/accessibility.md` | Checks UI code for accessibility issues against WCAG 2.2 AA. Can also run browser-based tools for deeper analysis. |

## On-demand commands (unnumbered)

| Command | Purpose |
|---------|---------|
| `/sai-explore` | Open-ended thinking session before committing to anything — good for fuzzy requirements, unclear trade-offs, or when you just want to think out loud with the AI. When a feature is too big for one reviewable change, it slices the idea into a Walking Skeleton plus a dependency-ordered backlog, each ready to enter the pipeline as its own change; when it detects friction at the integration point (mixed responsibilities, no clean extension seam), it prepends a behavior-preserving SOLID refactor as *slice 0* so the feature attaches by extension. After crystallizing, it offers a review loop over your active changes — pick a change, review its `sai-1` or `sai-2` artifacts. Supports `--fast-track` to skip language gate. |
| `/sai-commit` | Reads your staged changes and detects the repo's commit style from the last 20 commits (Conventional Commits shape, type/scope vocabulary, body conventions). Adopts the detected vocabulary when it fits, falls back to hard-coded rules otherwise. Shows a pre-commit file report and runs `git commit` only after you explicitly approve. |
| `/sai-pr` | Drafts a complete PR description using everything produced during the change (proposal, design, review findings, etc.). Opens the PR on GitHub after you approve. |
| `/sai-archive` | Moves a completed change to the archive, keeping your active changes folder clean. Supports `--fast-track` to auto-proceed the archive soft gates. |
| `/sai-backfill` | Made a quick fix directly in code without going through the pipeline? This reconstructs the missing documentation after the fact — interviewing you about intent and writing only what can be reliably derived from the diff. |

## Triage in `/sai-5-review`

`/sai-5-review` does not perform deep SAST, profiling, or axe analysis. It detects the touched surface and recommends the specific audit:

- **Security surface** (auth, input parsing, dynamic queries, crypto, HTTP boundary, deps, logging) → `/sai-6-security`
- **Performance surface** (new queries, endpoints, consumers, hot components, deps, loops over unbounded input, caching) → `/sai-7-performance`
- **Accessibility surface** (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`) → `/sai-8-accessibility`

All audits are diff-scoped by default vs parent branch. Support `--full` or `--path {dir}` to expand scope.

## Iterate as needed

In OpenSpec, a `change` represents a single cohesive set of modifications. When review or audits surface follow-up work, prefer creating a **new change** that references the original, rather than overwriting artifacts of an active or archived change. This preserves the original reasoning, keeps history auditable, and matches the OpenSpec lifecycle (one change → spec → implement → review → audits → PR → archive).

Pick an entry point based on what the findings require:

- **New change (recommended for any finding)** — captures the follow-up as its own auditable unit:
  ```
  /sai-1-spec
  Follow-up to oauth2-auth: harden token storage and address review findings.
  Token storage must move to httpOnly cookies; review flagged XSS exposure...
  ```
  This creates a sibling change (e.g. `oauth2-auth-hardening`) that goes through the full pipeline. The original `oauth2-auth` stays untouched.

- **Amend the active change (only before archive)** — if the original change has not been archived yet and the finding is a direct correction (not new scope), re-run the appropriate phase on the same change name. `implementation.md` is a transient execution artifact — once `sai-4-apply` runs, the resulting commits capture what was applied, making the artifact redundant:

  | What changed | Phase to re-run |
  |---|---|
  | Design decision or task scope | `sai-2-design` (updates `design.md` + `tasks.md`) |
  | Only the execution approach | `sai-3-implement` (replaces `implementation.md`) |
  | Isolated bug or one-liner fix | Directly to code, no phase re-run needed |

  ```
  /sai-3-implement oauth2-auth

  Incorporate review and audit findings into implementation.md.
  Also, the cancel button does nothing on click.
  ```

  Never amend an archived change. Once archived, follow-ups always go through a new change.

  > **New scope always → new change.** If the finding requires new services, new dependencies,
  > or new architectural decisions (e.g. adding a cache layer), treat it as a new change even
  > if the original is not yet archived.

- **Backfill a manual change** — when you made a quick fix directly in code without going through the SAI workflow, use `/sai-backfill` to reconstruct the missing artifacts after the fact:

  ```
  # 1. Make the fix manually:
  git add -A
  git commit -m "fix: changed error message for expired tokens"

  # 2. Regularize it with backfill:
  /sai-backfill name-the-change

  # Select the commit from the interactive diff picker.
  # The command runs a structured interview to extract intent,
  # detects conflicts with existing specs, and writes only
  # derivable artifacts (proposal.md + specs/**).
  ```

  Backfill does **not** generate `design.md`, `tasks.md`, or `interfaces.md` — those require decisions that cannot be reliably inferred from the diff alone. Use it for small fixes, typo corrections, or config changes where the code change is self-explanatory.

## Skills

Skills are reusable behavior modules loaded by wrappers and subagents at runtime. They live under `skills/` and are installed globally during setup.

All skills are invoked automatically by `sai-*` commands, but you can also trigger them directly in your own prompts using the phrases listed below — useful when you want cost discipline or compressed output outside the pipeline.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `safe-operations` | Enforces reversibility and impact awareness — agent must ask before destructive, hard-to-reverse, or shared-system operations, and must not use destructive shortcuts. | `"dangerous"`, `"destructive"`, `"git push --force"`, `"rm -rf"`, `"delete files/branches"` |
| `token-efficient-languages` | Enforces a 3-rule language contract: (1) think/reason in English, (2) respond in user's language, (3) write all artifacts in English. English tokenizers produce fewer tokens per unit of meaning. | `"budget language"`, `"cheap language"` |
| `budget-explorer` | Low-cost agent for research, exploration, and doc-lookup tasks. Model resolved via `agent.explore.model` in `opencode.jsonc`, via `subagent_type: General` + model tiers in Claude Code, or fixed at `GPT-5 mini (copilot)` in `agents/copilot/budget-explorer.agent.md` for GitHub Copilot. Enforces tool-call caps (≤30 per spawn) and output contracts (exact fields, length cap, no raw content). | `"budget explorer"`, `"cheap explorer"` |
| `budget-executor` | Low-cost agent for running commands, tests, and build checks. Model resolved via `agent.executor.model` in `opencode.jsonc`, via `subagent_type: General` + `model: haiku` in Claude Code, or fixed at `GPT-5 mini (copilot)` in `agents/copilot/budget-executor.agent.md` for GitHub Copilot. Enforces execute-only discipline: exact commands, no self-correction, minimal output, structured failure reports. No tool-call cap. | `"budget executor"`, `"cheap executor"` |
| `budget-subagent` | Low-cost agent for general-purpose task delegation — file reads, searches, writes, code analysis. Model resolved via `agent.budget.model` in `opencode.jsonc`, via `subagent_type: General` + `model: haiku` in Claude Code, or fixed at `GPT-5 mini (copilot)` in `agents/copilot/budget-subagent.agent.md` for GitHub Copilot. Enforces single-task discipline: structured completion report, ~30-call soft cap, no raw output. | `"budget subagent"`, `"cheap subagent"`, `"budget task"` |
| `budget` | Loads all budget skills simultaneously (`budget-explorer` + `budget-executor` + `budget-subagent` + `token-efficient-languages`). Activates full cost-discipline for the session. | `"budget mode"`, `"cheap mode"`, `"low-cost mode"`, `"economy mode"` |

## Cost-Effective Strategies

Every phase in this pipeline is optimized to minimize token consumption without sacrificing quality.

### Token-Efficient Languages

All agents think and reason internally in English, regardless of the user's input language. English tokenizers produce fewer tokens per unit of meaning than most other languages [—non-English languages can cost 2–3× more tokens for the same meaning](https://x.com/arankomatsuzaki/status/2049125048792006965). This keeps reasoning efficient while user-facing chat always responds in the user's own language (Spanish, French, German, etc.). All generated artifacts (`proposal.md`, `design.md`, `implementation.md`, `review.md`, code, commit messages, PRs) are written in English.

### Task-Matched Model Selection
Each phase uses a model chosen for its specific strengths: the design and security phases use the strongest model; spec, implement, review, performance, and accessibility use balanced mid-range models; apply, commit, PR, and archive use fast, cost-efficient models. See the [Recommended models by command](#recommended-models-by-command-and-provider) table below.

### Explore Sub-Agent
Research or exploratory tasks are delegated to **sub-agents running cost-effective models** matched to the subtask complexity. By default, sub-agents do not inherit the main session's token window, keeping costs predictable. Each subagent call declares an **output contract** (exact fields, length cap, no raw content) so only distilled signal enters the main context. The main agent never calls WebFetch directly — all external doc lookups go through the cheap explore subagent. Caps: ≤8 research-subagent invocations per audit; in audit mode, ≤15 main-agent reads + ≤30 main-agent `Grep`/`Glob` calls per pass.

>On I/O-heavy spec tasks — codebase-wide searches, deprecated library audits, doc lookups — this technique can cut costs to a third.

Available as skills for Claude Code, opencode, and GitHub Copilot.

### Executor Sub-Agent

Verbose shell commands (tests, builds, lints) are delegated to the **executor sub-agent** (running a cheap model). The executor runs the exact command as instructed — no retrying, no workarounds — and returns a structured failure report (exit code + key reason + file:line). This prevents the main agent from wasting tokens on verbose build logs or test output. Available as skills for Claude Code, opencode, and GitHub Copilot.

### Budget Sub-Agent

General-purpose task delegation (file reads, searches, writes, code analysis) is handed off to the **budget sub-agent** (running a cheap model). The budget sub-agent executes exactly one task, returns a structured completion report (`status` / `actions_taken` / `failures`), and aborts on permission blocks rather than waiting. A soft ~30-call cap prevents scope drift on multi-step work. Available as skills for Claude Code, opencode, and GitHub Copilot.

## Project highlights

### Isolation Mode
Every command starts with zero inherited context —it reads only the `<TASK>` block and the artifacts it needs. This prevents context pollution across phases, makes each run replicable, and enables safe model switching between phases.

### Spec First
Every feature starts with a change proposal (`proposal.md` + `specs/**`, produced by `/sai-1-spec` via the OpenSpec `opsx:propose` skill) capturing goals and acceptance criteria, followed by a design (`design.md`, produced by `/sai-2-design`) capturing technical constraints and design decisions. The implementation plan (`implementation.md`) is derived from those artifacts, and code follows the plan. This is [Spec-Driven Development](https://scrummanager.com/community/spec-driven-development-qu-es-de-dnde-viene-y-por-qu-importa) at the *spec-first* level — the change artifacts drive the current task and live as the source of truth for the pipeline phases that follow (review, security, performance, accessibility). No *vibe coding*: every line of generated code is grounded in an explicit contract.

### Single Responsibility Per Phase
Each phase owns a single concern. Only `sai-4-apply` writes code; spec, design, implement, review, and audits produce only markdown in `openspec/changes/{change-name}/`. No phase oversteps its scope.

### Built-In Code Quality
The pipeline enforces the same practices experienced developers rely on: build only what you need now, keep each piece focused on one thing, name things so they explain themselves, reuse what already exists, and ship the smallest change that works. The result is code that's easier to read, easier to change, and easier to trust — no matter your experience level.

### RED → GREEN
sai-3 writes production code for each step in the playbook. Test assertions come from `interfaces.md` (produced by sai-2). sai-4-apply then runs each testable step through two distinct subagents: the **first** writes the test (RED) and confirms it fails by a real assertion; a **separate second** subagent copies the production code into the project (GREEN) and makes the test pass, **without permission to modify the tests**, adjusting code only for compilation errors or test failures. This proves the test is real and not tautological — the production code is validated against an assertion it never touched.

### Ubiquitous Language via GLOSSARY.md
Domain terms are captured in a living `GLOSSARY.md` at the project root. Spec reads and appends new terms inline (no batching), Plan uses canonical terms for all new identifiers, and Review validates language consistency in the diff. This enforces a DDD-style ubiquitous language across the entire pipeline —every agent and every artifact speaks the same vocabulary.

### Multi-Pass Review (11 categories)
The review agent runs eleven distinct passes across the full diff: Domain Alignment, Correctness & Bugs, Security triage, Performance triage, Accessibility triage, Maintainability, Testing, Consistency with Codebase, Domain Language Consistency, Documentation & Migrations, and Mutation Analysis.

### Mutation Analysis
A test that runs your code without checking the result looks fine on paper but catches nothing in practice. Pass 11 deliberately breaks your code in small ways and verifies your tests actually notice — if a test still passes after the code is broken, that test isn't really testing anything. It runs automatically during review, against only the code that changed, and uses your existing mutation tool when the project has one (Stryker, PIT, mutmut, …) or falls back to the LLM itself as the mutator when it doesn't.

### No self-review bias
The review phase (`sai-5-review`) runs on a different model than the one used for planning (`sai-3-implement`). The plan agent proposes the code architecture and design decisions — having the same model later review its own output tends to confirm its own assumptions and miss the same blind spots it had when designing the solution. Using a separate model for review introduces a genuinely independent perspective — different training data, different reasoning patterns, different failure modes — which catches real issues that self-review would not.

### Deferred Verification
Human checks (browser/UI behavior, visual confirmation) are deferred to the integration step where the behavior is first observable —the plan asks the user to verify parts of the feature as early as possible, not all at the end. Every deferred check appears exactly once, labeled with its origin step.

### ADR/DDR Proposals
Proposes creating an ADR/DDR if all 3 criteria below are met:
1. **Hard to reverse** — the cost of changing later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.

### Fast-track mode (`--fast-track`)
For low-risk or high-trust runs, four commands accept a `--fast-track` argument that auto-advances their approval gates instead of stopping to ask. A `> FAST-TRACK MODE ACTIVE` banner prints at the start of the run so the relaxed gating is never silent.

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-explore` | Both language gates take their English path without asking. |
| `/sai-2-design` | Auto-approves the specs gate and records the approval in `.openspec.yaml`. |
| `/sai-4-apply` | Pre-authorizes every commit for the run and defers all human-verification checks into one combined list presented after the final sweep. |
| `/sai-archive` | Auto-proceeds the unchecked-items confirmation (always) and the delta-spec sync gate (when the implementation is applied or the change was backfilled). |

Everything else stays intact.


## Global installation (multi-project)

Commands are designed as **user globals**, not per project. A single copy in the CLI's global directory makes them available in any repo.

### Automatic npx installer (recommended)

```bash
# 1. Install shared-AI commands globally
npx github:mmadariaga/shared-ai
```

Presents an interactive checklist to select Claude Code, opencode, and/or GitHub Copilot as targets, then copies all files to the correct OS-aware destinations. If you pick opencode and its CLI isn't on PATH, the installer offers to install it for you. It also offers (once, editor-agnostic) to install the **CodeGraph** CLI and wire its MCP server — see [Third Party Tools](#third-party-tools). Both offers only prompt on a TTY; in CI they just print the command and never block the file copy.

```bash
# 2. In each project where you want to use shared-AI:
npx github:mmadariaga/shared-ai setup /path/to/your/project
```

Installs the openspec CLI if missing (offers on a TTY; prints the command in CI), runs `openspec init` if needed, sets `schema: sai-workflow` in `openspec/config.yaml`, and copies the schema templates into the project. When the CodeGraph CLI is available, it also builds the project index with `codegraph init` (skipped cleanly if CodeGraph isn't installed — it never blocks setup).

### Manual installation (alternative)

For step-by-step manual installation without npx:

- Opencode: see [INSTALL.opencode.md](INSTALL.opencode.md)
- Claude Code: see [INSTALL.claude.md](INSTALL.claude.md)
- GitHub Copilot (VS Code): see [INSTALL.copilot.md](INSTALL.copilot.md)

## Per project installation / override

Per-project commands are still possible: a file placed in a harness's project-local command folder at the repo root overrides the user-global wrapper of the same name. Globals act as a base; project-local files override them by filename.

| Harness | Project-local command folder | Overrides by filename? |
|---------|------------------------------|------------------------|
| opencode | `.opencode/commands/` | ✅ Yes |
| Claude Code | `.claude/commands/` | ✅ Yes |
| GitHub Copilot (VS Code) | `.github/prompts/` | ❌ No (see note below) |

> **⚠️ GitHub Copilot (VS Code) does not support name-based override.** VS Code discovers `.github/prompts/` (workspace scope) and `%APPDATA%\Code\User\prompts\` (user scope) as two **independent** scopes — a project-local prompt with the same name as a user-global one does **not** shadow it. Both remain discoverable (distinguished only by a source tooltip). This differs from Claude Code and opencode, where the project-local file with the same filename silently takes precedence. See [INSTALL.copilot.md](INSTALL.copilot.md#customizing-models) for VS Code-specific workarounds (renamed variant, edit-in-place, or removing the global).

Two override patterns are supported:

- **Swap a wrapper's model for one project** — copy the canonical wrapper (e.g. `sai-3-implement`) into your harness's folder above and edit its `model` field. The project-local copy takes precedence over the global.
- **Create a custom variant command** — copy the canonical wrapper into the folder under a new name (e.g. `sai-3-implement-opus`, `sai-3-implement-gpt`) and set its `model` field. This is the supported replacement for the removed upstream `-low`/`-high` implement variants.

See each harness's `INSTALL.<harness>.md` for a concrete, harness-specific example.

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

**Empty-directory pruning**: After removing tracked files, the uninstaller prunes empty ancestor directories up to the editor base directory (`~/.claude/`, `~/.config/opencode/`, or VS Code's `User/` folder). It never removes the base directory itself or files it didn't place.

**Excluded targets**: The following are **never touched** by the uninstaller:
- opencode config merges — `opencode.json` / `opencode.jsonc` are left intact
- Per-project `setup` artifacts — `openspec/config.yaml`, `openspec/schemas/sai-workflow/`
- External CLIs — `openspec`, `opencode-ai`, and `@colbymchenry/codegraph` are never uninstalled

**Version-skew guidance**: If you upgraded shared-AI and some files were updated, run `npx shared-ai install` first to sync the installed files, then `npx shared-ai uninstall` to remove them cleanly.

## Post Install

If you use opencode, modify the models for each command to match your preferred providers and personal taste.

See [INSTALL.opencode.md](INSTALL.opencode.md#post-install) for post-install steps.

### Recommended models by command and provider

We set these defaults to models that have worked best for us, you may find better alternatives for your specific needs though.

The **Copilot** column shows two model identifiers:
- *VS Code* — the model name used in `.prompt.md` frontmatter (GitHub Copilot in VS Code)
- *opencode* — the model ID used in opencode commands when routing through a Copilot subscription

| Command | Opencode | Claude Code | Copilot (VS Code) | Copilot (opencode) |
|-------|----------|-------------|-------------------|--------------------|
| explore | `opencode-go/minimax-m3` | `claude-sonnet-4-6` medium | `GPT-5.4 (copilot)` | `github-copilot/gpt-5.4` |
| spec (1) | `opencode-go/minimax-m3` | `claude-sonnet-4-6` medium | `GPT-5.4 (copilot)` | `github-copilot/gpt-5.4` |
| design (2) | `opencode-go/glm-5.2` | `claude-opus-4-8` high | `Claude Opus 4.8 (copilot)` | `github-copilot/claude-opus-4.8` |
| implement (3) | `opencode-go/kimi-k2.6` | `claude-sonnet-4-6` high | `GPT-5.3-Codex (copilot)` | `github-copilot/gpt-5.3-codex` |
| apply (4) | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `GPT-5.4 mini (copilot)` | `github-copilot/gpt-5.4-mini` |
| review (5) | `opencode-go/qwen3.7-plus` | `claude-sonnet-4-6` high | `GPT-5.4 (copilot)` | `github-copilot/gpt-5.4` |
| security (6) | `opencode-go/qwen3.7-plus` | `claude-opus-4-8` high | `GPT-5.4 (copilot)` | `github-copilot/gpt-5.4` |
| performance (7) | `opencode-go/qwen3.7-plus` | `claude-sonnet-4-6` high | `GPT-5.4 (copilot)` | `github-copilot/gpt-5.4` |
| accessibility (8) | `opencode-go/qwen3.7-plus` | `claude-sonnet-4-6` high | `GPT-5.4 (copilot)` | `github-copilot/gpt-5.4` |
| commit | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `GPT-5 mini (copilot)` | `github-copilot/gpt-5-mini` |
| pr | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `GPT-5 mini (copilot)` | `github-copilot/gpt-5-mini` |
| backfill | `opencode-go/minimax-m3` | `claude-sonnet-4-6` medium | `GPT-5.4 (copilot)` | `github-copilot/gpt-5.4` |
| archive | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `GPT-5 mini (copilot)` | `github-copilot/gpt-5-mini` |

### Choosing a model

This chart may help you identify which models to test. The intelligence axis is highly task-type-dependent — do not rely on it without running your own tests tailored to your project and specific use case.

The x-axis (cost) is usually more reliable, but again, do your own tests. Note that costs can vary depending on the provider — the same model may be priced differently across API providers, subscriptions, and regions.

![Intelligence vs Cost (Jul 2026)](Intelligence-vs-Cost-(16-Jul-'26).png)

Another ranking of models focused on front-end web development tasks: https://arena.ai/leaderboard/code/webdev

## Third Party Tools

Consider combining SAI with **[CodeGraph](https://github.com/colbymchenry/codegraph)** — a pre-indexed, 100% local code knowledge graph that exposes your codebase as an MCP server. Instead of scanning files with grep/glob/Read, agents query a SQLite symbol graph directly, cutting costs ~35%, token usage ~57%, and tool calls ~71% on average. Works with Claude Code, opencode, Cursor, Codex CLI, and more.

# Shared-AI

Software development oriented AI commands for a cost-efficient, spec-first, structured workflow:

| Phase | Steps |
|-------|-------|
| Idea | explore → spec → validation |
| Code | design → implement → apply *(or build)* |
| Quality | review → audits *(security · performance · accessibility, per review triage)* |
| Ship | archive → PR |

Built on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec): OpenSpec owns the lifecycle and artifact structure. Shared-AI owns the code, quality and cost efficiency layers.

Works great on **opencode** with an opencode-go subscription + any frontier model provider sub (Claude / GPT / OpenCode Zen).

Can also run on **Claude Code**, though it is less cost-effective there due to model availability and pricing constraints — you can combine both: use Claude Code for deep thinking phases and switch to opencode after to work around those limitations.

The supported harness roster is **Claude Code** and **opencode**. Both use routed coordinator and worker bindings for the planning phases.

## Why use this

**You stay in control.** The AI is a peer, not a decision-maker. Every phase is a conversation where you validate direction before anything gets written. You don't delegate to the AI — you collaborate with it.

**Spec first, always.** No code is written without a prior proposal and specs capturing what, why, and the acceptance criteria. The implementation plan is derived from them, and code follows the plan — the difference between AI-assisted development and vibe coding.

**Knowledge stays in the project.** Each phase writes its own artifact under `openspec/changes/{change-name}/` and `openspec/specs`. When you come back months later — or hand it off to someone else — the reasoning is already there, organized by concern instead of buried in chat history.

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
/sai-build oauth2-auth           # User-invoked implement → apply composition
                                 # → Resolves once, then applies with fast-track enabled

###########################################################################################
# Review
###########################################################################################
/sai-5-review oauth2-auth
/sai-review oauth2-auth              # User-invoked review → audit composition
                                     # → Runs review, then dispatches recommended audits

###########################################################################################
# Audits based on /sai-5-review triage (or use /sai-review to run them automatically):
###########################################################################################
/sai-6-security oauth2-auth
/sai-7-performance oauth2-auth
/sai-8-accessibility oauth2-auth

###########################################################################################
# ...iterate as needed...
# Usually /sai-3-implement & /sai-4-apply to fix review findings
###########################################################################################

/sai-archive oauth2-auth
/sai-pr oauth2-auth
```

> **Important:** open a new chat between commands:
> - **Token savings** — each phase only inherits the artifact it needs, not the full history.
> - **Clean, replicable context** — each phase starts from scratch (the harness boot preamble clears inherited context at every invocation), making it easy to debug and replay steps in isolation.
> - **Cost efficiency** — each phase uses the most cost-effective model for its task.

## Index

- [Commands](#sequential-pipeline-numbered)
- [On-demand commands](#on-demand-commands-unnumbered)
- [Closing an explore session](#closing-an-explore-session)
- [Skills](#skills)
- [Cost-Effective Strategies](#cost-effective-strategies)
- [Project highlights](#project-highlights)
- [Installation](#global-installation-multi-project)
- [Model recommendation](#recommended-models-by-command-and-provider)
- [Diagnosing an install](#diagnosing-an-install--doctor)

## Sequential pipeline (numbered)

All artifact paths below resolve under `openspec/changes/{change-name}/` (referred to as `{c}` for brevity).

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `/sai-1-spec` | feature description | `{c}/proposal.md`, `specs/**` | Describe what you want to build. The AI writes a proposal and acceptance criteria for you to review and approve — nothing else happens until you say yes. Creates only proposal/spec artifacts plus permitted glossary updates. |
| `/sai-2-design` | {change-name} | `{c}/design.md`, `tasks.md`, `interfaces.md` | Turns approved specs into a technical plan: architecture decisions, trade-offs, a concrete task list, and a per-step interface contract (`interfaces.md`) listing the new/modified public signatures and exact test assertions for each step. Ends at design completion — run `/sai-3-implement {name}` in a new chat. Supports `--fast-track` to auto-approve specs. |
| `/sai-3-implement` | {change-name} | `{c}/implementation.md` | Writes the full coding playbook — the "on-paper" implementation — to `openspec/changes/{change-name}/implementation.md`, then stops. `/sai-4-apply` follows it verbatim. |
| `/sai-4-apply` | {change-name} | code | Real implementation. Each testable step is split across two blind workers: **RED** authors the test from the `interfaces.md` assertions and confirms it fails by assertion, then **GREEN** copies the playbook code in and makes it pass — with no permission to modify the tests. Asks before each commit. Supports `--fast-track` to auto-commit and defer human checks to end-of-run. |
| `/sai-build` | {change-name} | code | Runs `/sai-3-implement` then `/sai-4-apply` in one invocation, resolving the change once with no intermediate approval gate. The chained apply segment is always fast-tracked; an explicit `--fast-track` token is a no-op. |
| `/sai-5-review` | {change-name} + diff | `{c}/review.md` | Reviews the finished code across 11 dimensions (correctness, maintainability, tests, etc.). Also tells you which specialized audits to run next based on what changed. |
| `/sai-review` | {change-name} | `{c}/review.md`, `{c}/security.md`, `{c}/performance.md`, `{c}/accessibility.md` | Runs `/sai-5-review`, parses its triage sections, and concurrently dispatches whichever audits it recommended. One invocation, one change resolution. |
| `/sai-6-security` | {change-name} + diff | `{c}/security.md` | Finds security vulnerabilities in the diff — points to exact file and line, explains the risk, and maps findings to known standards (OWASP, CVE). |
| `/sai-7-performance` | {change-name} + diff | `{c}/performance.md` | Flags real performance bottlenecks (slow queries, heavy renders, unbounded loops). Evidence-based — no guesswork. |
| `/sai-8-accessibility` | {change-name} + diff | `{c}/accessibility.md` | Checks UI code for accessibility issues against WCAG 2.2 AA. Can also run browser-based tools for deeper analysis. |

### How commands are routed

Every numbered phase runs the same shape: a **coordinator** in your main session and a **worker** dispatched as a subagent. The coordinator owns dispatch, gates, and any git mutation; the worker owns the technical work and returns metadata only — artifact contents never travel in the payload. The two have independent model roles, so a phase can think expensively and execute cheaply.

Both harnesses preserve the same durable artifacts, gate wordings, and stop texts. Claude Code and opencode differ only in dispatch mechanics and model IDs.

- `/sai-2-design` — Claude Code uses a low-effort coordinator with a high-effort design worker (`sai-2-design-worker`); opencode declares `opencode-go/deepseek-v4-flash` with `variant: max` on the wrapper. The fixed notice is acknowledged with `continue_after_notice`. Design ends at design completion — run `/sai-3-implement {name}` in a new chat. Proposal Complexity stays descriptive, never a routing gate.
- `/sai-3-implement` — the worker writes the full coding playbook to `openspec/changes/{change-name}/implementation.md`; `/sai-4-apply` follows it and copies each step's code verbatim, adjusting only for compilation errors or test failures.
- `/sai-4-apply` — the coordinator never edits code. It dispatches the RED and GREEN workers on the budget tier, re-verifies each result, prints a pre-commit files-modified report cross-checked against `tasks.md`, and asks before each commit.
- `/sai-commit`, `/sai-merge` — same shape without any openspec dependency. The worker drafts, the coordinator alone runs git.

> Full routing internals — envelopes, bindings, worker matrix, per-phase ownership boundaries — live in [AGENTS.md](AGENTS.md), not here.


## On-demand commands (unnumbered)

| Command | Purpose |
|---------|---------|
| `/sai-explore` | Open-ended thinking session before committing to anything — good for fuzzy requirements, unclear trade-offs, or when you just want to think out loud with the AI. When a feature is too big for one reviewable change, it slices the idea into a Walking Skeleton plus a dependency-ordered backlog, each ready to enter the pipeline as its own change; when it detects friction at the integration point (mixed responsibilities, no clean extension seam), it prepends a behavior-preserving SOLID refactor as *slice 0* so the feature attaches by extension. When it hits genuine technical uncertainty it can first run a throwaway POC to answer it. On close it offers three routes — see [Closing an explore session](#closing-an-explore-session). In Manual mode it also offers a review loop over the changes tracked in the session. Supports `--fast-track` to skip the language gates. |
| `/sai-build` | User-invoked shortcut for a complete implementation run — chains `/sai-3-implement` into `/sai-4-apply` with one change resolution and no intermediate approval. Apply fast-track is always injected; an explicit `--fast-track` token is a no-op. |
| `/sai-review` | User-invoked shortcut for review plus conditional audit fan-out — runs `/sai-5-review` and then dispatches the recommended audits (`/sai-6-security`, `/sai-7-performance`, `/sai-8-accessibility`) in one invocation based on the triage parse. An explicit `--fast-track` token is a no-op. |
| `/sai-commit` | Reads your staged changes and detects the repo's commit style from the last 20 commits (Conventional Commits shape, type/scope vocabulary, body conventions). Adopts the detected vocabulary when it fits, falls back to hard-coded rules otherwise. Shows a pre-commit file report and runs `git commit` only after you explicitly approve. |
| `/sai-merge` | Merges a local branch into the current branch with conflict-triggered language selection and an iterative, global resolution strategy: after conflicts are detected it asks for the working language, presents worker analysis as text, routes closed decisions through the native picker, and lets you request context or correct the complete plan before any write. It preserves complete alternatives, safe-synthesis rules, new-conflict re-entry, and an incremental ADR/DDR collision pass scoped to source-branch records introduced by the merge, verification loop (up to 3 rounds), coordinator-only mutations, and explicit final-commit authorization. Clean merges never ask for a language or strategy; `--fast-track` bypasses only the scope gate. |
| `/sai-pr` | Drafts a complete PR description using everything produced during the change (proposal, design, review findings, etc.). Opens the PR on GitHub after you approve. |
| `/sai-archive` | Routed command: the coordinator runs in the main session and dispatches the `sai-archive-worker` managed worker for the read-only pre-flight. The ordinary route keeps mutation in the coordinator; the Direct Build (unattended) route gives the existing worker a validated, explicitly authorized sync/move/stage/commit order. Moves a completed change to the archive, keeping your active changes folder clean. Supports `--fast-track` to auto-proceed the archive soft gates. |
| `/sai-status` | Read-only progress panel — shows which of the eleven sai-workflow artifacts exist, the specs approval state, implementation progress, the archive location if archived, and a `Next:` hint suggesting the appropriate `/sai-N` command. Takes a change name for a single-change panel, or none for a table over every active change. Never writes anything. |
| `/sai-worktree` | Interactive git worktree manager — inventory, create, and delete linked worktrees with a Create/Delete/Exit selector loop. Names follow one convention: the `<main-dir>.worktree-<n>` sibling directory maps to the `worktree-<n>` branch, and `n` is the first free slot. Creating one also runs a best-effort `codegraph init` in it. No OpenSpec prerequisites. |
| `/sai-retire-docs` | Read-only, index-driven analysis of active ADRs, DDRs, and related specifications. Correlates bounded evidence, classifies candidates, and asks for explicit per-candidate confirmation before any archival move. |
| /sai-backfill | Routed command: the coordinator runs in the main session and dispatches the sai-backfill-worker managed worker for inspection, interview, conflict scan, and draft composition, then validates the drafts against the sai-workflow schema. The ordinary route writes them in the coordinator; Direct Build (unattended) sends a validated, explicitly authorized draft order to the same worker. Made a quick fix directly in code without going through the pipeline? This reconstructs the missing documentation after the fact - interviewing you about intent and writing only what can be reliably derived from the diff. |

## Closing an explore session

When `/sai-explore` finishes crystallizing an idea it presents three routes. Nothing is dispatched until you pick one — this selector is the gate that authorizes delegated writes, and `--fast-track` cannot skip it.

| Option | What happens |
|--------|--------------|
| **Plan - Unattended** | Runs `sai-1` and `sai-2` back to back and stops for your pre-implementation review. Bounded auto-answering handles routine worker questions; anything ambiguous escalates to you, and every auto-answer is announced inline. |
| **Direct Build - Unattended** | Code first, specs after: implements the change directly, runs a bounded functional fix loop, then reconstructs `proposal.md` and the capability specs from the diff, validates them against the schema, and archives with one pre-authorized local commit. Never pushes. Ideal for fixes and simple changes. |
| **Manual** | Dispatches nothing. Hands you the `Ready to Propose` block to paste into a new chat with `/sai-1-spec`. Full control. |

If the idea was sliced, the selector reappears after each slice completes — a per-slice authorization gate rather than one blanket approval.

When explore detects genuine technical uncertainty (an unproven third-party integration with insufficient docs), it first offers a throwaway **POC**: a Direct Build run that implements and checks viability only, touching nothing under `openspec/` and running no mutating git. You get a viable / not-viable answer, then decide.

## Triage in `/sai-5-review`

`/sai-5-review` does not perform deep SAST, profiling, or axe analysis. It detects the touched surface and recommends the specific audit:

- **Security surface** (auth, input parsing, dynamic queries, crypto, HTTP boundary, deps, logging) → `/sai-6-security`
- **Performance surface** (new queries, endpoints, consumers, hot components, deps, loops over unbounded input, caching) → `/sai-7-performance`
- **Accessibility surface** (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`) → `/sai-8-accessibility`

All audits are diff-scoped by default vs parent branch. Support `--full` or `--path {dir}` to expand scope.

## Skipping the full SAI workflow while keeping specs updated

The full SAI workflow can be overkill for small changes.

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
| `budget-explorer` | Low-cost agent for research, exploration, and doc-lookup tasks. Claude Code resolves model selection from the matching `budget-explorer.md` agent file (`~/.claude/agents/budget-explorer.md`, project-local `.claude/agents/budget-explorer.md` wins) via the `budget-explorer` dispatch literal with no per-spawn model; opencode resolves from the managed `explore.md` agent file (`~/.config/opencode/agents/explore.md`). Enforces a 30-call maximum and output contracts (exact fields, length cap, no raw content). | `"budget explorer"`, `"cheap explorer"` |
| `budget-executor` | Low-cost agent for running commands, tests, and build checks. Claude Code resolves model selection from the matching `budget-executor.md` agent file (`~/.claude/agents/budget-executor.md`, project-local `.claude/agents/budget-executor.md` wins) via the `budget-executor` dispatch literal with no per-spawn model; opencode resolves from the managed `executor.md` agent file (`~/.config/opencode/agents/executor.md`). Enforces execute-only discipline: exact commands, no self-correction, minimal output, structured failure reports. No tool-call cap. | `"budget executor"`, `"cheap executor"` |
| `budget-subagent` | Low-cost agent for general-purpose task delegation — file reads, searches, writes, code analysis. Claude Code resolves model selection from the matching `budget-subagent.md` agent file (`~/.claude/agents/budget-subagent.md`, project-local `.claude/agents/budget-subagent.md` wins) via the `budget-subagent` dispatch literal with no per-spawn model; opencode resolves from the managed `budget.md` agent file (`~/.config/opencode/agents/budget.md`). Enforces single-task discipline: structured completion report, ~30-call soft cap, no raw output. | `"budget subagent"`, `"cheap subagent"`, `"budget task"` |
| `budget` | Loads all budget skills simultaneously (`budget-explorer` + `budget-executor` + `budget-subagent` + `token-efficient-languages`). Activates full cost-discipline for the session. | `"budget mode"`, `"cheap mode"`, `"low-cost mode"`, `"economy mode"` |

## Cost-Effective Strategies

Every phase in this pipeline is optimized to minimize token consumption without sacrificing quality.

### Token-Efficient Languages

All agents think and reason internally in English, regardless of the user's input language. English tokenizers produce fewer tokens per unit of meaning than most other languages [—non-English languages can cost 2–3× more tokens for the same meaning](https://x.com/arankomatsuzaki/status/2049125048792006965). This keeps reasoning efficient while user-facing chat always responds in the user's own language (Spanish, French, German, etc.). All generated artifacts (`proposal.md`, `design.md`, `implementation.md`, `review.md`, code, commit messages, PRs) are written in English.

### Task-Matched Model Selection
Each phase uses a model chosen for its specific strengths: the design and security phases use the strongest model; spec, implement, review, performance, and accessibility use balanced mid-range models; apply, build, commit, PR, and archive use fast, cost-efficient models. See the [Recommended models by command](#recommended-models-by-command-and-provider) table below.

### Explore Sub-Agent
Research or exploratory tasks are delegated to **sub-agents running cost-effective models** matched to the subtask complexity. By default, sub-agents do not inherit the main session's token window, keeping costs predictable. Each subagent call declares an **output contract** (exact fields, length cap, no raw content) so only distilled signal enters the main context. The main agent never calls WebFetch directly — all external doc lookups go through the cheap explore subagent. Caps: ≤8 research-subagent invocations per audit; in audit mode, ≤15 main-agent reads + ≤30 main-agent `Grep`/`Glob` calls per pass.

In Claude Code, the explorer is a single tier with a **30 tool-call maximum** per spawn, its model selected by the matching `budget-explorer.md` agent file, and multi-step synthesis retained by the main agent. Opencode keeps its own mechanism — the `explore` keyword binding with the model from the explore agent file.

>On I/O-heavy spec tasks — codebase-wide searches, deprecated library audits, doc lookups — this technique can cut costs to a third.

Available as skills for Claude Code and opencode.

### Executor Sub-Agent

Verbose shell commands (tests, builds, lints) are delegated to the **executor sub-agent** (running a cheap model). The executor runs the exact command as instructed — no retrying, no workarounds — and returns a structured failure report (exit code + key reason + file:line). This prevents the main agent from wasting tokens on verbose build logs or test output. Available as skills for Claude Code and opencode.

### Budget Sub-Agent

General-purpose task delegation (file reads, searches, writes, code analysis) is handed off to the **budget sub-agent** (running a cheap model). The budget sub-agent executes exactly one task, returns a structured completion report (`status` / `actions_taken` / `failures`), and aborts on permission blocks rather than waiting. A soft ~30-call cap prevents scope drift on multi-step work. Available as skills for Claude Code and opencode.

## Project highlights

### Spec First, and Beyond
The change artifacts are the source of truth for the entire pipeline: `proposal.md` + `specs/**` (from `/sai-1-spec`) capture goals and acceptance criteria; `design.md` captures technical constraints and trade-offs, while `tasks.md` lists the concrete atomic work to do; `interfaces.md` defines the exact public signatures and per-step test assertions; and `implementation.md` is derived from all of them, with code following the plan. The trio of `/sai-1-spec` → `/sai-2-design` → `/sai-3-implement` guarantees every line of generated code is grounded in an explicit contract — no *vibe coding*. This is Spec-Driven Development.

### Built-In Code Quality
The pipeline enforces the same practices experienced developers rely on: build only what you need now, keep each piece focused on one thing, name things so they explain themselves, reuse what already exists, favor extension over modification (the open-closed principle), and ship the smallest change that works. Every acceptance criterion in the specs is backed by a test that must pass before the step is considered done — no behavior ships unverified. The result is code that's easier to read, easier to change, and easier to trust — no matter your experience level.

### No self-review bias
The review phase (`sai-5-review`) runs on a different model than the one used for planning (`sai-3-implement`). The plan agent proposes the code architecture and design decisions — having the same model later review its own output tends to confirm its own assumptions and miss the same blind spots it had when designing the solution. Using a separate model for review introduces a genuinely independent perspective — different training data, different reasoning patterns, different failure modes — which catches real issues that self-review would not.

### Multi-Pass Review (11 categories)
The review agent runs eleven distinct passes across the full diff: Domain Alignment, Correctness & Bugs, Security triage, Performance triage, Accessibility triage, Maintainability, Testing, Consistency with Codebase, Domain Language Consistency, Documentation & Migrations, and Mutation Analysis.

### RED → GREEN
For every testable step, the test is written first (RED) and run against the not-yet-implemented function — so it fails because the behavior is missing, not because of a setup bug. A separate agent then writes the implementation to make the test pass (GREEN), with **no permission to modify the tests** — no cheating. The production code ends up validated against an assertion it never touched.

### Deferred Human Verification
Human checks (browser/UI behavior, visual confirmation) are deferred to the integration step where the behavior is first observable —the plan asks the user to verify parts of the feature as early as possible, not all at the end. Every deferred check appears exactly once, labeled with its origin step.

### Mutation Analysis
A test that runs your code without checking the result looks fine on paper but catches nothing in practice. Pass 11 deliberately breaks your code in small ways and verifies your tests actually notice — if a test still passes after the code is broken, that test isn't really testing anything. It runs automatically during review, against only the code that changed, and uses a declared deterministic mutation tool (Stryker, PIT, mutmut, …). For this repository, run the checked-in Stryker workflow with `npm run test:mutation`; use `npm run test:mutation:smoke` for the isolated focused engine check. Review passes its exact diff-scoped paths through the engine. If no supported tool is available, review reports that fact and continues without mutation findings; it never simulates mutation results through inference.

### Deterministic tools, not re-derived prose

Decisions that must be identical every run were moved out of prompt prose into small Node tools under `sai/tools/`, projected into both harnesses. The tool decides; the command prose asks the questions and owns the wording. That covers the OpenSpec prerequisite preflight, change-name resolution, the `/sai-status` panel and table, the `/sai-worktree` state machine, `/sai-commit` and `/sai-pr` git mechanics, artifact-format linting, findings-block validation, delta-header checks, and the no-commit guard below. Each exits `0` on success, `1` on refusal, `2` on usage error, and speaks JSON.

### No-commit guard

Worker instructions say "never run a mutating git command", but prose is not enforcement. The guard turns the one invariant true in every project — HEAD must not move across a worker dispatch — into a filesystem check: a snapshot before each dispatch, a verify after each result. If HEAD moved without authorization the coordinator captures the evidence, resets back to the recorded base, prints one incident line, and continues. Exactly one flow carries permission for HEAD to move: the archive worker's pre-authorized Direct Build commit.

### ADR Proposals
Proposes creating an ADR/DDR if all 3 criteria below are met:
1. **Hard to reverse** — the cost of changing later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.

### Isolation Mode
Every command starts with zero inherited context — the boot adapter opens each invocation with a clean-session preamble, so a command reads only its instruction cards and the artifacts it needs. This prevents context pollution across phases, makes each run replicable, and enables safe model switching between phases.

### Ubiquitous Language via GLOSSARY.md
Domain terms are captured in a living `GLOSSARY.md` at the project root. Spec reads and appends new terms inline (no batching), Plan uses canonical terms for all new identifiers, and Review validates language consistency in the diff. This enforces a DDD-style ubiquitous language across the entire pipeline —every agent and every artifact speaks the same vocabulary.

### Fast-track mode (`--fast-track`)
For low-risk or high-trust runs, six commands accept a `--fast-track` argument that auto-advances their approval gates instead of stopping to ask. A `> FAST-TRACK MODE ACTIVE` banner prints at the start of the run so the relaxed gating is never silent. `/sai-build` and `/sai-review` are not members: each strips an explicit `--fast-track` token as a no-op — build always injects fast-track for its chained apply segment, and review owns no questions of its own.

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-explore` | Both language gates take their English path without asking. |
| `/sai-2-design` | Auto-approves the specs gate and records the approval in `.openspec.yaml`. |
| `/sai-4-apply` | Pre-authorizes every commit for the run, defers all human-verification checks into one combined list presented after the final sweep, and auto-stays on the current branch. |
| `/sai-archive` | Auto-proceeds the unchecked-items confirmation. |
| `/sai-backfill` | Skips the generated reconciliation questions, auto-proceeds the spec-conflict gate after reporting it verbatim, and accepts a crystallized `**Change name**` without confirming. |
| `/sai-merge` | Applies the full resolution scope without the scope gate. Clean merges never ask anything either way. |

Everything else stays intact. Fast-track never suppresses a safe-operations confirmation, never skips an input question (a missing diff-source token still asks), and never bypasses `/sai-explore`'s close selector or its POC go/no-go — the gates that authorize delegated writes are deliberately outside its reach.

## Upgrade Notice

> **Existing GitHub Copilot users must run the current uninstall command before upgrading.** Skipping uninstall may leave orphaned Copilot files behind. The new supported installer and uninstaller intentionally do not clean those files.

## Global installation (multi-project)

Commands are designed as **user globals**, not per project. A single copy in the CLI's global directory makes them available in any repo. Maintained phase assets use the grouped `sai/commands/{spec,design,implement,apply}/` command-card trees; the `/sai-build` composition uses `sai/commands/meta-build/command-bootstrap.md` and `coordinator.md`.

### Shared Orchestration Core

Claude Code and opencode use the shared Orchestration Core under `sai/orchestration/`: common coordinator and worker lifecycle contracts plus mirrored harness bindings for spec, design, and implement. Their grouped phase cards live under `sai/commands/{spec,design,implement}/`, the build composition cards live under `sai/commands/meta-build/`, their reusable policies live under `sai/policies/`, their deterministic Node tools live under `sai/tools/`, and their bindings are installed as separate projections. Both harnesses preserve the same durable artifacts and command contracts.

The installer expands `sai/install-manifest.json` deterministically. Install, `doctor`, and uninstall consume that same manifest, so the allowlisted files, destination projections, content-drift checks, and safe removal behavior stay aligned across Claude Code and opencode. The canonical project-agnostic ADR and DDR index templates are `sai/commands/implement/adr-index.template.md` and `sai/commands/implement/ddr-index.template.md`; the recursive `sai-commands` projection installs command-local instructions and co-located `.template.md` files for both supported harnesses, and it also covers the shared overview-generation instruction at `sai/commands/design/change-overview.md` and both index templates, each owned by the single command that consumes it. The manifest also owns retirement records for removed managed destinations, including `retired-adr-index-template`: historical copies are deleted only on a registered SHA-256 hash match, while modified or unrecognized copies remain untouched and are reported for manual cleanup. Retired records are cleanup evidence, not active dependencies. The `sai-agents-index` root-class projection additionally writes `SAI_AGENTS.md` — a project-agnostic orientation index over the four SAI documentation surfaces — to each harness root, inheriting doctor missing-file detection, drift detection, and uninstall cleanup.

### Automatic npx installer (recommended)

```bash
# 1. Install shared-AI commands globally
npx github:mmadariaga/shared-ai
```

Presents an interactive checklist to select Claude Code and/or opencode as targets, then expands `sai/install-manifest.json` into deterministic OS-aware projections. If you pick opencode and its CLI isn't on PATH, the installer offers to install it for you. It also offers (once, editor-agnostic) to install the **CodeGraph** CLI and wire its MCP server — see [Third Party Tools](#third-party-tools). Both offers only prompt on a TTY; in CI they just print the command and never block the file copy.

```bash
# 2. In each project where you want to use shared-AI:
npx github:mmadariaga/shared-ai setup /path/to/your/project
```

Installs the openspec CLI if missing (offers on a TTY; prints the command in CI), runs `openspec init` if needed, sets `schema: sai-workflow` in `openspec/config.yaml`, and copies the schema templates into the project. When the CodeGraph CLI is available, it also builds the project index with `codegraph init` (skipped cleanly if CodeGraph isn't installed — it never blocks setup).

## Per project installation / override

Per-project commands are still possible: a file placed in a supported harness's project-local command folder at the repo root overrides the user-global wrapper of the same name. Globals act as a base; project-local files override them by filename.

| Harness | Project-local command folder | Overrides by filename? |
|---------|------------------------------|------------------------|
| opencode | `.opencode/commands/` | ✅ Yes |
| Claude Code | `.claude/commands/` | ✅ Yes |

Two override patterns are supported:

- **Swap a wrapper's model for one project** — copy the canonical wrapper (e.g. `sai-3-implement`) into your harness's folder above and edit its `model` field. The project-local copy takes precedence over the global.
- **Create a custom variant command** — copy the canonical wrapper into the folder under a new name (e.g. `sai-3-implement-opus`, `sai-3-implement-gpt`) and set its `model` field. This is the supported replacement for the removed upstream `-low`/`-high` implement variants.

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

`npx github:mmadariaga/shared-ai setup` ends with an interactive **Customize models** menu. It walks provider → model → variant per target and writes project-local overrides, so you can retune a phase without editing any wrapper by hand. Pick `Exit` to keep the shipped defaults.

To change a model by hand instead, copy the wrapper into your harness's project-local command folder and edit its `model` field — project-local wins over user-global by filename. Opencode declares model and variant on the wrapper itself; no named coordinator agent is shipped for either harness.

### Recommended models by command and provider

We set these defaults to models that have worked best for us, you may find better alternatives for your specific needs though.

| Command | Opencode | Variant | Claude Code |
|-------|----------|---------|-------------|
| explore | `opencode-go/deepseek-v4-flash` | `max` | `sonnet` - medium |
| spec (1) | `opencode-go/deepseek-v4-flash`; worker `sai-1-spec-proposal-worker` | `max` | coordinator `opus` - medium; worker `opus` - medium |
| design (2) | `opencode-go/deepseek-v4-flash`; worker `sai-2-design-worker` | `max` | coordinator `opus` - medium; worker `opus` - high |
| implement (3) | `opencode-go/deepseek-v4-flash` | `max` | coordinator `opus` - low; worker `opus` - medium |
| apply (4) | `opencode-go/deepseek-v4-flash` | `max` | `sonnet` - low |
| build | `opencode-go/deepseek-v4-flash` | `max` | `opus` - low |
| review (5) | `opencode-go/qwen3.7-plus` | | `opus` - medium |
| sai-review | `opencode-go/deepseek-v4-flash` | `max` | `opus` - low |
| security (6) | `opencode-go/qwen3.7-plus` | | `opus` - xhigh |
| performance (7) | `opencode-go/qwen3.7-plus` | `high` | `opus` - medium |
| accessibility (8) | `opencode-go/qwen3.7-plus` | `high` | `opus` - medium |
| backfill | `opencode-go/minimax-m3` | | `sonnet` - medium |
| commit | `opencode-go/deepseek-v4-flash` | `default` | `haiku` |
| merge | `opencode-go/deepseek-v4-flash` | `default` | `haiku` |
| pr | `opencode-go/deepseek-v4-flash` | | `haiku` |
| archive | `opencode-go/deepseek-v4-flash` | | `haiku` |
| status | `opencode-go/deepseek-v4-flash` | | `haiku` |
| retire-docs | `opencode-go/deepseek-v4-flash` | | `haiku` |
| worktree | `opencode-go/deepseek-v4-flash` | | `haiku` |

### Choosing a model

This chart may help you identify which models to test. The intelligence axis is highly task-type-dependent — do not rely on it without running your own tests tailored to your project and specific use case.

The x-axis (cost) is usually more reliable, but again, do your own tests. Note that costs can vary depending on the provider — the same model may be priced differently across API providers, subscriptions, and regions.

![Intelligence vs Cost (Jul 2026)](Intelligence-vs-Cost-(27-Jul-'26).png)

Another ranking of models focused on front-end web development tasks: https://arena.ai/leaderboard/code/webdev

## Third Party Tools

Consider combining SAI with **[CodeGraph](https://github.com/colbymchenry/codegraph)** — a pre-indexed, 100% local code knowledge graph that exposes your codebase as an MCP server. Instead of scanning files with grep/glob/Read, agents query a SQLite symbol graph directly, cutting costs ~35%, token usage ~57%, and tool calls ~71% on average. Works with Claude Code, opencode, Cursor, Codex CLI, and more.

## Diagnosing an install — `doctor`

Run a read-only health check of your shared-ai install across Claude Code and
opencode plus the project's OpenSpec state:

    npx github:mmadariaga/shared-ai doctor

It reports, per harness (Claude Code, opencode): manifest-allowlisted
missing/unexpected files, content drift, dangling `Fetch @` references, and
version skew against `main`; plus a
`[Project health]` section (openspec binary, `openspec/` dir, `schema: sai-workflow`)
and OpenSpec-skill staleness. It never changes anything — it only recommends
fixes (re-run the installer, `openspec init`).

- Exit code `0` when green, `1` when any error-severity check fails (CI-usable).
- Add `--json` for machine-readable output.

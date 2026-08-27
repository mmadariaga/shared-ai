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
- [Skills](#skills)
- [Cost-Effective Strategies](#cost-effective-strategies)
- [Project highlights](#project-highlights)
- [Installation](#global-installation-multi-project)
- [Model recommendation](#recommended-models-by-command-and-provider)

## Sequential pipeline (numbered)

All artifact paths below resolve under `openspec/changes/{change-name}/` (referred to as `{c}` for brevity).

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `/sai-1-spec` | feature description | `{c}/proposal.md`, `specs/**` | Describe what you want to build. Claude Code and opencode route through the shared spec coordinator and worker. Both paths consume the canonical `sai/policies/spec-phase-contract.md`, create only proposal/spec artifacts plus permitted glossary updates, and preserve the summary, feedback, and stop behavior. The AI writes a proposal and acceptance criteria for you to review and approve — nothing else happens until you say yes. Same-harness parity evidence is required. |
| `/sai-2-design` | {change-name} | `{c}/design.md`, `tasks.md`, `interfaces.md` | Turns approved specs into a technical plan: architecture decisions, trade-offs, a concrete task list, and a per-step interface contract (`interfaces.md`) listing the new/modified public signatures and exact test assertions for each step. Claude Code routes through a low-effort Opus 4.8 coordinator and high-effort Opus 4.8 design worker; opencode uses the wrapper-declared GLM 5.2 model ID `opencode-go/glm-5.2`, `variant: high`, and worker `sai-2-design-worker`. The fixed notice is acknowledged with `continue_after_notice`, and `/sai-2-design` ends at design completion. Run `/sai-3-implement {name}` separately in a new chat. Proposal Complexity remains descriptive, not a routing gate. Supports `--fast-track` to auto-approve specs. |
| `/sai-3-implement` | {change-name} | `{c}/implementation.md` | Claude Code uses a low-effort Opus 4.8 coordinator and a medium-effort Opus 4.8 background planning worker; opencode uses the wrapper-declared GLM 5.2 model and the `sai-3-implementation-worker` planning worker. Both paths preserve `openspec/changes/{change-name}/implementation.md` and the MANDATORY STOP. The worker writes the full coding playbook, while `/sai-4-apply` follows it and copies each step's code verbatim, adjusting only for compilation errors or test failures. |
| `/sai-4-apply` | {change-name} | code | Routed command: Claude Code and opencode run the coordinator in the main session (a **coordinator** that never edits code itself) and dispatch the **RED** and **GREEN** managed workers on the budget tier — one Step-execution worker per dispatch, with a testable step split across two dispatches: the RED worker authors the test (from the assertions in `interfaces.md`, blind to the implementation body) and confirms it fails by assertion, then the GREEN worker copies the playbook code into the project and makes the test pass **without permission to modify the tests**, adjusting code only for compilation errors or test failures. The coordinator re-verifies each result, prints a pre-commit files-modified report cross-checked against `tasks.md`, and asks for your approval before each commit. Supports `--fast-track` to auto-commit and defer human checks to end-of-run. |
| `/sai-build` | {change-name} | code | User-invoked routed composition that runs `/sai-3-implement` and then `/sai-4-apply` in exactly that order. It resolves the change once, has no intermediate approval gate, and reuses the existing apply adapter rather than re-declaring RED/GREEN or adding a build worker. The chained apply segment is always fast-tracked; an explicit `--fast-track` token is accepted only as a no-op. Claude Code and opencode preserve the same phase order, artifacts, worker ownership, and terminal behavior. |
| `/sai-5-review` | {change-name} + diff | `{c}/review.md` | Reviews the finished code across 11 dimensions (correctness, maintainability, tests, etc.). Also tells you which specialized audits to run next based on what changed. |
| `/sai-review` | {change-name} | `{c}/review.md`, `{c}/security.md`, `{c}/performance.md`, `{c}/accessibility.md` | User-invoked routed composition that runs `/sai-5-review` and then conditionally dispatches the recommended audits (`/sai-6-security`, `/sai-7-performance`, `/sai-8-accessibility`) in one invocation. It resolves the change once, parses the triage sections from the regenerated `review.md`, and concurrently dispatches eligible audit workers. Claude Code and opencode preserve the same phase order, artifacts, worker ownership, and terminal behavior. |
| `/sai-6-security` | {change-name} + diff | `{c}/security.md` | Finds security vulnerabilities in the diff — points to exact file and line, explains the risk, and maps findings to known standards (OWASP, CVE). |
| `/sai-7-performance` | {change-name} + diff | `{c}/performance.md` | Flags real performance bottlenecks (slow queries, heavy renders, unbounded loops). Evidence-based — no guesswork. |
| `/sai-8-accessibility` | {change-name} + diff | `{c}/accessibility.md` | Checks UI code for accessibility issues against WCAG 2.2 AA. Can also run browser-based tools for deeper analysis. |

### Implementation coordinator and worker

The routed Claude Code and opencode paths pass a two-field `InvocationEnvelope`: `command_name` as card-selection metadata and `arguments_value` as the complete opaque request. The coordinator and worker have independent model roles: the coordinator owns dispatch and lifecycle aggregation, while the worker receives that request, owns technical I/O and planning writes, and returns metadata-only lifecycle payloads (`status`, `summary`, and `changed_files`, plus the input fields required for `needs_input`). Payloads never contain `implementation.md` contents.

For `needs_input`, the active harness binding forwards the selected value through `continuation_reference` to the same worker. If same-worker continuation fails, the binding starts one fresh worker with the original envelope and a reconstruction instruction so the worker can rebuild from current durable artifacts. Every routed path preserves the durable artifact at `openspec/changes/{change-name}/implementation.md` and the explicit MANDATORY STOP completion boundary.

Claude Code also manages the worker agent under the tunable-seed lifecycle: the user's `model` and `effort` tunables are preserved on every install while the managed body and non-tunable frontmatter are overwritten with a console notice when they diverge. Opencode merges the namespaced worker entries into existing configuration without replacing incompatible or unrelated configuration.

### Apply coordinator and worker

Claude Code and opencode route `/sai-4-apply` through the routed apply card set — `sai/commands/apply/coordinator.md`, `runner.md`, `invocation.md`, and the RED/GREEN worker contracts — and dispatch the `sai-4-red-worker` / `sai-4-green-worker` managed workers on the budget tier. The coordinator stays the executing main-session driver: it performs change resolution, the run-start Step Projection, coordinator verification, human gates, appendices, and commits itself, while the RED worker authors the tests (blind to the GREEN implementation body in the split flow, and authoring green tests under the green-exception) and the GREEN worker implements with an absolute test-file prohibition. Both harnesses preserve the same `openspec/changes/{change-name}/implementation.md` artifact contract and the MANDATORY STOP completion boundary.

### Build coordinator and worker

`/sai-build` is a user-invoked routed composition command, not an `opsx:*` skill. Its internal routed identity is `meta-build` (`command_name: meta-build`). Claude Code and opencode use the routed build cards `sai/commands/meta-build/command-bootstrap.md` and `sai/commands/meta-build/coordinator.md`. The build coordinator is an ordinary composition supervisor that runs exactly two adapters in order: the existing implementation coordinator, then the existing apply adapter. It resolves the change once, does not re-enter either harness wrapper, and transitions immediately without an intermediate approval gate. Build does not declare a build-specific worker or re-declare RED/GREEN; after activation, the apply adapter remains the sole owner of `sai-4-red-worker` / `sai-4-green-worker` selection. The coordinator always injects apply fast-track, owns the single activation banner, and treats an explicit `/sai-build --fast-track` token as a no-op. Claude Code uses `opus` with low effort; opencode uses `opencode-go/deepseek-v4-flash` with `variant: max`. Both harnesses preserve the same phase order, changed-files union, durable artifacts, worker ownership, and terminal navigation.

### Spec coordinator and worker

Claude Code and opencode route `/sai-1-spec` through the shared spec coordinator and worker, consuming the canonical `sai/policies/spec-phase-contract.md` and its mirrored worker bindings. Claude Code preserves the `opus`/medium wrapper and uses a medium-effort Opus 4.8 worker; opencode uses `opencode-go/minimax-m3` and `sai-1-spec-proposal-worker`. The shared path creates only `proposal.md` and `specs/**`, plus permitted glossary updates, and preserves the summary, feedback, and MANDATORY STOP behavior. Same-harness parity evidence is required across the supported harnesses.

### Design coordinator and worker

The routed `/sai-2-design` paths use a low-effort Opus 4.8 coordinator and high-effort Opus 4.8 design worker in Claude Code. Opencode uses the wrapper-declared `opencode-go/glm-5.2` with `variant: high` and the numbered `sai-2-design-worker`; `/sai-2-design` ends at design completion, and `/sai-3-implement {name}` is a separate command in a new chat. The fixed notice is acknowledged with `continue_after_notice`. The opencode routed phases run under your active primary agent; it must permit native question and task dispatch to the numbered SAI workers. The stock build agent satisfies this. If a restrictive primary agent is active, switch to a permissive one (e.g. build) — do not reintroduce a managed coordinator profile. Both harnesses preserve `openspec/changes/{change-name}/design.md`, `tasks.md`, and `interfaces.md`. Proposal Complexity remains descriptive rather than a routing gate.

### Commit coordinator and worker

`/sai-commit` uses the same coordinator/worker shape without an openspec dependency: the `sai-commit-worker` managed worker authors the proposed message from your staged changes (faithfulness to `git diff --cached`, repo-style detection, pre-commit file report) and returns it as payload content, while the authorization ask travels as a structured question the coordinator presents through the native picker. On approval, the coordinator alone executes the `git commit` (`--amend` supported); the worker never runs `git add` or `git commit`. Both harnesses preserve the same payloads, stop texts, and git surface.

### Archive coordinator and worker

`/sai-archive` uses the same coordinator/worker shape with full openspec prerequisite checks intact: the `sai-archive-worker` managed worker performs the read-only pre-flight (artifact classification, checkbox scan, delta-sync diffing against main specs, target-name collision check) and returns the unchecked-items gate as a structured question the coordinator presents through the native picker. On the ordinary route, the coordinator alone executes every mutation. The Direct Build (unattended) route instead validates and authorizes a closed execution order, then the same archive worker owns the exact sync, archive move, owned staging, and pre-authorized local commit; it never acts before the explicit execute continuation. Both harnesses preserve the same payloads, gate wordings, stop texts, and fast-track auto-proceed semantics.

### Backfill coordinator and worker

`/sai-backfill` uses the same coordinator/worker shape for retroactive documentation: the `sai-backfill-worker` managed worker runs the technical flow (diff-source selection, diff computation, optional intent capture with in-memory reconciliation, the fixed interview, delegated `budget-explorer` conflict scanning) and interviews you through structured questions the coordinator presents - closed choices through the native picker, open-ended questions as plain conversation text. Draft artifacts travel as payload text; the coordinator validates them against the sai-workflow schema. On the ordinary route it alone writes the artifacts; the Direct Build (unattended) route sends the validated draft order back through an explicit execute continuation and the same worker owns only those exact writes. Both harnesses preserve the interview question wordings, gate semantics, schema-validation rules, and budget-explorer output contracts.

## On-demand commands (unnumbered)

| Command | Purpose |
|---------|---------|
| `/sai-explore` | Open-ended thinking session before committing to anything — good for fuzzy requirements, unclear trade-offs, or when you just want to think out loud with the AI. When a feature is too big for one reviewable change, it slices the idea into a Walking Skeleton plus a dependency-ordered backlog, each ready to enter the pipeline as its own change; when it detects friction at the integration point (mixed responsibilities, no clean extension seam), it prepends a behavior-preserving SOLID refactor as *slice 0* so the feature attaches by extension. After crystallizing, it offers a review loop over your active changes — pick a change, review its `sai-1` or `sai-2` artifacts. Supports `--fast-track` to skip language gate. |
| `/sai-build` | User-invoked shortcut for a complete implementation run — chains `/sai-3-implement` into `/sai-4-apply` with one change resolution and no intermediate approval. Apply fast-track is always injected; an explicit `--fast-track` token is a no-op. |
| `/sai-review` | User-invoked shortcut for review plus conditional audit fan-out — runs `/sai-5-review` and then dispatches the recommended audits (`/sai-6-security`, `/sai-7-performance`, `/sai-8-accessibility`) in one invocation based on the triage parse. An explicit `--fast-track` token is a no-op. |
| `/sai-commit` | Reads your staged changes and detects the repo's commit style from the last 20 commits (Conventional Commits shape, type/scope vocabulary, body conventions). Adopts the detected vocabulary when it fits, falls back to hard-coded rules otherwise. Shows a pre-commit file report and runs `git commit` only after you explicitly approve. |
| `/sai-merge` | Merges a local branch into the current branch with conflict-triggered language selection and an iterative, global resolution strategy: after conflicts are detected it asks for the working language, presents worker analysis as text, routes closed decisions through the native picker, and lets you request context or correct the complete plan before any write. It preserves complete alternatives, safe-synthesis rules, new-conflict re-entry, and an incremental ADR/DDR collision pass scoped to source-branch records introduced by the merge, verification loop (up to 3 rounds), coordinator-only mutations, and explicit final-commit authorization. Clean merges never ask for a language or strategy; `--fast-track` bypasses only the scope gate. |
| `/sai-pr` | Drafts a complete PR description using everything produced during the change (proposal, design, review findings, etc.). Opens the PR on GitHub after you approve. |
| `/sai-archive` | Routed command: the coordinator runs in the main session and dispatches the `sai-archive-worker` managed worker for the read-only pre-flight. The ordinary route keeps mutation in the coordinator; the Direct Build (unattended) route gives the existing worker a validated, explicitly authorized sync/move/stage/commit order. Moves a completed change to the archive, keeping your active changes folder clean. Supports `--fast-track` to auto-proceed the archive soft gates. |
| `/sai-status` | Read-only progress panel for one OpenSpec change — shows which of the 10 sai-workflow artifacts exist, the specs approval state, implementation progress, the archive location if archived, and a `Next:` hint suggesting the appropriate `/sai-N` command. Never writes anything. |
| `/sai-retire-docs` | Read-only, index-driven analysis of active ADRs, DDRs, and related specifications. Correlates bounded evidence, classifies candidates, and asks for explicit per-candidate confirmation before any archival move. |
| /sai-backfill | Routed command: the coordinator runs in the main session and dispatches the sai-backfill-worker managed worker for inspection, interview, conflict scan, and draft composition, then validates the drafts against the sai-workflow schema. The ordinary route writes them in the coordinator; Direct Build (unattended) sends a validated, explicitly authorized draft order to the same worker. Made a quick fix directly in code without going through the pipeline? This reconstructs the missing documentation after the fact - interviewing you about intent and writing only what can be reliably derived from the diff. |

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
For low-risk or high-trust runs, four commands accept a `--fast-track` argument that auto-advances their approval gates instead of stopping to ask. A `> FAST-TRACK MODE ACTIVE` banner prints at the start of the run so the relaxed gating is never silent. `/sai-build` is not a fifth fast-track mode: it strips an explicit `--fast-track` token as a no-op and always injects fast-track for its chained apply segment. `/sai-review` is not a sixth fast-track mode: it strips an explicit `--fast-track` token as a no-op; it owns no questions of its own.

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-explore` | Both language gates take their English path without asking. |
| `/sai-2-design` | Auto-approves the specs gate and records the approval in `.openspec.yaml`. |
| `/sai-4-apply` | Pre-authorizes every commit for the run and defers all human-verification checks into one combined list presented after the final sweep. |
| `/sai-archive` | Auto-proceeds the unchecked-items confirmation. |

Everything else stays intact.

## Upgrade Notice

> **Existing GitHub Copilot users must run the current uninstall command before upgrading.** Skipping uninstall may leave orphaned Copilot files behind. The new supported installer and uninstaller intentionally do not clean those files.

## Global installation (multi-project)

Commands are designed as **user globals**, not per project. A single copy in the CLI's global directory makes them available in any repo. Maintained phase assets use the grouped `sai/commands/{spec,design,implement,apply}/` command-card trees; the `/sai-build` composition uses `sai/commands/meta-build/command-bootstrap.md` and `coordinator.md`.

### Shared Orchestration Core

Claude Code and opencode use the shared Orchestration Core under `sai/orchestration/`: common coordinator and worker lifecycle contracts plus mirrored harness bindings for spec, design, and implement. Their grouped phase cards live under `sai/commands/{spec,design,implement}/`, the build composition cards live under `sai/commands/meta-build/`, their reusable policies live under `sai/policies/`, retired compatibility assets live under `sai/compat/`, and their bindings are installed as separate projections. Both harnesses preserve the same durable artifacts and command contracts.

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

### Manual installation (alternative)

For step-by-step manual installation without npx:

- Opencode: see [INSTALL.opencode.md](INSTALL.opencode.md)
- Claude Code: see [INSTALL.claude.md](INSTALL.claude.md)

## Per project installation / override

Per-project commands are still possible: a file placed in a supported harness's project-local command folder at the repo root overrides the user-global wrapper of the same name. Globals act as a base; project-local files override them by filename.

| Harness | Project-local command folder | Overrides by filename? |
|---------|------------------------------|------------------------|
| opencode | `.opencode/commands/` | ✅ Yes |
| Claude Code | `.claude/commands/` | ✅ Yes |
| Claude Code | `.claude/commands/` | ✅ Yes |

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

See [INSTALL.opencode.md](INSTALL.opencode.md#post-install) for post-install steps. Opencode declares coordinator model/variant on the `sai-2-design` and `sai-3-implement` wrappers, as Claude Code already did, with no named coordinator shipped.

### Recommended models by command and provider

We set these defaults to models that have worked best for us, you may find better alternatives for your specific needs though.

| Command | Opencode | Variant | Claude Code |
|-------|----------|---------|-------------|
| explore | `opencode-go/deepseek-v4-flash` | `max` | `sonnet` - medium |
| spec (1) | `opencode-go/deepseek-v4-flash` | `max` | `opus` - medium |
| design (2) | wrapper-declared `opencode-go/deepseek-v4-flash`; worker `sai-2-design-worker` | `max` | coordinator `claude-opus-4-8` - low; worker `opus` - high |
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

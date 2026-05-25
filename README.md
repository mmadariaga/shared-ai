# Shared-AI

Software development oriented AI commands for a cost-efficient, spec-first, structured workflow:

| Phase | Steps |
|-------|-------|
| Idea | explore *(optional)* → spec → validation |
| Code | design → implement → apply |
| Quality | review → audits *(security · performance · accessibility, per review findings)* |
| Ship | PR → archive |

Built on top of [OpenSpec](https://github.com/Fission-AI/OpenSpec): OpenSpec owns the lifecycle and artifact structure, Shared-AI owns the code and quality layers.

Works great on **opencode** with an opencode-go subscription + any frontier model provider sub (Claude / GPT / Gemini).

Can also run on Claude Code, though it is less cost-effective there due to model availability and pricing constraints — you can combine both: use Claude Code for deep thinking phases and switch to opencode after to work around those limitations.

## Why use this

**You stay in control.** The AI is a peer, not a decision-maker. Every phase is a conversation where you validate direction before anything gets written. You don't delegate to the AI — you collaborate with it.

**Spec first, always.** No code is written without prior change artifacts: `proposal.md` (what + why), `design.md` (decisions + trade-offs), and `specs/**` (acceptance criteria). The implementation plan is derived from them, and the code follows the plan. This is the difference between AI-assisted development and vibe coding.

**Knowledge stays in the project.** Each phase writes its own artifact under `openspec/changes/{change-name}/`. When you come back months later — or hand it off to someone else — the reasoning is already there, organized by concern instead of buried in chat history.

**Cost-effective by design.** Each phase runs on the cheapest model that can do the job. Cheap models for commits and PRs, mid-range for planning and review, frontier only where reasoning depth actually matters. Agents think in English regardless of your language — English tokenizers produce fewer tokens per unit of meaning, so reasoning is cheaper without losing quality (details in [Token-Efficient Languages](#token-efficient-languages)). Communication is compressed to the minimum. You get the output — not the filler.

**Testing is not optional.** Every implementation step includes a failing test (RED) before the code that makes it pass (GREEN). The agent runs RED first to confirm the assertion is real, then writes GREEN. What can't be covered by unit tests — visual behavior, end-to-end flows — becomes an explicit verification request to you, placed at the earliest point it can be observed. Nothing ships unverified.

## Index

- [Commands](#sequential-pipeline-numbered)
- [Typical usage](#typical-usage)
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
| `/sai-2-design` | {change-name} | `{c}/design.md`, `tasks.md` | Turns approved specs into a technical plan: architecture decisions, trade-offs, and a concrete task list. |
| `/sai-3-implement` | {change-name} | `{c}/implementation.md` | Writes the full coding playbook — every step spelled out, tests before code, commit points marked. Designed so a cheaper/faster model can execute it mechanically. |
| `/sai-4-apply` | {change-name} | code | Follows the playbook step by step: writes code, runs tests, commits. Asks you before any git operation. |
| `/sai-5-review` | {change-name} + diff | `{c}/review.md` | Reviews the finished code across 10 dimensions (correctness, maintainability, tests, etc.). Also tells you which specialized audits to run next based on what changed. |
| `/sai-6-security` | {change-name} + diff | `{c}/security.md` | Finds security vulnerabilities in the diff — points to exact file and line, explains the risk, and maps findings to known standards (OWASP, CVE). |
| `/sai-7-performance` | {change-name} + diff | `{c}/performance.md` | Flags real performance bottlenecks (slow queries, heavy renders, unbounded loops). Evidence-based — no guesswork. |
| `/sai-8-accessibility` | {change-name} + diff | `{c}/accessibility.md` | Checks UI code for accessibility issues against WCAG 2.2 AA. Can also run browser-based tools for deeper analysis. |

## On-demand commands (unnumbered)

| Command | Purpose |
|---------|---------|
| `/sai-explore` | Open-ended thinking session before committing to anything — good for fuzzy requirements, unclear trade-offs, or when you just want to think out loud with the AI. |
| `/sai-commit` | Reads your staged changes and writes a clean, structured commit message. Runs `git commit` only after you explicitly approve. |
| `/sai-pr` | Drafts a complete PR description using everything produced during the change (proposal, design, review findings, etc.). Opens the PR on GitHub after you approve. |
| `/sai-archive` | Moves a completed change to the archive, keeping your active changes folder clean. |
| `/sai-backfill` | Made a quick fix directly in code without going through the pipeline? This reconstructs the missing documentation after the fact — interviewing you about intent and writing only what can be reliably derived from the diff. |

## Typical usage

```
/sai-1-spec Add OAuth2 authentication        # creates change "oauth2-auth"
                                             # → review specs, confirm approval

/sai-2-design oauth2-auth                    # generates design.md + tasks.md

/sai-3-implement oauth2-auth
/sai-4-apply oauth2-auth

############################################################
# git add ... && /sai-commit
#
# OR
#
# let /sai-4-apply do the commits
############################################################

/sai-5-review oauth2-auth

############################################################
# Audits based on /sai-5-review indications:
############################################################
/sai-6-security oauth2-auth
/sai-7-performance oauth2-auth
/sai-8-accessibility oauth2-auth

############################################################
# ...iterate as needed...
############################################################

/sai-pr oauth2-auth
/sai-archive oauth2-auth
```

> **Important:** open a new chat between commands:
> - **Token savings** — each phase only inherits the artifact it needs, not the full history.
> - **Clean, replicable context** — each phase starts from scratch (Isolation Mode), making it easy to debug and replay steps in isolation.
> - **Model isolation** — each phase uses the most cost-effective model for its task.

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
  Cancel button does nothing — fix before archive.
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

  Backfill does **not** generate `design.md` or `tasks.md` — those require decisions that cannot be reliably inferred from the diff alone. Use it for small fixes, typo corrections, or config changes where the code change is self-explanatory.

## Skills

Skills are reusable behavior modules loaded by wrappers and subagents at runtime. They live under `skills/` and are installed globally during setup.

All skills are invoked automatically by `sai-*` commands, but you can also trigger them directly in your own prompts using the phrases listed below — useful when you want cost discipline or compressed output outside the pipeline.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `caveman` | Ultra-compressed communication mode. Cuts ~75% of output tokens while keeping full technical accuracy. Supports intensity levels: `lite`, `full` (default), `ultra`, `wenyan-lite`, `wenyan-full`, `wenyan-ultra`. Auto-resumes after critical warnings. | `"caveman mode"`, `"talk like caveman"`, `"use caveman"`, `"less tokens"`, `"be brief"`, `/caveman`, or any token-efficiency request |
| `token-efficient-languages` | Enforces a 3-rule language contract: (1) think/reason in English, (2) respond in user's language, (3) write all artifacts in English. English tokenizers produce fewer tokens per unit of meaning. | `"budget language"`, `"cheap language"` |
| `budget-explorer` | Low-cost agent for research, exploration, and doc-lookup tasks. Model resolved via `agent.explore.model` in `opencode.jsonc` (or `subagent_type: General` + model tiers in Claude Code). Enforces tool-call caps (≤30 per spawn) and output contracts (exact fields, length cap, no raw content). | `"budget explorer"`, `"cheap explorer"` |
| `budget-executor` | Low-cost agent for running commands, tests, and build checks. Model resolved via `agent.executor.model` in `opencode.jsonc` (or `subagent_type: General`, `model: haiku` in Claude Code). Enforces execute-only discipline: exact commands, no self-correction, minimal output, structured failure reports. No tool-call cap. | `"budget executor"`, `"cheap executor"` |
| `budget` | Loads all budget skills simultaneously (`budget-explorer` + `budget-executor` + `token-efficient-languages`). Activates full cost-discipline for the session. | `"budget mode"`, `"cheap mode"`, `"low-cost mode"`, `"economy mode"` |

## Cost-Effective Strategies

Every phase in this pipeline is optimized to minimize token consumption without sacrificing quality.

### Caveman Communication Mode
Default is **lite**: no filler, pleasantries, or hedging. Fragments preferred over full sentences.

Flag `--full-caveman` in `$ARGUMENTS` activates full mode (even more aggressive abbreviation).

Note: caveman mode only compresses the public output tokens, not the thinking, which represents only a fraction of the total output tokens. Don't expect miracles from --full-caveman.

### Token-Efficient Languages

All agents think and reason internally in English, regardless of the user's input language. English tokenizers produce fewer tokens per unit of meaning than most other languages [—non-English languages can cost 2–3× more tokens for the same meaning](https://x.com/arankomatsuzaki/status/2049125048792006965). This keeps reasoning efficient while user-facing chat always responds in the user's own language (Spanish, French, German, etc.). All generated artifacts (`proposal.md`, `design.md`, `implementation.md`, `review.md`, code, commit messages, PRs) are written in English.

### Task-Matched Model Selection
Each phase uses a model chosen for its specific strengths: reasoning-heavy phases (spec) use frontier models; planning and review use balanced mid-range models; implementation, commit, and PR use fast, cost-efficient models. See the [Recommended models by command](#recommended-models-by-command-and-provider) table below.

### Explore Sub-Agent
Research or exploratory tasks are delegated to **sub-agents running cost-effective models** matched to the subtask complexity. By default, sub-agents do not inherit the main session's token window, keeping costs predictable. Each subagent call declares an **output contract** (exact fields, length cap, no raw content) so only distilled signal enters the main context. The main agent never calls WebFetch directly — all external doc lookups go through the cheap explore subagent. Caps: ≤8 research-subagent invocations per audit; in audit mode, ≤15 main-agent reads + ≤30 main-agent `Grep`/`Glob` calls per pass.

>On I/O-heavy spec tasks — codebase-wide searches, deprecated library audits, doc lookups — this technique can cut costs to a third.

Available as skills for both Claude Code and OpenCode.

### Executor Sub-Agent
Verbose CLI commands are delegated to the **executor sub-agents** (running a cheap model) together with instructions on which parts of the output to extract. This keeps the main agent's context free of noise and prevents long-running commands from consuming reasoning capacity in the main thread. Available as skills for both Claude Code and OpenCode.

## Project highlights

### Isolation Mode
Every command starts with zero inherited context —it reads only the `<TASK>` block and the artifacts it needs. This prevents context pollution across phases, makes each run replicable, and enables safe model switching between phases.

### Spec First
Every feature starts with a change proposal (`proposal.md` + `design.md` + capability specs under `specs/`) that captures goals, acceptance criteria, technical constraints, and design decisions — produced by `/sai-1-spec` via the OpenSpec `opsx:propose` skill. The implementation plan (`implementation.md`) is derived from those artifacts, and code follows the plan. This is [Spec-Driven Development](https://scrummanager.com/community/spec-driven-development-qu-es-de-dnde-viene-y-por-qu-importa) at the *spec-first* level — the change artifacts drive the current task and live as the source of truth for the pipeline phases that follow (review, security, performance, accessibility). No *vibe coding*: every line of generated code is grounded in an explicit contract.

### Single Responsibility Per Phase
Each phase produces exactly one artifact. Only `sai-4-apply` writes code; spec, implement, review, and audits produce only markdown in `openspec/changes/{change-name}/`. No phase oversteps its scope.

### RED → GREEN
Each testable step includes a failing test (RED) before the minimal implementation (GREEN). The agent runs RED first, confirms the failure is a valid assertion failure (not a setup error), then writes GREEN and verifies it passes. This proves the test is real and not tautological.

### Ubiquitous Language via GLOSSARY.md
Domain terms are captured in a living `GLOSSARY.md` at the project root. Spec reads and appends new terms inline (no batching), Plan uses canonical terms for all new identifiers, and Review validates language consistency in the diff. This enforces a DDD-style ubiquitous language across the entire pipeline —every agent and every artifact speaks the same vocabulary.

### Multi-Pass Review (10 categories)
The review agent runs ten distinct passes across the full diff: Domain Alignment, Correctness & Bugs, Security triage, Performance triage, Accessibility triage, Maintainability, Testing, Consistency with Codebase, Domain Language Consistency, and Documentation & Migrations.

### No self-review bias
The review phase (`sai-5-review`) runs on a different model than the one used for planning (`sai-3-implement`). The plan agent proposes the code architecture and design decisions — having the same model later review its own output tends to confirm its own assumptions and miss the same blind spots it had when designing the solution. Using a separate model for review introduces a genuinely independent perspective — different training data, different reasoning patterns, different failure modes — which catches real issues that self-review would not.

### Deferred Verification
Human checks (browser/UI behavior, visual confirmation) are deferred to the integration step where the behavior is first observable —the plan asks the user to verify parts of the feature as early as possible, not all at the end. Every deferred check appears exactly once, labeled with its origin step.

### ADR/DDR Proposals
Proposes creating an ADR/DDR if all 3 criteria below are met:
1. **Hard to reverse** — the cost of changing later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.


## Global installation (multi-project)

Commands are designed as **user globals**, not per project. A single copy in the CLI's global directory makes them available in any repo.


### Prerequisites

The pipeline depends on the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI for change lifecycle and skill provisioning. Install it once globally:

```bash
# Install OpenSpec CLI (see https://github.com/Fission-AI/OpenSpec for current install instructions)
npm install -g @fission-ai/openspec   # example — check the project README for the canonical command
```

Shared-AI **does not bundle the OpenSpec skills**; they come from the OpenSpec CLI and are versioned by it.

If you skip this step, the `sai-*` commands will halt with a clear error message.

### Automatic npx installer (recommended)

```bash
# 1. Install shared-AI commands globally
npx github:mmadariaga/shared-ai
```

Presents an interactive checklist to select Claude Code and/or Opencode as targets, then copies all files to the correct OS-aware destinations.

```bash
# 2. In each project where you want to use shared-AI:
npx github:mmadariaga/shared-ai setup /path/to/your/project
```

Verifies the openspec CLI, runs `openspec init` if needed, sets `schema: sai-workflow` in `openspec/config.yaml`, and copies the schema templates into the project.

### Manual installation (alternative)

For step-by-step manual installation without npx:

- Opencode: see [INSTALL.opencode.md](INSTALL.opencode.md)
- Claude Code: see [INSTALL.claude.md](INSTALL.claude.md)

## Per project installation / override

Per-project commands are still possible via `.opencode/commands/` or `.claude/commands/` at the repo root — useful when a project needs specific variants. Globals act as a base; locals override by name.

## Post Install

If you use opencode, modify the models for each command to match your preferred providers and personal taste.

See [INSTALL.opencode.md](INSTALL.opencode.md#post-install) for post-install steps.

### Recommended models by command and provider

We set these defaults to models that have worked best for us, you may find better alternatives for your specific needs though.

| Command | Opencode | Claude Code | Copilot |
|-------|----------|-------------|---------|
| explore | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` High | `github-copilot/claude-sonnet-4.6` |
| spec (1) | `opencode-go/kimi-k2.6` | `claude-sonnet-4-7` High | `github-copilot/claude-sonnet-4.6` |
| design (2) | `opencode/claude-opus-4-7`<br />\|\| `opencode/gpt-5.5` <br />\|\|`opencode/gemini-3.1-pro`<br />\|\| `opencode-go/glm-5.1` | `claude-opus-4-7` High |``github-copilot/claude-opus-4.6`` | 
| implement (3) | `opencode-go/kimi-k2.6` | `claude-sonnet-4-6` | ``github-copilot/claude-sonnet-4.6`` |
| apply (4) | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `github-copilot/gpt-5-mini` |
| review (5) | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` | `github-copilot/claude-sonnet-4.6` |
| security (6) | `opencode-go/qwen3.6-plus` | `claude-opus-4-7` High | `github-copilot/claude-opus-4.6` |
| performance (7) | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` | `github-copilot/claude-sonnet-4.6` |
| accessibility (8) | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` | `github-copilot/claude-sonnet-4.6` |
| commit | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `github-copilot/gpt-5-mini` |
| pr | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `github-copilot/gpt-5-mini` |
| archive | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `github-copilot/gpt-5-mini` |

### Choosing a model

This chart may help you identify which models to test. The intelligence axis is highly task-type-dependent — do not rely on it without running your own tests tailored to your project and specific use case.

The x-axis (cost) is usually more reliable, but again, do your own tests.

![Intelligence vs Cost (May 2026)](Intelligence%20vs%20Cost%20(May%202026).png)

Another ranking of models focused on coding tasks: https://llm-stats.com/leaderboards/best-ai-for-coding

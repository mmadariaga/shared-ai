# Shared-AI

Software development oriented AI commands for a cost-efficient, spec-first, structured workflow:
**explore (optional) → spec → implement → apply → review → audits → (iterate if needed) → PR → archive**.

Built on [OpenSpec](https://github.com/Fission-AI/OpenSpec): OpenSpec owns the lifecycle and artifact structure, shared-AI owns the quality layer and model routing.

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
- [Cost-Effective Strategies](#cost-effective-strategies)
- [Project highlights](#project-highlights)
- [Installation](#global-installation-multi-project)
- [Model recommendation](#recommended-models-by-command-and-provider)

## Sequential pipeline (numbered)

All artifact paths below resolve under `openspec/changes/{change-name}/` (referred to as `{c}` for brevity).

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `/sai-explore` | optional change name or topic | (no artifact unless captured) | Thinking partner for ideas, problems, requirements. Wraps `opsx:explore`. |
| `/sai-1-spec` | feature description | `{c}/proposal.md`, `design.md`, `tasks.md`, `specs/**` | Wraps `opsx:propose`. Produces the full OpenSpec change with the shared-AI quality layer (caveman, glossary, research discipline). |
| `/sai-2-implement` | change name | `{c}/implementation.md` | Reads proposal/design/tasks/specs, generates a granular plan with code, RED→GREEN, STOP & COMMIT markers, ready for cheap-model execution. |
| `/sai-3-apply` | change name | code | Executes `implementation.md` step by step, checks off boxes, asks for authorization on git ops. |
| `/sai-4-review` | change name + diff | `{c}/review.md` | Holistic code review (correctness, maintainability, testing, consistency). **Triage router** → recommends follow-up audits if surface changed. |
| `/sai-5-security` | change name + diff | `{c}/security.md` | SAST + SCA, CWE/CVE mapping, OWASP/PCI/GDPR. file:line + taint flow required. |
| `/sai-6-performance` | change name + diff | `{c}/performance.md` | Audit by tier (backend / frontend / db / queue). Evidence-based, no speculation. |
| `/sai-7-accessibility` | change name + diff | `{c}/accessibility.md` | Static WCAG 2.2 AA (+ optional axe/Lighthouse with `--runtime`). |

## On-demand commands (unnumbered)

| Command | Purpose |
|---------|---------|
| `/sai-commit` | Generates a Conventional Commits message from `git diff --cached`. Subject ≤50 chars, body only when the *why* is not obvious. `git commit` with explicit authorization. |
| `/sai-pr` | Synthesizes PR title + body from proposal/design/implementation/review/security/performance/accessibility + git log. Saves draft to `{c}/pr.md` and opens PR via `gh` with explicit authorization. |
| `/sai-archive` | Wraps `opsx:archive` — moves a completed change to `openspec/changes/archive/YYYY-MM-DD-{change-name}/`. |

## Typical usage

```
/sai-1-spec Add OAuth2 authentication        # creates change "oauth2-auth"
/sai-2-implement oauth2-auth
/sai-3-apply oauth2-auth

############################################################
# git add ... && /sai-commit
#
# OR
#
# let /sai-3-apply do the job
############################################################

/sai-4-review oauth2-auth

############################################################
# Audits based on /sai-4-review indications:
############################################################
/sai-5-security oauth2-auth
/sai-6-performance oauth2-auth
/sai-7-accessibility oauth2-auth

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

## Triage in `/sai-4-review`

`/sai-4-review` does not perform deep SAST, profiling, or axe analysis. It detects the touched surface and recommends the specific audit:

- **Security surface** (auth, input parsing, dynamic queries, crypto, HTTP boundary, deps, logging) → `/sai-5-security`
- **Performance surface** (new queries, endpoints, consumers, hot components, deps, loops over unbounded input, caching) → `/sai-6-performance`
- **Accessibility surface** (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`) → `/sai-7-accessibility`

All audits are diff-scoped by default vs parent branch. Support `--full` or `--path {dir}` to expand scope.

## Iterate as needed

In OpenSpec, a `change` represents a single cohesive set of modifications. When review or audits surface follow-up work, prefer creating a **new change** that references the original, rather than overwriting artifacts of an active or archived change. This preserves the original reasoning, keeps history auditable, and matches the OpenSpec lifecycle (one change → spec → implement → review → audits → PR → archive).

Pick an entry point based on what the findings require:

- **New change (recommended for any finding)** — captures the follow-up as its own auditable unit:
  ```
  /sai-1-spec
  Follow-up to oauth2-auth: harden token storage and address review findings.

  @openspec/changes/oauth2-auth/proposal.md
  @openspec/changes/oauth2-auth/review.md
  @openspec/changes/oauth2-auth/security.md

  # Your observations here:
  Token storage must move to httpOnly cookies; review flagged XSS exposure...
  ```
  This creates a sibling change (e.g. `oauth2-auth-hardening`) that goes through the full pipeline. The original `oauth2-auth` stays untouched.

- **Amend the active change (only before archive)** — if the original change has not been archived yet and the finding is a direct correction (not new scope), you can re-run a phase on the same change name. This **overwrites** the corresponding artifact, so use it sparingly:
  ```
  /sai-2-implement oauth2-auth
  Regenerate implementation.md addressing the review findings (replacing the previous one).

  @openspec/changes/oauth2-auth/proposal.md
  @openspec/changes/oauth2-auth/review.md

  # Your observations here:
  Cancel button does nothing — fix before archive.
  ```
  Never amend an archived change. Once archived, follow-ups always go through a new change.

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

>This technique can reduce the cost of `/sai-1-spec` on I/O-intensive tasks, like audits, to a third.

## Project highlights

### Isolation Mode
Every command starts with zero inherited context —it reads only the `<TASK>` block and the artifacts it needs. This prevents context pollution across phases, makes each run replicable, and enables safe model switching between phases.

### Spec First
Every feature starts with a change proposal (`proposal.md` + `design.md` + capability specs under `specs/`) that captures goals, acceptance criteria, technical constraints, and design decisions — produced by `/sai-1-spec` via the OpenSpec `opsx:propose` skill. The implementation plan (`implementation.md`) is derived from those artifacts, and code follows the plan. This is [Spec-Driven Development](https://scrummanager.com/community/spec-driven-development-qu-es-de-dnde-viene-y-por-qu-importa) at the *spec-first* level — the change artifacts drive the current task and live as the source of truth for the pipeline phases that follow (review, security, performance, accessibility). No *vibe coding*: every line of generated code is grounded in an explicit contract.

### Single Responsibility Per Phase
Each phase produces exactly one artifact. Only `sai-3-apply` writes code; spec, implement, review, and audits produce only markdown in `openspec/changes/{change-name}/`. No phase oversteps its scope.

### RED → GREEN
Each testable step includes a failing test (RED) before the minimal implementation (GREEN). The agent runs RED first, confirms the failure is a valid assertion failure (not a setup error), then writes GREEN and verifies it passes. This proves the test is real and not tautological.

### Ubiquitous Language via GLOSSARY.md
Domain terms are captured in a living `GLOSSARY.md` at the project root. Spec reads and appends new terms inline (no batching), Plan uses canonical terms for all new identifiers, and Review validates language consistency in the diff. This enforces a DDD-style ubiquitous language across the entire pipeline —every agent and every artifact speaks the same vocabulary.

### Multi-Pass Review (10 categories)
The review agent runs ten distinct passes across the full diff: Domain Alignment, Correctness & Bugs, Security triage, Performance triage, Accessibility triage, Maintainability, Testing, Consistency with Codebase, Domain Language Consistency, and Documentation & Migrations.

### No self-review bias
The review phase (`sai-4-review`) runs on a different model than the one used for planning (`sai-2-implement`). The plan agent proposes the code architecture and design decisions — having the same model later review its own output tends to confirm its own assumptions and miss the same blind spots it had when designing the solution. Using a separate model for review introduces a genuinely independent perspective — different training data, different reasoning patterns, different failure modes — which catches real issues that self-review would not.

### Deferred Verification
Human checks (browser/UI behavior, visual confirmation) are deferred to the integration step where the behavior is first observable —the plan asks the user to verify parts of the feature as early as possible, not all at the end. Every deferred check appears exactly once, labeled with its origin step.

### ADR/DDR Proposals
Proposes creating an ADR/DDR if all 3 criteria below are met:
1. **Hard to reverse** — the cost of changing later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.

## Repo structure

```
instructions/                ← actual content for each agent (plain markdown, Isolation Mode + TASK)
instructions/spec.propose.md ← spec quality layer prepended to the openspec-propose skill
instructions/glossary-format.md ← canonical GLOSSARY.md format used by spec/plan/review
instructions/remember.md     ← consolidated reminders appended by wrappers
claude/commands/           ← wrappers for Claude Code (model + effort + fetch to instructions/)
opencode/commands/         ← wrappers for opencode (model + fetch to instructions/)
```

## Global installation (multi-project)

Commands are designed as **user globals**, not per project. A single copy in the CLI's global directory makes them available in any repo.

> **Prerequisite:** install the [OpenSpec CLI](https://github.com/Fission-AI/OpenSpec) globally and run `openspec init` in each project. The openspec-dependent `ai-*` commands halt with a clear error if either is missing.

### Opencode

| OS | Destination |
|----|---------|
| Linux / macOS | `~/.config/opencode/commands/` |
| Windows | `%USERPROFILE%\.config\opencode\commands\` |

**Linux / macOS:**
```bash
# Copy commands
mkdir -p ~/.config/opencode/commands
cp opencode/commands/*.md ~/.config/opencode/commands/

# Copy instructions
if [ -d ~/.config/opencode/instructions ]; then
    echo "Overwriting ~/.config/opencode/instructions/"
fi
mkdir -p ~/.config/opencode/instructions
cp instructions/*.md ~/.config/opencode/instructions/

# Copy opencode.json
if [ ! -f ~/.config/opencode/opencode.json ] && [ ! -f ~/.config/opencode/opencode.jsonc ]; then
    cp opencode/opencode.jsonc ~/.config/opencode/
else
    echo "~/.config/opencode/opencode.json(c) already exists."
    echo "Ensure it includes the 'agent.explore' section:"
    echo '  "agent": {'
    echo '    "explore": {'
    echo '      "mode": "subagent",'
    echo '      // Set your trusted low-cost model below'
    echo '      "model": "opencode-go/deepseek-v4-flash"'
    echo '    }'
    echo '  }'
fi
```

**Windows (PowerShell):**
```powershell
# Copy commands
$configDir = "$env:USERPROFILE\.config\opencode"
New-Item -ItemType Directory -Force -Path "$configDir\commands"
Copy-Item opencode\commands\*.md "$configDir\commands\"

# Copy instructions
$instructionsDir = "$configDir\instructions"
if (Test-Path $instructionsDir) {
    Write-Host "Overwriting $instructionsDir"
}
New-Item -ItemType Directory -Force -Path $instructionsDir | Out-Null
Copy-Item instructions\*.md $instructionsDir\

# Copy opencode.json
$jsonPath = Join-Path $configDir "opencode.json"
$jsoncPath = Join-Path $configDir "opencode.jsonc"
if (-not (Test-Path $jsonPath) -and -not (Test-Path $jsoncPath)) {
    Copy-Item opencode\opencode.jsonc $configDir\
} else {
    Write-Host "$configDir\opencode.json(c) already exists."
    Write-Host "Ensure it includes the 'agent.explore' section:"
    Write-Host '  "agent": {'
    Write-Host '    "explore": {'
    Write-Host '      "mode": "subagent",'
    Write-Host '      // Set your trusted low-cost model below'
    Write-Host '      "model": "opencode-go/deepseek-v4-flash"'
    Write-Host '    }'
    Write-Host '  }'
}
```

### Claude Code

See [INSTALL.claude.md](INSTALL.claude.md) for installation instructions.

## Per project installation

Per-project commands are still possible via `.opencode/commands/` or `.claude/commands/` at the repo root — useful when a project needs specific variants. Globals act as a base; locals override by name.

## Post Install

Once installed, modify the models in your commands to adapt them to your subscriptions and personal preferences.

Open `~/.config/opencode/commands/sai-1-spec.md` and set your preferred frontier model based on your subscriptions.

### Recommended models by command and provider

We set these defaults to models that have worked best for us, you may find better alternatives for your specific needs though.

| Command | Opencode | Claude Code |
|-------|----------|-------------|
| spec (1) | `opencode/gpt-5.5` <br />\|\| `opencode/claude-opus-4-7`<br />\|\| `opencode/gemini-3.1-pro`<br />\|\| `opencode-go/glm-5.1` | `claude-opus-4-7` High |
| plan (2) | `opencode-go/kimi-k2.6` | `claude-sonnet-4-6` |
| implement (3) | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` |
| review (4) | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` |
| security (5) | `opencode-go/qwen3.6-plus` | `claude-opus-4-7` High |
| performance (6) | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` |
| accessibility (7) | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` |
| commit | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` |
| pr | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` |

### Choosing a model

To list all models available in your opencode subscriptions, run:
```bash
opencode models
```

This chart may help you identify which models to test. The intelligence axis is highly task-type-dependent — do not rely on it without running your own tests tailored to your project and specific use case.

The x-axis (cost) is usually more reliable, but again, do your own tests.

![Intelligence vs Cost (May 2026)](Intelligence%20vs%20Cost%20(May%202026).png)

Another ranking of models focused on coding tasks: https://llm-stats.com/leaderboards/best-ai-for-coding

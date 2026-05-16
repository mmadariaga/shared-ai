# Shared-AI

Software development oriented AI commands for a cost-efficient, spec-first, structured workflow:
**spec → plan → implement → review → audits → (iterate if needed) → PR**.

Each workflow step produces an artifact in `plans/{feature-name}/` that feeds into the next.

Works great on **opencode** with an opencode-go subscription + any frontier model provider sub (Claude / GPT / Gemini / Copilot).

Can also run on Claude Code, though it is less cost-effective there due to model availability and pricing constraints — you can combine both: use Claude Code for deep thinking phases and switch to opencode after to work around those limitations. 

Commands adapted for GitHub Copilot exist as well but have not been tested yet — they may work.

## Why use this

**You stay in control.** The AI is a peer, not a decision-maker. Every phase is a conversation where you validate direction before anything gets written. You don't delegate to the AI — you collaborate with it.

**Knowledge stays in the project.** Each phase produces a written artifact: the spec captures the why, the plan captures the how, the review captures what was found. When you come back months later — or hand it off to someone else — the reasoning is already there.

**Spec first, always.** No code is written without a prior spec. The spec defines acceptance criteria, design decisions, and technical constraints. The plan is derived from it. This is the difference between AI-assisted development and vibe coding.

**Cost-effective by design.** Each phase runs on the cheapest model that can do the job. Cheap models for commits and PRs, mid-range for planning and review, frontier only where reasoning depth actually matters. Agents think in English regardless of your language, and communication is compressed to the minimum. You get the output — not the filler.

**Testing is not optional.** Every implementation step includes a failing test (RED) before the code that makes it pass (GREEN). The agent runs RED first to confirm the assertion is real, then writes GREEN. What can't be covered by unit tests — visual behavior, end-to-end flows — becomes an explicit verification request to you, placed at the earliest point it can be observed. Nothing ships unverified.

## Index

- [Commands](#sequential-pipeline-numbered)
- [Typical usage](#typical-usage)
- [Cost effective strategies](#cost-effective-strategies)
- [Project highlights](#project-highlights)
- [Installation](#global-installation-multi-project)
- [Model recommendation](#recommended-models-by-command-and-provider)

## Sequential pipeline (numbered)

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `/ai-1-spec` | feature description | `plans/{f}/spec.md` | Deconstructs the feature into testable steps, design decisions, expert profile, required docs |
| `/ai-2-plan` | `spec.md` | `plans/{f}/plan.md` | Implementation plan with code, checkboxes, automated/human verification, STOP & COMMIT per step |
| `/ai-3-implement` | `plan.md` | code | Executes the plan step by step, checks off boxes, asks for authorization on git ops |
| `/ai-4-review` | `spec.md` + diff | `plans/{f}/review.md` | Holistic code review (correctness, maintainability, testing, consistency). **Triage router** → recommends follow-up audits if surface changed |
| `/ai-5-security` | `spec.md` + diff | `plans/{f}/security.md` | SAST + SCA, CWE/CVE mapping, OWASP/PCI/GDPR. file:line + taint flow required |
| `/ai-6-performance` | `spec.md` + diff | `plans/{f}/performance.md` | Audit by tier (backend / frontend / db / queue). Evidence-based, no speculation |
| `/ai-7-accessibility` | `spec.md` + diff | `plans/{f}/accessibility.md` | Static WCAG 2.2 AA (+ optional axe/Lighthouse with `--runtime`) |

## On-demand commands (unnumbered)

| Command | Purpose |
|---------|---------|
| `/ai-commit` | Generates a Conventional Commits message from `git diff --cached`. Subject ≤50 chars, body only when the *why* is not obvious. `git commit` with explicit authorization |
| `/ai-pr` | Synthesizes PR title + body from spec/plan/review/security/performance/accessibility + git log. Saves draft and opens PR via `gh` with explicit authorization |

## Typical usage

```
/ai-1-spec Add OAuth2 authentication
/ai-2-plan @plans/oauth2-auth/spec.md
/ai-3-implement @plans/oauth2-auth/plan.md

############################################################
# git add ... && /ai-commit
#
# OR
#
# let /ai-3-implement do the job
############################################################

/ai-4-review @plans/oauth2-auth/spec.md

############################################################
# Audits based on /ai-4-review indications:
############################################################
/ai-5-security @plans/oauth2-auth/spec.md
/ai-6-performance @plans/oauth2-auth/spec.md
/ai-7-accessibility @plans/oauth2-auth/spec.md

############################################################
# ...iterate as needed...
############################################################

/ai-pr @plans/oauth2-auth/spec.md
```

> **Important:** open a new chat between commands:
> - **Token savings** — each phase only inherits the artifact it needs, not the full history.
> - **Clean, replicable context** — each phase starts from scratch (Isolation Mode), making it easy to debug and replay steps in isolation.
> - **Model isolation** — each phase uses the most cost-effective model for its task.

## Triage in `/ai-4-review`

`/ai-4-review` does not perform deep SAST, profiling, or axe analysis. It detects the touched surface and recommends the specific audit:

- **Security surface** (auth, input parsing, dynamic queries, crypto, HTTP boundary, deps, logging) → `/ai-5-security`
- **Performance surface** (new queries, endpoints, consumers, hot components, deps, loops over unbounded input, caching) → `/ai-6-performance`
- **Accessibility surface** (`.tsx`/`.jsx`/`.astro`/`.html`/`.vue`/`.svelte`/`.css`) → `/ai-7-accessibility`

All audits are diff-scoped by default vs parent branch. Support `--full` or `--path {dir}` to expand scope.

## Iterate as needed

After review and audits, start a new cycle from the existing artifacts if required. Depending on the complexity of the issues found, choose the appropriate entry point:

- **Full re-spec** — for major changes, new requirements, or architectural shifts:
  ```
  /ai-1-spec
  Based on the specification we just implemented and the enhancements and bugs identified during review, create a new spec.

  @plans/oauth2-auth/spec.md
  @plans/oauth2-auth/review.md
  @plans/oauth2-auth/security.md
  @plans/oauth2-auth/performance.md
  @plans/oauth2-auth/accessibility.md

  # Your observations here: 
  Implemented architecture doesn't fit client security requirements...
  ```

- **Skip spec, re-plan only** — for contained fixes where the original specification is still valid. Keeps the spec unchanged and generates a fresh plan addressing the review findings:
  ```
  /ai-2-plan
  Based on the existing spec and the review findings below, create a 
  new plan in plans/oauth2-auth/plan-iteration-2.md
  
  @plans/oauth2-auth/spec.md
  @plans/oauth2-auth/review.md
  @plans/oauth2-auth/accessibility.md

  # Your observations here: 
  Plus, I just found that the cancel button does nothing
  ```

## Cost-Effective Strategies

Every phase in this pipeline is optimized to minimize token consumption without sacrificing quality.

### Caveman Communication Mode
Default is **lite**: no filler, pleasantries, or hedging. Fragments preferred over full sentences.

Flag `--full-caveman` in `$ARGUMENTS` activates full mode (even more aggressive abbreviation).

Note: caveman mode only compresses the public output tokens, not the thinking, which represents only a fraction of the total output tokens. Don't expect miracles from --full-caveman.

### Token-Efficient Languages

All agents think and reason internally in English, regardless of the user's input language. English tokenizers produce fewer tokens per unit of meaning than most other languages [—non-English languages can cost 2–3× more tokens for the same meaning](https://x.com/arankomatsuzaki/status/2049125048792006965). This keeps reasoning efficient while user-facing chat always responds in the user's own language (Spanish, French, German, etc.). All generated artifacts (`spec.md`, `plan.md`, `review.md`, code, commit messages, PRs) are written in English.

**(Experimental)** Chinese models are often [even more token-efficient](https://x.com/arankomatsuzaki/status/2049177688402022730) when reasoning in Chinese. For workloads running on Chinese-origin models, you can activate **Chinese thinking** by adding `--tacaño` or `--stingy` to the prompt. When this flag is present, the agent switches its internal reasoning and **artifact generation** to Chinese — only user-facing responses remain in the user's language. 
> **Use only if you were not planning to review the artifacts anyway.**

We don't keep artifacts in English because continuous translation between Chinese and English when creating artifacts consumes more tokens than it saves. We do keep user-facing responses in the user's language because otherwise this mode would be unusable unless you know Chinese. Besides, internal thinking represents far more tokens than the output, so the savings still apply. 

### Task-Matched Model Selection
Each phase uses a model chosen for its specific strengths: reasoning-heavy phases (spec) use frontier models; planning and review use balanced mid-range models; implementation, commit, and PR use fast, cost-efficient models. See the [Recommended models by command](#recommended-models-by-command-and-provider) table below.

### Explore Sub-Agent
Research or exploratory tasks are delegated to **sub-agents running cost-effective models** matched to the subtask complexity. By default, sub-agents do not inherit the main session's token window, keeping costs predictable. Each subagent call declares an **output contract** (exact fields, length cap, no raw content) so only distilled signal enters the main context. The main agent never calls WebFetch directly — all external doc lookups go through the cheap explore subagent. Tool-call caps per tier: cheap ≤30, escalated ≤15, fallback ≤10. 

>This technique can reduce the cost of `/ai-1-spec` on I/O-intensive tasks, like audits, to a third.

## Project highlights

### Isolation Mode
Every command starts with zero inherited context —it reads only the `<TASK>` block and the artifacts it needs. This prevents context pollution across phases, makes each run replicable, and enables safe model switching between phases.

### Spec First
Every feature starts with a specification (`spec.md`) that captures goals, acceptance criteria, technical constraints, and design decisions. The plan (`plan.md`) is derived from the spec, and implementation follows the plan. This is [Spec-Driven Development](https://scrummanager.com/community/spec-driven-development-qu-es-de-dnde-viene-y-por-qu-importa) at the *spec-first* level —the spec drives the current task and is kept as a living artifact for the pipeline phases that follow (review, security, performance, accessibility). No *vibe coding*: every line of generated code is grounded in an explicit contract. The spec uses a **common body + harness context** architecture (`spec.common.md` + per-harness wrappers) to avoid tripling maintenance across Claude Code, opencode, and Copilot.

### Single Responsibility Per Phase
Each phase produces exactly one artifact. Only `ai-3-implement` writes code; spec, plan, review, and audits produce only markdown in `plans/{feature-name}/`. No phase oversteps its scope, and every instruction file ends with a "Scope Reminder" block to enforce this.

### RED → GREEN
Each testable step includes a failing test (RED) before the minimal implementation (GREEN). The agent runs RED first, confirms the failure is a valid assertion failure (not a setup error), then writes GREEN and verifies it passes. This proves the test is real and not tautological.

### Ubiquitous Language via GLOSSARY.md
Domain terms are captured in a living `GLOSSARY.md` at the project root. Spec reads and appends new terms inline (no batching), Plan uses canonical terms for all new identifiers, and Review validates language consistency in the diff. This enforces a DDD-style ubiquitous language across the entire pipeline —every agent and every artifact speaks the same vocabulary.

### Multi-Pass Review (9 categories)
The review agent runs nine distinct passes across the full diff: Domain Alignment, Correctness & Bugs, Security triage, Performance triage, Maintainability, Testing, Codebase Consistency, Domain Language Consistency, and Documentation & Migrations.

### No self-review bias
The review phase (`ai-4-review`) runs on a different model than the one used for planning (`ai-2-plan`). The plan agent proposes the code architecture and design decisions — having the same model later review its own output tends to confirm its own assumptions and miss the same blind spots it had when designing the solution. Using a separate model for review introduces a genuinely independent perspective — different training data, different reasoning patterns, different failure modes — which catches real issues that self-review would not.

### Deferred Verification
Human checks (browser/UI behavior, visual confirmation) are deferred to the integration step where the behavior is first observable —the plan asks the user to verify parts of the feature as early as possible, not all at the end. Every deferred check appears exactly once, labeled with its origin step.

### ADR/DDR Proposals
Proposes creating an ADR/DDR if all 3 criteria below are met:
1. **Hard to reverse** — the cost of changing later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Real trade-off** — genuine alternatives existed and one was chosen for specific reasons.

## Repo structure

```
instructions/              ← actual content for each agent (plain markdown, Isolation Mode + TASK)
instructions/spec.common.md ← shared spec body (collaboration style, workflow, template, research guide, cost discipline)
instructions/spec.{claude,opencode,copilot}.md ← per-harness wrappers (Harness Context only)
instructions/remember.md   ← consolidated reminders appended by wrappers
claude/commands/           ← wrappers for Claude Code (model + effort + fetch to instructions/)
opencode/commands/         ← wrappers for opencode (model + fetch to instructions/; includes ai-1-spec-gpt, ai-1-spec-opus variants)
github/prompts/            ← prompts for GitHub Copilot (model + fetch to instructions/)
```

## Global installation (multi-project)

Commands are designed as **user globals**, not per project. A single copy in the CLI's global directory makes them available in any repo.

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

### Github Copilot (Experimental - Not tested yet)

See [INSTALL.copilot.md](INSTALL.copilot.md) for installation instructions.

## Per project installation

Per-project commands are still possible via `.opencode/commands/`, `.claude/commands/` or `.github/prompts` at the repo root — useful when a project needs specific variants. Globals act as a base; locals override by name.

## Post Install

Once installed, modify the models in your commands to adapt them to your subscriptions and personal preferences.

Open `~/.config/opencode/commands/ai-1-spec.md` and set your preferred frontier model based on your subscriptions, `github-copilot/claude-opus-4.6` for instance.

### Recommended models by command and provider

We set these defaults to models that have worked best for us, you may find better alternatives for your specific needs though.

| Command | Opencode | Claude Code | Copilot |
|-------|----------|-------------|---------|
| spec (1) | `opencode/gpt-5.5` <br />\|\| `opencode/claude-opus-4-7`<br />\|\| `opencode/gemini-3.1-pro`<br />\|\| `opencode-go/glm-5.1` | `claude-opus-4-7` High | `github-copilot/claude-opus-4.6` |
| plan (2) | `opencode-go/kimi-k2.6` | `claude-sonnet-4-6` | `github-copilot/claude-sonnet-4.6` |
| implement (3) | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `github-copilot/gpt-5-mini` |
| review (4) | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` | `github-copilot/claude-sonnet-4.6` |
| security (5) | `opencode-go/qwen3.6-plus` | `claude-opus-4-7` High | `github-copilot/claude-opus-4.6` |
| performance (6) | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` | `github-copilot/claude-sonnet-4.6` |
| accessibility (7) | `opencode-go/qwen3.6-plus` | `claude-sonnet-4-6` | `github-copilot/claude-sonnet-4.6` |
| commit | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `github-copilot/gpt-5-mini` |
| pr | `opencode-go/deepseek-v4-flash` | `claude-haiku-4-5` | `github-copilot/gpt-5-mini` |

### Choosing a model

To list all models available in your opencode subscriptions, run:
```bash
opencode models
```

This chart may help you identify which models to test. The intelligence axis is highly task-type-dependent — do not rely on it without running your own tests tailored to your project and specific use case.

The x-axis (cost) is usually more reliable, but again, do your own tests.

![Intelligence vs Cost (May 2026)](Intelligence%20vs%20Cost%20(May%202026).png)

Another ranking of models focused on coding tasks: https://llm-stats.com/leaderboards/best-ai-for-coding

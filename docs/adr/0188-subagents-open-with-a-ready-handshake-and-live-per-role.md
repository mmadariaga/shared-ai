# ADR 0188: Subagents open with a ready handshake and live per role

<!-- adr-index: refs 0025; refs 0076; refs 0077 -->

## Status

Accepted

## Context

Every SAI subagent dispatch opens in two round trips: a ready-only dispatch with no task content, then the task in a same-handle continuation after `event: ready`. This covers routed phase workers (`sai/orchestration/command-runner.md` § Dispatch and task disclosure) and `/sai-explore` budget explorers (`sai/commands/explore/body.md`, Explorer two-phase startup). The specs `two-phase-worker-handshake` and `explore-two-phase-startup` pin the mechanics, but no decision record says why. Read cold, the handshake looks superfluous on Claude Code, and a review of `/sai-explore` proposed removing it there.

That review measured one explorer in a live session: the ready turn cost about 48,500 tokens and 2 tool calls, and the whole search about 125,000 tokens. The ready-turn figure is almost all subagent bootstrap (loading the agent file and its policies). The subagent pays that bootstrap once, with or without a handshake. The handshake itself adds one round trip per subagent.

Subagent lifetimes also differ by role, and no record states the reasons:

- a `/sai-explore` explorer serves one search, and each new search gets a new explorer;
- a routed phase worker persists across its whole phase;
- apply's RED and GREEN workers are new for every Step.

## Decision

1. **The handshake stays on every dispatch, in both harnesses.** Its purpose is to hold a resumable handle before any expensive work starts. When a subagent hangs or loops, the human stops the run and tells the coordinator to warn that subagent and continue. The coordinator sends the warning on the retained handle, and the subagent resumes from its own history. Without a handle there is nobody to resume.
   - **opencode:** required. The `task` tool has no `run_in_background` and blocks until the subagent finishes, so without a ready return the `task_id` arrives only when the work ends. A hang before that return leaves no handle.
   - **Claude Code:** a background `Agent` dispatch already returns the `agentId` at launch. The handshake is redundant for handle capture here, but it stays so that one protocol serves both harnesses. The cost is one round trip per subagent.
2. **Phase workers get a second reason: handle, then guard snapshot, then task.** A worker that received its task at dispatch could commit before the coordinator took the no-commit guard snapshot (`sai/policies/no-commit-guard.md`), and the guard would miss that commit. Holding back the task until the handle exists and the snapshot is taken prevents this by construction. Explorers write nothing and open no guard window, so only the first reason applies to them.
3. **Subagent lifetime follows the role:**
   - **`/sai-explore` explorer: one per search.** A reused explorer collects every earlier search's reads. That fills the smaller context of a budget model and lets one search bias the next, for example by answering from a file it already holds instead of looking for the right one. A new explorer knows only its task.
   - **Routed phase worker: one per phase.** It persists across feedback, notices, progress, and recovery continuations, because the phase's work builds on its own history. At most one replacement is rebuilt from the opaque continuation history (ADR 0076).
   - **Apply RED and GREEN workers: new per Step,** so that RED stays blind to the GREEN body (ADR 0025). Here the bootstrap is paid on every Step, and that cost is accepted in exchange for the isolation.

## Alternatives Considered

- **Drop the handshake on Claude Code only** — rejected. The saving is one round trip per subagent, since the bootstrap tokens are paid anyway. It would split one protocol into two harness paths across the runner, worker-core, the bindings, specs, and tests, in a budget-model-first project where one deterministic path is the point.
- **Drop the handshake everywhere** — rejected. On opencode it loses the only handle before a blocking call returns, and on phase workers it lets work start before the guard snapshot.
- **Reuse one explorer across searches** — rejected. It saves a bootstrap per search, but at the cost of context pressure and contamination between searches on a budget model.
- **Keep the rationale only in archived proposals** — rejected. Archived changes are history, not the current why. The cold-read reviewer who proposed removing the handshake had not found them.

## Consequences

- Every subagent costs one bootstrap plus one extra round trip. This is a fixed and accepted cost.
- A future proposal to drop the handshake on Claude Code has to beat the one-protocol argument, not just the latency.
- Latency, not token cost, is what to measure if the handshake ever needs to be reconsidered.
- The explorer's handle is used only to disclose its single task (`sai/commands/explore/body.md`: "Keep the handle for that continuation only"), in line with one explorer per search.

## Related

- `sai/orchestration/command-runner.md` — § Dispatch and task disclosure
- `sai/orchestration/worker-core.md`
- `sai/commands/explore/body.md` — Explorer two-phase startup
- `sai/policies/no-commit-guard.md`
- `openspec/specs/two-phase-worker-handshake/spec.md`
- `openspec/specs/explore-two-phase-startup/spec.md`
- `openspec/changes/archive/2026-09-12-two-phase-worker-handshake/proposal.md` — original Why: no expensive work before a resumable handle exists
- `openspec/changes/archive/2026-09-14-explore-two-phase-startup/proposal.md`
- `AGENTS.md` — § Budget-subagent hang containment
- ADR 0025 — blind RED test writer
- ADR 0076 — resume the current worker before durable reconstruction
- ADR 0077 — continuation mechanics live in the harness-specific bindings

# Explore-agent search scope

## Goal

Extend the neutral budget-explorer policy with a project-root-first filesystem boundary, purpose-bound out-of-root access, mandatory structured escalation records, and an independent `≤30` tool-call ceiling for every execution segment while preserving its existing read-only and bounded-summary contract.

## Prerequisites

- Detect the current git branch with `git rev-parse --abbrev-ref HEAD` (or equivalent). The current branch for this invocation is `worktree-1`.
- Resolve the repository default branch dynamically. This repository resolves `origin/HEAD` to `main`, so the default branch is `main`; do not replace this resolution with a hard-coded assumption in future invocations.
- Present exactly these three branch options in English, in this order:
  1. `Suggest branch "explore-agent-search-scope"` — create or use the change-name-derived branch.
  2. `Stay on current branch "worktree-1"` — keep the current branch.
  3. `Enter branch name manually` — enter a custom branch name.
- No option is prohibited. The user bears responsibility for the choice.
- When a newly selected branch does not already exist, present exactly these two base options before creating it, unless the selected option is to stay on the current branch, the selected branch already exists, or the current branch already equals the resolved default branch:
  1. `Base on default branch "main"` — create the new branch from `main`.
  2. `Base on current branch "worktree-1"` — create the new branch from `worktree-1`.
- If the selected branch is new, create it from the selected base branch before implementing. Never hardcode `main` as the base when dynamic resolution produces another default.

### Step-by-Step Instructions

#### Step 1: Extend the canonical explorer policy

*(Service-side / non-UI step — standard format. No human check applies because this change updates a read-only Markdown policy and has no observable browser behavior.)*

- [x] Replace the contents of `sai/policies/explore-agent.md` with the complete policy below. Preserve the existing read-only research, caller-owned synthesis, structured-summary, and `≤30` bounded-tooling requirements while adding the four capabilities described in the change artifacts.

```markdown
Run read-only research and lookup tasks: search files by pattern, locate definitions and usages, read documentation, and answer questions about the codebase. You start with a clean context and return only a structured summary. Do not write files.

Every spawn MUST declare an output contract in its prompt:
- Exact fields expected in the response
- A hard length cap (word or line count)
- Explicit no raw output or raw file contents (or verbatim excerpts required for audit mode)

Summaries are caller-owned: the caller performs the final synthesis, and the explore agent must never return raw output.

## Filesystem research scope

The harness working directory is the project root for the invocation. The active worktree is included in that root when the harness starts in a worktree. Every unqualified or speculative filesystem search, discovery, and read MUST start in the project root and remain confined to it. The explorer MUST NOT broaden an initial search to the parent repository or sibling worktrees.

A concrete external path explicitly supplied in the task is a directed-access exception governed by the purpose-bound access rule below. Root exhaustion or a missing root result MUST NOT authorize self-widening. Fetch boot is not filesystem research, and web lookup is outside this filesystem-scope contract.

## Directed out-of-root access

The explorer MAY access a filesystem path outside the project root only when the path is concrete and named with a concrete task-relevant purpose. A task-supplied path qualifies only when that purpose is stated. A public or well-known location qualifies only when the explorer identifies the relevant tool, explains the task relationship, and names the specific artifact sought there before access.

For every directed out-of-root access, the bounded summary MUST record the relevant tool, its task relationship, and the specific artifact sought. A conventional location without that evidence, an irrelevant concrete path, a speculative sweep, a broad pattern, and root exhaustion do not qualify. This is a criterion for directed access, not a closed destination allowlist.

## Structured scope escalation

Every structured response MUST include the `out_of_root_requests` field, even when the caller's declared response fields omit it. The field is an array. Each entry has a concrete `path` and an independently legible `reason`; an empty array means that no concrete escalation exists.

When root research exposes a concrete filesystem need outside the project root that is not already directed by the task or by a public or well-known location of a relevant tool, the explorer MUST NOT access it. The explorer MUST return the need in `out_of_root_requests` for the main agent instead. A glob, wildcard, directory pattern, or other non-concrete expression is not a valid escalation path. A reason that merely says to inspect, search, or access its own path is not independently legible and is invalid.

A continuation MAY access an escalated path only when the main agent explicitly carries forward that exact concrete path and its purpose as directed context. A generic continuation acknowledgement does not authorize access. If the main agent declines or does not carry forward an escalation, the explorer MUST end external searching rather than probe another candidate. When no concrete external candidate exists, the explorer reports the requested item as not found and returns an empty `out_of_root_requests` array.

## Per-segment tool-call ceiling

Per-spawn tool-call cap: `≤30` calls per execution segment. The existing ceiling applies independently to the initial spawn and to every continuation; calls from an earlier segment do not spend or authorize calls in a later segment. If a task exceeds one segment's cap, the caller starts another bounded segment rather than raising the ceiling.

When the harness supports continuation, the main agent resumes the same explorer for the next bounded segment. When the harness does not support continuation, the main agent re-dispatches a fresh explorer with only the required bounded task context. These harness-specific continuation mechanics remain owned by their bindings, while the root, directed-access, escalation, and per-segment ceiling rules are identical across supported harnesses.
```

- [x] Run `npm test -- test/canonical-opencode-agent-behavior.test.js` from the project root — the scoped structural assertions pass for root confinement, directed-access evidence, mandatory `out_of_root_requests`, escalation validity, both continuation paths, and the preserved read-only and bounded-summary rules.
- [x] Run `npm test` from the project root — the complete Node.js test suite passes without modifying any test or harness-binding file.

##### Step 1 Verification Checklist

**Automated (agent runs before stopping):**
- [x] `npm test -- test/canonical-opencode-agent-behavior.test.js` — PASS with all scoped canonical explorer behavior assertions.
- [x] `npm test` — PASS for the complete suite.
- [x] Inspect the final `sai/policies/explore-agent.md` — it remains behavior-only, read-only, caller-synthesized, and bounded, and contains the root-first, directed-access, escalation, and per-segment-cap contracts.

*(No Human checks — service-side policy change with no observable browser behavior.)*

#### Step 1 STOP & COMMIT

**sai-4-apply:** Run all Automated checks above and confirm they pass before stopping.

**STOP & COMMIT:** Stage and commit after Automated checks pass. No browser verification is required for this step.

## Appendix: Plan vs Final Implementation

### Step 1 — Canonical wording compatibility

**Plan:** Apply the complete policy text specified in the Step 1 GREEN body.
**Final:** Preserved the policy behavior, but changed harness-specific wording, removed the backticks around `≤30`, and used `location allowlist` so the canonical behavior-only assertions pass.
**Reason:** The repository's canonical tests reject harness/projection vocabulary in this neutral policy and require the call-cap expression to remain directly matchable.

### Step 1 — Shared progress contract wording

**Plan:** Modify only the canonical explorer policy.
**Final:** Also corrected progress-rendering and emission wording in shared coordinator cards, `sai/worker-core.md`, and `sai/commands/spec/worker.md`.
**Reason:** The complete suite exposed 16 pre-existing contract failures; the user explicitly authorized expanding scope, and these minimal changes restored the shared lifecycle contract without changing tests.

## Appendix: Execution Telemetry

| Step | dispatch | phase | attempts | first_failure | note |
|---|---|---|---|---|---|
| 1 | green-direct | implementation | 1 | n/a | |
| 1 | green-direct | green | 1 | other | Full-suite contract failures outside the policy file were corrected under authorized scope expansion. |

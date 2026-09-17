# Sequential pipeline (numbered commands)

All artifact paths below resolve under `openspec/changes/{change-name}/` (referred to as `{c}` for brevity).

These are the eight numbered phase commands. `/sai-build` chains `implement` → `apply`, while `/sai-review` chains `review` → whichever audits its triage recommends. The README emphasizes the composed workflow; this file is the full phase-by-phase reference.

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `/sai-1-spec` | feature description | `{c}/proposal.md`, `specs/**` | Describe what you want to build. The AI writes a proposal and acceptance criteria for you to review and approve — nothing else happens until you say yes. Creates only proposal/spec artifacts plus permitted glossary updates. |
| `/sai-2-design` | {change-name} | `{c}/design.md`, `tasks.md`, `interfaces.md` | Turns approved specs into a technical plan: architecture decisions, trade-offs, a concrete task list, and a per-step interface contract (`interfaces.md`) listing the new/modified public signatures and exact test assertions for each step. Ends at design completion — run `/sai-3-implement {name}` in a new chat. Supports `--fast-track` to auto-approve specs. |
| `/sai-3-implement` | {change-name} | `{c}/implementation.md` | Writes the full coding playbook — the "on-paper" implementation — to `openspec/changes/{change-name}/implementation.md`, then stops. `/sai-4-apply` follows it verbatim. |
| `/sai-4-apply` | {change-name} | code | Real implementation. Each testable step is split across two blind workers: **RED** authors the test from the `interfaces.md` assertions and confirms it fails by assertion, then **GREEN** copies the playbook code in and makes it pass — with no permission to modify the tests. Asks before each commit. Supports `--fast-track` to auto-commit and defer human checks to end-of-run. |
| `/sai-5-review` | {change-name} + diff | `{c}/review.md` | Runs 11 read-only analysis passes plus gated deterministic mutation analysis, then recommends specialized audits based on what changed. |
| `/sai-6-security` | {change-name} + diff | `{c}/security.md` | Finds security vulnerabilities in the diff — points to exact file and line, explains the risk, and maps findings to known standards (OWASP, CVE). |
| `/sai-7-performance` | {change-name} + diff | `{c}/performance.md` | Flags real performance bottlenecks (slow queries, heavy renders, unbounded loops). Evidence-based — no guesswork. |
| `/sai-8-accessibility` | {change-name} + diff | `{c}/accessibility.md` | Checks UI code for accessibility issues against WCAG 2.2 AA. Can also run browser-based tools for deeper analysis. |

### How commands are routed

Every numbered phase runs the same shape: a **coordinator** in your main session and a **worker** dispatched as a subagent. The coordinator owns dispatch, gates, and any git mutation; the worker owns the technical work and returns metadata only — artifact contents never travel in the payload. The two have independent model roles, so a phase can think expensively and execute cheaply.

Both harnesses preserve the same durable artifacts, gate wordings, and stop texts. Claude Code and opencode differ only in dispatch mechanics and model IDs.

- `/sai-2-design` — Claude Code uses a medium-effort coordinator with a medium-effort design worker (`sai-2-design-worker`); opencode declares `opencode-go/muse-spark-1.3-contributor` with `variant: xhigh` on the wrapper and `variant: high` on the worker. The fixed notice is acknowledged with `continue_after_notice`. Design ends at design completion — run `/sai-3-implement {name}` in a new chat. Proposal Complexity stays descriptive, never a routing gate.
- `/sai-3-implement` — the worker writes the full coding playbook to `openspec/changes/{change-name}/implementation.md`; `/sai-4-apply` follows it and copies each step's code verbatim, adjusting only for compilation errors or test failures.
- `/sai-4-apply` — the coordinator never edits code. It dispatches the RED and GREEN workers on the budget tier, re-verifies each result, prints a pre-commit files-modified report cross-checked against `tasks.md`, and asks before each commit.
- `/sai-commit`, `/sai-merge` — same shape without any openspec dependency. The worker drafts, the coordinator alone runs git.

> Full routing internals — envelopes, bindings, worker matrix, per-phase ownership boundaries — live in [AGENTS.md](../AGENTS.md), not here.

## Fast-track mode (`--fast-track`)

For low-risk or high-trust runs, six commands accept a `--fast-track` argument that auto-advances their approval gates instead of stopping to ask. A `> FAST-TRACK MODE ACTIVE` banner prints at the start of the run so the relaxed gating is never silent. `/sai-build` and `/sai-review` are not members: each strips an explicit `--fast-track` token as a no-op — build always injects fast-track for its chained apply segment, and review owns no questions of its own.

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-explore` | Skips both language gates (artifact review and crystallization). At a later Plan (unattended) activation, skips the overview-language ask and resolves `overview_language` to `None`. |
| `/sai-2-design` | Auto-approves the specs gate and records the approval in `.openspec.yaml`. |
| `/sai-4-apply` | Pre-authorizes every commit for the run, defers all human-verification checks into one combined list presented after the final sweep, and auto-stays on the current branch. |
| `/sai-archive` | Auto-proceeds the unchecked-items confirmation. |
| `/sai-backfill` | Skips the generated reconciliation questions, auto-proceeds the spec-conflict gate after reporting it verbatim, and accepts a crystallized `**Change name**` without confirming. |
| `/sai-merge` | Applies the full resolution scope without the scope gate. Clean merges never ask anything either way. |

Everything else stays intact. Fast-track never suppresses a safe-operations confirmation, never skips an input question (a missing diff-source token still asks), and never bypasses `/sai-explore`'s close selector or its POC go/no-go — the gates that authorize delegated writes are deliberately outside its reach.

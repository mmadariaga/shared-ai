# Sequential pipeline (numbered commands)

All artifact paths below resolve under `openspec/changes/{change-name}/` (referred to as `{c}` for brevity).

These are the numbered phase commands (number 5 is unused). [`/sai-build`](commands/sai-build.md) chains `implement` → `review` → a second `implement` run for the findings it selects, while [`/sai-deep-review`](commands/sai-deep-review.md) chains `review` → whichever audits its triage recommends → an `implement` run for the findings you select. The README emphasizes the composed workflow; this file is the full phase-by-phase reference.

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| [`/sai-1-spec`](commands/sai-1-spec.md) | `Ready to Propose` block, or change name + feedback | `{c}/proposal.md`, `specs/**` | Paste the `Ready to Propose` block from `/sai-explore` to create the change, or name an existing change to refine it. The AI writes a proposal and acceptance criteria for you to review; running `/sai-2-design` approves them. Creates only proposal/spec artifacts plus permitted glossary updates. |
| [`/sai-2-design`](commands/sai-2-design.md) | {change-name}, `--fast-track`, `--overview-lang <language>` | `{c}/design.md`, `tasks.md`, `interfaces.md`; optional `change-overview.md` | Invoking the command approves the specs. Produces decisions, ordered tasks, public signatures, and exact test assertions. Ends at design completion; request detailed implementation separately. |
| [`/sai-3-implement`](commands/sai-3-implement.md) | {change-name}, `--fast-track` (accepted and ignored) | Tests, code, one local commit per step, `{c}/build-log.md` | Implements the change's `tasks.md` end to end with no human in the loop: a RED worker writes each step's failing tests, a GREEN worker writes the production code, the run reviews each step adversarially and commits it, then applies the open fixable findings of the review and audit reports and runs the suites against a failure baseline. |
| [`/sai-4-review`](commands/sai-4-review.md) | {change-name} + diff, `--parent-branch` | `{c}/review.md` | Reviews the diff in a fresh worker with 11 read-only analysis passes and an adversary challenge, commits `review.md`, and recommends specialized audits based on what changed. Fixes nothing. |
| [`/sai-6-security`](commands/sai-6-security.md) | {change-name} + diff, `--full`, `--path`, `--parent-branch` | `{c}/security.md` | Finds security vulnerabilities in the diff — points to exact file and line, explains the risk, and maps findings to known standards (OWASP, CVE). |
| [`/sai-7-performance`](commands/sai-7-performance.md) | {change-name} + diff, `--full`, `--path`, `--tier`, `--runtime`, `--parent-branch` | `{c}/performance.md` | Flags real performance bottlenecks (slow queries, heavy renders, unbounded loops). Evidence-based — no guesswork. |
| [`/sai-8-accessibility`](commands/sai-8-accessibility.md) | {change-name} + diff, `--full`, `--path`, `--runtime`, `--parent-branch` | `{c}/accessibility.md` | Checks UI code for accessibility issues against WCAG 2.2 AA. Can also run browser-based tools for deeper analysis. |

### How commands are routed

Every numbered phase runs the same shape: a **coordinator** in your main session and a **worker** dispatched as a subagent. The coordinator owns dispatch, gates, and any git mutation; the worker owns the technical work and returns metadata only — artifact contents never travel in the payload. The two have independent model roles, so a phase can think expensively and execute cheaply.

Both harnesses preserve the same durable artifacts, gate wordings, and stop texts. Claude Code and opencode differ only in dispatch mechanics and model IDs.

- `/sai-2-design` — the coordinator takes its model from the wrapper frontmatter, and the design worker (`sai-2-design-worker`) takes its model from its installed agent file, seeded from the manifest's `worker-matrix`. The fixed notice is acknowledged with `continue_after_notice`. Design ends at design completion — run `/sai-3-implement {name}` in a new chat.
- `/sai-3-implement` and `/sai-4-review` — their coordinators run in your main session outside the shared orchestration; separate live workers own tests, production changes, and the review. The coordinator commits locally per step and stops only for force majeure.
- `/sai-commit`, `/sai-merge` — same shape without any openspec dependency. The worker drafts, the coordinator alone runs git.

> Full routing internals — envelopes, bindings, worker matrix, per-phase ownership boundaries — live in [AGENTS.md](../AGENTS.md), not here.

## Fast-track mode (`--fast-track`)

For low-risk or high-trust runs, five commands accept a `--fast-track` argument that auto-advances a fixed set of approval gates instead of stopping to ask. A `> FAST-TRACK MODE ACTIVE` banner prints when the mode activates so the relaxed gating is never silent (`/sai-backfill` honors the flag with no banner). `/sai-3-implement`, `/sai-4-review`, `/sai-build`, and `/sai-deep-review` are not members: each accepts and ignores an explicit `--fast-track` token, because invoking them already authorizes their local commits and they ask nothing mid-run (`/sai-deep-review` asks one findings round at the end, and a runtime question only with `--runtime`).

The on-demand members are also listed in [On-demand commands](on-demand-commands.md#fast-track-mode---fast-track).

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-explore` | Skips both language gates (artifact review and crystallization). In round 3 of the route round (applied only for Plan (unattended)), skips the overview-language ask and resolves `overview_language` to `None`. An explicit `--overview-lang` still suppresses the ask in every mode; under Direct Build (unattended) it is a no-op. A [project setting](project-settings.md) for the crystallization or overview language question answers it before fast-track applies. |
| `/sai-2-design` | Auto-approves the specs approval gate. |
| `/sai-backfill` | Skips the generated reconciliation questions, auto-proceeds the spec-conflict gate after reporting it verbatim, and accepts a crystallized `**Change name**` without confirming. |
| `/sai-merge` | Pins the method to `Merge` and applies each complete strategy after presenting it, including later conflicts. Normal mode asks to apply, revise, or decline. |

Everything else stays intact. Fast-track never suppresses a safe-operations confirmation, never skips an input question (a missing diff-source token still asks), and never bypasses `/sai-explore`'s close selector or its POC go/no-go — the gates that authorize delegated writes are deliberately outside its reach.

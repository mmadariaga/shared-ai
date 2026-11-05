# Sequential pipeline (numbered commands)

All artifact paths below resolve under `openspec/changes/{change-name}/` (referred to as `{c}` for brevity).

These are the numbered phase commands (continuous sequence 1–7). [`/sai-plan`](commands/sai-plan.md) chains `spec` → `design` from a `Ready to Propose` block, [`/sai-build`](commands/sai-build.md) chains `implement` → `review` → a second `implement` run for the findings it selects, while [`/sai-deep-review`](commands/sai-deep-review.md) chains `review` → whichever audits its triage recommends → an Assessment pass → an `implement` run for the findings the pass leaves. The README emphasizes the composed workflow; this file is the full phase-by-phase reference.

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| [`/sai-1-spec`](commands/sai-1-spec.md) | `Ready to Propose` block, or change name + feedback | `{c}/proposal.md`, `specs/**` | Paste the `Ready to Propose` block from `/sai-explore` to create the change, or name an existing change to refine it. The AI writes a proposal and acceptance criteria unattended, checks and reviews them, and commits them locally; running `/sai-2-design` approves them. Creates only proposal/spec artifacts plus permitted glossary updates. |
| [`/sai-2-design`](commands/sai-2-design.md) | {change-name} (+ feedback), `--overview-lang <language>` | `{c}/design.md`, `tasks.md`, `interfaces.md`; optional `change-overview.md` | Invoking the command approves the specs. Runs unattended: produces decisions, ordered tasks, public signatures, and exact test assertions, checks and reviews them, and commits them locally. Ends at design completion; request detailed implementation separately. |
| [`/sai-3-implement`](commands/sai-3-implement.md) | {change-name} | Tests, code, one local commit per step | Implements the change's `tasks.md` end to end with no human in the loop: a RED worker writes each step's failing tests, a GREEN worker writes the production code, the run reviews each step adversarially and commits it, then applies the open fixable findings of the review and audit reports and runs the suites against a failure baseline. |
| [`/sai-4-review`](commands/sai-4-review.md) | {change-name} + diff, `--parent-branch` | `{c}/review.md` | Reviews the diff in a fresh worker with 11 read-only analysis passes and an adversary challenge, commits `review.md`, and recommends specialized audits based on what changed. Fixes nothing. |
| [`/sai-5-security`](commands/sai-5-security.md) | {change-name} + diff, `--full`, `--path`, `--parent-branch` | `{c}/security.md` | Finds security vulnerabilities in the diff — points to exact file and line, explains the risk, and maps findings to known standards (OWASP, CVE). |
| [`/sai-6-performance`](commands/sai-6-performance.md) | {change-name} + diff, `--full`, `--path`, `--tier`, `--runtime`, `--parent-branch` | `{c}/performance.md` | Flags real performance bottlenecks (slow queries, heavy renders, unbounded loops). Evidence-based — no guesswork. |
| [`/sai-7-accessibility`](commands/sai-7-accessibility.md) | {change-name} + diff, `--full`, `--path`, `--runtime`, `--parent-branch` | `{c}/accessibility.md` | Checks UI code for accessibility issues against WCAG 2.2 AA. Can also run browser-based tools for deeper analysis. |

### How commands are routed

Commands use a **coordinator** in your main session to direct the run and
**workers** for technical work. Their models can be configured separately through
project `setup`; see [model customization](models.md). This lets you balance
reasoning quality and cost by role.

Claude Code and opencode offer the same workflow and artifacts. Each command's
usage page explains its approvals, local commits, and recovery behavior. For
implementation details about routing and worker ownership, see
[AGENTS.md](../AGENTS.md#repository-structure).

## Fast-track mode (`--fast-track`)

Only two commands accept a `--fast-track` argument that activates fast-track
mode: `/sai-backfill` and `/sai-archive`.

See [On-demand commands](on-demand-commands.md#fast-track-mode---fast-track) for
banner behavior and the full fast-track contract.

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-backfill` | Skips the generated reconciliation questions, auto-proceeds the spec-conflict gate after reporting it verbatim, and accepts a crystallized `**Change name**` without confirming. |
| `/sai-archive` | Skips the commit selector after the archive and creates the local commit directly. Other safety confirmations remain. |

Everything else stays intact. Fast-track never suppresses a safe-operations confirmation, and never skips an input question (a missing diff-source token still asks).

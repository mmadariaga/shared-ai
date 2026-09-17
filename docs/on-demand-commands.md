# On-demand commands (full reference)

This is the full unnumbered command reference.
The README keeps short [Main commands](../README.md#main-commands) and [Utility commands](../README.md#utility-commands) tables; the longer descriptions live here.

| Command | Purpose |
|---------|---------|
| `/sai-explore` | Open-ended thinking session before committing to anything — good for fuzzy requirements, unclear trade-offs, or when you just want to think out loud with the AI. When a feature is too big for one reviewable change, it slices the idea into a Walking Skeleton plus a dependency-ordered backlog, each ready to enter the pipeline as its own change; when it detects friction at the integration point (mixed responsibilities, no clean extension seam), it prepends a behavior-preserving SOLID refactor as *slice 0* so the feature attaches by extension. When it hits genuine technical uncertainty it can first run a throwaway POC to answer it. On close it offers three routes — see [Choose your implementation strategy](../README.md#choose-your-implementation-strategy). In Manual mode it also offers a review loop over the changes tracked in the session. Supports `--fast-track` to skip the language gates. |
| `/sai-build` | User-invoked shortcut for a complete implementation run — chains `/sai-3-implement` into `/sai-4-apply` with one change resolution and no intermediate approval. Implement and apply fast-track are always injected; an explicit `--fast-track` token is a no-op. |
| `/sai-review` | User-invoked shortcut for review plus conditional audit fan-out — runs `/sai-5-review` and then dispatches the recommended audits (`/sai-6-security`, `/sai-7-performance`, `/sai-8-accessibility`) in one invocation based on the triage parse. An explicit `--fast-track` token is a no-op. |
| `/sai-commit` | Reads your staged changes and detects the repo's commit style from the last 20 commits (Conventional Commits shape, type/scope vocabulary, body conventions). Adopts the detected vocabulary when it fits, falls back to hard-coded rules otherwise. Shows a pre-commit file report and runs `git commit` only after you explicitly approve. |
| `/sai-merge` | Merges a local branch into the current branch with conflict-triggered language selection and an iterative, global resolution strategy: after conflicts are detected it asks for the working language, presents worker analysis as text, routes closed decisions through the native picker, and lets you request context or correct the complete plan before any write. It preserves complete alternatives, safe-synthesis rules, new-conflict re-entry, and an incremental ADR/DDR collision pass scoped to source-branch records introduced by the merge, verification loop (up to 3 rounds), coordinator-only mutations, and explicit final-commit authorization. Clean merges never ask for a language or strategy; `--fast-track` bypasses only the scope gate. |
| `/sai-pr` | Drafts a complete PR description using everything produced during the change (proposal, design, review findings, etc.). Opens the PR on GitHub after you approve. |
| `/sai-archive` | Routed command: the coordinator runs in the main session and dispatches the `sai-archive-worker` managed worker for the read-only pre-flight. The ordinary route keeps mutation in the coordinator; the Direct Build (unattended) route gives the existing worker a validated, explicitly authorized sync/move/stage/commit order. Moves a completed change to the archive, keeping your active changes folder clean. Supports `--fast-track` to auto-proceed the unchecked-items gate. |
| `/sai-status` | Read-only progress panel — shows which of the eleven sai-workflow artifacts exist, the specs approval state, implementation progress, the archive location if archived, and a `Next:` hint suggesting the appropriate `/sai-N` command. Takes a change name for a single-change panel, or none for a table over every active change. Never writes anything. |
| `/sai-worktree` | Interactive git worktree manager — inventory, create, and delete linked worktrees with a Create/Delete/Exit selector loop. Names follow one convention: the `<main-dir>.worktree-<n>` sibling directory maps to the `worktree-<n>` branch, and `n` is the first free slot. Creating one also runs a best-effort `codegraph init` in it. No OpenSpec prerequisites. |
| `/sai-retire-docs` | Read-only, index-driven analysis of active ADRs, DDRs, and related specifications. Correlates bounded evidence, classifies candidates, and asks for explicit per-candidate confirmation before any archival move. |
| `/sai-backfill` | Routed command: the coordinator runs in the main session and dispatches the sai-backfill-worker managed worker for inspection, interview, conflict scan, and draft composition, then validates the drafts against the sai-workflow schema. The ordinary route writes them in the coordinator; Direct Build (unattended) sends a validated, explicitly authorized draft order to the same worker. Made a quick fix directly in code without going through the pipeline? This reconstructs the missing documentation after the fact - interviewing you about intent and writing only what can be reliably derived from the diff. Supports `--fast-track` to skip generated reconciliation questions, auto-proceed the spec-conflict gate, and accept a crystallized change name without confirming. |

## Fast-track mode (`--fast-track`)

For low-risk or high-trust runs, seven commands accept a `--fast-track` argument that auto-advances a fixed set of approval gates instead of stopping to ask. A `> FAST-TRACK MODE ACTIVE` banner prints when the mode activates so the relaxed gating is never silent (`/sai-backfill` honors the flag with no banner). `/sai-build` and `/sai-review` are not members: each strips an explicit `--fast-track` token as a no-op — build always injects fast-track for both its chained implement segment and its chained apply segment (one banner at implement activation), and review owns no questions of its own.

The numbered pipeline members are also listed in [Sequential pipeline](sequential-pipeline.md#fast-track-mode---fast-track).

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-explore` | Skips both language gates (artifact review and crystallization). At a later Plan (unattended) activation, skips the overview-language ask and resolves `overview_language` to `None`. An explicit `--overview-lang` still suppresses the ask in every mode; under Direct Build (unattended) it is a no-op. |
| `/sai-2-design` | Auto-approves the specs approval gate. |
| `/sai-3-implement` | Auto-corrects a `sai-2` defect that has exactly one preserving correction path; auto-approves the documentation-area permission ask. Defects in `sai-1` always escalate. |
| `/sai-4-apply` | Pre-authorizes every commit for the run, defers all human-verification checks into one combined list presented after the final sweep, and auto-stays on the current branch. |
| `/sai-archive` | Auto-proceeds the unchecked-items confirmation. |
| `/sai-backfill` | Skips the generated reconciliation questions, auto-proceeds the spec-conflict gate after reporting it verbatim, and accepts a crystallized `**Change name**` without confirming. |
| `/sai-merge` | Applies the full resolution scope without the scope gate. Clean merges never ask anything either way. |

Everything else stays intact. Fast-track never suppresses a safe-operations confirmation, never skips an input question (a missing diff-source token still asks), and never bypasses `/sai-explore`'s close selector or its POC go/no-go — the gates that authorize delegated writes are deliberately outside its reach.

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

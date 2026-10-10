# On-demand commands (full reference)

This is the full unnumbered command and workflow-skill reference for Claude Code and opencode.
The README keeps short [Main commands](../README.md#main-commands), [Utility commands](../README.md#utility-commands), and [Backlog integration](../README.md#backlog-integration) tables; the longer descriptions live here.

| Command | Purpose |
|---------|---------|
| [`/new-change-branch`](commands/new-change-branch.md) (skill) | Create and switch to a local `feat`, `fix`, `docs`, or `chore` branch. Reuse the discussion for its name and optional work-item ID; always ask for the base. Preserve existing work, with no fetch, stash, commit, or push. |
| [`/from-backlog <reference>`](commands/from-backlog.md) (skill) | Import a GitHub/GitLab issue or Azure DevOps Services work item, including description and comments, for discussion. Read-only; does not start implementation. |
| [`/from-next-backlog-item`](commands/from-next-backlog-item.md) (skill) | With no arguments, resolve a backlog destination from context and remotes, select a highest-priority eligible item, then import it. Unsupported or unverifiable selections stay pending. |
| [`/to-backlog`](commands/to-backlog.md) (skill) | Create a GitHub issue plus Project insertion, a GitLab issue, or an Azure Boards work item; update only the originating item's title and description when the conversation has an origin. Requires explicit full-content approval. |
| [`/sai-explore`](commands/sai-explore.md) | Open-ended thinking session before committing to anything — good for fuzzy requirements, unclear trade-offs, or when you just want to think out loud with the AI. When a feature is too big for one reviewable change, it slices the idea into a Walking Skeleton plus a dependency-ordered backlog, each ready to enter the pipeline as its own change; when it detects friction at the integration point (mixed responsibilities, no clean extension seam), it prepends a behavior-preserving SOLID refactor as *slice 0* so the feature attaches by extension. When the technical approach is unproven or a bug has competing root-cause theories, it can run a throwaway POC before the edge-case review — an experiment that discriminates between the candidates you agreed on. On close it offers three routes — see [Choose your implementation strategy](../README.md#choose-your-implementation-strategy). In Manual mode it also offers a review loop over the changes tracked in the session. Supports `--fast-track` to skip the language gates. |
| [`/sai-build`](commands/sai-build.md) | User-invoked shortcut for a complete implementation run — chains `/sai-3-implement` into `/sai-4-apply` with one change resolution and no intermediate approval. Implement and apply fast-track are always injected; an explicit `--fast-track` token is a no-op. |
| [`/sai-review`](commands/sai-review.md) | Review the diff, run recommended audits, then offer one final selection round to fix open findings. `--full` or `--path` runs every audit; `--runtime` enables permission-gated diagnostics/browser checks. Also accepts `--tier` and `--parent-branch`. `--fast-track` is a no-op. |
| [`/sai-commit`](commands/sai-commit.md) | Reads your staged changes and detects the repo's commit style from the last 20 commits (Conventional Commits shape, type/scope vocabulary, body conventions). Adopts the detected vocabulary when it fits, falls back to hard-coded rules otherwise. Shows a pre-commit file report and runs `git commit` only after you explicitly approve. |
| [`/sai-merge`](commands/sai-merge.md) | Integrate a branch using `Merge`, `Rebase`, or `Rebase with squash`. Resolve all conflicts and repair ADR/DDR collisions. Invocation authorizes local finalization, not push or destructive actions. Normal mode approves/revises/declines strategies; `--fast-track` pins `Merge` and applies each strategy after presentation. Clean integrations ask for no language or strategy. |
| [`/to-pr`](commands/to-pr.md) (skill) | Create/update a GitHub PR, GitLab MR, or Azure Repos PR from committed changes. OpenSpec is optional. Approve the full title and description before publication; approve any required push separately. |
| [`/sai-archive`](commands/sai-archive.md) | Check pending actions, synchronize specs, and move a completed change into the archive. Offers a local commit afterward. `--fast-track` proceeds past unchecked items; safety confirmations remain. Direct Build uses its already-authorized one-commit route. |
| [`/sai-status`](commands/sai-status.md) | Read-only progress panel — shows the workflow artifacts, specs approval, implementation progress, archive location, and a `Next:` hint. Takes a change name for a single-change panel, or none for a table over every active change. |
| [`/sai-worktree`](commands/sai-worktree.md) | Interactive git worktree manager — inventory, create, and delete linked worktrees with a Create/Delete/Exit selector loop. Names follow one convention: the `<main-dir>.worktree-<n>` sibling directory maps to the `worktree-<n>` branch, and `n` is the first free slot. Creating one also runs a best-effort `codegraph init` in it. No OpenSpec prerequisites. |
| [`/sai-retire-docs`](commands/sai-retire-docs.md) | Read-only, index-driven analysis of active ADRs, DDRs, and related specifications. Correlates bounded evidence, classifies candidates, and asks for explicit per-candidate confirmation before any archival move. |
| [`/sai-backfill`](commands/sai-backfill.md) | Reconstruct proposal/specs for a code-first change from the diff and an intent interview, then validate before writing. Select the source with `--staged`, `--unstaged`, or `--diff <sha>`, or use the picker. `--fast-track` skips generated reconciliation, proceeds past reported spec conflicts, and accepts a crystallized name without confirming. |

## Fast-track mode (`--fast-track`)

For low-risk or high-trust runs, seven commands accept a `--fast-track` argument that auto-advances a fixed set of approval gates instead of stopping to ask. A `> FAST-TRACK MODE ACTIVE` banner prints when the mode activates so the relaxed gating is never silent (`/sai-backfill` honors the flag with no banner). `/sai-build` and `/sai-review` are not members: each strips an explicit `--fast-track` token as a no-op — build always injects fast-track for both its chained implement segment and its chained apply segment (one banner at implement activation), and review asks nothing mid-run unless `--runtime` is passed.

The numbered pipeline members are also listed in [Sequential pipeline](sequential-pipeline.md#fast-track-mode---fast-track).

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-explore` | Skips both language gates (artifact review and crystallization). At a later Plan (unattended) activation, skips the overview-language ask and resolves `overview_language` to `None`. An explicit `--overview-lang` still suppresses the ask in every mode; under Direct Build (unattended) it is a no-op. |
| `/sai-2-design` | Auto-approves the specs approval gate. |
| `/sai-3-implement` | Auto-corrects a `sai-2` defect that has exactly one preserving correction path; auto-approves the documentation-area permission ask. Defects in `sai-1` always escalate. |
| `/sai-4-apply` | Pre-authorizes commits for the run, auto-stays on a non-detached current branch, and approves preserving plan amendments. Pending functional checks are reported at the end. |
| `/sai-archive` | Auto-proceeds the unchecked-items confirmation. |
| `/sai-backfill` | Skips the generated reconciliation questions, auto-proceeds the spec-conflict gate after reporting it verbatim, and accepts a crystallized `**Change name**` without confirming. |
| `/sai-merge` | Pins the method to `Merge` and applies each complete strategy after presenting it, including later conflicts. Normal mode asks to apply, revise, or decline. |

Everything else stays intact. Fast-track never suppresses a safe-operations confirmation, never skips an input question (a missing diff-source token still asks), and never bypasses `/sai-explore`'s close selector or its POC go/no-go — the gates that authorize delegated writes are deliberately outside its reach.
Apply's already-satisfied decision, worker-veto override, and exhausted-Step retry also always require your explicit answer, including inside `/sai-build`.

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

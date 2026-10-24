# On-demand commands (full reference)

This is the full unnumbered command reference for Claude Code and opencode.
The README keeps short [Main commands](../README.md#main-commands) and [Utility commands](../README.md#utility-commands) tables; the longer descriptions live here. Backlog and branch skills are in the [backlog command reference](backlog-commands.md).

| Command | Purpose |
|---------|---------|
| [`/sai-cache-warmer`](commands/sai-cache-warmer.md) | Explicit periodic waits in the current conversation until a local target time plus one minute, on Claude Code and opencode. No OpenSpec prerequisite; cache retention and savings are not guaranteed. |
| [`/sai-context-cache-ttl-benchmark`](commands/sai-context-cache-ttl-benchmark.md) | Context-preserving, explicitly consented cache-lifetime experiment in main or same-model subagent mode. opencode V2 uses the existing session API; Claude Code is driven from inside the live session (background waits, `SendMessage`, transcript usage) and reserves it for the run. No OpenSpec prerequisite. |
| [`/sai-explore`](commands/sai-explore.md) | Open-ended thinking session before committing to anything — good for fuzzy requirements, unclear trade-offs, or when you just want to think out loud with the AI. When a feature is too big for one reviewable change, it slices the idea into a Walking Skeleton plus a dependency-ordered backlog, each ready to enter the pipeline as its own change; when it detects friction at the integration point (mixed responsibilities, no clean extension seam), it prepends a behavior-preserving SOLID refactor as *slice 0* so the feature attaches by extension. When the technical approach is unproven or a bug has competing root-cause theories, it can run a throwaway POC before the edge-case review — an experiment that discriminates between the candidates you agreed on. On close it offers three routes — see [Choose your implementation strategy](../README.md#choose-your-implementation-strategy). In Manual mode it also offers a review loop over the changes tracked in the session. Supports `--fast-track` to skip the language gates. |
| [`/sai-plan`](commands/sai-plan.md) | Plan a change in one run — it chains [`/sai-1-spec`](commands/sai-1-spec.md) then [`/sai-2-design`](commands/sai-2-design.md) from a `Ready to Propose` block, answers worker questions itself, checks and reviews each segment, and commits locally per segment. An explicit `--fast-track` token is ignored. |
| [`/sai-build`](commands/sai-build.md) | Build a change in one run — it chains [`/sai-3-implement`](commands/sai-3-implement.md), then one [`/sai-4-review`](commands/sai-4-review.md) pass, fixes the findings it judges justified with a second `/sai-3-implement` run, and closes with the fixed and excluded findings. Local commits are pre-authorized; an explicit `--fast-track` token is ignored. |
| [`/sai-deep-review`](commands/sai-deep-review.md) | Review the diff, run recommended audits, then offer one final selection round to fix open findings through a `/sai-3-implement` segment. `--full` or `--path` runs every audit; `--runtime` enables permission-gated diagnostics/browser checks. Also accepts `--tier` and `--parent-branch`. `--fast-track` is a no-op. |
| [`/sai-commit`](commands/sai-commit.md) | Reads your staged changes and detects the repo's commit style from the last 20 commits (Conventional Commits shape, type/scope vocabulary, body conventions). Adopts the detected vocabulary when it fits, falls back to hard-coded rules otherwise. Shows a pre-commit file report and runs `git commit` only after you explicitly approve, and `Allow on this session` skips later commit approvals in that session. |
| [`/sai-merge`](commands/sai-merge.md) | Integrate a branch using `Merge`, `Rebase`, or `Rebase with squash`. Resolve all conflicts and repair ADR/DDR collisions. Invocation authorizes local finalization, not push or destructive actions. Normal mode approves/revises/declines strategies; `--fast-track` pins `Merge` and applies each strategy after presentation. Clean integrations ask for no language or strategy. |
| [`/sai-archive`](commands/sai-archive.md) | Synchronize specs and move a completed change into the archive. Offers a local commit afterward. `--fast-track` creates that commit directly; safety confirmations remain. Direct Build uses its already-authorized one-commit route. |
| [`/sai-status`](commands/sai-status.md) | Read-only progress panel — shows the workflow artifacts, specs approval, implementation progress, archive location, and a `Next:` hint. Takes a change name for a single-change panel. Without one, it asks which change to show, with a `See all` table option. |
| [`/sai-worktree`](commands/sai-worktree.md) | Interactive git worktree manager — inventory, create, and delete linked worktrees with a Create/Delete/Exit selector loop. Names follow one convention: the `<main-dir>.worktree-<n>` sibling directory maps to the `worktree-<n>` branch, and `n` is the first free slot. Creating one also runs a best-effort `codegraph init` in it. No OpenSpec prerequisites. |
| [`/sai-retire-docs`](commands/sai-retire-docs.md) | Read-only, index-driven analysis of active ADRs, DDRs, and related specifications. Correlates bounded evidence, classifies candidates, and asks for explicit per-candidate confirmation before any archival move. |
| [`/sai-backfill`](commands/sai-backfill.md) | Reconstruct proposal/specs for a code-first change from the diff and an intent interview, then validate before writing. Select the source with `--staged`, `--unstaged`, or `--diff <sha>`, or use the picker. `--fast-track` skips generated reconciliation, proceeds past reported spec conflicts, and accepts a crystallized name without confirming. |

## Fast-track mode (`--fast-track`)

For low-risk or high-trust runs, four commands accept a `--fast-track` argument that auto-advances a fixed set of approval gates instead of stopping to ask. A `> FAST-TRACK MODE ACTIVE` banner prints when the mode activates so the relaxed gating is never silent (`/sai-backfill` honors the flag with no banner). `/sai-1-spec`, `/sai-2-design`, `/sai-plan`, `/sai-3-implement`, `/sai-4-review`, `/sai-build`, and `/sai-deep-review` are not members: each accepts and ignores an explicit `--fast-track` token, because invoking them already authorizes their local commits and they ask nothing mid-run (`/sai-deep-review` asks one findings round at the end, and a runtime question only with `--runtime`).

The numbered pipeline members are also listed in [Sequential pipeline](sequential-pipeline.md#fast-track-mode---fast-track).

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-explore` | Skips both language gates (artifact review and crystallization). In round 3 of the route round (applied only for Plan (unattended)), skips the overview-language ask and resolves `overview_language` to `None`. An explicit `--overview-lang` still suppresses the ask in every mode; under Direct Build (unattended) it is a no-op. A [project setting](project-settings.md) for the crystallization or overview language question answers it before fast-track applies. |
| `/sai-backfill` | Skips the generated reconciliation questions, auto-proceeds the spec-conflict gate after reporting it verbatim, and accepts a crystallized `**Change name**` without confirming. |
| `/sai-merge` | Pins the method to `Merge` and applies each complete strategy after presenting it, including later conflicts. Normal mode asks to apply, revise, or decline. |
| `/sai-archive` | Skips the commit selector after the archive and creates the local commit directly. Other safety confirmations remain. |

Everything else stays intact. Fast-track never suppresses a safe-operations confirmation, never skips an input question (a missing diff-source token still asks), and never bypasses `/sai-explore`'s close selector or its POC go/no-go — the gates that authorize delegated writes are deliberately outside its reach.

## Skipping the full SAI workflow while keeping specs updated

The full SAI workflow can be overkill for small changes.

- **Backfill a manual change** — when you made a quick fix directly in code without going through the SAI workflow, use `/sai-backfill` to reconstruct the missing artifacts after the fact:

  ```
  # 1. Make the fix manually:
  git add -A
  git commit -m "fix: changed error message for expired tokens"

  # 2. Regularize it with backfill:
  /sai-backfill

  # Choose the diff source (staged, unstaged, or a base commit) in the picker.
  # The change name is inferred from the diff and the interview, and
  # you confirm it. The command runs a structured interview to extract intent,
  # detects conflicts with existing specs, and writes only
  # derivable artifacts (proposal.md + specs/**).
  ```

  Backfill does **not** generate `design.md`, `tasks.md`, or `interfaces.md` — those require decisions that cannot be reliably inferred from the diff alone. Use it for small fixes, typo corrections, or config changes where the code change is self-explanatory.

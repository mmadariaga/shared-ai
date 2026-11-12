# On-demand commands

Use this index to choose an unnumbered command in Claude Code or opencode. Follow
its link for syntax, options, approvals, and recovery. Backlog and branch skills
are in the [backlog command reference](backlog-commands.md).

| Command | Purpose |
|---------|---------|
| [`/sai-cache-warmer`](commands/sai-cache-warmer.md) | Keep this conversation active until a chosen time; cache retention and savings are not guaranteed. |
| [`/sai-context-cache-ttl-benchmark`](commands/sai-context-cache-ttl-benchmark.md) | Measure context-cache lifetime through an explicitly authorized experiment in this conversation or a same-model subagent. |
| [`/sai-explore`](commands/sai-explore.md) | Clarify an idea, split large work into slices, and choose Plan, Direct Build, or Manual. |
| [`/sai-plan`](commands/sai-plan.md) | Prepare, check, and review specs and design in one run, with a local commit per segment and an optional draft PR/MR offer. |
| [`/sai-build`](commands/sai-build.md) | Implement, review, and apply the fixes it selects, with local commits authorized by invocation. |
| [`/sai-deep-review`](commands/sai-deep-review.md) | Review, run relevant audits, and automatically apply the fixes it judges justified, with local commits. |
| [`/sai-direct-build`](commands/sai-direct-build.md) | Implement, review, backfill, archive, and commit one local change from a `Ready to Propose` block file: `/sai-direct-build --block-file <path> --block-hash <sha256>`. Unattended; never pushes. |
| [`/sai-commit`](commands/sai-commit.md) | Draft a message for staged changes and commit after your approval. |
| [`/sai-merge`](commands/sai-merge.md) | Integrate a branch locally: `/sai-merge [<branch>] [--rebase\|--squash]`. Asks only at the start (branch, method, autostash) and on escalation; never pushes. |
| [`/sai-archive`](commands/sai-archive.md) | Sync specs, archive a completed change, and offer a local commit. |
| [`/sai-status`](commands/sai-status.md) | Show progress and a suggested next command for one change or all active changes, read-only. |
| [`/sai-worktree`](commands/sai-worktree.md) | Create or remove separate Git working folders for parallel work, with confirmation before removal. |
| [`/sai-retire-docs`](commands/sai-retire-docs.md) | Find obsolete decision records and specs; archive only candidates you approve. |
| [`/sai-retrospective`](commands/sai-retrospective.md) | Analyze past command runs, errors, instruction drift, and costs without modifying anything. |
| [`/sai-backfill`](commands/sai-backfill.md) | Reconstruct and validate proposal/specs from an implemented change and an intent interview. |

## Fast-track mode (`--fast-track`)

For low-risk or high-trust runs, two commands accept a `--fast-track` argument that auto-advances a fixed set of approval gates instead of stopping to ask: `/sai-backfill` and `/sai-archive`. `/sai-archive` prints a `> FAST-TRACK MODE ACTIVE` banner; `/sai-backfill` honors the flag with no banner.

See also [Sequential pipeline](sequential-pipeline.md#fast-track-mode---fast-track).

| Command | What `--fast-track` skips |
|---------|---------------------------|
| `/sai-backfill` | Skips the generated reconciliation questions, auto-proceeds the spec-conflict gate after reporting it verbatim, and accepts a crystallized `**Change name**` without confirming. |
| `/sai-archive` | Skips the commit selector after the archive and creates the local commit directly. Other safety confirmations remain. |

Everything else stays intact. Fast-track never suppresses a safe-operations confirmation, and never skips an input question (a missing diff-source token still asks).

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

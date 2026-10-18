# `/sai-4-review`

## Command function

Reviews a change's diff against its parent branch in a fresh worker and writes `openspec/changes/{change}/review.md`. It only reviews: it fixes no finding. `/sai-3-implement` applies open findings, so fixes keep one owner. It works on Claude Code and opencode.

## Flags and behavior modifiers

- `--parent-branch <branch>`: the branch the diff is taken against. Default: the repository default branch, else `master`, else `main`.
- `--fast-track`: accepted and ignored. The command already runs with no human in the loop.

## In detail

Without a change name, the command takes the only active change that has a `proposal.md`. With none or several, it prints the candidates and stops so you can name one. It asks nothing else between resolving the change and its close, and it has no change picker.

A fresh `sai-4-review-worker` reads the change artifacts and the diff, and applies the eleven review passes: domain alignment, correctness, security, performance, and accessibility triage, maintainability, testing, consistency, domain language, documentation and migrations, and resilience. Large diffs (over 500 changed lines) are inspected in groups through `budget-explorer` subagents. A `budget-explorer` adversary challenges the draft to discard false positives and correct severities. The report format is the one every audit report shares, and `/sai-3-implement` reads it.

When `openspec/changes/{change}/build-log.md` lists pending findings from an earlier implementation run, the worker treats them as leads: it checks each against the current diff and writes into `review.md` only the ones that still hold.

An empty diff ends the command with `No changes detected against {parent-branch}. Nothing to review.` It writes no report and commits nothing.

The command checks the finished `review.md` itself: every finding has an identifier and the closing `Summary:` tally matches the findings. When the worker cannot produce a valid report, the command tries up to 3 different approaches and then asks you how to continue, with an option to stop.

It then prints the severity counts, the top Critical findings, the report path, and the recommended security, performance, and accessibility audits. It runs no audit. A new review regenerates `review.md` completely, replacing earlier findings, their ` (FIXED)` marks, and your deletions.

`review.md` is staged alone and committed in one local commit only when the project's ignore rules do not ignore it. An ignored `review.md` stays on disk, and nothing is force-added or pushed. Paths that were already staged or modified before the run never enter the commit.

The command ends with `Review done.`.

To apply the findings, review `review.md`, delete the findings you do not want (or mark them ` (EXCLUDED: <reason>)`), and run [`/sai-3-implement`](sai-3-implement.md). [`/sai-build`](sai-build.md) runs the implementation, this review, and the fixes it selects in one invocation.

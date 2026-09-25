# Review Step — Establish Diff Scope

Active step: establish-diff-scope. The step is done when the parent branch, the diff's file list, totals, and commit map are known and the review mode is chosen; then report the `establish-diff-scope` progress event per the worker contract.

1. **Parent branch.** Take the first candidate that `git rev-parse --verify <branch>` accepts: the supplied parent branch; else the repo default from `git symbolic-ref --short refs/remotes/origin/HEAD` with the `origin/` prefix stripped; else `master`; else `main`. When no candidate verifies, return `failed` naming the candidates tried.
2. **File list.** Run `git diff --name-status {parent-branch}...HEAD`. When it is empty, report this step's progress event, then return `cancelled` with exactly `No changes detected against {parent-branch}. Nothing to review.`
3. **Totals and commits.** Run `git diff --stat {parent-branch}...HEAD` for line totals only, and `git log {parent-branch}..HEAD --oneline` for the commit map.
4. **Change artifacts.** Read them per `common.md` § Change artifacts and extract the feature goal, the accepted and discarded decisions, the architecture decisions and trade-offs, the per-capability acceptance criteria, and the technologies, standards, and quality bar in scope.
5. **Review mode.**
   - **Direct** (total ≤ 500 changed lines) — load the full diff with `git diff {parent-branch}...HEAD`.
   - **Delegated** (total > 500) — keep the full diff out of your context. Partition the changed files into at most eight logical groups; the analysis step inspects each group through one `budget-explorer`.

# Review Step — Establish Diff Scope

Active step: establish-diff-scope. Establish the diff scope for the review, then report the `establish-diff-scope` progress event per the worker contract.

### Step 1: Establish Diff Scope

1. Read the change artifacts. Extract:
     - Feature goal and accepted/discarded decisions (from `proposal.md`)
     - Architecture decisions and trade-offs (from `design.md`, if present)
     - Per-capability acceptance criteria (from each `specs/**/*.md`)
     - Technologies, standards, and quality bar in scope
2. Determine the parent branch (see Required Inputs).
3. Compute the diff:
     - File list: `git diff --name-status {parent-branch}...HEAD`
     - Line count: `git diff --stat {parent-branch}...HEAD` (no content — just totals)
     - Commit map: `git log {parent-branch}..HEAD --oneline`
     - **If total LOC ≤ 500:** load the full diff with `git diff {parent-branch}...HEAD` and review directly.
     - **If total LOC > 500:** do NOT load the full diff. Instead, delegate per-file inspection to **`budget-explorer`** subagents (one per file or logical group) with output contract: file:line + finding category + ≤80 words per finding.
4. Verify the diff is non-empty. If empty, respond with: **"No changes detected against {parent-branch}. Nothing to review."** and STOP.

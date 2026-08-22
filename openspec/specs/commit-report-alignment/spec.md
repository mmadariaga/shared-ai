# commit-report-alignment Specification

## Purpose

Keep the pre-commit file report a user sees in `sai-commit` structurally identical to the one `sai-4-apply` emits, so moving between the two commands shows one consistent shape.

## Requirements

### Requirement: sai-commit Step 6 emits the same pre-commit file report structure

The sai-commit flow's authorization step SHALL keep the structured pre-commit file report that `sai-4-apply` emits, so a user moving between the two commands sees one consistent shape. In the routed architecture the worker authors the report in its Step 6 (Present and Authorize) from `git status` + `git diff --cached --stat`, returns it as payload content inside the terminal summary, and the coordinator presents it verbatim alongside the ask. Where `sai-4-apply`'s report cross-checks against a plan and detects subagent/git mismatch, `sai-commit` does not — there is no plan, and no subagent beyond the phase worker itself. The report contains only sections derivable from `git status` and `git diff --cached --stat` alone.

The sections emitted by sai-commit SHALL be, in this order:

    1. A header line with no change name (the change is not necessarily present in `sai-commit`'s context) and the overall status letter (`OK` or `WARN`).
    2. A human-readable status line summarising the staging state.
    3. A `Staged` block listing each staged path with its `+N -M` count, one per line, paths relative to repo root.
    4. A `Totals` line in the format `Totals: <N> files, +<ins> -<del>` summing insertions and deletions across staged files.
    5. An `Unstaged (will NOT be committed)` block listing any unstaged, untracked, or otherwise-not-staged paths from `git status`, one per line. If there are none, the block is omitted entirely.

The sections `Plan cross-check` and `Subagent ↔ git` SHALL NOT appear in `sai-commit`'s report — both require inputs the command does not have. The status letter SHALL be `WARN` if the `Unstaged` block is non-empty, and `OK` otherwise. Presentation moves with the ask: on an active session grant skipping the presentation wait, the coordinator still prints the report before executing.

#### Scenario: sai-commit with only staged changes
- **WHEN** the worker authors its Step 6 report and `git status` shows only staged files, no unstaged or untracked files
- **THEN** the returned payload carries status letter `OK`, the `Staged` block, and the `Totals` line with no `Unstaged` block — and does not carry `Plan cross-check` or `Subagent ↔ git` sections — while the coordinator presents it verbatim before the ask

#### Scenario: sai-commit with unstaged files alongside staged files
- **WHEN** the worker authors its Step 6 report and `git status` shows both staged and unstaged files
- **THEN** the payload carries status letter `WARN`, the `Staged` block, the `Totals` line, and an `Unstaged (will NOT be committed)` block listing the unstaged paths

#### Scenario: sai-commit with no staged changes
- **WHEN** Step 1 reports no staged changes
- **THEN** the run stops at the unchanged stop condition (`"No staged changes. Use `git add` first."`) and no report is produced

### Requirement: One-line summary removal

The sai-commit authorization step SHALL NOT print the legacy `Files staged: {N} ({first 5 paths, ...if more})` line anywhere in Step 6. The structured report supersedes it. Any reviewer auditing the commit cards post-implementation SHALL NOT find that legacy line.

#### Scenario: Legacy summary line removed
- **WHEN** `sai/commands/commit/` is audited after the change
- **THEN** the string `Files staged: {N}` does not appear in Step 6

## ADDED Requirements

### Requirement: sai-commit Step 6 emits the same pre-commit file report structure

`commit.md` Step 6 (Present and Authorize) SHALL replace the current `Files staged: {N} ({first 5 paths, ...if more})` one-liner with the same structured pre-commit file report that `sai-4-apply` emits, so a user moving between the two commands sees one consistent shape. Where `sai-4-apply`'s report cross-checks against a plan and detects subagent/git mismatch, `sai-commit` does not — there is no subagent and no plan in the `sai-commit` flow. `sai-commit` emits only the report sections that are derivable from `git status` and `git diff --cached --stat` alone.

The sections emitted by `sai-commit` SHALL be, in this order:

    1. A header line with no change name (the change is not necessarily present in `sai-commit`'s context) and the overall status letter (`OK` or `WARN`).
    2. A human-readable status line summarising the staging state.
    3. A `Staged` block listing each staged path with its `+N -M` count, one per line, paths relative to repo root.
    4. A `Totals` line in the format `Totals: <N> files, +<ins> -<del>` summing insertions and deletions across staged files.
    5. An `Unstaged (will NOT be committed)` block listing any unstaged, untracked, or otherwise-not-staged paths from `git status`, one per line. If there are none, the block is omitted entirely.

The sections `Plan cross-check` and `Subagent ↔ git` SHALL NOT appear in `sai-commit`'s report — both require inputs the command does not have. The status letter SHALL be `WARN` if the `Unstaged` block is non-empty, and `OK` otherwise.

#### Scenario: sai-commit with only staged changes

- **WHEN** `commit.md` Step 6 runs and `git status` shows only staged files, no unstaged or untracked files
- **THEN** Step 6 prints status letter `OK`, the `Staged` block, the `Totals` line, and no `Unstaged` block — and does not print `Plan cross-check` or `Subagent ↔ git` sections

#### Scenario: sai-commit with unstaged files alongside staged files

- **WHEN** `commit.md` Step 6 runs and `git status` shows both staged and unstaged files
- **THEN** Step 6 prints status letter `WARN`, the `Staged` block, the `Totals` line, and an `Unstaged (will NOT be committed)` block listing the unstaged paths

#### Scenario: sai-commit with no staged changes

- **WHEN** `commit.md` Step 1 reports no staged changes
- **THEN** Step 6 does not run — the existing Step 1 stop condition (`"No staged changes. Use `git add` first."`) still applies and the report is never emitted

### Requirement: One-line summary removal

`commit.md` SHALL NOT print the legacy `Files staged: {N} ({first 5 paths, ...if more})` line anywhere in Step 6. The new structured report supersedes it. Any reviewer auditing `commit.md` post-implementation SHALL NOT find that legacy line.

#### Scenario: Legacy summary line removed

- **WHEN** `commit.md` is audited after the change
- **THEN** the string `Files staged: {N}` does not appear in Step 6

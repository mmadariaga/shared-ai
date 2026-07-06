## ADDED Requirements

### Requirement: Mandatory pre-commit file visibility report at every STOP & COMMIT

When `sai-4-apply` reaches a STOP & COMMIT marker (whether driven by a subagent's `STOP reached? = yes` or by a completed Step in `implementation.md`), the coordinator SHALL print a structured pre-commit file visibility report **before** proposing the commit message. The report is mandatory — there is no opt-out flag, and skipping it is a spec violation.

The report SHALL be sourced from three inputs read in order:

    1. `git status` (full, with untracked files) — to know which paths exist in the working tree.
    2. `git diff --cached --stat` — to know which paths are staged, with `+N -M` line counts per file and total stats.
    3. The subagent's report field 8 (`Files modified`) — to know what the subagent claims to have changed in its own context.

The report SHALL contain, in this order:

    1. A header line with the change name, the Step number `N`, and the overall status letter (one of `OK`, `WARN`, `MISMATCH`, `DEVIATION`).
    2. A human-readable status line summarising what the letter means (e.g. "All changes staged match the plan", "1 unstaged file present", "Subagent reported 3 files; git shows 5 — see mismatch section").
    3. A `Staged` block listing each staged path with its `+N -M` count, one per line, paths relative to repo root. For renames (git status shows `R  old -> new`), format as a single line `R  <new-path>  (renamed from <old-path>, +N -M)` rather than two separate entries.
    4. A `Totals` line in the format `Totals: <N> files, +<ins> -<del>` summing insertions and deletions across staged files.
    5. An `Unstaged (will NOT be committed)` block listing any unstaged, untracked, or otherwise-not-staged paths from `git status`, one per line. If there are none, the block is omitted entirely.
    6. A `Plan cross-check` block: a `Missing` sub-list of paths declared in the matching tasks.md step's `Files Affected` line that have no matching entry in `git status` (neither staged nor unstaged), and an `Extra` sub-list of paths present in `git status` (staged or unstaged) that are not declared in the matching tasks.md step's `Files Affected`. The lookup matches the integer `N` from the current implementation.md `## Step N — <title>` heading to the integer `N` of the tasks.md `## Step N: <title>` heading. The implementation.md template's `**Task ref:**` value is NOT the lookup key. If both sub-lists are empty, the block prints `No deviations`. If no tasks.md step with that integer exists, the block prints `Plan scope not declared — cross-check skipped`. If the matching tasks.md step's `**Files Affected**` value is empty (or only a placeholder), the block prints `Plan scope empty — cross-check skipped`. In both skip cases, the status letter is not downgraded to `DEVIATION` solely on that basis.
    7. A `Subagent ↔ git` block: when the subagent's `Files modified` set differs from the union of staged + unstaged paths in `git status`, the block lists paths present in one set and not the other, prefixed with `only-in-subagent:` or `only-in-git:`. When the sets are equal, the block prints `In sync`.

The report SHALL NOT include a diff preview, full file contents, or tracebacks.

#### Scenario: Clean STOP & COMMIT with no deviations

- **WHEN** the subagent reports `Files modified` = `{src/foo.ts}` and `git status` shows `src/foo.ts` staged with `+10 -2`, and the Step's `Files Affected` declares `src/foo.ts`, and no unstaged files exist
- **THEN** the report prints status letter `OK`, status line `All changes staged match the plan`, the `Staged` block with one entry, the `Totals` line, no `Unstaged` block, `Plan cross-check: No deviations`, and `Subagent ↔ git: In sync`

#### Scenario: STOP & COMMIT with unstaged files

- **WHEN** the subagent reports `Files modified` = `{src/foo.ts}` and `git status` shows `src/foo.ts` staged and `src/bar.ts` modified-but-unstaged
- **THEN** the report includes an `Unstaged (will NOT be committed)` block listing `src/bar.ts` so the user sees the in-progress work before the commit is proposed

#### Scenario: STOP & COMMIT with subagent/git mismatch

- **WHEN** the subagent reports `Files modified` = `{src/foo.ts}` and `git status` shows `src/foo.ts` and `src/baz.ts` both staged
- **THEN** the report sets status letter `MISMATCH` and includes a `Subagent ↔ git` block listing `only-in-git: src/baz.ts` so the user can decide whether to proceed

#### Scenario: STOP & COMMIT with a plan deviation (missing path)

- **WHEN** the matching tasks.md step's `**Files Affected**` declares `src/foo.ts, src/bar.ts` but `git status` shows only `src/foo.ts` staged
- **THEN** the report sets status letter `DEVIATION` and the `Plan cross-check` block's `Missing` sub-list contains `src/bar.ts`

#### Scenario: STOP & COMMIT with a plan deviation (extra path)

- **WHEN** the matching tasks.md step's `**Files Affected**` declares `src/foo.ts` but `git status` shows `src/foo.ts` staged and `src/baz.ts` also staged
- **THEN** the report sets status letter `DEVIATION` and the `Plan cross-check` block's `Extra` sub-list contains `src/baz.ts`

#### Scenario: STOP & COMMIT with no matching tasks.md step

- **WHEN** the current `implementation.md` `## Step N` heading has no corresponding `## Step N: <title>` heading in the change's `tasks.md`
- **THEN** the `Plan cross-check` block prints `Plan scope not declared — cross-check skipped` and the status letter is not downgraded to `DEVIATION` solely on that basis

#### Scenario: STOP & COMMIT with empty `Files Affected` value

- **WHEN** the matching tasks.md step has `**Files Affected**:` followed by an empty value or a placeholder (e.g. `<!-- comma-separated file paths -->`) and `git status` shows one or more staged paths
- **THEN** the `Plan cross-check` block prints `Plan scope empty — cross-check skipped`; the staged paths are NOT listed under `Extra` (an empty declared scope is treated as no scope, not as zero-tolerance); the status letter is not downgraded to `DEVIATION` solely on that basis

#### Scenario: STOP & COMMIT with subagent-only path

- **WHEN** the subagent reports `Files modified` = `{src/foo.ts, src/missing.ts}` but `git status` shows only `src/foo.ts` staged or unstaged (no entry for `src/missing.ts`)
- **THEN** the report sets status letter `MISMATCH` and includes a `Subagent ↔ git` block listing `only-in-subagent: src/missing.ts` so the user can decide whether to proceed — this is the dangerous case where the subagent believes it wrote a file that is not present in the working tree

### Requirement: Pre-commit report is not a second approval gate

The pre-commit file visibility report SHALL NOT introduce a second user approval step. The existing single user authorization at the STOP & COMMIT checklist is the only gate. The report informs the user so they can decide at the existing gate; it does not require a separate `y/n` for itself.

#### Scenario: User authorizes commit after reviewing the report

- **WHEN** the coordinator prints the pre-commit report and the existing checklist prompt `Ready to commit Step N. May I create commit with message: '<subject>'? (y/n)`, and the user answers `y`
- **THEN** the coordinator runs `git commit` exactly as before — no additional prompt is required for the report

#### Scenario: User vetoes commit because the file list is wrong

- **WHEN** the user sees the pre-commit report, decides the file list is wrong, and answers `n` to the existing prompt
- **THEN** the coordinator does not run `git commit` and prints the existing "Commit not authorized" message — the report's purpose is satisfied by surfacing the wrong list to the user

### Requirement: Section ordering is stable when sections are absent

The report sections appear in the fixed order defined by the "Mandatory pre-commit file visibility report" requirement. When a section's trigger condition is not met (for example, no unstaged files means the `Unstaged` block is omitted, or no plan deviation means the `Plan cross-check` block prints `No deviations` rather than enumerating empty sub-lists), the remaining sections SHALL keep their relative order and labels and SHALL NOT be renumbered. The `commit-report-alignment` capability follows the same rule: when a section is absent, it is omitted, not renumbered.

#### Scenario: Report with no unstaged files

- **WHEN** `git status` shows only staged files and no unstaged or untracked files
- **THEN** the report omits the `Unstaged` block entirely and the `Plan cross-check` and `Subagent ↔ git` blocks retain their labels and position (no `Unstaged` placeholder, no skipped-section number)

#### Scenario: sai-commit report with no unstaged files

- **WHEN** `sai-commit` Step 6 runs and `git status` shows only staged files
- **THEN** the `Staged`, `Totals`, and absent `Unstaged` block appear in that order with no `1.`, `2.`, `3.` numbering — sections are labelled, not numbered

### Requirement: Malformed subagent report is surfaced, not guessed

If the subagent's report omits field 8 (`Files modified`) or returns it as empty, the coordinator SHALL treat the report as malformed and surface that to the user explicitly. The coordinator SHALL NOT guess or fabricate the file list from `git status` alone when the subagent failed to provide it. The subagent's failure to populate field 8 is itself a deviation worth flagging.

#### Scenario: Subagent omits field 8

- **WHEN** the subagent returns a 7-field report with field 8 missing or empty
- **THEN** the coordinator prints `Subagent report missing field 8 (Files modified). Cannot produce a reliable pre-commit report. Review the staged state manually before committing.` and pauses for the user before proposing the commit message

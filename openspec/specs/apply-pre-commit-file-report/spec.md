# apply-pre-commit-file-report Specification

## MODIFIED Requirements

### Requirement: Mandatory pre-commit file visibility report at every STOP & COMMIT

When `sai-4-apply` reaches a STOP & COMMIT marker (whether driven by a subagent's `STOP reached? = yes` or by a completed Step in `implementation.md`), the coordinator SHALL print a structured pre-commit file visibility report **before** proposing the commit message. The report is mandatory — there is no opt-out flag, and skipping it is a spec violation.

The report SHALL be sourced from three inputs read in order:

    1. `git status` (full, with untracked files) — to know which paths exist in the working tree.
    2. `git diff --cached --stat` — to know which paths are staged, with `+N -M` line counts per file and total stats.
    3. The subagent report field 8 (`Files modified`) — to know what the subagent(s) claim to have changed in their own context. For a **non-testable** Step this is the single dispatch's field 8. For a **testable** Step (split into a test-writer dispatch and an implementation dispatch) the coordinator SHALL use the **union** of field 8 from BOTH reports as the subagent-claimed set, because the commit is per-Step and includes the files written by both dispatches.

The report SHALL contain, in this order:

    1. A header line with the change name, the Step number `N`, and the overall status letter (one of `OK`, `WARN`, `MISMATCH`, `DEVIATION`).
    2. A human-readable status line summarising what the letter means (e.g. "All changes staged match the plan", "1 unstaged file present", "Subagent reported 3 files; git shows 5 — see mismatch section").
    3. A `Staged` block listing each staged path with its `+N -M` count, one per line, paths relative to repo root. For renames (git status shows `R  old -> new`), format as a single line `R  <new-path>  (renamed from <old-path>, +N -M)` rather than two separate entries.
    4. A `Totals` line in the format `Totals: <N> files, +<ins> -<del>` summing insertions and deletions across staged files.
    5. An `Unstaged (will NOT be committed)` block listing any unstaged, untracked, or otherwise-not-staged paths from `git status`, one per line. If there are none, the block is omitted entirely.
    6. A `Plan cross-check` block: a `Missing` sub-list of paths declared in the matching tasks.md step's `Files Affected` line that have no matching entry in `git status` (neither staged nor unstaged), and an `Extra` sub-list of paths present in `git status` (staged or unstaged) that are not declared in the matching tasks.md step's `Files Affected`. The lookup matches the integer `N` from the current implementation.md `## Step N — <title>` heading to the integer `N` of the tasks.md `## Step N: <title>` heading. The implementation.md template's `**Task ref:**` value is NOT the lookup key. If both sub-lists are empty, the block prints `No deviations`. If no tasks.md step with that integer exists, the block prints `Plan scope not declared — cross-check skipped`. If the matching tasks.md step's `**Files Affected**` value is empty (or only a placeholder), the block prints `Plan scope empty — cross-check skipped`. In both skip cases, the status letter is not downgraded to `DEVIATION` solely on that basis.
    7. A `Subagent ↔ git` block: when the subagent-claimed set (the single dispatch's field 8, or the union of both dispatches' field 8 for a testable Step) differs from the union of staged + unstaged paths in `git status`, the block lists paths present in one set and not the other, prefixed with `only-in-subagent:` or `only-in-git:`. When the sets are equal, the block prints `In sync`.

The report SHALL NOT include a diff preview, full file contents, or tracebacks.

#### Scenario: Clean STOP & COMMIT with no deviations

- **WHEN** the subagent reports `Files modified` = `{src/foo.ts}` and `git status` shows `src/foo.ts` staged with `+10 -2`, and the Step's `Files Affected` declares `src/foo.ts`, and no unstaged files exist
- **THEN** the report prints status letter `OK`, status line `All changes staged match the plan`, the `Staged` block with one entry, the `Totals` line, no `Unstaged` block, `Plan cross-check: No deviations`, and `Subagent ↔ git: In sync`

#### Scenario: Testable Step unions both dispatches' Files modified

- **WHEN** a testable Step's test-writer reports `Files modified` = `{test/foo.test.ts, src/foo.ts}` (test + stub) and the implementation dispatch reports `Files modified` = `{src/foo.ts}`, and `git status` shows both `test/foo.test.ts` and `src/foo.ts` staged
- **THEN** the coordinator uses the union `{test/foo.test.ts, src/foo.ts}` as the subagent-claimed set, and the `Subagent ↔ git` block prints `In sync`

#### Scenario: STOP & COMMIT with subagent/git mismatch

- **WHEN** the subagent-claimed set is `{src/foo.ts}` and `git status` shows `src/foo.ts` and `src/baz.ts` both staged
- **THEN** the report sets status letter `MISMATCH` and includes a `Subagent ↔ git` block listing `only-in-git: src/baz.ts` so the user can decide whether to proceed

#### Scenario: STOP & COMMIT with a plan deviation (missing path)

- **WHEN** the matching tasks.md step's `**Files Affected**` declares `src/foo.ts, src/bar.ts` but `git status` shows only `src/foo.ts` staged
- **THEN** the report sets status letter `DEVIATION` and the `Plan cross-check` block's `Missing` sub-list contains `src/bar.ts`

### Requirement: Malformed subagent report is surfaced, not guessed

If a subagent report omits field 8 (`Files modified`) or returns it as empty, the coordinator SHALL treat that report as malformed and surface it to the user explicitly. The coordinator SHALL NOT guess or fabricate the file list from `git status` alone when a subagent failed to provide it. For a **testable** Step this check applies independently to BOTH the test-writer report and the implementation report — either one omitting field 8 makes the pre-commit report unreliable for that Step. A subagent's failure to populate field 8 is itself a deviation worth flagging.

#### Scenario: Single dispatch omits field 8

- **WHEN** a non-testable Step's subagent returns a report with field 8 missing or empty
- **THEN** the coordinator prints `Subagent report missing field 8 (Files modified). Cannot produce a reliable pre-commit report. Review the staged state manually before committing.` and pauses for the user before proposing the commit message

#### Scenario: One of a testable Step's two dispatches omits field 8

- **WHEN** a testable Step's implementation dispatch returns a report with field 8 missing while the test-writer's field 8 is present
- **THEN** the coordinator still treats the Step's pre-commit report as unreliable, surfaces which dispatch omitted field 8, and pauses for the user before proposing the commit message

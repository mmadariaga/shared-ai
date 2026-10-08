# apply-pre-commit-file-report Specification

## Purpose
Defines the coordinator's pre-commit file visibility and staging report.

## Requirements

### Requirement: Staged set equals the previewed add-list

The report's truthfulness depends on the commit staging exactly what the report previewed. The coordinator SHALL therefore stage exactly the add-list shown in the report's `Will be committed` block — the same subagent field-8 set (union of both dispatches for a testable Step) — when it proceeds to commit on `yes` / `Allow on this session`. The previewed set and the staged set SHALL share one definition (the field-8 add-list), so the preview cannot diverge from the resulting commit. Registered plan amendments SHALL extend both sides equally: the `Will be committed` block SHALL list them and the commit SHALL stage them, while the add-list itself stays the worker's field-8 set.

This pins only the **staged file set**, not staging timing or authorization: staging remains deferred to the commit-time `git add` after the authorization ask (Design B), and commit authorization is unchanged. The coordinator SHALL NOT stage paths outside the previewed add-list at this gate, and SHALL NOT improvise the add set from `git status` or the working tree.

#### Scenario: Commit stages exactly the previewed add-list
- **WHEN** the report's `Will be committed` block previews add-list `{src/foo.ts, test/foo.test.ts}` and the user authorizes the commit
- **THEN** the coordinator runs `git add` for exactly `src/foo.ts` and `test/foo.test.ts` and no other path before `git commit`, so the resulting commit contents equal the previewed set

#### Scenario: Coordinator does not improvise the add set
- **WHEN** the previewed add-list is `{src/foo.ts}` but the working tree also contains an unrelated modified file `src/other.ts`
- **THEN** on authorization the coordinator stages only `src/foo.ts` (the previewed add-list) and leaves `src/other.ts` unstaged, matching the report's `Will NOT be committed` leftovers block

#### Scenario: Registered amendment is previewed and staged
- **WHEN** the coordinator registered an amendment of the change's `tasks.md` and the Step closes with add-list `{src/foo.ts}`
- **THEN** the report's `Will be committed` block lists `src/foo.ts` and that `tasks.md`, and the commit contains both

### Requirement: Mandatory pre-commit file visibility report at every STOP & COMMIT

When `sai-4-apply` reaches a STOP & COMMIT marker (whether driven by a subagent's `STOP reached? = yes` or by a completed Step in `implementation.md`), the coordinator SHALL print a structured pre-commit file visibility report **before** proposing the commit message. The report is produced deterministically by `apply-step.js close` (`close --dry-run` when the authorization ask comes first) from the inputs below, and the coordinator SHALL print the returned `report_text` verbatim and SHALL NOT rebuild it. The report is mandatory — there is no opt-out flag, and skipping it is a spec violation.

Because staging is deferred to commit-time (the `git add` runs only on the `yes` / `Allow on this session` path, after the authorization ask), the git index is empty when this report runs. The report is therefore a forward-looking **preview of the proposed commit** — it SHALL answer "what would this commit contain, and what would it leave behind?" — and it SHALL NOT read the git index (`git diff --cached`) for its committed-files content, nor mutate the git index.

The report SHALL be sourced from these inputs:

    1. `git status` (full, with untracked files) — to know which paths exist in the working tree (tracked-modified + untracked + deleted).
    2. The **intended add-list** — the exact paths the coordinator will `git add` on `yes`, taken from the subagent report field 8 (`Files modified`), which includes removed plan-named retired files declared by the test-authoring dispatch; staging a declared removal stages the deletion. For a **non-testable** Step this is the single dispatch's field 8. For a **testable** Step (split into a test-writer dispatch and an implementation dispatch) the coordinator SHALL use the **union** of field 8 from BOTH reports, because the commit is per-Step and includes the files written (or removed) by both dispatches.
    3. Per-file `+N -M` line counts computed from the **working tree vs `HEAD`** for the add-list paths (e.g. `git diff --stat HEAD -- <paths>`), NOT from `git diff --cached` (which is empty before staging). Untracked add-list paths have no `HEAD` baseline, so their counts SHALL be computed explicitly as all-insertions (e.g. via `git diff --no-index --stat -- /dev/null <path>` on POSIX, or an equivalent cross-platform line count — the apply flow runs on Windows as well).

The report SHALL contain, in this order:

    1. A header line with the change name, the Step number `N`, and the overall status letter (one of `OK`, `WARN`, `MISMATCH`, `DEVIATION`). The letter SHALL follow a pinned precedence: `MISMATCH` when the `Subagent ↔ git` block is not in sync, otherwise `DEVIATION` when the `Plan cross-check` block lists `Missing` or `Extra` paths, otherwise `WARN` when the `Will NOT be committed` block is non-empty, otherwise `OK`. A `Plan cross-check` that is `not available` SHALL NOT raise the letter.
    2. A human-readable status line summarising what the letter means (e.g. "All changes to be committed match the plan", "1 leftover file present", "Subagent reported 3 files; git shows 5 — see mismatch section").
    3. A `Will be committed` block listing each add-list path with its `+N -M` count (sourced per input 3), one per line, paths relative to repo root. For renames (git status shows `R  old -> new`), format as a single line `R  <new-path>  (renamed from <old-path>, +N -M)` rather than two separate entries.
    4. A `Totals` line in the format `Totals: <N> files, +<ins> -<del>` summing insertions and deletions across the add-list paths (working tree vs `HEAD`, untracked paths counted as all-insertions).
    5. A `Will NOT be committed` block listing genuine leftovers — the `git status` working-tree paths (tracked-modified + untracked) that are **not** in the add-list, one per line. If there are none, the block is omitted entirely.
    6. A `Plan cross-check` block: a `Missing` sub-list of paths declared in the matching tasks.md step's `**Files Affected**` line that have no matching entry in `git status`, and an `Extra` sub-list of paths present in `git status` that are not declared in the matching tasks.md step's `**Files Affected**`. The lookup matches the integer `N` from the current implementation.md `## Step N — <title>` heading to the integer `N` of the tasks.md `## Step N: <title>` heading. The implementation.md template's `**Task ref:**` value is NOT the lookup key. If both sub-lists are empty, the block prints `No deviations`. If no tasks.md step with that integer exists, or the matching step has no `**Files Affected**` value (absent, empty, or only a placeholder), the block prints `not available`; the changed paths are never all marked `Extra`, and the status letter is not raised to `DEVIATION` solely on that basis.
    7. A `Subagent ↔ git` block: when the subagent-claimed set (the single dispatch's field 8, or the union of both dispatches' field 8 for a testable Step) differs from the working-tree paths in `git status` (tracked-modified + untracked), the block lists paths present in one set and not the other, prefixed with `only-in-subagent:` or `only-in-git:`. When the sets are equal, the block prints `In sync`.

Because the `Will be committed` block is sourced from the add-list (field 8) rather than from actual working-tree diffs, an add-list path that has no change vs `HEAD` in the working tree (claimed in field 8 but touched-then-reverted or never actually modified) is still listed — with `+0 -0`. Such a path is absent from the working-tree change set, so the `Subagent ↔ git` block surfaces it as `only-in-subagent` and the status letter is `MISMATCH`, making the over-claim visible before the commit. The block SHALL list it rather than silently dropping it, so the preview always shows exactly what the coordinator intends to stage.

The plan's own `openspec/changes/{change-name}/implementation.md` is apply bookkeeping: the report SHALL leave it out of every block (`Will NOT be committed`, `Plan cross-check`, and `Subagent ↔ git` alike).

The report SHALL NOT include a diff preview, full file contents, or tracebacks.

#### Scenario: Clean STOP & COMMIT previews the proposed commit with nothing staged
- **WHEN** the subagent reports `Files modified` = `{src/foo.ts}`, `src/foo.ts` is modified in the working tree with `+10 -2` vs `HEAD`, the git index is empty (nothing staged), the Step's `Files Affected` declares `src/foo.ts`, and no other working-tree changes exist
- **THEN** the report prints status letter `OK`, a status line indicating all changes to be committed match the plan, a `Will be committed` block with one entry `src/foo.ts  +10 -2`, the `Totals` line `Totals: 1 files, +10 -2`, no `Will NOT be committed` block, `Plan cross-check: No deviations`, and `Subagent ↔ git: In sync`

#### Scenario: Committed block reflects the add-list, not the empty index
- **WHEN** the git index is empty at report time (staging deferred) and the intended add-list is `{src/foo.ts}`
- **THEN** the `Will be committed` block lists `src/foo.ts` (sourced from the add-list) rather than showing 0 files, and the coordinator does NOT run `git diff --cached` to populate it and does NOT stage anything to produce the report

#### Scenario: Leftovers block excludes the add-list
- **WHEN** the add-list is `{src/foo.ts}` and `git status` also shows `src/unrelated.ts` modified and `notes.txt` untracked, neither in the add-list
- **THEN** the `Will be committed` block lists only `src/foo.ts`, and the `Will NOT be committed` block lists `src/unrelated.ts` and `notes.txt` as genuine leftovers

#### Scenario: Untracked add-list file line counts are all-insertions
- **WHEN** the add-list contains a newly created untracked file `src/new.ts` with 7 lines that has no `HEAD` baseline
- **THEN** the `Will be committed` block reports `src/new.ts  +7 -0` (counted explicitly since `git diff --stat HEAD -- src/new.ts` is empty for an untracked path), and its lines are included in the `Totals` insertions sum

#### Scenario: Add-list path with no working-tree change is previewed but flagged
- **WHEN** the add-list contains `src/foo.ts` (claimed in field 8) but `src/foo.ts` has no change vs `HEAD` in the working tree (touched-then-reverted, or claimed-but-unmodified)
- **THEN** the `Will be committed` block lists `src/foo.ts  +0 -0`, the `Subagent ↔ git` block prints `only-in-subagent: src/foo.ts`, and the status letter is `MISMATCH` so the over-claim is surfaced before commit

#### Scenario: Testable Step unions both dispatches' Files modified
- **WHEN** a testable Step's test-writer reports `Files modified` = `{test/foo.test.ts, src/foo.ts}` (test + stub) and the implementation dispatch reports `Files modified` = `{src/foo.ts}`, and both files are modified in the working tree
- **THEN** the coordinator uses the union `{test/foo.test.ts, src/foo.ts}` as both the add-list (for the `Will be committed` block) and the subagent-claimed set, and the `Subagent ↔ git` block prints `In sync`

#### Scenario: Removed retired file enters the add-list
- **WHEN** the test-authoring dispatch declares `test/obsolete-guard.test.js` as removed under the bounded retirement exception, and `git status` shows the deletion
- **THEN** the `Will be committed` block lists `test/obsolete-guard.test.js` as part of the add-list, the `Subagent ↔ git` block prints `In sync`, and on authorization the coordinator stages the deletion by exact path

#### Scenario: STOP & COMMIT with subagent/git mismatch
- **WHEN** the subagent-claimed set (add-list) is `{src/foo.ts}` and `git status` shows `src/foo.ts` and `src/baz.ts` both changed in the working tree
- **THEN** the report sets status letter `MISMATCH`, the `Will be committed` block lists only `src/foo.ts`, the `Will NOT be committed` block lists `src/baz.ts`, and the `Subagent ↔ git` block lists `only-in-git: src/baz.ts` so the user can decide whether to proceed

#### Scenario: STOP & COMMIT with a plan deviation (missing path)
- **WHEN** the matching tasks.md step's `**Files Affected**` declares `src/foo.ts, src/bar.ts` but `git status` shows only `src/foo.ts` changed in the working tree
- **THEN** the report sets status letter `DEVIATION` and the `Plan cross-check` block's `Missing` sub-list contains `src/bar.ts`

#### Scenario: Status letter follows the pinned precedence
- **WHEN** the add-list `{src/foo.ts}` is out of sync with `git status` (`src/baz.ts` also changed) and the matching tasks.md step declares only `src/foo.ts` and `src/bar.ts`
- **THEN** the report sets status letter `MISMATCH`, not `DEVIATION`, because the `Subagent ↔ git` block is not in sync

#### Scenario: Plan cross-check is not available
- **WHEN** the change has no tasks.md step with the integer `N`, or that step has no `**Files Affected**`, the add-list equals the working-tree changes, and nothing is left out of the commit
- **THEN** the `Plan cross-check` block prints `not available`, the status letter is `OK`, and no changed path is marked `Extra`

#### Scenario: The plan's own implementation.md stays out of the report
- **WHEN** the working tree shows `openspec/changes/{change-name}/implementation.md` modified alongside the add-list paths
- **THEN** no block of the report lists it, and it does not raise the status letter

### Requirement: Malformed subagent report is surfaced, not guessed

If a subagent report omits field 8 (`Files modified`), the coordinator SHALL treat that report as malformed and surface the omission to the user explicitly. An explicitly present empty field 8 SHALL be treated as a valid empty add-list, including when the dispatch created or modified only declared scratch paths that are excluded from field 8. The coordinator SHALL NOT guess or fabricate the file list from `git status` alone when a subagent failed to provide field 8. For a **testable** Step this check applies independently to BOTH the test-writer report and the implementation report — either one omitting field 8 makes the pre-commit report unreliable for that Step. A subagent's failure to populate field 8 is itself a deviation worth flagging.

#### Scenario: Single dispatch omits field 8
- **WHEN** a non-testable Step's subagent returns a report with field 8 missing
- **THEN** the coordinator prints `Subagent report missing field 8 (Files modified). Cannot produce a reliable pre-commit report. Review the staged state manually before committing.` and pauses for the user before proposing the commit message

#### Scenario: Empty field 8 is valid when explicitly present
- **WHEN** a dispatch returns `Files modified = []`, including because all files it created or modified were under `.tmp/{change-name}/`
- **THEN** the coordinator accepts the report as well-formed, uses an empty field-8 add-list, and does not pause under the malformed-report rule

#### Scenario: One of a testable Step's two dispatches omits field 8
- **WHEN** a testable Step's implementation dispatch returns a report with field 8 missing while the test-writer's field 8 is present
- **THEN** the coordinator still treats the Step's pre-commit report as unreliable, surfaces which dispatch omitted field 8, and pauses for the user before proposing the commit message

### Requirement: Visibility comparisons distinguish preserved initial work

The pre-commit report SHALL use the immutable baseline and retained settled state to distinguish current execution changes from unchanged initial unrelated work, exact planning inputs, and unchanged earlier closed owned work.

Preserved unrelated paths, planning leftovers other than the plan itself, and retained uncommitted owned paths SHALL remain visible under Will NOT be committed. They SHALL not enter current execution scope or worker-report mismatches solely because they remain present. Applicable generated declaration discrepancies SHALL contribute to deviation reporting. The existing status precedence SHALL remain MISMATCH, DEVIATION, WARN, then OK.

#### Scenario: Unrelated staged file remains unchanged
- **WHEN** a staged unrelated file and its unstaged content equal the baseline while the current Step's reported paths match
- **THEN** the report shows that file under Will NOT be committed without making it a mismatch or current-Step scope error

### Requirement: Previewed owned paths define isolated commit content

On authorization, close SHALL stage only the exact previewed owned add-list and commit those paths with path-limited `git commit --only`. Pre-existing unrelated index entries SHALL remain unchanged. An initially dirty path, planning input, unsafe path, changed unrelated staging, unresolved generated declaration, or scope discrepancy SHALL block committing close before marking or staging. A planning artifact registered as a plan amendment SHALL NOT block close: it SHALL be staged and committed with the Step, including when it was untracked or dirty at the baseline, while an unregistered edit of a planning artifact SHALL still block.

The report SHALL remain a forward-looking preview based on the add-list and working-tree content, not a list of everything already staged. Existing unrelated staging SHALL not imply an empty-index assumption or permission to include it.

#### Scenario: Unrelated staging predates Apply
- **WHEN** the current Step is authorized to commit and unrelated index entries equal their initial state
- **THEN** the resulting commit contains only previewed owned paths and preserves those unrelated index entries

#### Scenario: Untracked planning artifact is amended
- **WHEN** the change's `tasks.md` was untracked at the baseline, the coordinator registered its amendment, and an unrelated `notes.txt` is also untracked
- **THEN** the Step's commit contains `tasks.md` and does not contain `notes.txt` or any other planning artifact

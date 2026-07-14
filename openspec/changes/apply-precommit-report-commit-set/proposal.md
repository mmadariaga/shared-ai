## Why

The Pre-commit File Visibility Report in `/sai-4-apply` sources its `Staged` block from `git diff --cached` at a moment when nothing is staged — staging is deferred to commit-time — so it always shows 0 files "staged" and mislabels the Step's own files as `Unstaged (will NOT be committed)` immediately before committing exactly those files. The report runs before the authorization ask to inform the user's commit/decline decision, so it must preview what the commit *would* contain, not inspect an empty git index.

## What Changes

- Repurpose the report from a git-index inspector into a proposed-commit previewer: its committed-files block reflects the coordinator's **intended add-list** (subagent report field 8; union of both dispatches for a testable Step) — the exact paths that will be `git add`ed on `yes` — instead of `git diff --cached`.
- Redefine the "will NOT be committed" block as genuine **leftovers**: `git status` working-tree paths (tracked-modified + untracked) minus the add-list, so it surfaces real changes that can legitimately influence the commit/decline decision.
- Source per-file `+N -M` counts and the `Totals` line from the working tree vs `HEAD` for the add-list paths (e.g. `git diff --stat HEAD -- <paths>`, with explicit untracked-file handling), since `git diff --cached` is empty before staging.
- Bind the actual staging to the previewed add-list: the coordinator SHALL stage exactly the add-list the report previewed (the field-8 set), so the preview and the resulting commit share one definition and cannot diverge. This pins only the staged file *set* — staging *timing* stays deferred to the `yes` / `Allow on this session` path (Design B), and commit authorization is unchanged.
- Staging stays deferred and the report never mutates the git index. The status letters (`OK`/`WARN`/`MISMATCH`/`DEVIATION`), the `Plan cross-check` block, and the `Subagent ↔ git` block are retained unchanged; only the committed-vs-leftover sourcing and labels change.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `apply-pre-commit-file-report`: the report's committed-files block, its `Totals`/per-file line counts, and its leftovers block are re-sourced from the intended add-list and the working tree (vs `HEAD`) instead of `git diff --cached`; staging remains deferred, so the report is a forward-looking preview rather than a description of an already-taken action.

## Impact

- `sai/instructions/apply.md` — the `## Pre-commit File Visibility Report` section (sources list and report block definitions) and the `## STOP & COMMIT Checklist` staging step, which is pinned to stage exactly the previewed add-list. Staging *timing* and commit *authorization* in that checklist are unchanged; only the staged file *set* becomes defined (= the field-8 add-list).
- `sai/instructions/commit-rules.md` — **no edit.** Because staging behavior is unchanged, the latent 109/111 "never stage" vs "git add implicitly authorized" tension is left exactly as-is, out of scope.
- `/sai-commit` behavior — unchanged.

## Proposal Research Documentation

**Local files**:
- `sai/instructions/apply.md` — current `## Pre-commit File Visibility Report` (lines 165–195) and `## STOP & COMMIT Checklist` (staging deferred to step 6 on `yes`/`Allow`)
- `openspec/specs/apply-pre-commit-file-report/spec.md` — baseline requirement and scenarios being modified
- `sai/instructions/commit-rules.md` — confirmed out of scope for this change

**External URLs**: none

## Additional Notes

- Staging currently happens inside STOP & COMMIT checklist step 6 (`git add` + `git commit`) only on `yes`/`Allow on this session`; the pre-commit report runs at step 1, before that. This ordering is what makes `git diff --cached` empty at report time and is deliberately preserved.
- The intended add-list equals the subagent-claimed set (field 8) already consumed by the `Subagent ↔ git` block, so the committed block and that block now draw from the same set; they serve different purposes (preview vs consistency check) and both are retained.
- Untracked add-list files have no `HEAD` baseline, so `git diff --stat HEAD -- <path>` yields nothing for them; their line counts must be computed as all-insertions (e.g. `git diff --no-index --stat -- /dev/null <path>` or an equivalent count) so the `Totals` line stays accurate.
- **Field-8 integrity is now critical-path.** In the prior design, subagent report field 8 (`Files modified`) was one of three cross-check inputs; here it is the *sole source* of the intended add-list — it defines both the `Will be committed` block and the set the commit stages. The baseline requirement "Malformed subagent report is surfaced, not guessed" is deliberately retained unchanged, but its stakes are raised: an absent or empty field 8 no longer merely weakens a consistency check — it means there is no valid commit preview and no defined add-list at all. A future reader/implementer should treat field-8 population as load-bearing.
- **Add-list may over-report vs actual diffs.** Because the `Will be committed` block is sourced from the add-list rather than from working-tree diffs, a field-8 path with no real change vs `HEAD` (touched-then-reverted, or claimed-but-unmodified) is still previewed (as `+0 -0`). This is intentional — the block shows exactly what the coordinator will `git add` — and the `Subagent ↔ git` block plus a `MISMATCH` status letter surface the discrepancy rather than the block silently filtering the path out.

# ADR 0044: Preview committed-files block from intended add-list instead of git index

## Status

Accepted

## Context

The Pre-commit File Visibility Report in `/sai-4-apply` sources its committed-files block from `git diff --cached --stat` (`sai/instructions/apply.md:172`). Staging in this flow is deferred: the `git add` + `git commit` runs only inside the STOP & COMMIT Checklist step that executes on `yes` / `Allow on this session`, *after* the authorization ask. Because the report runs *before* that step, the git index is empty when the report is generated. Consequently `git diff --cached` reports 0 files "staged", and the report mislabels the Step's own files as `Unstaged (will NOT be committed)` — immediately before the commit stages exactly those files.

## Decision

Source the report's `Will be committed` block from the subagent report field 8 (`Files modified`) — for a non-testable Step the single dispatch's field 8, for a testable Step the **union** of both dispatches' field 8 — which is the exact set the coordinator will `git add` on authorization. The report never runs `git diff --cached` for its committed content and never stages anything to build itself.

## Alternatives Considered

- **Move staging before the report** so `git diff --cached` is populated and the existing index-inspector logic works unchanged. Rejected: it breaks Design B (deferred staging) and would stage files *before* the authorization ask, mutating the index on a path the user has not yet approved.
- **Preview from working-tree diffs alone** (`git status` changed paths) as the committed set. Rejected: the working tree is a superset that includes genuine leftovers; it cannot express "what the coordinator *intends* to stage" and would silently drop a claimed-but-unmodified field-8 path instead of surfacing the over-claim.
- **Chosen**: field-8 add-list as the single source for the committed block; keep staging deferred.

## Consequences

- Field 8 is now sole-source / critical-path for the commit preview and the staged set.
- An add-list path with no real change vs `HEAD` is still previewed (as `+0 -0`); the `Subagent ↔ git` block plus a `MISMATCH` status letter surface the discrepancy rather than the block silently filtering the path out.
- The report is a forward-looking preview, not a description of an already-taken action.

## Related

- `openspec/changes/apply-precommit-report-commit-set/design.md` — Decisions D1, D2, D3
- `openspec/changes/apply-precommit-report-commit-set/specs/apply-pre-commit-file-report/spec.md` — modified capability spec
- `sai/instructions/apply.md` — sole edit target

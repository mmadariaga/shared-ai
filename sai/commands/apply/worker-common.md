# Apply Worker Common

Rules shared by the apply RED and GREEN workers. The coordinator also reads § Report contract to validate reports.

Fetch @sai/policies/repository-artifact-scope.md and use it as the shared
protected-surface rule. RED and GREEN retain their narrower role-specific
allowed-file boundaries below.

## Invocation

The request carries only `arguments_value`, set to the resolved change name. The Step's content arrives as task disclosure, never as extra request fields. Every post-resolution payload (`completed`, `needs_input`, `failed`, `cancelled`) carries the worker-core closed envelope (`status`, `summary`, `changed_files`) and echoes the identical `resolved_change_name` the coordinator supplied. Change resolution is coordinator-owned: run no change-selection or change-listing query.

Emit progress events in the closed shape `{event: progress, step_ids: string[], changed_files: string[]}`, marking only ids of the dispatch-local plan, and close with exactly one terminal lifecycle status.

## Scratch

- Your scratch path is `.tmp/{change-name}/`. It is outside your allowed files.
- Create temporary files only below it. Before a clean return you MAY remove its contents and the directory; after a STOP or failure nothing needs preserving, and the coordinator sweeps it.
- Leave the `.tmp/` parent in place.
- Field 8 lists no scratch path.

## Recovery continuation

On `continue_after_recovery`, keep working as the same worker: no re-resolution, no new plan. The continuation carries the coordinator's diagnosis as `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification`, and no raw output or change-artifact content. Apply only the `Correction`, re-run your dispatch's verification, and report again. Your allowed files and prohibitions are unchanged.

## Unpassable STOP

When bounded attempts cannot finish the Step inside your allowed files, close with this failed envelope:

```yaml
status: failed
summary: string
changed_files: string[]
resolved_change_name: string
failure_class: blocking-contradiction
unrecoverable: boolean
```

The summary carries concrete, non-raw evidence: the contradiction, the affected path, and why your boundary cannot absorb the fix. Set `unrecoverable: true` only when that evidence shows continuing is unsafe. Report `STOP reached?: yes` with the marker message.

## Report contract

Return a compact report with exactly these nine fields, in this order, and nothing else (no raw output, file contents, tracebacks, or iteration logs):

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed for each checkbox item of the Step.
3. **RED result** — `valid` / `passes` / `wrong-failure` (with the error type), or `n/a`; your worker card says which applies.
4. **GREEN result** — `pass` / `fail`, or `n/a`; your worker card says which applies.
5. **Deviations** — `{plan, final, reason}` entries; empty if none.
6. **Technical learnings/friction** — self-contained, actionable facts; empty if none.
7. **STOP reached?** — yes/no, with the exact marker message when yes.
8. **Files modified** — every non-scratch path you wrote, created, or removed, repo-relative, one per entry. Always present: an empty list is valid, a missing field makes the report malformed.
9. **Attempts per phase** — `{phase, attempts, first_failure, note}` entries. Expected; a missing field 9 never makes the report malformed.

## Prohibitions

- Run no git operation and create no commit.
- Leave `implementation.md` and every checkbox untouched.
- On a `STOP & COMMIT` marker, halt and report `STOP reached?: yes`.
- Run no `openspec` command, load no skill, and read no change artifact.

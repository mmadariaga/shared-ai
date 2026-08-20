# Apply GREEN Worker

Fetch @sai/orchestration/worker-core.md and follow it exactly.

## Invocation Envelope

The worker receives the Step's GREEN body and the dispatch-local rules; it receives no test-file content — the tests authored by the RED dispatch are never injected into the GREEN prompt. Every post-resolution lifecycle payload — `completed`, `needs_input`, `failed`, or `cancelled` — carries the worker-core closed envelope (`status`, `summary`, `changed_files`) and echoes the identical `resolved_change_name` supplied by the coordinator; pre-resolution payloads omit it. The worker never resolves a change: resolution is coordinator-owned and this worker SHALL NOT run any change-selection or change-listing query.

## Dispatch-Local Progress Plan

The GREEN dispatch declares exactly one immutable plan: `implementation → green-verification`. Emit progress events marking only the dispatch-local plan's step ids via the closed shape `{event: progress, emitted_on: string, step_ids: string[], changed_files: string[]}`, and close the run with exactly one terminal lifecycle status.

## Scope

- *Scope*: Implement ONLY what is specified in the Step's GREEN body. Do NOT write tests.
- Implementation Dispatch Allowed files contain only plan-authorized production files and exclude tests and declared interfaces.
- Scratch path: `.tmp/{change-name}/` (separate from and excluded from `Allowed files`).
- A worker MAY create temporary files only below `.tmp/{change-name}/`, MAY remove all contents of exactly that directory and the directory itself before a clean return, and has no preservation obligation on STOP or failure. A non-clean return has no preservation obligation.
- A worker MUST NOT remove the `.tmp/` parent.
- Files modified MUST contain only non-scratch paths and MUST exclude every path below `.tmp/{change-name}/`.

## GREEN Verification

The worker MAY edit production files only. Creating or modifying any test file is FORBIDDEN — the prohibition is absolute. Execute the GREEN verification command; if it does not pass, iterate on the implementation confined to non-test files. This iteration is bounded: STOP and report the Step as unpassable when either (a) passing would require editing a test file or the declared interface, or (b) repeated attempts make no progress. If the tests cannot be satisfied within bounded iteration, STOP and report the failure, leaving all test files unmodified — a failing GREEN is either an implementation bug or a wrong test/interface, which one it is SHALL be decided by a human, never by this worker.

## Recovery Continuation

On `continue_after_recovery`, resume the same GREEN worker session without re-resolution or replacement dispatch. Recovery is implementation-only and limited to authorized production files: apply the coordinator's `Correction`, re-run the dispatch's own GREEN verification, and preserve the `implementation → green-verification` plan. The coordinator's diagnosis carries exactly `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification`.

During recovery the worker MUST NOT create or modify any test file, test, or `interfaces.md`, ever or under any circumstances. This absolute prohibition has no exceptions: the GREEN continuation remains implementation-only, leaves tests and declared interfaces untouched, and may not widen its allowed files. It receives no raw output or change-artifact content and closes with a completed or failed result carrying the failure metadata and the same `resolved_change_name`.

## Unpassable GREEN STOP

If the GREEN verification remains unpassable after bounded implementation-only attempts, or a pass would require a test, `interfaces.md`, or another forbidden file change, close the post-resolution worker result with this failed envelope:

```yaml
status: failed
emitted_on: string
summary: string
changed_files: string[]
resolved_change_name: string
failure_class: blocking-contradiction
unrecoverable: boolean
```

The failed result must carry concrete, non-raw evidence: summarize the failing behavior, affected authorized production path, and the exact scope contradiction; never return raw output, logs, tracebacks, or file contents. Set boolean `unrecoverable` to `true` only when that evidence establishes that continuation is unsafe. Report `GREEN result: fail` and `STOP reached?: yes` with the exact marker message. Leave every test file and `interfaces.md` untouched, and do not authorize work outside the implementation-only scope.

## Report Contract

The worker returns a compact report containing exactly these 9 fields, and nothing else (no raw output, no file contents, no tracebacks, no iteration logs):

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed for each of the Step's checkbox items.
3. **RED result** — `n/a` (the implementation dispatch does not author or verify RED).
4. **GREEN result** — one of `pass` / `fail`.
5. **Deviations** — a list of `{plan, final, reason}` entries; empty if none.
6. **Technical learnings/friction** — self-contained, actionable facts; empty if none.
7. **STOP reached?** — yes/no, with the exact marker message when yes.
8. **Files modified** — non-scratch paths modified or created, relative to the repo root, one path per entry; empty list if none. An explicitly present empty `Files modified` list is valid; an omitted field 8 is malformed.
9. **Attempts per phase** — a list of `{phase, attempts, first_failure, note}` entries; field 9 is expected but optional and its absence soft-degrades.

## Prohibitions

- MUST NOT run any git operation or create any commit.
- MUST NOT edit or modify `implementation.md` or mark any checkbox.
- Act on a STOP & COMMIT marker — halt and report the STOP instead.
- Run any `openspec` command, load any skill, or read change artifacts.
- Create or modify any test file — this prohibition is absolute, even when this worker believes the test is wrong.
- **Report completeness**: populate field 8 with the production files modified. An empty list is valid; omitting the field produces a malformed report.

# Apply RED Worker

Fetch @sai/orchestration/worker-core.md and follow it exactly.

## Invocation Envelope

The worker receives the dispatch-local prompt assembled from the matching `## Step N` contract and the testing slice, plus the resolved change name. Every post-resolution lifecycle payload — `completed`, `needs_input`, `failed`, or `cancelled` — carries the worker-core closed envelope (`status`, `summary`, `changed_files`) and echoes the identical `resolved_change_name` supplied by the coordinator; pre-resolution payloads omit it. The worker never resolves a change: resolution is coordinator-owned and this worker SHALL NOT run any change-selection or change-listing query.

## Dispatch-Local Progress Plan

The RED dispatch declares exactly one immutable plan: `test-authoring → red-verification`. Emit progress events marking only the dispatch-local plan's step ids via the closed shape `{event: progress, emitted_on: string, step_ids: string[], changed_files: string[]}`, and close the run with exactly one terminal lifecycle status.

## Scope

- *Scope*: Write ONLY the interface stubs and the tests for this Step. Do NOT write the implementation.
- Blind Test-Writer Allowed files contain only plan-authorized test and RED/interface-stub files and exclude production files.
- Scratch path: `.tmp/{change-name}/` (separate from and excluded from `Allowed files`).
- A worker MAY create temporary files only below `.tmp/{change-name}/`, MAY remove all contents of exactly that directory and the directory itself before a clean return, and has no preservation obligation on STOP or failure. A non-clean return has no preservation obligation.
- A worker MUST NOT remove the `.tmp/` parent.
- Files modified MUST contain only non-scratch paths and MUST exclude every path below `.tmp/{change-name}/`.

## RED Phase Contract

Use only the matching Step interface contract and the injected testing slice (framework and assertion libraries and the test command). The interface stubs you write SHALL expose the required symbol but return a null/empty/wrong value and contain no logic that would satisfy the assertion — type-only scaffolding only, never assertion-satisfying production logic. You MAY read existing test files and test infrastructure only when the injected contract lacks setup conventions; the read is the specified fallback, never the first source.

## RED Verification

Run the injected test command scoped to the tests you authored and classify the failure type: a valid RED fails by assertion on the behaviour under test; a RED that passes is reported as `passes`; a setup/import/compilation failure is reported as `wrong-failure` with the error type. The test-writer does NOT verify GREEN and reports GREEN result = `n/a`.

## Recovery Continuation

On `continue_after_recovery`, resume the same RED worker without re-resolution or replacement dispatch. Recovery is limited to tests and RED/interface stubs only: apply only the coordinator-authorized `Correction`, re-run the injected RED verification, and preserve the original `test-authoring → red-verification` plan. The worker remains explicitly blind to implementation and production work; the continuation receives no implementation or production content.

The RED recovery MUST NOT write implementation or production files, perform GREEN work, or cross the tests/stubs boundary. It remains blind to the implementation and may use only the ordered `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` diagnosis; no raw output or change-artifact content is accepted. A continuation that cannot safely stay in this scope closes as an unpassable RED STOP rather than authorizing GREEN.

## Unpassable RED STOP

When bounded RED attempts cannot produce a valid RED result without a forbidden production change, an interface or test contradiction, or another unsafe correction, close the post-resolution worker result with this failed envelope:

```yaml
status: failed
emitted_on: string
summary: string
changed_files: string[]
resolved_change_name: string
failure_class: blocking-contradiction
unrecoverable: boolean
```

The failed STOP must contain concrete, non-raw evidence: summarize the observed contradiction, affected test or stub path, and why the authorized tests/stubs-only boundary cannot safely continue; never return raw output, logs, tracebacks, or file contents. Set the worker's boolean `unrecoverable` to `true` only when that evidence establishes that continuation is unsafe. Report `STOP reached?: yes` with the exact marker message, RED result not valid, GREEN result = `n/a`, and **no GREEN authorization**; this worker never dispatches or permits GREEN after an unpassable RED.

## Report Contract

The worker returns a compact report containing exactly these 9 fields, and nothing else (no raw output, no file contents, no tracebacks, no iteration logs):

1. **Step executed** — the Step number `N`.
2. **Per-item status** — done/failed for each of the Step's checkbox items.
3. **RED result** — one of `valid` / `passes` / `wrong-failure` (with error type when applicable).
4. **GREEN result** — `n/a` (the test-writer does not verify GREEN).
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
- Read any production source file outside the blindness fallback.
- **Report completeness**: populate field 8 with the test/stub files written. An empty list is valid; omitting the field produces a malformed report.

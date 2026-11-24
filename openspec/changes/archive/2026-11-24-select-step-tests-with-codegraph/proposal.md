> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

On a project whose suite takes 15 minutes, the full baseline suite at the start of `/sai-3-implement` cost one full suite per run (two per `/sai-build`), and the rule that ran every earlier step's tests was blind: it could not see that a step broke a pre-existing test until Close. Each step now runs only its own tests plus the tests `codegraph affected` selects for the files it changed, falling back to the full suite whenever the selection cannot be trusted, and Close checks only the failing tests against the change base instead of comparing with a baseline recorded at Start.

## What Changes

- New tool `sai/tools/test-select.js` with three sub-commands:
  - `select --input-file <path> [--timeout-ms <n>] --cwd <root>` reads the JSON list of files a step changed (paths under `openspec/` are left out) and prints `verdict` (`selected` or `full`), `tests`, and `reason`. It uses only the public codegraph CLI, each call with a timeout (60000 ms by default): `codegraph sync`, `codegraph status --json` (pending changes), `codegraph files --json` (index membership), and `codegraph affected --json --stdin`. It never opens `.codegraph/codegraph.db`. The fallback reasons are `no-binary`, `no-index`, `sync-failed`, `stale-index`, `unindexed-file` (with the files in `files`), `codegraph-error`, `timeout`, and `invalid-output`. An empty file list is `selected` with no tests.
  - `swap --record <path> --dirty-baseline <path> [--parent-branch <branch>] --cwd <root>` writes a record of the files the change touched since the change base, then restores the modified and deleted ones to their change-base version in the working tree and removes the added ones, never touching the git index. It refuses (`verdict: refused`, exit 1) when a changed path is in the dirty baseline (`dirty-baseline-overlap`), has uncommitted work (`uncommitted-changes`), or an unrestored record already exists (`record-exists`).
  - `restore --record <path> --cwd <root>` brings the recorded paths back to `HEAD`, is idempotent, and prints `restored`, `clean`, or `failed` with the paths that remain.
- New module `sai/tools/change-base.js` holds the one change-base computation (merge-base of `HEAD` with the parent branch, default branch order origin/HEAD, `master`, `main`); `sai/tools/scenario-coverage.js` now imports it instead of keeping its own copy.
- `sai/commands/implement/coordinator.md`:
  - Start runs no suite: the failure baseline and `baseline-failures.txt` are gone; the dirty baseline stays. The `**Test Command**` scoping idiom now names how the command takes a list of test files; a missing field, the sentinel, or an idiom that takes no file list makes every step run the full suite with the warning `no scoping idiom`.
  - A new **Test selection** paragraph replaces "the tests of every earlier step": the coordinator writes the step's changed paths to a file, runs `test-select.js select`, and on `selected` runs the step's own `**Test Command**` plus one command built from the scoping idiom over `tests`; on `full` it runs the step's own command and the full unit and integration suites and keeps the reason. A selected test that `tasks.md` lists under a later step and stays red does not fail the step. Each run appends a line to `selection.md` in the run directory, and the selection is recomputed after every review fix round.
  - Close runs the unit and integration suites; each failing test runs once more at `HEAD` (a pass is flaky and reported), then the tests that fail again run against the change base through `swap`, the installed dependencies, and `restore` whatever the outcome. A test that also fails at the base is pre-existing and reported; one that passes there is new and opens `final-suite`. A refused swap, a tool error, or a base run that cannot complete counts the failures as new, and a `failed` restore is the `final-suite` obstacle too.
  - Resuming with a `swap` record runs `restore` first.
  - The closing report lists the flaky tests, the pre-existing failures, and one line per step with `selected` and its number of tests or `full` and its reason.
- `sai-state/machines/implement-run.js` adds the `record` kind `swap` (`swaps`); `baseline` now points only to the dirty baseline.
- `sai/policies/tool-resolution.md` documents the `test-select.js` invocations, verdicts, and exit codes.
- `AGENTS.md`, `README.md`, `docs/commands/sai-3-implement.md`, `docs/review-triage.md`, and `docs/sequential-pipeline.md` describe the selection and the base check instead of the failure baseline.
- Tests: new `test/test-select.test.js`; `test/implement-family.test.js` and `test/implement-run-machine.test.js` updated.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `implement-new-loop`: Start no longer runs a baseline suite, each step's tests come from codegraph selection with a full-suite fallback, and Close classifies each failing test against the change base.
- `implement-green-cycle`: the plan-test red check no longer feeds a failure baseline, and a step closes on its own tests plus the selection instead of every earlier step's tests.
- `implement-new-resilience`: the run state records the `swap` kind and only the dirty baseline, and a resumed run restores the change's files from a `swap` record before anything else.
- `implement-new-run-log`: the closing report carries the flaky tests, the pre-existing failures, and one line per step on its tests instead of the suite result against the baseline.
- `sai-tools-distribution`: `test-select.js` and `change-base.js` join the registered deterministic tool roster.

## Impact

New files:
- `sai/tools/change-base.js`
- `sai/tools/test-select.js`
- `test/test-select.test.js`

Modified files:
- `AGENTS.md`
- `README.md`
- `docs/commands/sai-3-implement.md`
- `docs/review-triage.md`
- `docs/sequential-pipeline.md`
- `sai-state/machines/implement-run.js`
- `sai/commands/implement/coordinator.md`
- `sai/policies/tool-resolution.md`
- `sai/tools/scenario-coverage.js`
- `test/implement-family.test.js`
- `test/implement-run-machine.test.js`

Limitations accepted: file-level selection can be broad (a change to `sai/tools/scenario-coverage.js` selects 143 of 201 test files in this repository at the default depth); any changed file codegraph does not index (Markdown, JSON, prompts read with `fs`) forces the full suite, so prompt-heavy repositories gain little; the base check temporarily modifies the working tree during Close; a failure whose base run cannot complete counts as new and may escalate. End-to-end suites stay out of `/sai-3-implement`, and the audits are unchanged.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Future scope, outside this change: an end-to-end hop that follows changed symbols to their page or controller components, their `route` nodes, and the end-to-end specs whose `page.goto` literal matches the route pattern; it depends on the issue's open question Q3 (whether the indexer emits route nodes for `page.goto` literals or the selector parses the specs). Symbol-level selection through `codegraph impact`/`callers` is a later refinement once file-level selection has been measured on a real project. Step and slice time budgets (`testSelection.stepBudget`, `testSelection.sliceBudget`) and a plan-time `deferred` marker are deferred until test durations are measured and issue #525 has settled the `tasks.md` format.

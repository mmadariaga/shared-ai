# ADR 0232: Find the failures the base already had lazily at Close, in the working tree

## Status

Accepted.

## Context

`/sai-3-implement` ran the unit and integration suites once at Start to record the failure baseline, and again at Close to compare against it. On a project whose suite takes 15 minutes, that is a full suite per run (two per `/sai-build`) spent mostly on tests that pass. The earlier-steps rule had a second defect: it ran only the tests of earlier steps, so it could not see that a step broke a pre-existing test until Close.

The baseline is needed only for the tests that fail at Close, to tell a failure the base already had from a new one. A temporary worktree at the change base looks like the natural place to run them, but a fresh worktree has no installed dependencies (`node_modules`, `.venv`), so its runs would fail and every pre-existing failure would count as new.

## Decision

1. **No suite at Start.** Start records the dirty baseline and runs no full suite. The plan RED check (each plan test is still red by assertion, or passes for a `[regression guard]`) stays, through each step's own `**Test Command**`. The `baseline` record of `implement-run@1` points only to the dirty baseline.
2. **The base check runs at Close, for the failing tests only.** Each failing test runs once more at `HEAD`; a test that passes is flaky and is reported. A test that fails again runs against the change base, and the coordinator classifies it: it also fails there and is pre-existing (reported), or it passes there and is new, which opens the `final-suite` obstacle.
3. **The change base is put in the working tree.** `sai/tools/test-select.js swap` restores to their change-base version, in the working tree only, the files the change modified or deleted, and removes the files it added, so the test runs with the dependencies already installed. `restore` brings those paths back to `HEAD`, runs whatever the outcome of the base run, and is idempotent. Neither touches the git index or a dirty-baseline path, and only the coordinator runs them. The change base is the merge-base computation of `sai/tools/change-base.js`, shared with `sai/tools/scenario-coverage.js`.
4. **The swap is recorded before it happens.** `swap` writes its record file (the paths and their statuses) before it changes any file, and the coordinator keeps the record's path in `implement-run@1` as a `swap` record. A resumed run, or a Close that was interrupted with files at the base, runs `restore` with that record first, before anything else; it prints `clean` when nothing needs restoring. A `restore` that reports `failed` is a `final-suite` obstacle, and the run never commits or closes while the working tree holds base files.
5. **The swap refuses before it harms.** `swap` refuses (`refused`, exit 1) when a path of the change is part of the dirty baseline or has uncommitted work, and while the record of an earlier unrestored swap exists. A refusal, a tool error, or a base run that cannot complete counts the failure as new, so the check never hides a regression.
6. **The step selection reports what Close finds.** The closing report lists, per step, whether the selection ran (with its number of tests) or the full suite ran (with the reason), and the flaky tests and the pre-existing failures that Close found.

## Alternatives Considered

- **Keep the full Start baseline** — rejected: it costs a full suite per run and saves nothing, because the same failures are found at Close for the tests that fail.
- **A partial baseline over the selection** — rejected: it is more complex and protects less, because the selection is by construction the tests the change can reach, not the tests that fail at Close.
- **A temporary worktree at the change base, with an optional setup-command setting** — rejected: a fresh worktree has no installed dependencies, so its runs would fail and every pre-existing failure would count as new, and the setup command would add a setting that each project has to get right.

## Consequences

- A run no longer pays a full suite at Start, and a failure the base already had no longer needs a recorded list: only the tests that fail at Close are run twice more.
- The user's working tree temporarily holds base files during the Close check. Safety rests on every step being committed, on the refusal rules of `swap`, and on the record written first, so an interruption is healed by `restore` on resume.
- A failure whose base run cannot complete counts as new and may escalate to the user through `final-suite`, which is the price of never hiding a regression.
- A change to a path that is part of the dirty baseline cannot be checked against the base at all, so its failures count as new.

## Provenance

Change `select-step-tests-with-codegraph`, decision "Lazy failure baseline in the working tree".

# ADR 0233: SAI commands run indicated and related tests; the routine full-suite run belongs to CI

<!-- adr-index: amends 0232; refs 0201 -->

## Status

Accepted.

Amends [ADR 0232](./0232-lazy-failure-baseline-in-the-working-tree.md).

## Context

The SAI commands that run project tests followed three different policies. `/sai-3-implement` ran each step's own tests plus the tests `test-select.js` reported as affected, but its Close ran the full unit and integration suites. The Direct Build suite gate ran the full suite on every gate round. `/sai-merge` ran a full-suite baseline at `HEAD` before the launch and a full-suite verification at the end. Each command also resolved its test command differently, classified failing tests with a different mechanism (`test-select.js swap`/`restore`, a detached `git worktree` at `base_sha`, an eager baseline), handled flaky tests differently, and treated a runner that cannot run differently. Running the full suite inside these commands cost time on every run, and the divergence made the behavior hard to predict and maintain.

## Decision

1. **One policy.** `sai/policies/test-execution.md` is the single source for how `/sai-3-implement` (and through it `/sai-build` and `/sai-deep-review`), Direct Build (the explore route and `/sai-direct-build`), and `/sai-merge` choose, run, and classify project tests.
2. **Indicated and related tests only.** Each run executes the tests the work names (a step's or the plan's `**Tests**`, or the test files the Direct Build implementer created or modified) plus the tests `test-select.js select` reports for the files changed in that run's scope. The routine full-suite run belongs to CI.
3. **The full suite is the last resort.** It runs only when the selection cannot be trusted (no `codegraph`, a stale index, a changed file with no dependents, and the other `full` reasons of `select`), or when the test command takes no list of files.
4. **One resolver.** `test-select.js command` resolves the test command and its scoping idiom once per run for the three commands.
5. **One classification.** A failing test is rerun once at the current state (passing means flaky) and then run at the classification base through `test-select.js swap` and `restore` (ADR 0232), which this record extends from `/sai-3-implement` to Direct Build (`base_sha`) and `/sai-merge` (the pre-launch `HEAD`). The detached-worktree classification of Direct Build and the eager pre-launch baseline of `/sai-merge` retire.
6. **A runner that cannot run is an obstacle.** An ambiguous test command or a runner that cannot run is the `test-command` obstacle, with a budget of 3 attempts and escalation, in every command; a project with no test suite is reported and the run continues.

## Alternatives Considered

- **Run only the indicated tests, with a warning when the selection cannot be trusted** — rejected in favor of the full suite as a last resort, which is safer.
- **Stop and escalate when the selection cannot be trusted** — rejected, because it would block unattended runs on an environment detail.
- **Keep each command's resolver and add a scoping idiom to each** — rejected, because the three resolvers would keep diverging.
- **Lazy classification in a detached worktree in the three commands** — rejected, because the worktree lacks the installed dependencies and turns many tests `unrunnable`.
- **Keep the eager merge baseline over a set predicted with `merge.js simulate`** — rejected as extra complexity for one command.
- **Report a runner that cannot run and continue in every command** — rejected, because a Direct Build could archive and commit with no test run.

## Consequences

- A regression in code that no related test reaches surfaces only in CI, not inside the SAI command.
- In `/sai-merge`, `swap` changes the working tree right after the integration, so a failed `restore` blocks the run.
- A project whose test command takes no list of files keeps running the full suite, with the reason `no scoping idiom`.
- Each closing report lists every test run with its selection result, the flaky and pre-existing failures, and a statement that the routine full-suite run belongs to CI.

## Provenance

Change `unify-test-execution-policy`, decision "The routine full-suite run belongs to CI".

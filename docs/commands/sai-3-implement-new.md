# `/sai-3-implement-new`

## Command function

Implements a change's planning artifacts (`proposal.md`, `specs/`, `design.md`, `tasks.md`, `interfaces.md`) from start to finish with no human in the loop. It writes the tests, writes the code, runs the checks, and makes one local commit per step. It works on Claude Code and opencode.

## Flags and behavior modifiers

- `--fast-track`: accepted and ignored. The command already commits locally without asking.

## In detail

The change must have `proposal.md`, `tasks.md`, and at least one file under `specs/`. When one is missing, the command prints which items are absent and stops before it starts. This is not an escalation. When every task in `tasks.md` is already checked, it does no new work, runs the suites, and closes.

Before the first step, the command records which unit and integration tests already fail. Those failures are not obstacles. At the end it runs every unit and integration suite and compares the result with that record. End-to-end suites never run inside the command; leave them to your CI.

The command works in steps. A step is one cycle of RED, GREEN, review, and commit, and the command chooses its size:

1. A RED worker writes the step's failing tests and the stubs they need. The command runs only those tests and checks that they fail on an assertion.
2. A GREEN worker writes the production code and never touches tests. The command runs the same tests again and checks that they pass.
3. The command reads the step's diff against its brief.
4. The command ticks the finished tasks in `tasks.md` and commits only the paths the run changed. Files that were already dirty before the run are never touched or committed. Nothing is pushed.

Both workers live for the whole run and receive each step as a message, with the file that tells them how to work by pointer.

The plan is a plan. The command may edit any planning artifact, or override it in the instruction it sends a worker, whenever that is cheaper than following it. It records each difference as a deviation and lists the deviations in its closing report.

When something blocks a step, the command tries one corrected approach. If the step still cannot close, or if the run needs a decision only you can make (a change to the proposal's intent, a push, a deletion, a missing credential), it stops and asks you with options, one of which ends the run. This slice has no retry budget, run-state store, worker replacement, resume, or `build-log.md`, and no review round after GREEN.

The command ends with `Implement-new done.` when every task is checked and the suites show no new failure.

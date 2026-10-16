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
3. The command attacks the step's implementation, because GREEN sees the tests and can satisfy them without meeting the spec. It reads the diff against the step's spec scenarios and tasks for spec fidelity, test gaming, and excess scope, and exercises the behavior through the project's runnable surface when it can. Style, design, performance, and general security are left to the later review command. The findings follow the shared artifact review format. Defects go back to the worker that owns them, for at most 3 fix rounds, and a finding about a scenario without a test goes through RED first so the fix stays test-driven. Fix rounds are not attempts. Findings that survive the third round are not a failure: the command records them as pending, commits the step, and carries on.
4. The command ticks the finished tasks in `tasks.md` and commits only the paths the run changed. Files that were already dirty before the run are never touched or committed. Nothing is pushed.

Both workers live for the whole run and receive each step as a message, with the file that tells them how to work by pointer.

The plan is a plan. The command may edit any planning artifact, or override it in the instruction it sends a worker, whenever that is cheaper than following it. It records each difference as a deviation and lists the deviations in its closing report.

When something blocks a step or the final suite run, the command treats it as an obstacle. Each obstacle has a budget of 3 attempts, and every attempt must take a different approach: a corrected instruction, an edit to the plan, an override that contradicts the plan, or a new worker. Asking the same approach again is not an attempt. A worker whose report cannot be read, that goes silent, or that drifts from its instruction is an obstacle too: the command asks the same worker again first, then replaces it with a new worker that receives a hand-over summary the command wrote itself.

When the 3 attempts are spent, the command stops at once and asks you, without moving on to later tasks first: a step cannot skip its failing test and still keep the test-first order. It tells you what happened, what is done and committed, and what it tried, then offers options it writes itself. One option always stops the run. If you choose a way to continue, that obstacle's counter starts again at zero. A decision only you can make (a change to the proposal's intent, a push, a deletion, a missing credential) asks you at once without spending an attempt.

The command keeps its run state in the `sai-state` store, as identifiers and file paths only. The free text of the run (deviations, overrides, worker reports, baselines) lives in files in a run directory inside the repository's ignored `.tmp/{change}/run-*/` folder, so workers can write there without leaving the project, and workers return only the path of their report. After a context compaction, the command reads the store and the files it points to and carries on. In a new session that cannot see the store, it rebuilds progress from `git log` and the `tasks.md` checkboxes and continues at the first pending step; the step that was in progress restarts with its counters at zero.

When the run ends, whether it completed, you stopped it, or the question went unanswered, the command writes `openspec/changes/{change}/build-log.md`: the work done, the deviations and overrides, the suite result against the baseline, the pending findings left by the step reviews, and the blocker with the options offered. The file is the record for a later review, because the run directory is scratch. It stays on disk next to the change's artifacts and is part of no commit, because version control ignores the change directory apart from `proposal.md`.

The command ends with `Implement-new done.` when every task is checked and the suites show no new failure. A stopped or blocked run ends with its report and no closing line.

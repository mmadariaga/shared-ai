# `/sai-3-implement`

## Command function

Implements a change's planning artifacts (`proposal.md`, `specs/`, `design.md`, `tasks.md`, `interfaces.md`) from start to finish with no human in the loop. It writes the tests, writes the code, runs the checks, and makes one local commit per step. It works on Claude Code and opencode.

## Flags and behavior modifiers

- `--fast-track`: accepted and ignored. The command already commits locally without asking.

## In detail

Without a change name, the command takes the only active change that has a `tasks.md`; with none or several, it prints the candidates and stops so you can name one. The change must have `proposal.md`, `tasks.md`, and at least one file under `specs/`. When one is missing, the command prints which items are absent and stops before it starts. This is not an escalation. When every task in `tasks.md` is already checked and no audit report holds an open fixable finding, it does no new work, runs the suites, and closes.

Before the first step, the command records which unit and integration tests already fail, using the `Test Command` field of `tasks.md` (or, when it is missing, `SAI_LEARNINGS.md`, `design.md`, or the project's build files). Those failures are not obstacles. At the end it runs every unit and integration suite and compares the result with that record. End-to-end suites never run inside the command; leave them to your CI.

The command works in steps. A step is one cycle of RED, GREEN, review, and commit, and the command chooses its size:

1. A RED worker writes the step's failing tests and the stubs they need. The command runs only those tests and checks that they fail on an assertion.
2. A GREEN worker writes the production code and never touches tests. The command runs the same tests again and checks that they pass.
3. The command attacks the step's implementation, because GREEN sees the tests and can satisfy them without meeting the spec. It reads the diff against the step's spec scenarios and tasks for spec fidelity, test gaming, and excess scope, and exercises the behavior through the project's runnable surface when it can. Style, design, performance, and general security are left to the later review command. The findings follow the shared artifact review format. Defects go back to the worker that owns them, for at most 3 fix rounds, and a finding about a scenario without a test goes through RED first so the fix stays test-driven. Fix rounds are not attempts. Findings that survive the third round are not a failure: the command records them as pending, commits the step, and carries on.
4. The command ticks the finished tasks in `tasks.md` and commits only the paths the run changed, then checks that nothing the run changed is left uncommitted. Before staging, it checks every path against the project's ignore rules and never force-adds an ignored one: in a project that ignores its change directory, `tasks.md` and the other plan artifacts keep their edits on disk and stay out of the commit. Files that were already dirty before the run are never touched or committed. Nothing is pushed.

After the last task, the command applies the audit reports that exist in the change directory (`review.md`, `security.md`, `performance.md`, `accessibility.md`). Each open finding goes through the same GREEN, review, and commit cycle, with RED first only when the finding needs a new test: then RED writes a test that proves the defect in the existing code before GREEN fixes it. A finding that an existing test already exposes, or that no test can usefully pin, goes to GREEN directly. The commit carries the fix together with the finding's ` (FIXED)` mark. Findings that already carry the mark, like checked tasks, are never done again, and findings that carry an ` (EXCLUDED: <reason>)` mark are skipped: remove the mark to have them applied. Questions stay open for you and appear in the closing report, and a finding the command judges mistaken stays open with its reason.

Both workers live for the whole run and receive each step as a message, with the file that tells them how to work by pointer.

The plan is a plan. The command may edit any planning artifact, or override it in the instruction it sends a worker, whenever that is cheaper than following it. It records each difference as a deviation and lists the deviations in its closing report.

When something blocks a step or the final suite run, the command treats it as an obstacle. Each obstacle has a budget of 3 attempts, and every attempt must take a different approach: a corrected instruction, an edit to the plan, an override that contradicts the plan, or a new worker. Asking the same approach again is not an attempt. A worker whose report cannot be read, that goes silent, or that drifts from its instruction is an obstacle too: the command asks the same worker again first, then replaces it with a new worker that receives a hand-over summary the command wrote itself.

When the 3 attempts are spent, the command stops at once and asks you, without moving on to later tasks first: a step cannot skip its failing test and still keep the test-first order. It tells you what happened, what is done and committed, and what it tried, then offers options it writes itself. One option always stops the run. If you choose a way to continue, that obstacle's counter starts again at zero. A decision only you can make (a change to the proposal's intent, a push, a deletion, a missing credential) asks you at once without spending an attempt.

The command keeps its run state in the `sai-state` store, as identifiers and file paths only. The free text of the run (deviations, overrides, worker reports, baselines) lives in files in a run directory inside the repository's ignored `.tmp/{change}/run-*/` folder, so workers can write there without leaving the project, and workers return only the path of their report. After a context compaction, the command reads the store and the files it points to and carries on. The store is keyed by the change, so a later session on the same machine finds an interrupted run and resumes it; run one build per change at a time. When the store is gone (another machine, or a cleared temporary directory), it rebuilds progress from `git log` and the `tasks.md` checkboxes and continues at the first pending step; the step that was in progress restarts with its counters at zero.

When the run ends, whether it completed, you stopped it, or the question went unanswered, the command writes `openspec/changes/{change}/build-log.md`: the work done, the deviations and overrides, the suite result against the baseline, the pending findings left by the step reviews, the audit findings fixed and those left open, and the blocker with the options offered. The file is the record for a later review, because the run directory is scratch. It stays on disk next to the change's artifacts, and the command never stages it.

When a deviation is a project fact, such as a package, command, or configuration rule, the command also records it in the root `SAI_LEARNINGS.md`. That file stays uncommitted, and the command creates no file when no deviation qualifies.

When [`/sai-deep-review`](sai-deep-review.md) runs this command as its fix segment, it hands over the reports it regenerated and marked: the command applies only those reports, treats them as the run's own paths, and commits them with the first step. A Question that carries your answer is applied as a finding whose correction is that answer.

The command ends with `Implement done.` when every task is checked and the suites show no new failure. A stopped or blocked run ends with its report and no closing line.

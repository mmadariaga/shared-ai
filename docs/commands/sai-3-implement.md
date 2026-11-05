# `/sai-3-implement`

## Command function

Implements a change's planning artifacts (`proposal.md`, `specs/`, `design.md`, `tasks.md`, `interfaces.md`) from start to finish with no human in the loop. It writes the tests, writes the code, runs the checks, and makes one local commit per step. It works on Claude Code and opencode.

## In detail

Without a change name, the command takes the only active change that has a `tasks.md`; with none or several, it prints the candidates and stops so you can name one. The change must have `proposal.md`, `tasks.md`, and either at least one file under `specs/` or `.openspec.yaml` with `skip_specs: true`. When one is missing, the command prints which items are absent and stops before it starts. This is not an escalation. When every task in `tasks.md` is already checked and no audit report holds an open fixable finding, it does no new work, runs the suites, and closes.

Before the first step, the command records which unit and integration tests already fail, using the `Test Command` field of `tasks.md` (or, when it is missing, `SAI_LEARNINGS.md`, `design.md`, or the project's build files). Those failures are not obstacles. At the end it runs every unit and integration suite and compares the result with that record. End-to-end suites never run inside the command; leave them to your CI.

The command works in steps. A step is one cycle of RED, GREEN, review, and commit, and the command chooses its size:

1. A RED worker writes the step's failing tests and the stubs they need. The command runs only those tests and checks that they fail on an assertion.
2. A GREEN worker writes the production code and never touches tests. The command runs the same tests again and checks that they pass.
3. The command attacks the step's implementation, because GREEN sees the tests and can satisfy them without meeting the spec. It reads the diff against the step's spec scenarios and tasks for spec fidelity, test gaming, and excess scope, and exercises the behavior through the project's runnable surface when it can. Style, design, performance, and general security are left to the later review command. The findings follow the shared artifact review format. Defects go back to the worker that owns them, for at most 3 fix rounds, and a finding about a scenario without a test goes through RED first so the fix stays test-driven. The first review pass of a step reads the whole step diff; every later pass reads only what the last fix round changed, plus the code that uses it, so unchanged code is not reviewed again. A finding stays open until a later pass confirms it fixed, and a problem that was already there before the step is reported at the end instead of being fixed. Fix rounds are not attempts. After the third round the command makes one last report-only pass. Findings that survive it are not a failure: the command records them as pending, commits the step, and carries on.
4. The command ticks the finished tasks in `tasks.md` and commits only the paths the run changed, then checks that nothing the run changed is left uncommitted. Before staging, it checks every path against the project's ignore rules and never force-adds an ignored one: in a project that ignores its change directory, `tasks.md` and the other plan artifacts keep their edits on disk and stay out of the commit. Files that were already dirty before the run are never touched or committed. Nothing is pushed.

After the last task, the command applies the audit reports that exist in the change directory (`review.md`, `security.md`, `performance.md`, `accessibility.md`). Each open finding goes through the same GREEN, review, and commit cycle, with RED first only when the finding needs a new test: then RED writes a test that proves the defect in the existing code before GREEN fixes it. A finding that an existing test already exposes, or that no test can usefully pin, goes to GREEN directly. The commit carries the fix together with the finding's ` (FIXED)` mark. Findings that already carry the mark, like checked tasks, are never done again, and findings that carry an ` (EXCLUDED: <reason>)` mark are skipped: remove the mark to have them applied. Questions stay open for you and appear in the closing report, and a finding the command judges mistaken stays open with its reason.

Both workers live for the whole run and receive each step as a message, with the file that tells them how to work by pointer.

The plan is a plan, and it holds decisions you agreed in Explore. The command may edit any planning artifact, or override it in the instruction it sends a worker, only when execution shows that following it does not work: the plan contradicts the code or the tests, a planned signature or file does not fit, a step cannot close as grouped, or two artifacts contradict each other. Saving work is not a reason. The command chooses the alternative that preserves the intent of `proposal.md`, also when the decision came from the `Ready to Propose` block, and does not stop to ask. It records each difference as a deviation and lists the deviations in its closing report.

When something blocks a step or the final suite run, the command treats it as an obstacle. Each obstacle has a budget of 3 attempts, and every attempt must take a different approach: a corrected instruction, an edit to the plan, an override that contradicts the plan, or a new worker. Asking the same approach again is not an attempt. A worker whose report cannot be read, that goes silent, or that drifts from its instruction is an obstacle too: the command asks the same worker again first, then replaces it with a new worker that receives a hand-over summary the command wrote itself.

When the 3 attempts are spent, the command stops at once and asks you, without moving on to later tasks first: a step cannot skip its failing test and still keep the test-first order. It tells you what happened, what is done and committed, and what it tried, then offers options it writes itself. One option always stops the run. If you choose a way to continue, that obstacle's counter starts again at zero. A decision only you can make (a change to the proposal's intent, a push, a deletion, a missing credential) asks you at once without spending an attempt.

After a context compaction, the command continues from its saved progress. To
resume an interrupted run, invoke `/sai-3-implement <change-name>` again on the
same machine; run only one build per change at a time. If the saved state is
unavailable, it reconstructs progress from local commits and checked tasks and
restarts the unfinished step. For temporary-storage or permission errors, see
[implementation recovery](../doctor.md#interrupted-implementation-runs).

When the run ends, whether it completed, you stopped it, or the question went unanswered, the command prints a closing report: the work done, the deviations with their reasons, the suite result against the baseline, the pending findings left after the third fix round of the step reviews, the audit findings fixed and those left open, and the blocker with the options offered. Deviations and pending findings are always listed, or reported as none. Nothing is persisted: the report is the only record, and a `build-log.md` that already exists in a change is left untouched.

The root `SAI_LEARNINGS.md`, when it exists, is read directly by design, RED, GREEN, and review; the step brief carries its path, and nothing copies its entries into `tasks.md`. An entry wins over code that does the opposite: RED and GREEN follow it, and contradicting code in a file the step modifies is corrected in the same step. Contradicting code in a file the change does not touch stays unchanged, and the closing report shows its path and the entry's key. When following an entry fails on execution, the entry is stale: the command records a deviation with that evidence and, at close, corrects or deletes the entry. Each correction or deletion is written to the `## Learnings Corrections` section of the change's `design.md` (section, key, previous value, new value or `deleted`, and the evidence) and appears in the closing report.

When a deviation is a project fact, such as a package, command, or configuration rule, the command also records it in the root `SAI_LEARNINGS.md`. That file stays uncommitted, and the command creates no file when no deviation qualifies and no entry is stale.

When a completed run fixed at least one audit-report finding and has a
`review.md`, it stores four inherent-risk ratings there: security, reversibility,
critical sections, and blast radius. They describe the nature of the reviewed
change, not how many defects remain. The ratings receive their own local commit
under the invocation's existing authorization; an ignored `review.md` stays
uncommitted. A stopped or blocked run, a run with no finding fixed, or a change
without `review.md` stores no ratings. If the comparison branch cannot be
determined or the ratings cannot be validated, the closing report explains why
they were not stored. Running review again regenerates `review.md` without
stored ratings; a later completed fix run can add them again.
[`/to-pr`](to-pr.md) reuses current ratings or recomputes them when needed.
For the storage format and freshness checks, see the
[technical risk contract](../../sai/policies/inherent-risk.md#stored-block).

When the run completes and the design has decisions that carry a `**Record family**` marker, the command creates one ADR or DDR per decision and updates the family's index, in its own local commit before the closing report, describing what was implemented and citing the deviation when the run departed from the decision. A stopped or blocked run creates none. A change receives its records once: a later run on the same change does not create a record that already cites it. Inside [`/sai-build`](sai-build.md) the build creates the records at its own close, and inside [`/sai-deep-review`](sai-deep-review.md) the completed fix segment creates them. Without a `docs/adr/` or `docs/ddr/` folder or its `0000-INDEX.md`, the first record creates it from the index template. A path the project's ignore rules cover stays on disk uncommitted, and the closing report says so.

When [`/sai-deep-review`](sai-deep-review.md) runs this command as its fix segment, it hands over the reports it regenerated and marked: the command applies only those reports, treats them as the run's own paths, and commits them with the first step.

The command ends with `Implement done.` when every task is checked and the suites show no new failure. A stopped or blocked run ends with its report and no closing line.

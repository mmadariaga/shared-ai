# `/sai-3-implement-new` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @skills/budget-executor/SKILL.md
Fetch @sai/policies/tool-resolution.md

You are the driver of the run. The invocation carries one string, `arguments_value`: the change name.

## Goal

Implement the change's plan artifacts end to end with no human in the loop. The change is done when every task in `tasks.md` is checked, each step has its own local commit, and the unit and integration suites show no failure that the base did not already have. A human is needed only for force majeure.

The plan is a plan. You read it, edit it, and override it whenever that is cheaper than obeying it, and you record every difference as a deviation.

## Start

1. Fetch @sai/policies/prereqs-check.md and run its check. A halt prints the matching literal and ends the run before anything else happens. Fetch @sai/policies/prereqs-paths.md for the artifact paths.
2. Drop any `--fast-track` token from `arguments_value`; the remainder is the change name. An empty remainder takes the only change directory under `openspec/changes/` (archive excluded) that has a `tasks.md`.
3. The change is startable when `openspec/changes/{name}/` has `proposal.md`, `tasks.md`, and at least one file under `specs/`. Otherwise print this and end the run, without escalating and writing nothing: `Cannot start /sai-3-implement-new for {name}: missing {list of the absent items}.`
4. Read `proposal.md`, `tasks.md`, `interfaces.md`, `design.md`, and the specs once; read each again when a step needs it. A missing `design.md` or `interfaces.md` is a deviation, not a stop.
5. Open the run state. `spawn` a `sai-state` session and keep its id (key: `implement-new-{name}`), resolving the CLI per `tool-resolution.md`, then emit `status` to `implement-new-run@1`. A `running` or `escalated` stage with its `dir` is a run that was interrupted: follow Resuming and skip the rest of Start. Otherwise create the run directory inside the repository, as `.tmp/{name}/run-{unique-suffix}/` (the already-ignored `.tmp/`, which the workers may write without leaving the project), and emit `start` with its path. The directory holds the free text of the run; the store holds only identifiers and paths (see Run state).
6. Record the dirty baseline: write `git status --porcelain` to `baseline-dirty.txt` in the run directory and emit `record` (`baseline`). Those paths are not the run's.
7. Find the project's unit and integration test commands in `SAI_LEARNINGS.md`, `design.md`, `package.json`, or the build files. When every task is already checked, do no new work: run the suites once through the executor, report their result, and close. When no suite can be found or run, say so in that report.
8. Run the suites once through the executor. The failing tests are the failure baseline: write them to `baseline-failures.txt` in the run directory and emit `record` (`baseline`). When no suite can be found or run, record the baseline as `unavailable`.

## The step cycle

A step is one RED, GREEN, review, and commit cycle. Choose its size: the smallest group of unchecked tasks that delivers one testable behavior. Name it `step-{n}` and emit `step-start`. Write its brief first: the goal, the task ids, the spec scenarios, the `interfaces.md` signatures, the paths each worker may write, and the path where the worker writes its report.

**RED.** Send the brief to the RED worker. Run the step's tests through the executor. RED is closed when the tests fail by assertion on the behavior under test. A pass or a failure for any other reason (import, syntax, fixture) means RED has not proven the behavior: send RED a corrected instruction, which is an attempt of the step. A pass whose behavior already exists in the code closes the step differently: commit the tests, skip GREEN, and record the deviation. A step that admits no meaningful test skips RED and runs GREEN only, with its deviation recorded.

When RED is closed, `git add` the paths RED reported. The index now holds the tests as RED wrote them.

**GREEN.** Send the brief to the GREEN worker. Run the step's tests through the executor. GREEN is closed when they pass and no test file or `interfaces.md` changed since RED: compare `git diff --name-only` and `git status --porcelain` with the set staged after RED. Restore a touched file from the index, delete a test file GREEN created, and count either as an attempt of the step.

**Review.** GREEN saw the tests and can satisfy them without meeting the spec, so attack the step's implementation before a later step builds on it. Read the step's diff (`git diff HEAD`, which holds the staged tests and GREEN's production code) against the brief's spec scenarios and tasks, and form findings with two checks:

- Structural. Every scenario and task maps to changed production paths and to a test that asserts it. The tests are not gamed: no special-casing of the test inputs, no hard-coded expected values, no assertion that proves less than its scenario. Nothing beyond the brief is added, with no anticipatory implementation (no hook, stub, "for later" abstraction, or reference whose only purpose is to serve a later step). The production files match the plan or are justified in a deviation.
- Empirical. Whenever feasible, exercise the requested behavior through the project's runnable surface (tests, CLI, or script) with the executor, and do not infer it from the diff.

This is the criteria of `sai/commands/explore/steps/pipeline-direct-build.md` Step 2, scoped to spec fidelity, test gaming, and excess scope. Style, design, performance, and general security belong to the later review command, so do not report them.

Fetch @sai/policies/artifact-review-contract.md and form findings in its shape (identifier, severity, location, issue, correction). An observation whose fix needs behavior the approved scope does not ask for is a scope observation, not a finding: it is neither fixed nor recorded as pending, and it extends no round. Write each round's findings to `reviews/step-{n}-round-{k}.md` in the run directory.

A round with findings sends them, as one ordered list, to the worker that owns the defect: a production defect to GREEN, a wrong test to RED. A finding about a spec scenario that has no test goes through RED first: RED writes the test, you run it through the executor and confirm it fails by assertion, `git add` its files, and only then send the finding to GREEN, so the fix stays test-driven. The message reuses the step's pointer line without resetting the machine, and names a new report path. After each fix, run the step's tests again through the executor and re-apply the GREEN closing check. Any file a fix changes joins the step's paths.

Fix rounds are not attempts and spend no budget. Run at most 3 fix rounds, then read the diff once more. A round with no findings converges. Findings that remain after the third fix round are not a failure and not an obstacle, and nothing escalates: write them to `findings.md` in the run directory, one entry per finding with the step, identifier, severity, location, issue, and correction, emit `record` (`finding`) the first time the file is written, and continue to the commit. The later review reads them first. A worker that fails to carry out a fix round (an unreadable report, silence, or drift) is an ordinary obstacle of the step.

**Commit.** Check the checkboxes in `tasks.md` that the step completed. Stage exactly the step's paths: the workers' reported files, `tasks.md`, and any plan artifact you edited. `git diff --cached --name-only` must list only those paths. Commit locally with a Conventional Commits message, subject at most 50 characters and body only when needed. The message carries only the step's own content: no `Co-Authored-By` trailer and no AI-attribution line of any kind, even when the harness suggests one. Invoking the command authorizes these local commits and nothing else: never push.

After the commit, emit `step-done`. Continue with the next step until every task is checked.

## Workers

Fetch @sai/orchestration/workers/bindings/red-new-worker.md and use it.
Fetch @sai/orchestration/workers/bindings/green-new-worker.md and use it.

Create each worker when its first step needs it, and keep it for the whole run. The creation dispatch carries only the ready prompt; the worker returns `event: ready` and the first brief goes to the same worker in the next message. A worker that returns no ready is an obstacle (see Obstacles). Continue a worker with the harness call its binding names: `SendMessage` to the captured agent ID on Claude Code, `task` with the captured `task_id` on opencode.

Every brief opens with the pointer line for the worker's step file. Before each step, reset the role's machine, `red-new-steps@1` or `green-new-steps@1`, and send `Active step: <stage> — follow <next.follow>` from the response. When the store fails, send the next pointer from the static order yourself and continue: RED follows `sai/commands/implement-new/steps/red-step.md`, GREEN follows `sai/commands/implement-new/steps/green-step.md`.

A worker writes its report to the file named in the brief, `reports/step-{n}-{role}-{k}.yaml` in the run directory, and returns only that path. Emit `record` (`report`) for the path, then read the file. RED writes tests and stubs, GREEN writes production code, and neither runs git.

## Authority over the plan

You edit `proposal.md`, `specs/`, `design.md`, `tasks.md`, and `interfaces.md` yourself, and workers write only tests, stubs, and production code. An override in a brief takes precedence over the plan. When artifacts contradict each other, keep the reading that preserves the intent of `proposal.md`, edit the other artifact, and move on.

A correction that invalidates a committed step adds a new step in `tasks.md` that corrects it. Commits are never rewritten. Commits contain only paths the run changed; a path from the dirty baseline that a step must also change cannot be committed without absorbing foreign work, so that is force majeure.

Write each deviation to `deviations.md` in the run directory as it happens: where the work differs from the plan, what the plan said, what was done, and why. Write each override you give a worker to `overrides.md` the same way: the step, the worker, and the instruction. Emit `record` (`deviation`, `override`) the first time each file is written. Both files feed the closing report and `build-log.md`.

## Obstacles

An obstacle is anything that prevents closing a step or the run: a test you judge wrong or contrary to the spec, a failing tool, a worker whose report cannot be read, a worker that stays silent past what the step needs, or a worker that drifts from its instruction. The goal is to close the step, so respond and keep moving.

Name each obstacle with an identifier (`step-{n}`, or `final-suite` for the closing suite run) and give it a budget of 3 attempts. An attempt is one response with an approach different from the previous one, so repeating an approach is not an attempt. The approaches are:

- a corrected instruction, which includes asking the same worker again when its report is unreadable, it is silent, or it drifted;
- a plan edit, such as correcting `tasks.md` or `interfaces.md`, or having RED correct a test you judge wrong; GREEN never touches tests;
- an override: an instruction to a worker that contradicts the plan;
- a new worker, created when asking the same worker again did not help: it replaces the old one for that role, gets the ready handshake like any new worker, and receives a hand-over summary you write yourself in `handover-{role}-{k}.md` in the run directory (the step's goal, the files already written, the conventions the old worker followed, and the symptom). Never forward the old worker's history. The files in the working tree stay as they are.

Before each attempt, emit `attempt` for the obstacle. The response reports what is spent. When it is `rejected` as `exhaustion`, the budget is gone: escalate at once. Do not advance to another task first, because RED blocks GREEN inside a step and a skipped step breaks the test-first order.

A final suite run with a new or worsened failure compared with the baseline is the `final-suite` obstacle, with its own budget; each attempt is a new step that corrects the failure.

Force majeure escalates at once, without spending an attempt: a change of intent for `proposal.md`'s What or Why, an operation that needs human authorization (push, deletion, shared-system change, missing credential, unavailable external service), or foreign work in a path the run must commit. An exhausted budget is force majeure as well.

To escalate, emit `escalate` for the obstacle, then state in plain words what happened, what is done and committed, and what you tried. Ask through the native picker, with options you write: one or more ways to continue, each naming a different approach, and one that stops the run. Keep the option count within the picker's capacity. Emit `answer` with the user's choice (`continue` or `stop`). A `continue` resets that obstacle's counter; carry out the approach the user chose. A `stop` closes the run (see Close).

## Run state

The `implement-new-run@1` machine in `sai-state` is your memory outside the conversation. It holds identifiers and paths only: the run directory, the current step, the committed steps, the attempts spent per obstacle, the open escalation, and the paths of the files that hold deviations, overrides, worker reports, findings, and baselines. Free text never goes into an event, because a shell pipe may re-encode it. It lives in files in the run directory, which is why a worker returns the path of its report and not the report.

Emit an event by piping its JSON to `emit <id> implement-new-run@1 -`. The events are `start`, `step-start`, `step-done`, `attempt`, `escalate`, `answer`, `record`, `close`, and `status`, each with the identifier or path fields its use above names. Every response carries `run` (the current state) and `budgets` (the attempts spent per obstacle). When an emit still fails after two retries with a corrected delivery form, keep the same facts in `run-state.md` in the run directory and carry on from there; the run does not stop for it.

Pending findings are defects from a step review that survive the step's third fix round and remain at close. They live in `findings.md`, recorded as the Review section says.

## Resuming

After a context compaction, or when Start finds an interrupted run, you may remember little of it. Emit `status` first, read the files the state references, and compare them with `git log` and the checkboxes in `tasks.md`. Commits and checkboxes win over the store. Continue at the first step with an unchecked task: the step in progress restarts and keeps the attempts the store has for it. Your workers' handles may be gone with your context; create new workers, which gets them the ready handshake and a hand-over summary like any replacement, and spends no attempt. An `escalated` stage means the question was not answered: ask it again.

In a session that cannot see the store, rebuild progress from `git log` and `tasks.md` the same way and start the run state fresh: every counter is at zero. A run directory left under `.tmp/{name}/` by the earlier run still holds its deviations, overrides, and findings; read them and carry them into the new run directory. Uncommitted paths you did not make count as the dirty baseline, and a step that must change one of them is force majeure.

## Close

After the last step, run the unit and integration suites through the executor; end-to-end suites are never run here. Compare with the failure baseline. A new or worsened failure is the `final-suite` obstacle (see Obstacles). An `unavailable` baseline is reported as is.

The run closes when every task is checked and the suites show no new failure, when the user answers an escalation with stop, or when the escalation question is dismissed without an answer. In each case:

1. Compose `openspec/changes/{name}/build-log.md` from the run directory files. It is the durable report for a later review, which may run in another session after the run directory is gone. It holds: the work done (each committed step with its subject and the tasks it completed), the deviations, the overrides, the suite result against the baseline, the pending findings, and the blocker with the options offered and the answer when the run did not complete. It stays on disk next to the change's artifacts and is part of no commit: version control ignores the change directory apart from `proposal.md`.
2. Print the closing report: the steps committed (subject each), the deviations, the suite result against the baseline, the pending findings, and whatever remains open. Mention that `build-log.md` holds the same record.
3. Emit `close` with the outcome (`completed`, `stopped`, or `escalated` for a dismissed question), then `reset` both step machines and `close` the `sai-state` session.

A run that completed ends with exactly `Implement-new done.`. A run that stopped or escalated ends with its report and no closing line. Inside `/sai-build-new` the line of that command replaces this one.

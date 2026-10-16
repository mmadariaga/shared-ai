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
5. Record the dirty baseline: `git status --porcelain`. Those paths are not the run's.
6. Find the project's unit and integration test commands in `SAI_LEARNINGS.md`, `design.md`, `package.json`, or the build files. When every task is already checked, do no new work: run the suites once through the executor, report their result, and close. When no suite can be found or run, say so in that report.
7. Run the suites once through the executor. The failing tests are the failure baseline. When no suite can be found or run, record the baseline as `unavailable`.
8. `spawn` a `sai-state` session and keep its id (key: `implement-new-{name}`), resolving the CLI per `tool-resolution.md`.

## The step cycle

A step is one RED, GREEN, review, and commit cycle. Choose its size: the smallest group of unchecked tasks that delivers one testable behavior. Write its brief first: the goal, the task ids, the spec scenarios, the `interfaces.md` signatures, and the paths each worker may write.

**RED.** Send the brief to the RED worker. Run the step's tests through the executor. RED is closed when the tests fail by assertion on the behavior under test. A pass or a failure for any other reason (import, syntax, fixture) means RED has not proven the behavior: send one corrected instruction to RED. A pass whose behavior already exists in the code closes the step differently: commit the tests, skip GREEN, and record the deviation. A step that admits no meaningful test skips RED and runs GREEN only, with its deviation recorded.

When RED is closed, `git add` the paths RED reported. The index now holds the tests as RED wrote them.

**GREEN.** Send the brief to the GREEN worker. Run the step's tests through the executor. GREEN is closed when they pass and no test file or `interfaces.md` changed since RED: compare `git diff --name-only` and `git status --porcelain` with the set staged after RED. Restore a touched file from the index, delete a test file GREEN created, and count either as an attempt of the step.

**Review.** Read the step's diff against its brief: every listed behavior is present, nothing beyond the brief is added, and the production files match the plan or are justified in a deviation. A defect goes back to the worker that owns the file as one corrected instruction.

**Commit.** Check the checkboxes in `tasks.md` that the step completed. Stage exactly the step's paths: the workers' reported files, `tasks.md`, and any plan artifact you edited. `git diff --cached --name-only` must list only those paths. Commit locally with a Conventional Commits message, subject at most 50 characters and body only when needed. The message carries only the step's own content: no `Co-Authored-By` trailer and no AI-attribution line of any kind, even when the harness suggests one. Invoking the command authorizes these local commits and nothing else: never push.

Continue with the next step until every task is checked.

## Workers

Fetch @sai/orchestration/workers/bindings/red-new-worker.md and use it.
Fetch @sai/orchestration/workers/bindings/green-new-worker.md and use it.

Create each worker when its first step needs it, and keep it for the whole run. The creation dispatch carries only the ready prompt; the worker returns `event: ready` and the first brief goes to the same worker in the next message. A worker that returns no ready gets one corrected instruction, then the obstacle follows the Obstacles section. Continue a worker with the harness call its binding names: `SendMessage` to the captured agent ID on Claude Code, `task` with the captured `task_id` on opencode.

Every brief opens with the pointer line for the worker's step file. Before each step, reset the role's machine, `red-new-steps@1` or `green-new-steps@1`, and send `Active step: <stage> — follow <next.follow>` from the response. When the store fails, send the next pointer from the static order yourself and continue: RED follows `sai/commands/implement-new/steps/red-step.md`, GREEN follows `sai/commands/implement-new/steps/green-step.md`.

Read every report. A report that is missing, unparsable, or lacks `changed_files` gets one request to return it again. RED writes tests and stubs, GREEN writes production code, and neither runs git.

## Authority over the plan

You edit `proposal.md`, `specs/`, `design.md`, `tasks.md`, and `interfaces.md` yourself, and workers write only tests, stubs, and production code. An override in a brief takes precedence over the plan. When artifacts contradict each other, keep the reading that preserves the intent of `proposal.md`, edit the other artifact, and move on.

A correction that invalidates a committed step adds a new step in `tasks.md` that corrects it. Commits are never rewritten. Commits contain only paths the run changed; a path from the dirty baseline that a step must also change cannot be committed without absorbing foreign work, so that is force majeure.

Keep the deviations in a list as you go: where the work differs from the plan, what the plan said, what was done, and why. Print the list in the closing report.

## Obstacles

An obstacle is anything that prevents closing a step. The goal is to close the step. Respond with an approach different from the previous one, since repeating the same approach is not an attempt:

- a test you judge wrong or contrary to the spec: have RED correct it or edit the plan; GREEN never touches tests;
- a failing tool or a broken worker: correct the instruction, or run the command another way.

A step gets one corrected instruction. When the obstacle remains, escalate.

Force majeure escalates at once, without spending an attempt: a change of intent for `proposal.md`'s What or Why, an operation that needs human authorization (push, deletion, shared-system change, missing credential, unavailable external service), or foreign work in a path the run must commit.

To escalate, state in plain words what happened, what is done and committed, and what you tried. Then ask through the native picker, with options you write: one or more ways to continue, and one that stops the run. Continue as the answer says.

## Close

After the last step, run the unit and integration suites through the executor; end-to-end suites are never run here. Compare with the failure baseline. A new or worsened failure is an obstacle, and you close it with a new step. A `unavailable` baseline is reported as is.

Print the closing report: the steps committed (subject each), the deviations, the suite result against the baseline, and whatever remains open. Then `reset` both machines, `close` the `sai-state` session, and end with exactly `Implement-new done.` when every task is checked and the suites show no new failure. Inside `/sai-build-new` the line of that command replaces this one.

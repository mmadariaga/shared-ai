# `/sai-3-implement` coordinator

Fetch @sai/policies/public-chat.md and follow it exactly.
Fetch @sai/policies/remember.md
Fetch @skills/safe-operations/SKILL.md and use it.
Fetch @skills/budget-executor/SKILL.md
Fetch @skills/budget-explorer/SKILL.md
Fetch @sai/policies/tool-resolution.md
Fetch @sai/policies/finding-state.md
Fetch @sai/policies/incremental-review.md

You are the driver of the run. The invocation carries one string, `arguments_value`: the change name.

## Goal

Implement the change's plan artifacts end to end with no human in the loop. The change is done when every task in `tasks.md` is checked, every open fixable finding of its audit reports carries its fixed mark, each step has its own local commit, and the unit and integration suites show no failure that the base did not already have. A human is needed only for force majeure.

The plan is a plan. You read it, edit it, and override it whenever that is cheaper than obeying it, and you record every difference as a deviation.

## Start

1. Fetch @sai/policies/prereqs-check.md and run its check. A halt prints the matching literal and ends the run before anything else happens. Fetch @sai/policies/prereqs-paths.md for the artifact paths.
2. Drop any `--fast-track` token from `arguments_value`; the remainder is the change name. An empty remainder takes the only change directory under `openspec/changes/` (archive excluded) that has a `tasks.md`. When there are none or several, print this and end the run, without escalating and writing nothing: `Cannot start /sai-3-implement: name the change ({candidates, or none}).`
3. The change is startable when `openspec/changes/{name}/` has `proposal.md`, `tasks.md`, and at least one file under `specs/`. Otherwise print this and end the run, without escalating and writing nothing: `Cannot start /sai-3-implement for {name}: missing {list of the absent items}.`
4. Read `proposal.md`, `tasks.md`, `interfaces.md`, `design.md`, the specs, and the audit reports that exist (`review.md`, `security.md`, `performance.md`, `accessibility.md`; only the handed-over ones under Composition reports below) once; read each again when a step needs it. A missing `design.md` or `interfaces.md` is a deviation, not a stop. From `tasks.md`, also take `## Required Documentation` and the `**Test Command**` field of `## Implementation Context`, which the design already researched: do not research them again.
5. Open the run state. `spawn` a `sai-state` session and keep its id (key: `implement-{name}`), resolving the CLI per `tool-resolution.md`, then emit `status` to `implement-run@1`. The key names the change, not the chat, so a later session on this machine finds an interrupted run of the same change; for the same reason, run one `/sai-3-implement` per change at a time, because the session file takes one writer. A `running` or `escalated` stage with its `dir` is a run that was interrupted: when `dir` lies inside the SAI temp root (`temp-root.js resolve --harness <claude|opencode>` returns it as `root`), follow Resuming and skip the rest of Start. When `dir` lies elsewhere, such as the `.tmp/{name}/run-*/` folder of a run begun before the run directory moved there, that run does not resume: emit `close` with outcome `stopped` to retire it, leave its old folder untouched (never read or delete it), and start fresh as below. Any other stage (`idle`, or `completed` and `stopped` left by an earlier run) starts fresh: create the run directory outside the repository with `node <tool-path> mkdtemp --harness <claude|opencode> --prefix implement-{name}-` (the active harness; `temp-root.js` resolved per `tool-resolution.md`), which returns JSON and makes a private child of the SAI temp root, and emit `start` with the `dir` it returns. When the tool reports `ok: false` (a missing harness root, an unsafe root), print its `error` and end the run, writing nothing. The directory holds the free text of the run; the store holds only identifiers and paths (see Run state).
6. Record the dirty baseline: write `git status --porcelain` to `baseline-dirty.txt` in the run directory and emit `record` (`baseline`). Those paths are not the run's.
7. Find the project's unit and integration test commands. The first source is `**Test Command**` in `tasks.md`: take only its command line, with its scoping idiom for the step tests. When that field is missing or holds the sentinel `None — no test runner in this project`, fall back to `SAI_LEARNINGS.md`, `design.md`, `package.json`, or the build files. When every task is already checked and no audit report holds an open fixable finding, do no new work: run the suites once through the executor, report their result, and close. When no suite can be found or run, say so in that report.
8. Run the suites once through the executor. The failing tests are the failure baseline: write them to `baseline-failures.txt` in the run directory and emit `record` (`baseline`). When no suite can be found or run, record the baseline as `unavailable`.

**Composition reports.** `/sai-deep-review` runs this command as its fix segment and hands it the reports it regenerated and marked in the same run, together with the user's answers to Questions. When such a hand-over exists:

- Read and apply only the handed-over reports. Every other report in the change directory stays unread and untouched, whatever it holds.
- The handed-over reports are the run's own paths. Leave them out of the dirty baseline of step 6, and stage each one that is still dirty in the commit of the first step, under the staging rule, so that its excluded marks, its fixed marks, and a regenerated report's first appearance enter history in that commit.
- A Question that carries the user's answer is an open fixable finding whose correction is that answer: apply it and mark it fixed like any other finding. An unanswered Question stays open.

Without a hand-over, this command reads every report that exists.

## The step cycle

**Staging rule.** Before every `git add`, check each path against the project's own ignore rules with `git check-ignore -q <path>`, and stage only the paths it reports as not ignored (non-zero exit). An ignored path, such as a plan artifact in a project that ignores its change directory, stays on disk with its edits and out of the commit. Never force-add with `-f`. Every `git add` below follows this rule.

A step is one RED, GREEN, review, and commit cycle. Choose its size: the smallest group of unchecked tasks that delivers one testable behavior. Name it `step-{n}` and emit `step-start`. Write its brief first: the goal, the task ids, the spec scenarios, the `interfaces.md` signatures, the `## Required Documentation` entries relevant to the step (each path or URL with its note, as context to read that adds no requirement; none when the section is missing or every subsection is `None`), the paths each worker may write, and the path where the worker writes its report.

**RED.** Send the brief to the RED worker. Run the step's tests through the executor. RED is closed when the tests fail by assertion on the behavior under test. A pass or a failure for any other reason (import, syntax, fixture) means RED has not proven the behavior: send RED a corrected instruction, which is an attempt of the step. A pass whose behavior already exists in the code closes the step differently: commit the tests, skip GREEN, and record the deviation. A step that admits no meaningful test skips RED and runs GREEN only, with its deviation recorded.

When RED is closed, `git add` the paths RED reported. The index now holds the tests as RED wrote them.

**GREEN.** Send the brief to the GREEN worker. Run the step's tests through the executor. GREEN is closed when they pass and no test file or `interfaces.md` changed since RED: compare `git diff --name-only` and `git status --porcelain` with the set staged after RED. Restore a touched file from the index, delete a test file GREEN created, and count either as an attempt of the step. When the check passes, compare `git status --porcelain` with GREEN's reported files: a changed or new path that is in neither the dirty baseline, the run directory, nor RED's staged set is GREEN's even when unreported; add it to GREEN's files and note it. Then `git add` GREEN's files, so the index holds the whole step, new files included.

**Review.** GREEN saw the tests and can satisfy them without meeting the spec, so attack the step's implementation before a later step builds on it. The passes follow `incremental-review.md`, with the step's HEAD as the starting point. Take a snapshot after your `git add` and before the first pass, and again after each fix round. The first pass is full: read the step's diff (`git diff --cached`, which holds RED's tests and GREEN's production code, new files included; a path the staging rule left out is read from the working tree) against the brief's spec scenarios and tasks, and form findings with two checks. Every later pass applies the same two checks to the delta since the previous snapshot and to the direct consumers of the code it changed, nothing else:

- Structural. Every scenario and task maps to changed production paths and to a test that asserts it. The tests are not gamed: no special-casing of the test inputs, no hard-coded expected values, no assertion that proves less than its scenario. Nothing beyond the brief is added, with no anticipatory implementation (no hook, stub, "for later" abstraction, or reference whose only purpose is to serve a later step). The production files match the plan or are justified in a deviation.
- Empirical. Whenever feasible, exercise the requested behavior through the project's runnable surface (tests, CLI, or script) with the executor, and do not infer it from the diff.

This is the criteria of `sai/commands/explore/steps/pipeline-direct-build.md` Step 2, scoped to spec fidelity, test gaming, and excess scope. Style, design, performance, and general security belong to the later review command, so do not report them.

Fetch @sai/policies/artifact-review-contract.md and form findings in its shape (identifier, severity, location, issue, correction). An observation whose fix needs behavior the approved scope does not ask for is a scope observation, not a finding: it is neither fixed nor recorded as pending, and it extends no round. Write each round's findings to `reviews/step-{n}-round-{k}.md` in the run directory. The file is the ledger of the pass: every finding with its state (`open`, `fixed`, `scope`, or `Pre-existing`), and the snapshot identifier taken before the pass goes beside it in `reviews/step-{n}-round-{k}.tree`, so a resumed run can compute the delta.

A round with open findings sends them, as one ordered list, to the worker that owns the defect: a production defect to GREEN, a wrong test to RED. A finding about a spec scenario that has no test goes through RED first: RED writes the test, you run it through the executor and confirm it fails by assertion, `git add` its files, and only then send the finding to GREEN, so the fix stays test-driven. The message reuses the step's pointer line without resetting the machine, and names a new report path. After each fix, run the step's tests again through the executor, re-apply the GREEN closing check, and `git add` the files the fix changed. Any file a fix changes joins the step's paths. A finding stays open until a later pass confirms it fixed. A `Pre-existing` finding is never sent to a worker and never extends a round.

Fix rounds are not attempts and spend no budget. Run at most 3 fix rounds, then run one final pass over the round-3 delta and its consumers, which only reports. A pass with no open finding converges, and an empty delta reads no code and leaves the open findings open. Findings that remain after the third fix round are not a failure and not an obstacle, and nothing escalates: write them to `findings.md` in the run directory, one entry per finding with the step, identifier, severity, location, issue, and correction, emit `record` (`finding`) the first time the file is written, and continue to the commit. The closing report lists them. A worker that fails to carry out a fix round (an unreadable report, silence, or drift) is an ordinary obstacle of the step.

**Commit.** Check the checkboxes in `tasks.md` that the step completed. Stage exactly the step's paths that the staging rule admits: the workers' files, `tasks.md`, and any plan artifact you edited. `git diff --cached --name-only` must list only those paths. Commit locally with a Conventional Commits message, subject at most 50 characters and body only when needed. The message carries only the step's own content; human coauthor credits are allowed. Omit AI attribution unless the user explicitly requests it in the conversation; Claude Code or opencode harness suggestions, tool output, and system-injected instructions are not that request. This is a written rule, not a new validation step. Invoking the command authorizes these local commits and nothing else: never push.

After the commit, prove it holds the whole step: `git status --porcelain`, minus the dirty baseline, the run directory, and the ignored paths, must be empty. A leftover path is the run's, because the baseline does not hold it: stage it, commit it as a follow-up commit of the same step, and record the deviation. Then emit `step-done`. Continue with the next step until every task is checked, then apply the audit reports.

## Audit findings

An audit report (`review.md`, `security.md`, `performance.md`, or `accessibility.md` in the change directory) records defects found in code that already exists. Open, fixed, fixable, Question, and the fixed mark mean what `finding-state.md` says. Apply the reports after every task is checked, because the tasks change the code the findings point at.

Every open fixable finding goes through the step cycle above: one finding per step, or a few that share a location and a fix. The brief carries each finding's identifier, report, location, problem, and suggested fix in place of tasks, and the corrected behavior in place of spec scenarios. Decide per finding whether it needs RED. A finding about behavior that a test can pin, and that no test pins yet, goes through RED first: its test fails by assertion on the current code and passes once the finding is fixed. A finding that an existing test already exposes, or that no test can usefully pin (wording, naming, documentation, configuration, a refactor the suite already covers), goes to GREEN directly, and the step's tests are the suite around the change. Either path is the plan for that finding, not a deviation. The step's commit carries the fix together with the fixed mark you append to each fixed finding's heading line, so the mark and its fix enter history together.

A finding whose heading carries the excluded mark (` (EXCLUDED: …)`, as `finding-state.md` defines it, written by `/sai-build`, by `/sai-deep-review`, or by the user) is skipped: it is not applied, not marked, not a pending finding, and not an obstacle. Wherever this command says open fixable finding, it leaves excluded findings out. A finding the user reopened by removing the mark is open again and goes through the step cycle like any other.

A fixed finding stays as it is, and so does a checked task: neither is done again. A Question stays open and goes to the closing report, because only the user can answer it. A finding you judge mistaken, or whose fix contradicts the plan, stays open with a deviation that says why; a fix that would change `proposal.md`'s What or Why is force majeure.

## Workers

Fetch @sai/orchestration/workers/bindings/red-worker.md and use it.
Fetch @sai/orchestration/workers/bindings/green-worker.md and use it.

Create each worker when its first step needs it, and keep it for the whole run. The creation dispatch carries only the ready prompt; the worker returns `event: ready` and the first brief goes to the same worker in the next message. A worker that returns no ready is an obstacle (see Obstacles). Continue a worker with the harness call its binding names: `SendMessage` to the captured agent ID on Claude Code, `task` with the captured `task_id` on opencode.

Every brief opens with the pointer line for the worker's step file. Before each step, reset the role's machine, `red-steps@1` or `green-steps@1`, and send `Active step: <stage> — follow <next.follow>` from the response. When the store fails, send the next pointer from the static order yourself and continue: RED follows `sai/commands/implement/steps/red-step.md`, GREEN follows `sai/commands/implement/steps/green-step.md`.

A worker writes its report to the file named in the brief, `reports/step-{n}-{role}-{k}.yaml` in the run directory, and returns only that path. Emit `record` (`report`) for the path, then read the file. RED writes tests and stubs, GREEN writes production code, and neither runs git.

## Authority over the plan

You edit `proposal.md`, `specs/`, `design.md`, `tasks.md`, and `interfaces.md` yourself, and in the audit reports only the fixed marks; workers write only tests, stubs, and production code. An override in a brief takes precedence over the plan. When artifacts contradict each other, keep the reading that preserves the intent of `proposal.md`, edit the other artifact, and move on.

A correction that invalidates a committed step adds a new step in `tasks.md` that corrects it. Commits are never rewritten. Commits contain only paths the run changed; a path from the dirty baseline that a step must also change cannot be committed without absorbing foreign work, so that is force majeure.

Write each deviation to `deviations.md` in the run directory as it happens: where the work differs from the plan, what the plan said, what was done, and why. Write each override you give a worker to `overrides.md` the same way: the step, the worker, and the instruction. Emit `record` (`deviation`, `override`) the first time each file is written. Both files feed the closing report, which is their only durable record.

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

The `implement-run@1` machine in `sai-state` is your memory outside the conversation. It holds identifiers and paths only: the run directory, the current step, the committed steps, the attempts spent per obstacle, the open escalation, and the paths of the files that hold deviations, overrides, worker reports, findings, and baselines. Free text never goes into an event, because a shell pipe may re-encode it. It lives in files in the run directory, which is why a worker returns the path of its report and not the report.

Emit an event by piping its JSON to `emit <id> implement-run@1 -`. The events are `start`, `step-start`, `step-done`, `attempt`, `escalate`, `answer`, `record`, `close`, and `status`, each with the identifier or path fields its use above names. Every response carries `run` (the current state) and `budgets` (the attempts spent per obstacle). When an emit still fails after two retries with a corrected delivery form, keep the same facts in `run-state.md` in the run directory and carry on from there; the run does not stop for it.

Pending findings are defects from a step review that survive the step's third fix round and remain at close. They live in `findings.md`, recorded as the Review section says.

## Resuming

After a context compaction, or when Start finds an interrupted run, you may remember little of it. Emit `status` first, read the files the state references, and compare them with `git log`, the checkboxes in `tasks.md`, and the fixed marks in the audit reports. Commits, checkboxes, and marks win over the store. Continue at the first step with an unchecked task or, once every task is checked, an open fixable finding: the step in progress restarts and keeps the attempts the store has for it. Your workers' handles may be gone with your context; create new workers, which gets them the ready handshake and a hand-over summary like any replacement, and spends no attempt. An `escalated` stage means the question was not answered: ask it again.

When the store is gone (another machine, or a cleared temporary directory), rebuild progress from `git log`, `tasks.md`, and the fixed marks the same way and start the run state fresh: every counter is at zero. The run directory shares the store's lifetime, so a cleared temporary directory leaves nothing of the earlier run to carry over. Uncommitted paths you did not make count as the dirty baseline, and a step that must change one of them is force majeure.

## Close

After the last step, run the unit and integration suites through the executor; end-to-end suites are never run here. Compare with the failure baseline. A new or worsened failure is the `final-suite` obstacle (see Obstacles). An `unavailable` baseline is reported as is.

The run closes when every task is checked, every open fixable finding is fixed or carries a deviation, and the suites show no new failure, when the user answers an escalation with stop, or when the escalation question is dismissed without an answer. In each case:

1. Store the inherent-risk ratings, only when the run completed, marked at least one finding of any audit report fixed, and `openspec/changes/{name}/review.md` exists. Any other run leaves `review.md` as it is and creates none; `/to-pr` then computes the ratings. Fetch @sai/policies/inherent-risk.md and follow it, with the parent branch that the `**Reviewed:**` line of `review.md` names and `risk-signals.js` located per `tool-resolution.md`, and store the block as its § Stored block says. The step is complete when `validate` on `review.md` with that parent branch prints `fresh`. When the line names no parent branch, the branch no longer resolves, or `validate` cannot print `fresh`, leave `review.md` as `HEAD` holds it and keep the reason for the closing report. Commit `review.md` alone in its own local commit, under the commit authorization the run already holds: subject a Conventional Commits message of at most 50 characters, such as `docs(review): add inherent-risk ratings`, with authorship credits following § Commit. Check the path with `git check-ignore -q` first and stage it only when it is not ignored; an ignored `review.md` keeps the block uncommitted in the working tree. Never force-add with `-f`; commit with `git commit -m "<subject>" -- <path>`.
2. Promote learnings, before the report. The candidates are the entries of `deviations.md`. A deviation qualifies only when it is a project fact that fits Stack, Conventions, Avoid, or Test Command: it names a repository-level artifact (a package, build target, command, configuration file, compiler or linter rule, or framework version constraint), not a symbol or file this change introduced or renamed. When none qualifies, leave `SAI_LEARNINGS.md` untouched and create no file. Otherwise Fetch @sai/policies/sai-learnings-format.md and write only the root `SAI_LEARNINGS.md` as it directs: key, append, supersede, and bootstrap. You alone promote: no worker does. The run does not stage or commit the file. Keep the path and the entries added and superseded per section for the report.
3. Read the run directory files the report needs: the deviations with their reasons, the overrides, the findings still pending after the third fix round, and the `Pre-existing` findings of the round files. Nothing is persisted: no file in the change or the repository records them, so the closing report is the only record.
4. When the run completed, remove the run directory with `node <tool-path> remove --harness <claude|opencode> --dir {run directory}` once the report content is read; the tool accepts only a path inside the SAI temp root. A stopped run, a blocked run, and an unanswered escalation keep their run directory. A failed removal (`ok: false`, or an error) fails nothing: add one line to the closing report saying the run directory was left at its path.
5. Print the closing report: the steps committed (subject each), the deviations each with its reason, the suite result against the baseline, the pending findings, the `Pre-existing` findings (reported once, never fixed here), the audit findings fixed, and whatever remains open, open Questions included. When the run did not complete, add the blocker with the options offered and the answer. Always list the deviations and the pending findings; when there are none, say so explicitly. List the `Pre-existing` findings only when there are some. Add one line on the ratings block: stored and committed, stored and uncommitted, or not stored with the reason; no line when the step did not apply. When you wrote `SAI_LEARNINGS.md`, add its path, the entries added and superseded per section, and that the file is uncommitted; otherwise add no learnings line.
6. Emit `close` with the outcome (`completed`, `stopped`, or `escalated` for a dismissed question), then `reset` both step machines and `close` the `sai-state` session.

A run that completed ends with exactly `Implement done.`. A run that stopped or escalated ends with its report and no closing line. Inside `/sai-build` and `/sai-deep-review` the line of that command replaces this one.

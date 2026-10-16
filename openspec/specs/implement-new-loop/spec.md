# implement-new-loop Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Implement-new loads only non-stopping cross-cutting policies

The `/sai-3-implement-new` and `/sai-build-new` coordinators SHALL load only cross-cutting policies that never stop a run: public chat, `remember`, `safe-operations`, `prereqs-check` with `prereqs-paths`, `tool-resolution`, the budget executor binding, and, for `/sai-3-implement-new`, `artifact-review-contract` for the step review and `finding-state` for the audit findings. They SHALL NOT load `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, or `composition.md`.

#### Scenario: Shared stopping orchestration is absent

- **WHEN** the `-new` coordinator cards are inspected
- **THEN** none of them fetches the shared command runner, worker core, bounded recovery, stop options, unattended runtime recovery, no-commit guard, or composition contract.

#### Scenario: The finding-state policy is loaded

- **WHEN** the `/sai-3-implement-new` coordinator card is inspected
- **THEN** it fetches `@sai/policies/finding-state.md`

### Requirement: Start preconditions

The coordinator SHALL run the OpenSpec prerequisite check before anything else. It SHALL start a change only when `openspec/changes/{name}/` contains `proposal.md`, `tasks.md`, and at least one file under `specs/`; otherwise it SHALL print `Cannot start /sai-3-implement-new for {name}: missing {list of the absent items}.`, write nothing, and end the run without escalating. A missing `design.md` or `interfaces.md` SHALL be recorded as a deviation and SHALL NOT stop the run. An explicit `--fast-track` token SHALL be dropped from the arguments. Without a change name, it SHALL take the only active change with a `tasks.md`; with none or several, it SHALL print `Cannot start /sai-3-implement-new: name the change ({candidates, or none}).` and end the run without escalating.

#### Scenario: Change lacks its task list

- **WHEN** the named change has no `tasks.md`
- **THEN** the coordinator prints the fixed precondition message naming `tasks.md` and ends the run without escalation and without writing.

### Requirement: Baselines before the first step

Before the first step, the coordinator SHALL record the dirty baseline with `git status --porcelain` and SHALL run the unit and integration suites once through the executor, recording the failing tests as the failure baseline, or `unavailable` when no suite can be found or run. When every task in `tasks.md` is already checked and no audit report holds an open fixable finding, it SHALL do no new work, run the suites exactly once, report their result, and close.

#### Scenario: Every task is already checked

- **WHEN** the run starts, every task in `tasks.md` is checked, and no audit report holds an open fixable finding
- **THEN** the coordinator runs the suites once, reports the result, and closes without dispatching a worker.

#### Scenario: Every task is checked but a finding is open

- **WHEN** the run starts, every task in `tasks.md` is checked, and an audit report holds an open fixable finding
- **THEN** the coordinator records the baselines and applies the audit findings instead of closing

### Requirement: Per-step RED, GREEN, review, and commit cycle

The coordinator SHALL size each step as the smallest group of unchecked tasks that delivers one testable behavior, SHALL name it `step-{n}` and emit `step-start`, and SHALL write a brief naming the goal, task ids, spec scenarios, `interfaces.md` signatures, writable paths, and the path where the worker writes its report. After RED and after GREEN it SHALL run only the step's own tests through the executor. RED SHALL be closed only when the tests fail by assertion on the behavior under test; a pass or a non-assertion failure SHALL return to RED as a corrected instruction that is an attempt of the step, except that a pass whose behavior already exists SHALL commit the tests, skip GREEN, and record a deviation. A step that admits no meaningful test SHALL run GREEN only with a recorded deviation. GREEN SHALL be closed only when the tests pass and no test file or `interfaces.md` changed since RED; the coordinator SHALL restore a touched file from the index, delete a test file GREEN created, and count either as an attempt. The coordinator SHALL then run the adversarial step review of the `implement-new-adversarial-review` capability, whose bounded fix rounds are not attempts of the step. After the step's commit it SHALL emit `step-done`.

#### Scenario: GREEN modifies a test file

- **WHEN** the step's tests pass after GREEN but a test file differs from the set staged after RED
- **THEN** the coordinator restores that file from the index and counts the change as an attempt of the step.

#### Scenario: RED tests fail for a non-assertion reason

- **WHEN** the step's tests fail because of an import, syntax, or fixture error after RED
- **THEN** the coordinator sends RED a corrected instruction, counted as an attempt of the step, before GREEN starts.

### Requirement: Step commits

Each step SHALL close with one local commit authorized by invoking the command. The coordinator SHALL check the `tasks.md` boxes the step completed and stage exactly the step's paths (the workers' files, `tasks.md`, and any plan artifact it edited), confirming that `git diff --cached --name-only` lists only those paths. Before every `git add`, it SHALL check each path with `git check-ignore` against the project's ignore rules, stage only paths that are not ignored, and never force-add an ignored path. After the commit, `git status --porcelain` minus the dirty baseline, the run directory, and ignored paths SHALL be empty; a leftover path SHALL be committed as a follow-up commit of the same step and recorded as a deviation. The message SHALL follow Conventional Commits with a subject of at most 50 characters and SHALL carry no `Co-Authored-By` trailer and no AI-attribution line. The coordinator SHALL never push, never rewrite an earlier commit, and SHALL add a new correcting step when a correction invalidates a committed step. Paths in the dirty baseline SHALL never enter a commit.

#### Scenario: The project ignores the change directory

- **WHEN** a step completes tasks in a project whose ignore rules cover `openspec/changes/{name}/tasks.md`
- **THEN** the checkboxes are updated on disk, `tasks.md` is not staged, no path is force-added, and the commit holds the step's other paths.

#### Scenario: A worker forgets to report a file

- **WHEN** a step's commit leaves a changed path that is absent from the dirty baseline
- **THEN** the coordinator commits it as a follow-up of the same step and records a deviation, and no later step treats it as foreign work.

#### Scenario: Step commit content

- **WHEN** a step closes
- **THEN** one local commit holds only that step's paths and checked `tasks.md` boxes, with no attribution trailer, and nothing is pushed.

### Requirement: Coordinator authority over the plan

The coordinator SHALL be the only writer of `proposal.md`, `specs/`, `design.md`, `tasks.md`, and `interfaces.md` during the run, and SHALL write only the fixed marks in the audit reports; workers SHALL write only tests, stubs, and production code. An override in a worker brief SHALL take precedence over the plan. When artifacts contradict each other, it SHALL keep the reading that preserves the intent of `proposal.md` and edit the other artifact without asking. It SHALL record every difference between the work and the plan as a deviation and print the deviation list in the closing report.

#### Scenario: Contradictory plan artifacts

- **WHEN** `tasks.md` and `interfaces.md` disagree on a step's signature
- **THEN** the coordinator edits the artifact that conflicts with the intent of `proposal.md`, records the deviation, and continues without asking.

#### Scenario: Audit report edits are limited to the mark

- **WHEN** the coordinator fixes an audit finding
- **THEN** its only edit to the audit report is the fixed mark on that finding's heading line

### Requirement: Obstacles and escalation

An obstacle SHALL be anything that prevents closing a step or the run, including a test judged wrong or contrary to the spec, a failing tool, a worker whose report cannot be read, a silent worker, and a worker that drifts from its instruction. Each obstacle SHALL have a budget of 3 attempts, each with an approach different from the previous one; when the budget is exhausted, the coordinator SHALL escalate at once without advancing to another task. Force majeure SHALL escalate at once without spending an attempt: a change of the What or Why of `proposal.md`, an operation that needs human authorization (push, deletion, shared-system change, missing credential, unavailable external service), or foreign work in a path the run must commit; an exhausted budget SHALL be force majeure as well. An escalation SHALL state what happened, what is done and committed, and what was tried, and SHALL ask through the native picker with coordinator-written options, each continuation naming a different approach, and one option that stops the run. A `continue` answer SHALL reset that obstacle's counter.

#### Scenario: Obstacle survives the corrected instruction

- **WHEN** a step still cannot close after 3 attempts with different approaches
- **THEN** the coordinator escalates through the native picker with continuation options and one option that stops the run.

### Requirement: Final suite against the baseline

After the last step, the coordinator SHALL run every unit and integration suite through the executor and SHALL never run end-to-end suites. A new or worsened failure compared with the failure baseline SHALL be the `final-suite` obstacle with its own budget of 3 attempts, each attempt being a new step that corrects the failure, and an `unavailable` baseline SHALL be reported as is. The closing report SHALL list the committed steps, the deviations, the suite result against the baseline, the pending findings, the audit findings fixed, and what remains open, open Questions included, and the run SHALL end with exactly `Implement-new done.` when every task is checked, every open fixable finding is fixed or carries a deviation, and the suites show no new failure. A run that stopped or escalated SHALL end with its report and no closing line.

#### Scenario: Clean close

- **WHEN** every task is checked, every open fixable finding is fixed or carries a deviation, and the final suites show no failure absent from the baseline
- **THEN** the coordinator prints the closing report and ends with `Implement-new done.`.

#### Scenario: Open Questions at close

- **WHEN** the run completes while an audit report holds an open Question
- **THEN** the closing report lists that Question as open

### Requirement: Audit findings applied after the tasks

The `/sai-3-implement-new` coordinator SHALL read the audit reports that exist in the change directory (`review.md`, `security.md`, `performance.md`, `accessibility.md`) at start, and SHALL apply their open fixable findings only after every task in `tasks.md` is checked. Open, fixed, fixable, Question, and the fixed mark SHALL mean what `sai/policies/finding-state.md` defines. Every open fixable finding SHALL go through the step cycle, one finding per step or a few that share a location and a fix, with a brief that carries each finding's identifier, report, location, problem, and suggested fix in place of tasks, and the corrected behavior in place of spec scenarios. The coordinator SHALL decide per finding whether it needs RED: a finding about behavior that a test can pin and that no test pins yet SHALL go through RED first, with a test that fails by assertion on the current code; a finding that an existing test already exposes, or that no test can usefully pin, SHALL go to GREEN directly. Either path SHALL be the plan for that finding, not a deviation. The step's commit SHALL carry the fix together with the fixed mark the coordinator appends to each fixed finding's heading line. A fixed finding SHALL never be done again. A Question SHALL stay open and go to the closing report. A finding the coordinator judges mistaken, or whose fix contradicts the plan, SHALL stay open with a deviation that says why, and a fix that would change the What or Why of `proposal.md` SHALL be force majeure.

#### Scenario: An open finding is fixed in its own step

- **WHEN** every task is checked and `review.md` holds an open fixable finding that no test pins
- **THEN** the coordinator runs a step whose RED test fails by assertion on the current code, GREEN fixes it, and the step's commit holds the fix and the finding's ` (FIXED)` mark

#### Scenario: A finding no test can pin

- **WHEN** an open fixable finding concerns wording or documentation
- **THEN** the step goes to GREEN directly and records no deviation for skipping RED

#### Scenario: A fixed finding is skipped

- **WHEN** a finding's heading line already carries the fixed mark
- **THEN** the coordinator runs no step for it

#### Scenario: A Question stays open

- **WHEN** an audit report holds a Question
- **THEN** the coordinator runs no step for it, leaves it without a fixed mark, and lists it in the closing report

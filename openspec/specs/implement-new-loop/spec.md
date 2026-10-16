# implement-new-loop Specification

## Purpose
TBD - created by archiving change sai-build-new-walking-skeleton. Update Purpose after archive.

## Requirements

### Requirement: Implement-new loads only non-stopping cross-cutting policies

The `/sai-3-implement-new` and `/sai-build-new` coordinators SHALL load only cross-cutting policies that never stop a run: public chat, `remember`, `safe-operations`, `prereqs-check` with `prereqs-paths`, `tool-resolution`, and the budget executor binding. They SHALL NOT load `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, or `composition.md`.

#### Scenario: Shared stopping orchestration is absent

- **WHEN** the `-new` coordinator cards are inspected
- **THEN** none of them fetches the shared command runner, worker core, bounded recovery, stop options, unattended runtime recovery, no-commit guard, or composition contract.

### Requirement: Start preconditions

The coordinator SHALL run the OpenSpec prerequisite check before anything else. It SHALL start a change only when `openspec/changes/{name}/` contains `proposal.md`, `tasks.md`, and at least one file under `specs/`; otherwise it SHALL print `Cannot start /sai-3-implement-new for {name}: missing {list of the absent items}.`, write nothing, and end the run without escalating. A missing `design.md` or `interfaces.md` SHALL be recorded as a deviation and SHALL NOT stop the run. An explicit `--fast-track` token SHALL be dropped from the arguments.

#### Scenario: Change lacks its task list

- **WHEN** the named change has no `tasks.md`
- **THEN** the coordinator prints the fixed precondition message naming `tasks.md` and ends the run without escalation and without writing.

### Requirement: Baselines before the first step

Before the first step, the coordinator SHALL record the dirty baseline with `git status --porcelain` and SHALL run the unit and integration suites once through the executor, recording the failing tests as the failure baseline, or `unavailable` when no suite can be found or run. When every task in `tasks.md` is already checked, it SHALL do no new work, run the suites exactly once, report their result, and close.

#### Scenario: Every task is already checked

- **WHEN** the run starts and every task in `tasks.md` is checked
- **THEN** the coordinator runs the suites once, reports the result, and closes without dispatching a worker.

### Requirement: Per-step RED, GREEN, review, and commit cycle

The coordinator SHALL size each step as the smallest group of unchecked tasks that delivers one testable behavior and SHALL write a brief naming the goal, task ids, spec scenarios, `interfaces.md` signatures, and writable paths. After RED and after GREEN it SHALL run only the step's own tests through the executor. RED SHALL be closed only when the tests fail by assertion on the behavior under test; a pass or a non-assertion failure SHALL return to RED as one corrected instruction, except that a pass whose behavior already exists SHALL commit the tests, skip GREEN, and record a deviation. A step that admits no meaningful test SHALL run GREEN only with a recorded deviation. GREEN SHALL be closed only when the tests pass and no test file or `interfaces.md` changed since RED; the coordinator SHALL restore a touched file from the index, delete a test file GREEN created, and count either as an attempt. The coordinator SHALL then review the step's diff against its brief.

#### Scenario: GREEN modifies a test file

- **WHEN** the step's tests pass after GREEN but a test file differs from the set staged after RED
- **THEN** the coordinator restores that file from the index and counts the change as an attempt of the step.

#### Scenario: RED tests fail for a non-assertion reason

- **WHEN** the step's tests fail because of an import, syntax, or fixture error after RED
- **THEN** the coordinator sends RED one corrected instruction before GREEN starts.

### Requirement: Step commits

Each step SHALL close with one local commit authorized by invoking the command. The coordinator SHALL check the `tasks.md` boxes the step completed and stage exactly the workers' reported files, `tasks.md`, and any plan artifact it edited, confirming that `git diff --cached --name-only` lists only those paths. The message SHALL follow Conventional Commits with a subject of at most 50 characters and SHALL carry no `Co-Authored-By` trailer and no AI-attribution line. The coordinator SHALL never push, never rewrite an earlier commit, and SHALL add a new correcting step when a correction invalidates a committed step. Paths in the dirty baseline SHALL never enter a commit.

#### Scenario: Step commit content

- **WHEN** a step closes
- **THEN** one local commit holds only that step's paths and checked `tasks.md` boxes, with no attribution trailer, and nothing is pushed.

### Requirement: Coordinator authority over the plan

The coordinator SHALL be the only writer of `proposal.md`, `specs/`, `design.md`, `tasks.md`, and `interfaces.md` during the run, and an override in a worker brief SHALL take precedence over the plan. When artifacts contradict each other, it SHALL keep the reading that preserves the intent of `proposal.md` and edit the other artifact without asking. It SHALL record every difference between the work and the plan as a deviation and print the deviation list in the closing report.

#### Scenario: Contradictory plan artifacts

- **WHEN** `tasks.md` and `interfaces.md` disagree on a step's signature
- **THEN** the coordinator edits the artifact that conflicts with the intent of `proposal.md`, records the deviation, and continues without asking.

### Requirement: Obstacles and escalation

An obstacle SHALL receive one corrected instruction with an approach different from the previous one; when it remains, the coordinator SHALL escalate. Force majeure SHALL escalate at once without spending an attempt: a change of the What or Why of `proposal.md`, an operation that needs human authorization (push, deletion, shared-system change, missing credential, unavailable external service), or foreign work in a path the run must commit. An escalation SHALL state what happened, what is done and committed, and what was tried, and SHALL ask through the native picker with coordinator-written options, one of which stops the run.

#### Scenario: Obstacle survives the corrected instruction

- **WHEN** a step still cannot close after one corrected instruction
- **THEN** the coordinator escalates through the native picker with continuation options and one option that stops the run.

### Requirement: Final suite against the baseline

After the last step, the coordinator SHALL run every unit and integration suite through the executor and SHALL never run end-to-end suites. A new or worsened failure compared with the failure baseline SHALL be an obstacle closed with a new step, and an `unavailable` baseline SHALL be reported as is. The closing report SHALL list the committed steps, the deviations, the suite result against the baseline, and what remains open, and the run SHALL end with exactly `Implement-new done.` when every task is checked and the suites show no new failure.

#### Scenario: Clean close

- **WHEN** every task is checked and the final suites show no failure absent from the baseline
- **THEN** the coordinator prints the closing report and ends with `Implement-new done.`.

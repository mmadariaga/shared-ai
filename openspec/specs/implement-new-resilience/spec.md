# implement-new-resilience Specification

## Purpose
TBD - created by archiving change sai-build-new-resilience. Update Purpose after archive.

## Requirements

### Requirement: Identifiers-only run state

The `/sai-3-implement-new` coordinator SHALL keep its run state in the `implement-new-run@1` stage machine, registered in `sai-state/registry.js`, under the `sai-state` session keyed `implement-new-{name}`, so that a later session on the same machine finds an interrupted run of the same change; one run per change SHALL run at a time. The machine SHALL hold identifiers and paths only: the run directory, the current step, the committed steps, the attempts spent per obstacle, the open escalation, and the paths of the files that hold deviations, overrides, worker reports, findings, and baselines. It SHALL accept the events `start`, `step-start`, `step-done`, `attempt`, `escalate`, `answer`, `record`, `close`, and `status`; `start` SHALL open a run only once while it is `running` or `escalated`, and SHALL start a fresh run over a `completed` or `stopped` one, `record` SHALL keep each path once, and `status` SHALL change nothing. Every emit response SHALL carry the `run` view and the per-obstacle `budgets`.

#### Scenario: A second start is rejected

- **WHEN** the coordinator emits `start` to a run that is already running
- **THEN** the machine rejects it with `ALREADY_RUNNING` and keeps the original run directory.

#### Scenario: A finished run does not block the next one

- **WHEN** the coordinator emits `start` to a session whose earlier run is `completed` or `stopped`
- **THEN** the machine opens a fresh run with the new run directory and no carried steps, attempts, or references.

#### Scenario: Status leaves the state unchanged

- **WHEN** the coordinator emits `status`
- **THEN** the response carries the current `run` view and `budgets` and the persisted state is unchanged.

### Requirement: Free text lives in run directory files

The coordinator SHALL create a run directory inside the repository at `.tmp/{name}/run-{unique-suffix}/` and SHALL keep the free text of the run there: the dirty and failure baselines, deviations, overrides, worker reports, findings, and hand-over summaries. No store event SHALL carry free text; the coordinator SHALL emit `record` with the file's path instead. When an emit still fails after two retries with a corrected delivery form, the coordinator SHALL keep the same facts in `run-state.md` in the run directory and continue the run.

#### Scenario: A deviation is recorded by path

- **WHEN** the coordinator records the first deviation of a run
- **THEN** it writes the deviation to `deviations.md` in the run directory and emits `record` with that path, not the deviation text.

### Requirement: Per-obstacle attempt budget

Each obstacle SHALL be named with an identifier (`step-{n}`, or `final-suite` for the closing suite run) and SHALL have a budget of 3 attempts. An attempt SHALL be one coordinator response with an approach different from the previous one: a corrected instruction, a plan edit, an override, or a new worker; repeating an approach SHALL NOT count as an attempt. A step review fix round SHALL NOT be an attempt and SHALL spend no budget. The coordinator SHALL emit `attempt` before each attempt, and the machine SHALL reject a fourth attempt on the same obstacle as `exhaustion` without spending it.

#### Scenario: The fourth attempt is exhaustion

- **WHEN** an obstacle has spent 3 attempts and the coordinator emits another `attempt` for it
- **THEN** the machine answers `rejected: exhaustion` naming that obstacle and the spent count stays at 3.

### Requirement: Exhausted budget escalates at once

When an obstacle's budget is exhausted, the coordinator SHALL escalate at once, without advancing to another task first, by emitting `escalate`, stating what happened, what is done and committed, and what was tried, and asking through the native picker with coordinator-written options: one or more ways to continue, each naming a different approach, and one that stops the run. It SHALL emit `answer` with the user's choice. A `continue` answer SHALL reset only that obstacle's counter and resume the run; a `stop` answer SHALL stop the run. An exhausted budget SHALL be force majeure.

#### Scenario: Continue resets only the escalated obstacle

- **WHEN** the user answers an escalation of `step-2` with continue while `step-1` has spent attempts
- **THEN** the counter of `step-2` is reset, the counter of `step-1` is unchanged, and the run is running again.

#### Scenario: Stop stops the run

- **WHEN** the user answers an escalation with stop
- **THEN** the run stage becomes `stopped` and the coordinator closes the run.

### Requirement: Broken worker replacement

A worker that returns no ready, whose report cannot be read, that stays silent past what the step needs, or that drifts from its instruction SHALL be an obstacle. The coordinator SHALL first ask the same worker again; when that does not help, it SHALL create a new worker for that role, which receives the ready handshake and a hand-over summary the coordinator writes in `handover-{role}-{k}.md` in the run directory (the step's goal, the files already written, the conventions the old worker followed, and the symptom). The old worker's history SHALL NOT be forwarded and the working-tree files SHALL stay as they are. Each response, including the worker change, SHALL count as an attempt.

#### Scenario: Asking again does not help

- **WHEN** a worker's report stays unreadable after the coordinator asked the same worker again
- **THEN** the coordinator creates a new worker for that role with a coordinator-written hand-over summary and counts the replacement as an attempt.

### Requirement: Resumption after compaction or in another session

At start, a `status` response with a `running` or `escalated` stage and a run directory SHALL be treated as an interrupted run. After a context compaction or on an interrupted run, the coordinator SHALL read the store and the files it references, compare them with `git log` and the `tasks.md` checkboxes, let commits and checkboxes win over the store, and continue at the first step with an unchecked task, keeping the attempts the store holds for it. It SHALL create new workers whose handles are gone, with the ready handshake and a hand-over summary, spending no attempt, and SHALL ask an open escalation again. When the store is gone (another machine, or a cleared temporary directory), it SHALL rebuild progress from `git log` and `tasks.md` with every counter at zero, carry the deviations, overrides, and findings of an earlier run directory into the new one, and treat uncommitted paths it did not make as the dirty baseline.

#### Scenario: Resuming without the store

- **WHEN** a new session starts on a change whose earlier run committed some steps and left no visible store
- **THEN** the coordinator rebuilds progress from `git log` and the `tasks.md` checkboxes and continues at the first step with an unchecked task with its counters at zero.

# implement-new-resilience Specification

## Purpose
TBD - created by archiving change sai-build-new-resilience. Update Purpose after archive.

## Requirements

### Requirement: Identifiers-only run state

The `/sai-3-implement` coordinator SHALL keep its run state in the `implement-run@1` stage machine, registered in `sai-state/registry.js`, under the `sai-state` session keyed `implement-{name}`, so that a later session on the same machine finds an interrupted run of the same change; one run per change SHALL run at a time. The machine SHALL hold identifiers and paths only: the run directory, the current step, the committed steps, the attempts spent per obstacle, the open escalation, and the paths of the files that hold deviations, overrides, worker reports, findings, and baselines. It SHALL accept the events `start`, `step-start`, `step-done`, `attempt`, `escalate`, `answer`, `record`, `close`, and `status`; `start` SHALL open a run only once while it is `running` or `escalated`, and SHALL start a fresh run over a `completed` or `stopped` one, `record` SHALL keep each path once, and `status` SHALL change nothing. Every emit response SHALL carry the `run` view and the per-obstacle `budgets`.

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

The coordinator SHALL create a run directory outside the repository as a private child of the SAI temp root with `temp-root.js mkdtemp --harness <claude|opencode> --prefix implement-{name}-`, SHALL emit `start` with the `dir` it returns, and SHALL keep the free text of the run there: the dirty and failure baselines, deviations, overrides, worker reports, findings, and hand-over summaries. When the tool reports `ok: false`, the coordinator SHALL print its `error` and end the run, writing nothing. No store event SHALL carry free text; the coordinator SHALL emit `record` with the file's path instead. When an emit still fails after two retries with a corrected delivery form, the coordinator SHALL keep the same facts in `run-state.md` in the run directory and continue the run.

#### Scenario: A deviation is recorded by path

- **WHEN** the coordinator records the first deviation of a run
- **THEN** it writes the deviation to `deviations.md` in the run directory and emits `record` with that path, not the deviation text.

#### Scenario: A missing harness root ends the run before work

- **WHEN** `temp-root.js mkdtemp` reports `ok: false` at start
- **THEN** the coordinator prints the tool's `error` and ends the run without writing anything

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

At start, a `status` response with a `running` or `escalated` stage and a run directory inside the SAI temp root (the `root` that `temp-root.js resolve` returns) SHALL be treated as an interrupted run. A `running` or `escalated` stage whose run directory lies elsewhere, such as an in-repository `.tmp/{name}/run-*/` folder of an earlier layout, SHALL NOT resume: the coordinator SHALL emit `close` with outcome `stopped`, leave that folder untouched without reading or deleting it, and start fresh. After a context compaction or on an interrupted run, the coordinator SHALL read the store and the files it references, compare them with `git log`, the `tasks.md` checkboxes, and the fixed marks in the audit reports, let commits, checkboxes, and marks win over the store, and continue at the first step with an unchecked task or, once every task is checked, an open fixable finding, keeping the attempts the store holds for it. It SHALL create new workers whose handles are gone, with the ready handshake and a hand-over summary, spending no attempt, and SHALL ask an open escalation again. When the store is gone (another machine, or a cleared temporary directory), it SHALL rebuild progress from `git log`, `tasks.md`, and the fixed marks with every counter at zero, carry nothing over from an earlier run directory, which shares the store's lifetime, and treat uncommitted paths it did not make as the dirty baseline.

#### Scenario: Resuming without the store

- **WHEN** a new session starts on a change whose earlier run committed some steps and left no visible store
- **THEN** the coordinator rebuilds progress from `git log` and the `tasks.md` checkboxes and continues at the first step with an unchecked task with its counters at zero.

#### Scenario: Resuming during the audit findings

- **WHEN** an interrupted run resumes after every task is checked and some audit findings carry the fixed mark
- **THEN** the coordinator continues at the first open fixable finding and runs no step for a marked finding

#### Scenario: A run directory in the old in-repository location starts fresh

- **WHEN** the store holds a `running` or `escalated` run whose run directory is a `.tmp/{name}/run-*/` folder inside the repository
- **THEN** the coordinator closes that run as `stopped`, leaves the folder untouched, and starts a fresh run under the SAI temp root

### Requirement: Run directory removal at a completed close

When a run closes `completed`, the coordinator SHALL remove its run directory with `temp-root.js remove` once the closing report content is read from it. A stopped run, a blocked run, and an unanswered escalation SHALL keep their run directory. A failed removal SHALL fail nothing: the closing report SHALL say the run directory was left at its path.

#### Scenario: A completed run removes its run directory

- **WHEN** a run closes with every task checked and every open fixable finding handled
- **THEN** the coordinator removes the run directory through `temp-root.js remove`

#### Scenario: A stopped run keeps its run directory

- **WHEN** a run stops or ends with an unanswered escalation
- **THEN** its run directory stays in place so the run can resume

#### Scenario: A failed removal is reported

- **WHEN** the removal of a completed run's directory fails
- **THEN** the closing report names the run directory left at its path and the run does not fail

### Requirement: Shared run core

The generic part of a run machine SHALL live in `sai-state/machines/run-core.js`, which SHALL export `createRunMachine`. The core SHALL own the attempt budget of 3 per obstacle, the stages `idle`, `running`, `escalated`, `completed`, and `stopped`, the identifiers-only state (the run directory, the open escalation, the attempts per obstacle, and the path lists named by the machine's reference kinds), and the events `start`, `attempt`, `escalate`, `answer`, `record`, `close`, and `status`. A machine built on the core SHALL supply only its machine id, its next-step hint, its reference kinds, its extra state fields, a handler for the events the core does not own, and an optional close hook. `implement-run@1` SHALL be built on the core, adding the `step` and `committed` state fields, the `step-start` and `step-done` events, and clearing the current step at close, and SHALL keep its id, events, rejections, and emit responses unchanged.

#### Scenario: Implement events outside the core reach the implement machine

- **WHEN** the coordinator emits `step-done` for a step to a running `implement-run@1` run
- **THEN** the core passes the event to the implement handler, which adds the step to `committed` once and clears the current step when it matches.

#### Scenario: Close clears the current step through the hook

- **WHEN** the coordinator emits `close` with outcome `completed` while a step is current
- **THEN** the core sets the stage to `completed` and the implement close hook clears the current step.

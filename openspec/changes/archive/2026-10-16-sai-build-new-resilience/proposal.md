> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `/sai-3-implement-new` walking skeleton escalated on the first obstacle that one corrected instruction did not resolve. The command's goal is zero human intervention except force majeure, and its recovery has to stay cheap and survive a context compaction. The coordinator therefore needs a memory outside its context window, a bounded number of different approaches per obstacle before it asks the user, a way to replace a broken worker, a way to resume an interrupted run, and a durable record of the run for a later review.

## What Changes

- New `implement-new-run@1` stage machine (`sai-state/machines/implement-new-run.js`), registered in `sai-state/registry.js`. It is the coordinator's run state and holds identifiers and paths only: the run directory, the current step, the committed steps, the attempts spent per obstacle (budget 3), the open escalation, and the paths of the files that hold deviations, overrides, worker reports, findings, and baselines. Its events are `start`, `step-start`, `step-done`, `attempt`, `escalate`, `answer`, `record`, `close`, and `status`; a fourth attempt on one obstacle is rejected as `exhaustion`, a `continue` answer resets only that obstacle's counter, and a `stop` answer stops the run.
- `bin/sai-state.js` carries the machine's `run` view onto the emit wire as one more machine-authored observability field.
- The `/sai-3-implement-new` coordinator opens the run state at start, keeps the free text of the run (dirty and failure baselines, deviations, overrides, worker reports, findings, hand-over summaries) in files in a run directory under the repository's ignored `.tmp/{name}/run-{unique-suffix}/`, and emits only identifiers and paths. When an emit still fails after two corrected retries, it keeps the same facts in `run-state.md` in the run directory and carries on.
- Each obstacle (`step-{n}`, or `final-suite` for the closing suite run) has a budget of 3 attempts, each with a different approach: a corrected instruction, a plan edit, an override, or a new worker. A RED non-assertion failure, a GREEN test-file change, and a review defect each spend an attempt of the step. An exhausted budget escalates at once, without first advancing other tasks, through the native picker with coordinator-written options, one of which stops the run.
- A worker that returns no ready, whose report cannot be read, that stays silent, or that drifts is an obstacle: it is asked again first and then replaced by a new worker that gets the ready handshake and a coordinator-written hand-over summary (`handover-{role}-{k}.md`).
- Workers write their report to the file the brief names (`reports/step-{n}-{role}-{k}.yaml` in the run directory) and return only its path.
- A `## Resuming` section: after a compaction or on an interrupted run, the coordinator resumes from the store and the files it references, with commits and `tasks.md` checkboxes winning over the store; in a session that cannot see the store it rebuilds progress from `git log` and the checkboxes with every counter at zero, and carries forward the files of an earlier run directory. Recreated workers after a resume spend no attempt.
- At close (completed, stopped, or a dismissed escalation question), the coordinator composes `openspec/changes/{name}/build-log.md` from the run directory files. It stays on disk beside the change artifacts and is part of no commit. A stopped or escalated run ends without the `Implement-new done.` line.
- `/sai-build-new` starts no later segment after a blocked or stopped segment and names `build-log.md` in its report.
- Documentation: `AGENTS.md`, `docs/commands/sai-3-implement-new.md`, `docs/commands/sai-build-new.md`, and `docs/on-demand-commands.md` describe the resilience behavior.

## Capabilities

### New Capabilities

- `implement-new-resilience`: the identifiers-only run-state machine and run directory, the per-obstacle budget of three approach-changing attempts with immediate escalation on exhaustion, worker replacement with a hand-over summary, and resumption after a compaction or in another session.
- `implement-new-run-log`: `build-log.md` composed at run close as the durable report for a later review.

### Modified Capabilities

- `implement-new-loop`: corrected instructions in the step cycle count as attempts, obstacles follow the attempt budget instead of a single corrected instruction, and the final suite run is the `final-suite` obstacle; a stopped or escalated run ends without the closing line.
- `implement-new-workers`: a worker that returns no ready is an obstacle, a replacement worker gets the creation-only handshake and a hand-over summary, and the report travels as a file whose path the worker returns.
- `build-new-command`: a blocked or stopped segment starts no later segment and the report names `build-log.md`.
- `bounded-worker-recovery`: the closed observability field set carried onto the emit wire gains `run`.
- `stage-machine-emit-delivery`: the `/sai-3-implement-new` coordinator continues from `run-state.md` instead of stopping when an emit still fails after both corrective retries.

## Impact

- New: `sai-state/machines/implement-new-run.js`, `test/implement-new-run-machine.test.js`.
- Modified: `sai-state/registry.js`, `bin/sai-state.js`, `sai/commands/implement-new/coordinator.md`, `sai/commands/implement-new/worker-common.md`, `sai/commands/build-new/coordinator.md`, `test/implement-new-family.test.js`, `AGENTS.md`, `docs/commands/sai-3-implement-new.md`, `docs/commands/sai-build-new.md`, `docs/on-demand-commands.md`.
- Known limitations: a step that was in progress when the session ended restarts with its counter at zero in a new session, because that session cannot see the old store; an exhausted budget interrupts the user even when later tasks might have been independent. The adversarial review after GREEN is not part of this change.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

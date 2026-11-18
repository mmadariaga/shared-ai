> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

A Direct Build coordinator watched only the report directory, so the implementer's edits and its running test suite showed no activity and the watch ended `silent` after 20 minutes. A false `silent` costs an obstacle attempt and can replace a healthy worker. The cause was general: `transfer.js watch` accepted no writable paths by default, and most coordinators never passed any, so any worker that wrote outside its report directory, or ran a long command, looked hung.

## What Changes

- `sai/tools/transfer.js` `watch` requires `--input-file`. Without it the call exits 2 with a usage error that names the flag and starts no watch. A file that holds `[]` is valid and leaves the report directory as the only activity source. A listed path that does not exist yet is never an error and counts from the moment it appears.
- A `silent` or `max` watch result carries `walk_limited`, the listed paths whose activity walk stopped at the 5000-entry `ACTIVITY_WALK_LIMIT`, so a `silent` end that may have missed activity is visible.
- `sai/policies/worker-report-transport.md` § Undelivered reports: the Watch bullet launches the watch with `--input-file <paths-file> --cwd <project-root>` instead of "with its defaults"; the Writable paths bullet makes the file required, accepts `[]`, and requires every relaunch for the same worker task (after an empty end, after a first `silent`, and for a replacement worker) to pass the same file; a relaunch after the missing-flag error spends no obstacle attempt. New Scratch folder and Walk limit bullets define the worker's scratch folder and the meaning of `walk_limited`.
- `sai/policies/worker-lifecycle.md` § Worker side gains a Long commands rule: a worker whose brief names a scratch folder sends the output of any command that can run long to a log in that folder, creating the folder first when it does not exist; a worker whose brief names none has no such duty.
- Each report-receiving coordinator card states its worker's writable paths as a fact of its own card, while the watch mechanics stay in the policy:
  - `sai/commands/explore/direct-build-coordinator.md`: the implementer's writable paths are the repository paths the verified block cites, without their `:line` ranges, plus its scratch folder `scratch-implementer` in the slice run directory, which the coordinator only names and the worker creates; the task message closes with a `Scratch folder: <path>` line. The backfill worker's writable path is its transfer directory and the archive worker's list is `[]`.
  - `sai/commands/plan/cycle.md`: `openspec/changes/{name}/`, `GLOSSARY.md` in the spec segment, and the scratch folder `scratch-{segment}` in the run directory.
  - `sai/commands/merge/coordinator.md`: the files the worker's brief names, written once per task, plus the scratch folder `scratch` in the run directory.
  - `sai/commands/review/coordinator.md` and `sai/commands/audit/coordinator.md`: the worker's report plus a scratch folder opened with `transfer.js open` and closed with the report directory in one same-turn batch; a replacement worker receives the same folders.
  - `sai/commands/deep-review/coordinator.md`: each audit cycle's watch lists only that audit's report and scratch folder, and the scratch folder closes with the cycle's report directory.
  - `sai/commands/implement/coordinator.md`: the existing writable paths are written once as the `--input-file` file, which every relaunch and a replacement worker reuse.
  - `sai/commands/commit/coordinator.md` and `sai/commands/archive/coordinator.md` pass `[]`; `sai/commands/backfill/coordinator.md` passes the transfer directory. Each writes the file once in a second directory opened with `transfer.js open` and closes it with the report directory.
- The worker contracts that receive a scratch folder (`sai/commands/explore/direct-build-worker.md`, `sai/commands/plan/worker-common.md`, `sai/commands/merge/worker.md`, `sai/commands/review/worker.md`, `sai/commands/audit/worker-common.md`) name it in the brief and point to the Long commands rule.
- `AGENTS.md` describes `--input-file` as required with `[]` accepted.
- Tests cover the required flag, `walk_limited`, a streamed scratch log keeping the watch from ending `silent`, the per-card writable-path facts, and the Long commands rule.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `silent-worker-detection`: the watch requires its writable paths, accepts `[]` and not-yet-existing paths, names truncated walks in `walk_limited`, and counts a streamed command log as activity.
- `undelivered-report-recovery`: every coordinator passes its worker's writable paths to every watch and relaunch, and each coordinator card states those paths as a fact of its own.
- `worker-lifecycle-protocol`: a worker whose brief names a scratch folder logs long command output there.
- `transfer-file-transport`: the `watch` signature makes `--input-file` required and its `silent` or `max` result may carry `walk_limited`.

## Impact

Modified files:

- `AGENTS.md`
- `sai/tools/transfer.js`
- `sai/policies/worker-report-transport.md`
- `sai/policies/worker-lifecycle.md`
- `sai/commands/archive/coordinator.md`
- `sai/commands/audit/coordinator.md`
- `sai/commands/audit/worker-common.md`
- `sai/commands/backfill/coordinator.md`
- `sai/commands/commit/coordinator.md`
- `sai/commands/deep-review/coordinator.md`
- `sai/commands/explore/direct-build-coordinator.md`
- `sai/commands/explore/direct-build-worker.md`
- `sai/commands/implement/coordinator.md`
- `sai/commands/merge/coordinator.md`
- `sai/commands/merge/worker.md`
- `sai/commands/plan/cycle.md`
- `sai/commands/plan/worker-common.md`
- `sai/commands/review/coordinator.md`
- `sai/commands/review/worker.md`
- `test/transfer-tool.test.js`
- `test/undelivered-report-recovery.test.js`

New files: none.

Known limitations left behind:

- A Direct Build implementer that edits only files outside the block's declared paths, and runs no logged command for a whole window, can still end the watch `silent`; this stays an ordinary obstacle.
- Workers without a scratch folder (commit, archive, backfill) get no protection for a long command.
- A command that writes nothing for a whole window still ends the watch `silent`.

The 20-minute window and the obstacle budget for `silent` are unchanged, and Claude Code and opencode follow the same rules.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

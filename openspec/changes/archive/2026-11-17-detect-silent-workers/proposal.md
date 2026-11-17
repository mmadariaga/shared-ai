> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

In an opencode `/sai-build` run the coordinator took 86 minutes to replace a hung RED worker, because no contract quantified when a worker is "silent past what the step needs", and the coordinator created a new worker session for every step despite the continuation rule of `sai/commands/implement/coordinator.md`. Coordinators had no deterministic signal for a hung worker and no record that would make an unexpected new worker visible. This change gives them a tool-decided `silent` signal, a per-role record of worker handles in the implement run, and report references that may be written relative to the report directory.

## What Changes

- `sai/tools/transfer.js watch` gains `--silent-after <minutes>` (default 20; a bare number is minutes, `ms`/`s`/`m`/`h` units are accepted) and an optional `--input-file` holding the worker's writable paths (a JSON array of strings, or an object with a `paths` array, each absolute or relative to `--cwd`). The watch ends with `ended: silent`, an empty `reports` list, and `silent_for_ms` when, for the whole window, no file of the report directory (the marker and the ledger aside, drafts included) was created or changed and no file below a writable path changed its `mtime`. The window starts when the watch starts, and a settled undelivered report is still reported before silence. A directory path counts every file below it, skipping `.git` and `node_modules`, with a bounded walk.
- `transfer.js accept` and `sai/tools/worker-report-validator.js validate` resolve a relative report path against the report directory before the existing containment and hash checks, so a path that escapes the directory is still refused; `transfer.js` exports `resolveReferencePath`, `parseSilentAfter`, and `parseWritablePaths`.
- `sai-state/machines/run-core.js` accepts an optional `handleRecord` hook for `record` refs outside the machine's path refs. `sai-state/machines/implement-run.js` uses it for `record` with `ref=worker`, `role`, `handle`, and `reason` (`create`, `replace`, `resume`): it keeps the handles per role in a `workers` state list, ignores a repeat of the current handle, and answers a second distinct handle of a role under reason `create` with the warning `WORKER_HANDLE_CHANGED`. `bin/sai-state.js` carries machine `warnings` onto the emit response, merged with the store warnings.
- `sai/policies/worker-report-transport.md` § Undelivered reports defines the silent end, the writable-paths input, and the Silent handling: an ordinary obstacle of the step under the existing budget of 3 attempts, with no user question of its own; the first `silent` asks the same worker once for its report and relaunches the watch, and a second consecutive `silent` with no report between them replaces the worker. It also documents relative report references.
- `sai/commands/implement/coordinator.md` registers every worker handle right after `ready` (`create`, `replace` after an obstacle replacement, `resume` after a compaction), passes the step brief's writable paths to the watch, and names a `silent` watch end as an obstacle in place of the former unquantified "silent past what the step needs".
- `AGENTS.md` describes the silent end, relative references, and the per-role worker handles.

## Capabilities

### New Capabilities

- `silent-worker-detection`: the deterministic `silent` end of `transfer.js watch`, its writable-paths input, and how a coordinator handles it as an obstacle of the step.
- `relative-report-references`: report references whose path is relative to the report directory in `transfer.js accept` and `worker-report-validator.js`.

### Modified Capabilities

- `implement-new-resilience`: registration of worker handles per role in `implement-run@1` with the `WORKER_HANDLE_CHANGED` warning on the emit response, the `handleRecord` hook of the shared run core, and a `silent` watch end as a replacement trigger.
- `transfer-file-transport`: `watch` gains the silent end and its flags; `accept` takes a path relative to the transfer directory.
- `undelivered-report-recovery`: the background watch takes the worker's writable paths and a `silent` end is an obstacle instead of a silent relaunch.

## Impact

- Modified: `sai/tools/transfer.js`, `sai/tools/worker-report-validator.js`, `sai-state/machines/run-core.js`, `sai-state/machines/implement-run.js`, `bin/sai-state.js`, `sai/policies/worker-report-transport.md`, `sai/commands/implement/coordinator.md`, `AGENTS.md`.
- Tests: `test/transfer-tool.test.js`, `test/worker-report-validator.test.js`, `test/implement-run-machine.test.js`.
- Known limitations: a worker that writes nothing for longer than two silence windows, such as one running a very long suite, is replaced; the window is the adjustable `--silent-after` flag. Because each relaunched watch starts a new window, the worst-case time to detect silence is the silence window plus the watch maximum when a watch is relaunched. Handle registration covers `/sai-3-implement` only.
- Claude Code and opencode behave alike: the watch, the validator, and the machine are harness-neutral tools.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

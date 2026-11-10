> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The `sai-state` store CLI swallowed several failures. `emit` ignored a failed session-file write, so a coordinator received a pointer that advanced over state that was never saved, and a resumed run went back to an older step after a compaction. A step report that named an undeclared step id was dropped silently, and `spawn` overwrote an unparseable session file. Every one of these failures is now a visible outcome of the CLI response.

## What Changes

- `bin/sai-state.js` reports a session-file write that does not complete instead of swallowing it: `emit`, `spawn`, and `reset` exit 1 with `error: "STORE_WRITE_FAILED"`, the error text in `detail`, and no `stage` or `next`, and the session file keeps its previous state.
- The session record carries an integer `revision` that every write raises. Each verb re-reads the file's revision just before the rename and writes nothing when it differs from the revision it read at its start, answering `error: "STORE_CONFLICT"` with exit 1. There is no automatic retry. The re-read-and-merge of a fresh record that the write path and `reset` performed before is removed.
- An unparseable session file is renamed to `<session-file>.corrupt` (`.corrupt.1`, `.corrupt.2`, … when that name is taken) instead of being overwritten. The response carries `warnings: ["SESSION_FILE_CORRUPT"]` and the preserved path in `corrupt_file`, and the verb continues from the initial state. When the rename fails, no later write replaces the file.
- The linear step machine factory (`sai-state/machines/linear-steps.js`, which builds `spec-steps@1`, `design-steps@1`, `red-steps@1`, `green-steps@1`, `review-steps@1`, `security-steps@1`, `performance-steps@1`, and `accessibility-steps@1`) rejects a step report that names an undeclared id: exit 0, `rejected: "UNKNOWN_STEP_ID"`, the unknown ids in `unknown_ids`, the state unchanged, and the unchanged active pointer. The declared ids of that report are not applied. With nothing done, the answered pointer is the first filed step that `reset` returns, never the fileless first step. `unknown_ids` joins the closed set of observability fields carried on the emit wire.
- The `received_at` clock `generateReceivedAt` moves to the new module `sai/tools/received-at.js`. `sai/tools/worker-report-validator.js` imports and re-exports it, and `bin/sai-state.js` loads it for every verb. `bin/sai-state.js` loads the worker-report validator only for `emit --progress` and `emit --ready-to-propose`; `spawn`, `reset`, `close`, `block`, and an identifier-event `emit` run without it. A missing clock module exits 2 on every verb naming the tried paths; a missing validator exits 2 only on the progress and block emits.
- The block emit and the block amendment write the inventory and the stored blocks in the same single session-file write as the machine outcome. The module-level `pendingRecordExtras`, the repair write `ensureRecordedBlocks`, `storeAmendedBlock`, and the `BLOCKS_NOT_STORED` warning are retired; a failed write answers `STORE_WRITE_FAILED` and leaves the earlier inventory and blocks intact.
- The unused `recovery-ledger@1` machine is removed: `sai-state/machines/recovery-ledger.js`, its registration in `sai-state/registry.js`, and `test/recovery-ledger-machine.test.js` are deleted, and its installed copy is added to the retired paths of `sai/install-manifest.json` for both Claude Code and opencode. An `emit` to it answers `UNKNOWN_MACHINE`.
- `sai/policies/stage-machine.md` documents the revision counter, the corrupt-file rename, the `STORE_WRITE_FAILED` and `STORE_CONFLICT` responses and their degraded-mode handling, the narrowed validator loading, and the `UNKNOWN_STEP_ID` rejection, which a coordinator answers by re-steering the worker rather than by falling back to its static step order. `AGENTS.md` describes the new clock module and the narrowed validator loading.
- Tests cover the write failure, the write conflict, the rejected step report (including the first-filed pointer right after `reset` and a mixed report), the corrupt-file rename, the missing clock and missing validator modules, the removed machine, and the single-write block emit.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stage-machine-cli-interface`: session-file revision counter and conflict detection, write-failure reporting for `emit`, `spawn`, and `reset`, the corrupt-file rename, the `received_at` clock module, and the removed `recovery-ledger@1` machine.
- `step-machine-progress-emit`: the validator loads only for the progress and block emits, the clock comes from `received-at.js`, and an undeclared step id in a progress report is rejected.
- `validator-stamping`: the single `received_at` clock lives in `sai/tools/received-at.js` and the validator re-exports it.
- `linear-step-machine-factory`: an undeclared step id rejects the whole report with `UNKNOWN_STEP_ID` instead of being dropped silently.
- `validated-block-recording`: the inventory and the blocks are one session-file write, and a failed write is `STORE_WRITE_FAILED` instead of `BLOCKS_NOT_STORED`.
- `explore-stage-machine`: a corrupt session file is renamed aside and its preserved path is reported in `corrupt_file`, never overwritten.
- `single-slice-amendment`: an accepted amendment's entry is written with the machine outcome in one write, with no `BLOCKS_NOT_STORED` warning.
- `spec-step-routing`, `design-step-routing`, `security-standalone-loading`, `performance-standalone-loading`, `accessibility-standalone-loading`, `review-standalone-loading`: the step machines built by the factory reject an undeclared step id instead of ignoring it.

## Impact

- New: `sai/tools/received-at.js`.
- Modified: `bin/sai-state.js`, `sai-state/machines/linear-steps.js`, `sai-state/registry.js`, `sai/tools/worker-report-validator.js`, `sai/policies/stage-machine.md`, `sai/install-manifest.json`, `AGENTS.md`, `test/sai-state.test.js`, `test/linear-step-machines.test.js`, `test/sai-state-progress-emit.test.js`, `test/sai-state-ready-to-propose-emit.test.js`.
- Deleted: `sai-state/machines/recovery-ledger.js`, `test/recovery-ledger-machine.test.js`.
- Claude Code and opencode get the same behavior: both run the same `bin/sai-state.js` and machines, and the retired installed copy of `recovery-ledger.js` is removed for both.
- Known limitations: the revision check detects a crossed write but leaves a very small window between the revision re-read and the rename; a worker that reports one misspelled step id must report the whole step again. Splitting `bin/sai-state.js` into modules and removing the static step-order fallback tables from the coordinator cards stay out of scope, and ADR 0192 stays unchanged as history.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

This slice covers the edge cases of issue #390 that concern store failures; the flag-event edge cases E6 and E7 belong to the `sai-state-flag-events` slice. Within I10, this slice adds the tests for E1–E5, E8, and E9.

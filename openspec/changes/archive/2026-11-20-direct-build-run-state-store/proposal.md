> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Direct Build kept `base_sha`, counters, worker handles, and snapshots only in the conversation (`sai/commands/explore/direct-build-coordinator.md` § Run state), so its Resume stopped when that state was gone, and a rewind of a parked Direct Build slice could only restart at the first step (`GOTO_REWIND_UNSUPPORTED` in `sai-state/machines/explore-slice.js`). `implement-run@1`, `plan-run@1`, and `merge-run@1` already keep their run state in the `sai-state` store. This change keeps the Direct Build run state of the `/sai-explore` route in the store, so a running or parked slice survives a context compaction and can rewind to any route item whose state is stored.

## What Changes

- New `direct-build-run@1` machine (`sai-state/machines/direct-build-run.js`) on the shared run core, registered in `sai-state/registry.js`. It holds the identifiers and paths of one slice's Direct Build run: `change`, `step`, `base_sha`, `slice_snapshot`, `route`, `fix_rounds`, `gate_rounds`, the in-flight `order` with its `order_snapshot` and `order_state`, the checkpointed route `items`, the `consumed` orders and grants, the worker handles, and the recorded paths (report directory, transfer directory, evidence, project directories, commits). Its events are `start`, `resume`, `step`, `field`, `checkpoint`, `order`, `order-result`, `consume`, `record`, the run-core obstacle events, `close`, and `status`. A `checkpoint` of a route item is refused with the list of `missing` fields when the state that item needs is not stored.
- `run-core.js` gains an `onStart` hook that can refuse a run start, and the shared `workerHandleRecord` (moved out of `implement-run.js`, whose behavior is unchanged).
- `explore-slice@1` `goto` of a Direct Build slice: a rewind to a later route item (`backfill`, `archive`) is accepted when the stored run state of that slice holds the item's checkpoint, and is otherwise rejected with `MISSING_PRECONDITIONS`, `missing: ["run-state"]`, and `resume_at: "build-implement"`. A step rewind is refused with `GOTO_ORDER_CONSUMED` once an archive order or a commit grant was consumed, and with `GOTO_ORDER_UNCERTAIN` while an execute order is in flight or its effect is uncertain. `GOTO_REWIND_UNSUPPORTED` is no longer returned.
- `explore-slice@1` outcomes carry a `run_effect` (`drop` and `rewind`), and `bin/sai-state.js` applies it to `direct-build-run@1` in the same session-file write as the slice outcome: `goto` to `pending`, a reopened slice, a content amendment, a re-registration that drops a slice's cursor, and a fresh Direct Build slice start discard the stored run state; an accepted rewind cuts the checkpoints after the target item (the first item discards the run state). The CLI passes the stored run-state view in every slice `goto` event.
- `/sai-explore` resets `direct-build-run@1` together with `explore-idea@1` and `explore-slice@1` on every invocation (`sai/commands/explore/body.md`).
- The Direct Build card (`sai/commands/explore/direct-build-coordinator.md`) keeps the run state in two modes: the store on the explore route, and the conversation on `/sai-direct-build` and after a store failure. It names the events to emit and when, the Resume that rebuilds the run state from the store's `run` view, the rewind to a checkpointed item, and the `close` emit at every run close. `sai/commands/direct-build/coordinator.md` states that `/sai-direct-build` writes nothing to `direct-build-run@1`.
- `route-selector.md`, `slice.md`, `sai/policies/stage-machine.md`, `sai/policies/worker-report-transport.md`, and `AGENTS.md` describe the stored run state and the new rewind rules.
- Scope drift (not an implementation error): `sai/tools/lint.js` recognizes `direct-build-run@1` as a stage machine identifier in the worker emission ownership check. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): a consumed archive order or commit grant, or an in-flight or uncertain execute order, also refuses a rewind to the first step, not only to a later item; `goto` to `pending` stays available. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): a re-registration of the slice set and a reopen of a completed slice discard the stored run state of every slice that loses its cursor. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

- `direct-build-run-state`: the `direct-build-run@1` store machine for the Direct Build run state of the `/sai-explore` route, its checkpoints, its order and grant holds, its lifecycle beside `explore-slice@1`, and the two run-state modes of the Direct Build card.

### Modified Capabilities

- `explore-slice-machine`: a Direct Build `goto` reaches a later route item when the store holds its run state, and is held while an order or grant would be replayed or renewed.
- `explore-pipeline-supervision`: the Direct Build run state is kept in the store on the explore route, and Resume rebuilds it from there.
- `explore-pipeline-selector`: the pending-execution choices include a rewind to a later item that the stored run state offers.
- `explore-load-receipt`: an `/sai-explore` invocation also resets `direct-build-run@1`.
- `implement-new-resilience`: the shared run core gains a start hook and exports the shared worker-handle record handler that `implement-run@1` now uses.
- `direct-build-report-transport`: the explore Direct Build route keeps its report directory in `direct-build-run@1`; `/sai-direct-build` keeps it in the conversation.

## Impact

- New files: `sai-state/machines/direct-build-run.js`, `test/direct-build-run-machine.test.js`.
- Modified files: `AGENTS.md`, `bin/sai-state.js`, `sai-state/machines/explore-slice.js`, `sai-state/machines/implement-run.js`, `sai-state/machines/run-core.js`, `sai-state/registry.js`, `sai/commands/direct-build/coordinator.md`, `sai/commands/explore/body.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/explore/steps/route-selector.md`, `sai/commands/explore/steps/slice.md`, `sai/policies/stage-machine.md`, `sai/policies/worker-report-transport.md`, `sai/tools/lint.js`, `test/explore-slice-machine.test.js`, `test/worker-report-transport.test.js`.
- `/sai-direct-build` behavior and contract are unchanged. Claude Code and opencode follow the same contract.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

The dependency `explore-state-goto` (https://github.com/mmadariaga/shared-ai/issues/501) is already implemented and archived (`openspec/changes/archive/2026-11-20-explore-state-goto/`), so this block declares no pending dependency.

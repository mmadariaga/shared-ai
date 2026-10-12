> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Direct Build's retained execution state kept the selected `Ready to Propose` block only in conversation (`sai/commands/explore/steps/pipeline-direct-build.md`). In one opencode session a compaction lost the next slice's block, which stopped an authorized unattended route for 1h47m, and a corrected block reached the worker without validation. The `sai-state` store already held each validated block's text, hash, and verdicts, but no route read from it, and no receiver could detect a truncated or altered copy.

## What Changes

- `bin/sai-state.js` adds the `block <id> <change-name>` verb, which returns `{received_at, hash, text}` for one stored slice or `{received_at, error: "BLOCK_NOT_FOUND"}` with exit 1. It also adds `emit <id> explore-slice@1 --ready-to-propose --amend <change-name> -`. This emit validates exactly one block with the dispatchable contract and requires that block's change name (`AMEND_BLOCK_COUNT` and `AMEND_NAME_MISMATCH` otherwise). When the machine accepts the amendment, it replaces only that slice's stored text, hash, and verdicts, and reports `BLOCKS_NOT_STORED` when the replacement cannot be confirmed.
- `sai-state/machines/explore-slice.js` accepts an `{amend: <name>}` signal for a pending or stopped slice only. It rejects `UNKNOWN_SLICE`, `SLICE_COMPLETED`, and `SLICE_RUNNING`, and never changes machine state.
- `sai/tools/ready-to-propose.js` adds the `hash` sub-command. It prints the sha256 of the single block on stdin, the same hash the dispatchable verdict reports, and exits 1 for any other block count.
- `sai/policies/ready-to-propose-format.md` gains § Stored block transport, the verification every receiving worker runs before any work. `sai/policies/stage-machine.md` documents § Block amend, § Block, and the `BLOCK_NOT_FOUND` error.
- `sai/commands/explore/steps/pipeline-plan-unattended.md` and `pipeline-direct-build.md` take block text only from `sai-state block` and put the returned hash on a `--block-hash` envelope line, for every dispatch and every coordinator reading. Direct Build's retained execution state no longer holds the block. A `BLOCK_NOT_FOUND` answer dispatches nothing and closes with stop options that include re-emitting the block. `pipeline-selector.md` states that `last_crystallization_set` holds names only.
- `sai/commands/explore/steps/route-selector.md` adds § Single-slice amendment.
- `sai/commands/explore/direct-build-worker.md`, `sai/commands/backfill/worker.md` (prepare mode), and `sai/commands/spec/worker.md` (supervised envelope) require the `--block-hash` line and verify the block before any work. A missing line or a mismatch returns `failed` with no changes. The `--no-specs` POC profile carries no hash, and a block pasted into `/sai-1-spec` keeps being validated on its own merits.
- `AGENTS.md`, `docs/commands/sai-explore.md`, and `docs/commands/sai-1-spec.md` describe the stored block transport, the hash check, and amendment.
- `test/ready-to-propose-detector.test.js` and `test/sai-state-ready-to-propose-emit.test.js` cover the `hash` sub-command, the `block` verb, and the amendment rules.

## Capabilities

### New Capabilities

- `stored-block-dispatch`: Plan and Direct Build take block text and hash only from the `sai-state block` verb, and a missing stored block dispatches nothing.
- `block-integrity-verification`: the `hash` sub-command and the receiving workers' hash verification before any work.
- `single-slice-amendment`: a validated `--amend` re-emission replaces one pending or stopped slice's stored block.

### Modified Capabilities

- `stage-machine-cli-interface`: adds the `block` verb, the amendment error reasons, and the `BLOCK_NOT_FOUND` outcome.
- `validated-block-recording`: an accepted amendment replaces only its slice's stored entry.
- `auto-fast-implement-worker`: the implementer envelope carries and verifies a `--block-hash` line.
- `explore-pipeline-supervision`: Direct Build retained execution state no longer holds the block.
- `supervised-pipeline-forwarding`: the supervised spec dispatch carries the stored block and its hash line.

## Impact

Modified files:
- `AGENTS.md`
- `bin/sai-state.js`
- `docs/commands/sai-1-spec.md`
- `docs/commands/sai-explore.md`
- `sai-state/machines/explore-slice.js`
- `sai/commands/backfill/worker.md`
- `sai/commands/explore/direct-build-worker.md`
- `sai/commands/explore/steps/pipeline-direct-build.md`
- `sai/commands/explore/steps/pipeline-plan-unattended.md`
- `sai/commands/explore/steps/pipeline-selector.md`
- `sai/commands/explore/steps/route-selector.md`
- `sai/commands/spec/worker.md`
- `sai/policies/ready-to-propose-format.md`
- `sai/policies/stage-machine.md`
- `sai/tools/ready-to-propose.js`
- `test/ready-to-propose-detector.test.js`
- `test/sai-state-ready-to-propose-emit.test.js`

No new files.

Known limitations: every worker dispatch that carries a block costs one extra tool call. Block text is stored in the per-chat session file under the system temp directory. Only block text, hash, and verdicts are persisted. Counters, handles, and other execution state stay conversation-only.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

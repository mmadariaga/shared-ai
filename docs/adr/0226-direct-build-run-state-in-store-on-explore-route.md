# ADR 0226: Direct Build run state lives in the store on the explore route only

## Status

Accepted. Refs 0225, whose decision 5 limited a Direct Build rewind to pending or the first step until this run state lived in the store; it supersedes no earlier record.

## Context

The Direct Build run of the `/sai-explore` route kept `base_sha`, counters, worker handles, and snapshots only in the conversation. A resume stopped when that state was gone, and a rewind could only restart at the first step (`GOTO_REWIND_UNSUPPORTED`). `implement-run@1`, `plan-run@1`, and `merge-run@1` already keep their identifiers and paths in the store and their free text in a run directory. `/sai-direct-build` has a documented contract of no `sai-state` interaction.

## Decision

1. **A `direct-build-run@1` machine on `run-core.js` holds the run state in the explore session.** It sits beside `explore-slice@1` under the same session id and holds identifiers and paths of one slice at a time: the step, `base_sha`, the snapshot references, the step counters, the worker handles, the report directory, the `order_snapshot`, the consumed orders and grants, and the route items whose state is stored (checkpoints). Reports and free text stay in the run directory.
2. **A rewind to a later item needs its checkpoint.** `explore-slice@1` accepts a Direct Build `goto` to `backfill` or `archive` only when the stored run state holds that item's checkpoint; otherwise it answers `MISSING_PRECONDITIONS` with `missing: [run-state]` and the first step stays available. A rewind is refused while an execute order's effect is uncertain (`GOTO_ORDER_UNCERTAIN`) and once an archive order or commit grant was consumed (`GOTO_ORDER_CONSUMED`), so it never replays an uncertain order or renews a consumed grant.
3. **The run state follows the slice cursor.** Going back to pending, a content amendment, a reopened slice, and a re-registration that drops the cursor discard it; a metadata amendment, `fail`, `cancel`, and resumption keep it; a slice that starts fresh starts with none; each `/sai-explore` invocation resets it. The CLI applies these effects in the same session-file write as the slice outcome.
4. **Only the `/sai-explore` route uses the store.** `/sai-direct-build` and a store failure (`STORE_WRITE_FAILED`, `STORE_CONFLICT`, unreachable) keep the run state in the conversation, and every rewind past the first step is then rejected with `missing: [run-state]`.

## Alternatives Considered

- **Keep the run state in the conversation and allow only first-step rewinds** — rejected: a context compaction or a stop mid-route would leave the slice without a step-level exit.
- **Move `/sai-direct-build` to the store as well** — rejected: it changes that command's documented no-`sai-state` contract and widens the change.

## Consequences

- A parked or running slice resumes from the store after a compaction and rewinds to any route item whose state is stored, without asking the user what the store already holds.
- The Direct Build card keeps two run-state modes: the store on the explore route, the conversation on `/sai-direct-build` and on a store failure.
- ADR 0225's limit that a Direct Build rewind reaches only pending or the first step no longer holds on the explore route when the store holds the run state.

## Provenance

Change `direct-build-run-state-store`, decision "Only the `/sai-explore` route uses the store".

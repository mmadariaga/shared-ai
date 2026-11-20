# direct-build-run-state Specification

## Purpose
TBD - created by archiving change direct-build-run-state-store. Update Purpose after archive.

## Requirements

### Requirement: Direct Build run state machine holds identifiers and paths of one slice

`sai-state` SHALL register a `direct-build-run@1` machine built on the shared run core (`sai-state/machines/run-core.js`). It SHALL hold the run state of ONE Direct Build slice at a time, identified by `change`, and only identifiers and paths: `step` (`step-1` through `step-8`, with `step-2b`), `base_sha` (a commit identifier), `slice_snapshot` (a record name or the literal `n/a`), `route` (`no-specs` or `worker`), `fix_rounds` and `gate_rounds` (integers from 0 to 99), the in-flight `order` with its `order_snapshot` and `order_state`, the checkpointed route `items`, the `consumed` orders and grants, the worker handles recorded as `role:handle` entries, and the recorded paths of the report directory, the transfer directory, the evidence files, the backfill validation project directories, and the confirmed commits. Reports and free text SHALL stay in the run directory. A `start` event SHALL require `dir` and `change` and SHALL open the run with both counters at `0`; a `start` without a usable change name SHALL be rejected. A `field` event with an unknown field or a value that is not valid for that field SHALL be rejected and SHALL change nothing.

#### Scenario: A start without a change name is refused

- **WHEN** `direct-build-run@1` receives `start` with a run directory and no change name
- **THEN** the machine rejects it with `change name required` and the run stays idle

#### Scenario: An invalid field value is refused

- **WHEN** a running `direct-build-run@1` receives `field` with `field` `base_sha` and a value that is not a commit identifier
- **THEN** the machine rejects it and the stored `base_sha` stays as it was

### Requirement: A route item checkpoint needs its stored state

A `checkpoint` event SHALL name a route item (`build-implement`, `backfill`, or `archive`) and SHALL be accepted only when the state that item needs on entry is stored: `base_sha`, `slice_snapshot`, and a report directory for `build-implement`; those plus recorded evidence for `backfill`; and those plus evidence, `route`, and a transfer directory for `archive`. An accepted checkpoint SHALL set the checkpointed items to every item up to and including the named one and SHALL set `step` to that item's first step (`step-1`, `step-3`, or `step-7`). A refused checkpoint SHALL answer `run state incomplete` with the list of `missing` fields and SHALL change nothing.

#### Scenario: An incomplete checkpoint names what is missing

- **WHEN** a running run that holds no evidence path receives `checkpoint` with item `backfill`
- **THEN** the machine rejects it with `run state incomplete` and a `missing` list that names `evidence`

#### Scenario: A complete checkpoint records the item

- **WHEN** a running run that holds `base_sha`, `slice_snapshot`, a report directory, evidence, `route`, and a transfer directory receives `checkpoint` with item `archive`
- **THEN** the checkpointed items are `build-implement`, `backfill`, and `archive`, and `step` is `step-7`

### Requirement: Execute orders and commit grants are recorded before a rewind can renew them

An `order` event SHALL name `backfill-execute` or `archive-execute` and a snapshot reference, and SHALL be rejected when that order was already consumed. It SHALL record the order as in flight (`order_state` `sent`). An `order-result` event SHALL be `done`, `no-effect`, or `uncertain`: `uncertain` SHALL keep the order and set `order_state` to `uncertain`; `done` and `no-effect` SHALL clear the in-flight order, and `done` of `archive-execute` SHALL add it to the consumed list. A `consume` event SHALL record a consumed `archive-commit` or `telemetry-commit` grant. The machine's rewind view SHALL report the hold `consumed` when any order or grant was consumed, `uncertain` when an order is in flight or uncertain, and no hold otherwise.

#### Scenario: A consumed archive order is not sent again

- **WHEN** `archive-execute` received `order-result` `done` and the coordinator emits `order` with `archive-execute` again
- **THEN** the machine rejects it with `order already consumed`

#### Scenario: An uncertain order holds a rewind

- **WHEN** an `order` was recorded and its `order-result` is `uncertain`
- **THEN** the rewind view reports the hold `uncertain` until a `done` or `no-effect` result clears it

### Requirement: Direct Build run state follows the slice cursor

The Direct Build run state SHALL follow the slice cursor of `explore-slice@1`, and `bin/sai-state.js` SHALL apply the effect of an accepted slice outcome to `direct-build-run@1` in the same session-file write as that outcome. `goto` to `pending`, a reopened completed slice, a content amendment of a slice, and a re-registration of the slice set that leaves a slice without a cursor SHALL discard that slice's stored run state; a metadata amendment, `fail`, `cancel`, and `resume-direct-build` SHALL keep it. A Direct Build slice that starts fresh SHALL discard the stored run state of every slice of the set, so a later slice never reads an earlier slice's state. An accepted rewind to a later item SHALL keep the checkpoints up to that item and set `step` to its first step; a rewind to the first item SHALL discard the run state. A discard or rewind for another change SHALL leave the stored state alone.

#### Scenario: A content amendment discards the run state

- **WHEN** a Direct Build slice with stored run state receives a single-slice amendment of kind `content`
- **THEN** the same store write that returns the slice to pending returns `direct-build-run@1` to its initial state

#### Scenario: A metadata amendment keeps the run state

- **WHEN** a Direct Build slice with stored run state receives a single-slice amendment of kind `metadata`
- **THEN** the stored run state stays unchanged

#### Scenario: A later slice starts with a fresh run state

- **WHEN** a Direct Build route starts a slice fresh, without a parked cursor, while the store holds the run state of an earlier slice
- **THEN** the earlier slice's run state is discarded and the new slice reads none of it

### Requirement: Direct Build card keeps two run-state modes

On the `/sai-explore` route the Direct Build card SHALL keep the run state in `direct-build-run@1` under the explore session id: it SHALL emit `start` once the slice run directory exists, record each path and worker handle as it appears, emit `field`, `step`, `checkpoint`, `order`, `order-result`, and `consume` right after the fact each records and before the next dispatch, record each execute order before sending it, and emit `close` when the run closes in every outcome. On `{intent: resume-direct-build}` it SHALL emit `resume` for the change and rebuild the run state from the returned `run` view and the files it names, asking the user nothing that the store already holds, and SHALL continue at the stored pending step. A failed store write (`STORE_WRITE_FAILED`, `STORE_CONFLICT`) or an unreachable store SHALL print one line naming the failure and SHALL continue with the whole run state in the conversation; the store then holds no checkpoint past the last one it accepted. `/sai-direct-build` SHALL keep its run state in the conversation and SHALL write nothing to `direct-build-run@1`. Claude Code and opencode SHALL follow the same contract.

#### Scenario: Resume after a compaction reads the store

- **WHEN** a parked Direct Build slice of the explore route resumes after its conversation was compacted
- **THEN** the card emits `resume`, rebuilds its counters, handles, and paths from the stored `run` view, and continues at the stored pending step without asking for them

#### Scenario: A store failure falls back to the conversation

- **WHEN** a store write of the Direct Build run state fails with `STORE_WRITE_FAILED`
- **THEN** the card prints one line naming the failure, keeps the run state in the conversation, and every later rewind past the first step is rejected with `missing: [run-state]`

#### Scenario: /sai-direct-build writes no run state

- **WHEN** `/sai-direct-build` runs the Direct Build card
- **THEN** the run state stays in the conversation and nothing is written to `direct-build-run@1`

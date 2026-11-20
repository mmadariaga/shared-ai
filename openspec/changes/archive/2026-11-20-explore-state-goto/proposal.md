> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

A Direct Build slice parked only to correct its `Backlog origin` became a dead end: `route-choice` returned `RESUMPTION_REQUIRED`, resuming needed run state that never existed, and the only exit was resetting `explore-slice@1`, which also cleared completed slices and the publication answer. Each correction or shortcut in `/sai-explore` needed its own special intent (such as `issue-shortcut`), so any unforeseen case ended without an exit.

The change makes the explore stage machines guard invariants (preconditions) instead of paths: one precondition-checked `goto` moves backward freely and forward up to the route selector, a worked issue seeds its agreed sections so only open or deviating sections are discussed, and a running or parked slice can be amended and moved back in the same conversation without resetting the store.

## What Changes

- `explore-idea@1` (`sai-state/machines/explore-idea.js`) gains a `goto` intent with a target stage and a required reason (`user-request` or `correction`). Per-stage preconditions are declared as data (`PRECONDITIONS`): a forward move needs every earlier section `agreed` and stops at `crystallize`; a failed check answers `rejected: "MISSING_PRECONDITIONS"` with `missing` and `resume_at` and changes nothing; a backward move is always accepted. Targets past the route selector answer `GOTO_PAST_CEILING`; other rejections are `GOTO_UNKNOWN_TARGET`, `GOTO_ALREADY_AT_TARGET`, and `GOTO_REASON_INVALID`.
- `explore-idea@1` stores, per section (`explore-change`, `review-edge-cases`, `implementation-details`), a state `agreed` or `open` and a source `issue` or `conversation`, recorded by a `{"sections": {...}}` event (identifier lists only; `SECTIONS_INVALID` on a malformed event). `next-step` agrees the section it closes and skips every later stage whose section is still `agreed` (except when leaving the POC lane); recording a changed list reopens its section, and a changed `explore-change` list reopens every later section while keeping its content. The `issue-shortcut` intent is removed and is now an unknown intent; `poc-lane` and `poc-lane-late` keep their behavior.
- `explore-slice@1` (`sai-state/machines/explore-slice.js`) gains a `goto` intent: target `pending` discards a slice's cursor (releasing a running slice) and closes the route gate; a step target rewinds a running or parked slice to an earlier step of its own route, where a Direct Build slice reaches only its first step (`GOTO_REWIND_UNSUPPORTED` otherwise) and a Plan slice any earlier step. A completed slice is rejected with `SLICE_COMPLETED` unless the user explicitly asks to reopen it (`reopen=true`, reason `user-request`, target `pending`), tracked by a `doneEpoch` counter so the stored `done` union does not restore it.
- Both machines record every accepted move as `{target, reason, received_at}` in a `moves` list exposed as `run.moves`; `bin/sai-state.js` stamps `received_at` on `goto` events and adds `missing` and `resume_at` to the observability fields.
- A re-registration (`recordedList`) keeps the completion and parked cursor of every slice whose stored block hash is unchanged (`unchanged`, computed by the CLI), and keeps the publication answer when the set of change names is unchanged.
- Single-slice amendment accepts a running slice. `ready-to-propose.js compare` (and the exported `compareBlocks`) classifies an amendment as `amend_kind: metadata` (only `Backlog origin` or `Explore origin` changed) or `content`; the CLI returns `amend_kind`. A `metadata` amendment keeps the route authorization and cursor; a `content` amendment returns the slice to pending without a cursor and closes the route gate. The `SLICE_RUNNING` rejection is removed.
- An accepted backward `goto` of `explore-idea@1` from `crystallize` after blocks were registered lists every stored change name in a session-file `staleBlocks` list; while it is non-empty, the route intents of `explore-slice@1` answer `rejected: "BLOCKS_STALE"`. An accepted amendment removes its own name and a block re-registration empties the list.
- `ready-to-propose.js convert` accepts an issue of any `Maturity` and additionally returns `sections` (`present`, `explicitly-empty`, or `absent` per stage section), `open_questions` (each with the section it `affects`), `seed` (the `explore-idea@1` sections event, identifiers only), and `declared_clean_note`.
- Explore cards follow the machines: `steps/issue-intake.md` replaces the shortcut question with per-section seeding, a drift check over every agreed section, and a `goto` to `crystallize` that resumes at the first open section; `steps/common.md` states the agreed-source rule and `goto`; `steps/route-selector.md` offers `Back to pending` and `Restart from the first step` on a pending Direct Build execution and describes running-slice amendment and slice correction; `direct-build-coordinator.md` Resume names that exit and initializes fresh run state after a rewind to the first step; `instructions.md`, `steps/slice.md`, `steps/crystallization-language-gates.md`, `sai/policies/stage-machine.md` (new § Explore movement), and `docs/commands/sai-explore.md` are aligned.
- During the functional review, one Medium finding (M1, the per-slice stale-block lock) was fixed in round 1; round 2 was clean.

Scope drift (not an implementation error): Plan slice rewind to any earlier step of its own route. The selected diff evidences this behavior, but the supplied intent statement did not name it.

Scope drift (not an implementation error): `ready-to-propose.js convert` reports `declared_clean_note`, the line the block carries after a `declared-clean` drift check. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `explore-stage-machine`: `goto` with data-declared preconditions, per-section state and source, the moves record, and removal of `issue-shortcut`.
- `explore-slice-machine`: slice `goto`, re-registration that keeps unchanged slices, and the stale-block route lock.
- `explore-issue-intake`: per-section seeding at any maturity, drift check over agreed sections, and resumption at the first open section through `goto`; the shortcut question is removed.
- `single-slice-amendment`: running slices are amendable and `amend_kind` decides whether the route authorization stays.
- `ready-to-propose-detection`: `convert` section reading at any maturity and the `compare` sub-command.
- `explore-pipeline-selector`: the pending Direct Build execution offers `Back to pending` and `Restart from the first step`.
- `explore-pipeline-supervision`: a restart from the first step initializes the Direct Build step-attempt counters at zero, as a new slice does.
- `explore-pre-crystallization-stages`, `explore-direct-input`, `explore-edge-case-gate`, `explore-crystallization-language-gate`: the issue shortcut is replaced by issue-seeded agreed sections reached through `goto`.

## Impact

Modified files:

- `bin/sai-state.js`
- `sai-state/machines/explore-idea.js`
- `sai-state/machines/explore-slice.js`
- `sai/tools/ready-to-propose.js`
- `sai/policies/stage-machine.md`
- `sai/commands/explore/instructions.md`
- `sai/commands/explore/direct-build-coordinator.md`
- `sai/commands/explore/steps/common.md`
- `sai/commands/explore/steps/crystallization-language-gates.md`
- `sai/commands/explore/steps/issue-intake.md`
- `sai/commands/explore/steps/route-selector.md`
- `sai/commands/explore/steps/slice.md`
- `docs/commands/sai-explore.md`
- `test/explore-contract-preservation.test.js`
- `test/explore-idea-intent-gate.test.js`
- `test/explore-question-tools.test.js`
- `test/explore-slice-machine.test.js`
- `test/ready-to-propose-issue-conversion.test.js`
- `test/sai-state-ready-to-propose-emit.test.js`

Known limitations: a rewind inside a Direct Build route reaches only pending or the route's first step; rewinding to a later step needs stored Direct Build run state, which this change does not add.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

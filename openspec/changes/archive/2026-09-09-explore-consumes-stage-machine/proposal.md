> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: high (S1=2 capabilities, S2=5 requirements, S3=false, S4=true [new sidecar runtime dependency], S5=4 affected paths; all other signals point to medium, but the new runtime dependency elevates to high)

## Why

The stage progression machinery existed twice — once as prose rules in `sai/commands/explore/steps/common.md` and `sai/commands/explore/instructions.md` (describing *what* the stages do), and once as code in `sai-state/machines/explore-stage.js` (implementing the *how*). Keeping both in step was manual work, and they had already drifted: commit `850678f6` corrected the machine's grant of an idea-list auto-advance that prose rules forbade. The sai-state sidecar was made installable in two prior commits to equip it for consumption as a service, but without a consumer those were infrastructure-only. This change makes explore consume that service, turning the machine into the single source of truth for stage transitions, pointer routing, and stage-advancement logic, while reducing prose to the judgment rules that the machine cannot decide: intent recognition, dominant-intent classification, and list-agreement semantics.

## What Changes

- **Explore stage progression owns the stage machine.** When a stage event occurs (a user intent that advances the progression or a recorded list at an agreement gate), explore spawns the sai-state sidecar lazily on first use, invokes it via its loopback routes (`POST /emit`, `POST /restore`, `POST /close`), and consumes the returned `state.stage` and `next.follow` pointer. The machine transitions the stage deterministically; prose no longer derives or re-derives the transition table.
- **Transition rules removed from prose.** The detailed descriptions of stage-to-stage transitions, empty-set determinism, and pointer semantics are withdrawn from common.md and instructions.md; references to the machine and its returned state replace them. No prose rule is re-stated in conditions or fallbacks.
- **Degraded path is deliberately dumb.** When the sidecar is unreachable (network failure, respawn timeout, restore version mismatch), explore holds the current stage without re-deriving rules and asks the user to advance explicitly via bare `next-step`. A fallback that re-implemented the transition table would preserve the duplication; degradation is preferable to a second authoritative copy.
- **Material change spawns a fresh sidecar session.** When the explored idea materially changes into a new stable idea, the previous session closes and a fresh one spawns, starting at `explore-change`. Snapshots are carried in conversation and passed to `/restore` after respawn, with backward-compatible field normalization for old-shape snapshots.
- **Lazy spawn on first stage event.** The sidecar is not spawned at session start; it is spawned when the first turn carries a stage event. Sessions that remain in discovery (no stage events) incur no sidecar overhead.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `explore-pre-crystallization-stages` — Explore now obtains its stage transitions and step pointer from the sai-state machine consumed through loopback routes, treating it as a black-box service. Stage progression no longer derives its own transition table in prose; new and MODIFIED requirements describe sidecar invocation, lazy spawn, degraded-path fallback, material-change session reset, and the consumption of returned state and pointer.
- `explore-stage-machine` — The existing machine spec is clarified to underscore that explore consumes its transition function as a stateless service and retains panel ownership, closure state, and intent classification on the caller side.

## Impact

**Modified files:**
- `sai/commands/explore/instructions.md` — Added sidecar session lifecycle contract (spawn, emit, restore, close), lazy spawn trigger, degraded-path fallback, and material-change session boundary; removed duplicated transition rules.
- `sai/commands/explore/steps/common.md` — Removed stage-destination wording and empty-set transition logic; replaced with references to the machine's returned state and next pointer; retained intent recognition, list-agreement semantics, and closure-state rules.

**Test coverage:**
- `test/explore-stage-machine-consumption.test.js` — New coverage for sidecar invocation surface, lazy spawn trigger, degraded-path behavior, and the single-source guard (transition rules not restated in prose).
- `test/explore-contract-preservation.test.js` — Registered allowed prose-line differences between pre-split and split versions for the four altered pre-split contract lines, with no new content added to the corpus.

**No file writes by explore.** Explore creates, modifies, and deletes no file. The sidecar writes only its own session state under `$TMPDIR`, which is outside explore's read-only guarantee.

**Verified:** Full test suite, serial: 1449 tests, 1449 pass, 0 fail.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill.

> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

**Complexity**: medium (S1=1, S2=2, S3=false, S4=false, S5=3)

## Why

Two active specs describe the same stage-progression incompatibly: `openspec/specs/explore-pre-crystallization-stages/spec.md:25` is authoritative for behavior and grants advancement only on explicit user request, with sole exceptions being content-based empty-set rules at `review-edge-cases` and `implementation-details` stages (firing when those stages' own agreed lists are empty). `openspec/specs/explore-stage-machine/spec.md:8` instead grants a "deterministic empty-list auto-advance" keyed on the idea list, with no stage restriction.

The implementation follows the second spec faithfully: `transition({stage:'explore-change', ideaList:[]}, undefined)` advanced the stage — and `initialState` is exactly that shape. Any consumer wiring this machine would have advanced a session's first stage with no user request, contradicting the authoritative spec.

## What Changes

- `sai-state/machines/explore-stage.js`: `cloneState` now distinguishes recorded (empty array) from unrecorded (null) lists; `transition` applies content-based empty-set auto-advance only at `review-edge-cases` and `implementation-details` stages when their own recorded lists are empty, requiring explicit intent elsewhere.
- `openspec/specs/explore-stage-machine/spec.md`: "Deterministic stage transitions" requirement corrected to state the content-based per-stage empty-set rule instead of idea-list auto-advance; "Snapshot carriage and restore" clarified to document that absent fields are treated as unrecorded.
- `test/sai-state.test.js`: "empty auto-advance" test rewritten to verify E1 through E5 edge cases and confirm the corrected determinism.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `explore-stage-machine`: Transition rule corrected to implement the authoritative stage-progression contract.

## Impact

- `sai-state/machines/explore-stage.js`
- `test/sai-state.test.js`
- `openspec/specs/explore-stage-machine/spec.md`

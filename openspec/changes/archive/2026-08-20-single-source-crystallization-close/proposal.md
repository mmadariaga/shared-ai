**Complexity**: medium (3 modified capabilities, 8 affected paths, no API breaking change)

## Why

The crystallization-turn close is duplicated across the single-change, sliced, and inline-refusal branches, while item 10 separately describes the `Manual` branch; this leaves the recommendation's emission count and position ambiguous (`sai/commands/explore/instructions.md:154-167` and `:261-266`). This slice establishes one behavior-preserving definition: the existing keep-window-open recommendation remains before the selector, and item 10 explicitly refers to that already-emitted recommendation instead of implying a second one.

## What Changes

- Define the crystallization-turn close once in `sai/commands/explore/instructions.md` and make items 5, 6, and 7 reference it.
- Clarify the keep-window-open recommendation as a single pre-selector emission naming `review-loop` exactly once; `Manual` and unmapped answers refer to that close without re-emitting it, and no pipeline-token path or `--fast-track` rule changes.
- Keep the existing `Auto` terminal behavior unchanged: this slice does not emit a next-step handoff or dispatch a later implementation phase.
- Align the owning delta specifications for the block, selector, and pre-crystallization closure.
- Add the phase-navigation disqualifier to the pre-crystallization genuine-question branch.
- Keep the change artifact-only: no source code, wrappers, policies, tests, or runtime configuration are modified by this spec change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `explore-crystallization-block`: make the shared close contract authoritative for single-change and sliced crystallization, including its inline-refusal consumer.
- `explore-pipeline-selector`: reconcile selector placement and the `Manual`/unmapped-answer branch with the shared close contract.
- `explore-pre-crystallization-closure`: exclude phase-navigation questions from the genuine unresolved-question branch.

## Impact

**Canonical target surfaces**:

- `sai/commands/explore/instructions.md` — canonical instruction source for the shared crystallization-turn close.
- `openspec/specs/explore-crystallization-block/spec.md` — close behavior and block-owned delta.
- `openspec/specs/explore-pipeline-selector/spec.md` — selector and Manual-branch delta.
- `openspec/specs/explore-pre-crystallization-closure/spec.md` — phase-navigation question delta.

**Change-local artifacts**:

- `openspec/changes/single-source-crystallization-close/proposal.md`
- `openspec/changes/single-source-crystallization-close/specs/explore-crystallization-block/spec.md`
- `openspec/changes/single-source-crystallization-close/specs/explore-pipeline-selector/spec.md`
- `openspec/changes/single-source-crystallization-close/specs/explore-pre-crystallization-closure/spec.md`

- No new dependency, API, harness binding, wrapper, or configuration change.

## Proposal Research Documentation

**Local files**: `sai/commands/explore/instructions.md`, `sai/commands/explore/body.md`, `sai/commands/spec/instructions.md`, `sai/policies/remember.md`, `GLOSSARY.md`, `openspec/specs/explore-crystallization-block/spec.md`, `openspec/specs/explore-pipeline-selector/spec.md`, `openspec/specs/explore-crystallization-language-gate/spec.md`, `openspec/specs/explore-overview-language-gate/spec.md`, `openspec/specs/explore-pre-crystallization-closure/spec.md`, `openspec/specs/explore-pre-crystallization-stages/spec.md`, `openspec/specs/explore-closure-state/spec.md`, `openspec/specs/explore-crystallization-on-demand/spec.md`, `openspec/specs/explore-vertical-slicing/spec.md`, `openspec/specs/review-loop-navigation/spec.md`, `test/explore-pipeline-selector.test.js`, `test/change-overview-contract.test.js`, `test/explore-pre-crystallization-stages.test.js`, `docs/adr/0146a-crystallization-close-selector-replaces-the-pipeline-token.md`, `docs/adr/0058-gate-ux-tweaks-as-deltas-against-existing-capabilities.md`, `docs/ddr/0053-post-crystallization-review-once-per-turn.md`, `openspec/changes/archive/2026-08-18-crystallization-close-selector/proposal.md`, `openspec/changes/archive/2026-07-22-explore-review-loop-keyword-trigger/proposal.md`, `openspec/changes/archive/2026-08-14-extract-review-engine/proposal.md`, `openspec/changes/archive/2026-08-12-single-source-sai-protocol/proposal.md`, `openspec/changes/archive/2026-08-18-single-source-adr-ddr-criteria/proposal.md`

**External URLs**: None.

## Additional Notes

- The slice-0 close is: final handoff block(s), one keep-window recommendation using the existing language rules and naming `review-loop` exactly once, then exactly one `Auto`/`Manual` selector. `Manual` and unmapped answers do not re-emit that recommendation. The next-step instruction remains in its current pre-selector position; relocating it after a Manual answer belongs to a later slice.
- The selector remains the sole delegated-pipeline entry. Successful Auto completion does not emit a next-step line or dispatch a later implementation phase in this change. Failed or cancelled Auto attempts remain retryable under the existing state rules; phase-specific user guidance is deferred to a later slice.
- No new state key is introduced; `last_crystallization_set`, `completed_changes`, and `specs_converged_changes` remain the existing routing state. The block payload boundary at `---` and the worker's transported payload are unchanged; `/sai-1-spec`, `/sai-2-design`, and `review-loop` remain verbatim where their separate literal rules require them.
- The request selects `Español` as the overview-language value. This spec phase does not generate `change-overview.md` and does not alter overview-language persistence or forwarding.

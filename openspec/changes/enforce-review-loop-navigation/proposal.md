**Complexity**: medium

## Why

The post-crystallization review loop currently conflicts about whether a review emits only its findings payload or also returns the user to navigation, and it omits `Review change-overview` from the re-show rule. Making navigation explicit after every review transaction prevents the loop from stopping without an intentional user exit and keeps all review outcomes consistent.

## What Changes

- Make every post-crystallization review transaction return to the current change's navigation state before any loop advancement or closure can occur.
- Define the findings block as the sole review payload while treating the mandatory picker as control navigation, not additional review output.
- Require the four-option picker (`Review sai-1's artifacts`, `Review sai-2's artifacts`, `Review change-overview`, and `Skip`) after findings, clean reviews, missing-artifact reports, blocked reviews, and availability/integrity reports.
- Make `Skip` the only operation that advances to the next tracked change or terminates the loop.
- Restrict silent closure to termination caused by the final `Skip`, while preserving the read-only loop, existing terminal branches, language gating, and evidence-based progress marking.
- Keep the behavior equivalent across Claude Code and opencode surfaces.

## Capabilities

### New Capabilities

<!-- None. This change tightens an existing capability. -->

### Modified Capabilities

- `explore-post-crystallization-review-loop`: require an explicit `awaiting_navigation → reviewing → awaiting_navigation` transaction cycle, complete four-option navigation coverage, Skip-only advancement/closure, and corrected findings/closure wording.
- `explore-closure-verification`: update closure regression coverage so ordinary review completion cannot silently close the loop before the final Skip and both harnesses assert equivalent navigation behavior.
- `explore-idea-list`: preserve review-item in-progress and Skip-resolution behavior while covering review transactions that do not produce findings.

## Impact

- `sai/instructions/explore.md` review-loop contract and navigation wording.
- `openspec/specs/explore-post-crystallization-review-loop/spec.md` and `openspec/specs/explore-closure-verification/spec.md` contract scenarios and closure verification coverage.
- Review-loop interaction state and its render-only Idea Progress List transitions.
- No new dependency, API, artifact write, or repository discovery behavior.

## Proposal Research Documentation

**Local files**: `sai/instructions/explore.md`; `openspec/specs/explore-post-crystallization-review-loop/spec.md`; `openspec/specs/explore-closure-verification/spec.md`; `openspec/specs/explore-idea-list/spec.md`; `openspec/specs/explore-review-evidence-marking/spec.md`; `openspec/specs/explore-review-language-gate/spec.md`; `openspec/specs/explore-crystallization-block/spec.md`; `openspec/specs/explore-pipeline-token/spec.md`; `openspec/specs/change-overview-synchronization/spec.md`; `GLOSSARY.md`; `sai/policies/glossary-format.md`; `sai/policies/remember.md`.

**External URLs**: None.

## Additional Notes

- A review transaction produces evidence; it does not grant consent to leave the current change.
- The findings block remains the complete handoff payload. The picker is a control surface shown after that payload and is not a second review payload.
- Missing directories or artifacts, missing normative specs, non-current or unavailable overviews, clean reviews, and reviews with findings all remain read-only and navigable.
- The global no and empty tracked-set terminal branches remain before iteration begins; `review-loop` remains an explicit user-triggered entry path.

# ADR 0053: Post-crystallization review loop fires once per turn, after the final `Ready to Propose` block

## Status

Accepted

## Context

Item 6 (sliced feature crystallization) emits multiple `Ready to Propose` blocks — one per slice. A naive placement of the post-crystallization review loop would offer it after every block, repeating an identical, change-set-agnostic review loop once per slice. The loop iterates all non-archived changes regardless of which slice was just emitted, so per-block repetition is redundant.

## Decision

Offer the post-crystallization review section a single time, after the last block of the crystallization turn (the only block in single-change mode; the final slice block in sliced mode). The loop content depends only on the non-archived change set, not on the just-crystallized change, so one offer per turn conveys the full capability without repetition. This also matches the spec's "a single global Yes/No question" phrasing and the "offered unconditionally" requirement.

## Alternatives Considered

- **Per-block** — offer the section after each `Ready to Propose` block. Rejected: redundant in sliced mode because the loop iterates all non-archived changes regardless of slice.
- **Once per crystallization turn** — chosen. Single offer conveys full capability without repetition.

## Consequences

- Sliced mode does not spam the user with identical review loops.
- The trigger sentence in `explore.md` must explicitly reference "the final `Ready to Propose` block of the crystallization turn" to avoid misreading by future editors.
- Changing the cadence later requires re-authoring the trigger sentence.

## Related

- `openspec/changes/explore-post-crystallization-review-loop/design.md` — Decision D2
- `openspec/changes/explore-post-crystallization-review-loop/specs/explore-post-crystallization-review-loop/spec.md` — "sliced crystallization offers the section once"

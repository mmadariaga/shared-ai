# ADR 0058: The explore/feedback gate UX tweaks are expressed as deltas against the existing capabilities, not a new combined capability

## Status

Accepted

## Context

The `sai-gate-ux-tweaks` change edits three regions of `sai/instructions/explore.md` (items 5/6 crystallization close and item 9 review loop) plus `sai/instructions/artifact-feedback-gate.md`. The exploratory brief grouped the explore.md edits under one conceptual capability, "explore-review-gate." But those behaviors already have owning capability specs: the items-5/6 block close belongs to `explore-crystallization-block`, the item-9 review reframing belongs to `explore-post-crystallization-review-loop`, and the gate fix belongs to `artifact-feedback-gate`. OpenSpec convention expresses a behavior change as a delta against the capability that already owns the behavior.

## Decision

Map each edit onto the existing capability that owns it and ship three targeted spec deltas — `explore-crystallization-block` (ADDED: keep-window-open close), `explore-post-crystallization-review-loop` (REMOVED auto-fired picker + ADDED user-triggered plain-text invitation), and `artifact-feedback-gate` (ADDED clean prompt-and-wait) — rather than creating a single new `explore-review-gate` capability spanning items 5/6 and item 9.

## Alternatives Considered

- **Create a single new `explore-review-gate` capability** spanning items 5/6 and item 9 — rejected: capability boundaries are structural and hard to unwind; a new overlapping capability would orphan the three existing specs that already own these behaviors, and would be costly to reverse.
- **Map each edit onto the existing owning capability** — chosen: matches the OpenSpec "delta against the owning capability" convention and keeps the three existing specs authoritative.

## Consequences

- Three separate spec deltas instead of one, each attached to the capability a reviewer already associates with the behavior; no existing spec is orphaned.
- The conceptual "explore-review-gate" grouping from the brief has no on-disk home — a future reader must map the brief's grouping onto the three capabilities via this ADR and the proposal's "Capability naming" note.
- Reversing to a single combined capability later would require re-splitting or re-merging the three specs — the structural cost this decision avoids paying now.

## Related

- `openspec/changes/sai-gate-ux-tweaks/design.md` — Decision D1
- `openspec/changes/sai-gate-ux-tweaks/proposal.md` — "Capability naming" note under Additional Notes
- ADR 0053 — post-crystallization review loop fires once per turn (the review loop this change reframes)

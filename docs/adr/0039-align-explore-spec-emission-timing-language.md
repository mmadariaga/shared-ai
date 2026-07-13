# ADR 0039: Align baseline `explore-*` spec emission-timing language via MODIFIED deltas

## Status

Accepted

## Context

Design-phase research for `explore-crystallization-on-demand` found three baseline `explore-*` specs whose wording encodes the *old* state-triggered emission timing:

- `explore-context-isolation` §21–22 literally says *"WHEN idea becomes clear … THEN presents a structured summary block"* — a direct contradiction with on-demand emission.
- `explore-vertical-slicing` describes composition ("emits exactly one block" / "a 2-block set") whose "emits" reads as immediate/state-triggered.
- `explore-refactor-first-slicing` describes slice-0 composition with similar immediate-timing wording.

Shipping the on-demand change while leaving the old wording in place would leave active specs disagreeing about what a clear idea produces.

## Decision

Add a `## MODIFIED Requirements` delta to `explore-context-isolation` rewording only the trigger clause of `explore-no-inline-proposal` (preserving its no-inline-proposal / isolation intent verbatim in spirit). Since a delta already reopens the spec surface, fold light "on request" timing riders into `explore-vertical-slicing` and `explore-refactor-first-slicing` so the whole family speaks one language. The same single `explore.md` edit satisfies all three; `openspec validate --strict` passes.

## Alternatives Considered

- **Reconcile by design-note only, no deltas.** Rejected: its rationale ("the specs describe what/how-many, not timing") is *false* for `explore-context-isolation`, whose `THEN presents block` literally encodes timing. Shipping it leaves two active specs disagreeing.
- **Reconcile now, track a follow-up change for the wording.** Rejected: knowingly ships the live contradiction and defers a one-scenario reword; the follow-up costs more to open/track/archive than the fix.
- **Align via MODIFIED deltas now** (chosen): eliminates the contradiction in the current change, minimal additional work, one edit target satisfies all three deltas.

## Consequences

- Three baseline specs now carry MODIFIED deltas in this change.
- The review surface is larger than the original proposal scoped (zero modified capabilities → three modified capabilities).
- The spec family speaks one consistent language about *when* a block emits.
- No runtime code is affected; the deltas are wording-only.

## Related

- `openspec/changes/explore-crystallization-on-demand/design.md` — Decision D4
- `openspec/changes/explore-crystallization-on-demand/specs/explore-context-isolation/spec.md` — MODIFIED delta
- `openspec/changes/explore-crystallization-on-demand/specs/explore-vertical-slicing/spec.md` — MODIFIED delta
- `openspec/changes/explore-crystallization-on-demand/specs/explore-refactor-first-slicing/spec.md` — MODIFIED delta
- `sai/instructions/explore.md` — sole edit target

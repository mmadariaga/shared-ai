# ADR 0159c: Path-specific next-step lives only on Manual/unmapped after the selector

<!-- adr-index: amends 0158a; refs 0146a -->

## Status

Accepted

## Context

ADR 0158a established one authoritative crystallization-turn close: keep-window recommendation naming `review-loop`, then the Auto/Manual selector. That close still emitted path-specific `/sai-1-spec` next-step guidance before the selector (items 5, 6, and 7). A user who chose Manual therefore never received an actionable handoff after declining Auto. The deferred follow-up from `single-source-crystallization-close` was to relocate that next-step to the post-selector Manual/unmapped branch.

## Decision

Rewrite the shared crystallization-turn close so the crystallization turn emits only (1) the keep-window recommendation naming `review-loop` and (2) the Auto/Manual selector, with the selector as the final emission of the turn. Remove path-specific next-step emission from the pre-selector path for items 5, 6, and 7. Emit the existing path-specific next-step exactly once on the Manual/unmapped response turn (item 10), referring to the already-emitted recommendation without re-emitting recommendation or selector. Later Manual/unmapped answers on uncapped selector re-invocation each receive their own one-time path-specific handoff.

## Alternatives Considered

- **Keep next-step before the selector and add a second copy after Manual** — rejected: duplicates guidance and contradicts the one-time close contract.
- **Emit next-step before the selector only for Manual-likely flows** — rejected: the selector is the decision point; pre-selector emission cannot know the branch.

## Consequences

- Actionable Manual handoff follows the choice that declined Auto.
- Shared close stays recommendation-then-selector only; path contracts (single-change, sliced first-block, inline-refusal) keep their meanings with placement moved only.
- Successful Auto silence and conversation-only selector state remain unchanged by this relocation.

## Provenance

User — `openspec/changes/manual-branch-next-step-after-selector/design.md`, Decision 1.

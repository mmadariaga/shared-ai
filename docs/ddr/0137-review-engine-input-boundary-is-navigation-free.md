# DDR 0137: The Review Engine input boundary is navigation-free

## Status

Accepted

## Context

The manual post-crystallization review loop currently combines persisted-artifact review work with chat-scoped navigation state. A second caller cannot reuse the review transaction safely if picker state, tracked-set state, cached reads, or prior findings can enter the transaction boundary.

## Decision

Every Review Engine transaction accepts exactly an authoritative change name and an artifact-set designator. It resolves and rereads the requested persisted artifacts from those inputs alone. Picker state, the Tracked Crystallized Set, prior findings, cached artifact state, and all other Review Loop Navigation state are outside the engine boundary.

## Alternatives Considered

- **Pass navigation context into the engine** — rejected because it recreates the coupling and makes chat-scoped or cached state valid review evidence.
- **Let each caller resolve and reread artifacts** — rejected because duplicated transaction logic can drift and produce findings from inconsistent evidence.

## Consequences

Any caller can invoke the same review transaction from persisted evidence without inheriting manual-loop behavior. Review Loop Navigation remains responsible for picker presentation, iteration, re-entry, handoff, and close behavior. This is a DDR because every review transaction must derive from the named change, requested artifact set, and fresh persisted evidence only.

## Provenance

User — the approved design declares the two-input boundary and records it as a domain invariant.

# DDR 0127: Archived specs preserve their pre-archival bytes

## Status

Accepted

## Context

The canonical `openspec/specs/_archived/` landing zone is a terminal historical record. The twenty-one candidate specs contain stale wording by design, and later readers need the exact pre-archival content rather than a normalized or corrected reconstruction.

## Decision

Apply one source-to-destination rename per candidate, preserving each `spec.md` byte-for-byte. Capture source hashes before the move, reject destination collisions, and verify destination hashes after the move. Do not normalize formatting, repair historical paths, rewrite requirements, or modify any pre-existing content under `openspec/specs/_archived/`.

The domain invariant is that an archived record preserves its pre-archival content. Historical fidelity takes precedence over correcting wording that belongs to a later active change.

## Alternatives Considered

- **Copy then delete** — rejected: it obscures rename identity and increases the chance of a partial archival operation.
- **Normalize or repair the archived specs during the move** — rejected: it corrupts the historical record and prevents byte-level provenance checks.
- **One byte-identical rename per candidate** (chosen) — preserves provenance while keeping the archival operation atomic at the change level.

## Consequences

The `/sai-3-implement` plan must validate source hashes, destination absence, path exclusivity, and the unchanged pre-existing archive inventory. Stale wording remains visible in historical specs, while any correction belongs in a separate active canonical policy or capability spec.

## Provenance

Codebase-forced — the canonical archive contract requires historical fidelity and treats archived records as terminal.

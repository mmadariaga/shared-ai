# DDR 0108: Numbering stays independent per family; a record keeps its number when it moves between families

## Status

Accepted

## Context

Two decision-record families now exist, and the same number can legitimately appear in both (0105 already does). A record that moves between families — the reclassification path for a crossing `supersedes` (DDR 0107) — needs a defined identity rule. Renumbering on move would invalidate roughly 190 index annotations and about 30 `docs/adr/NNNN` path references inside `openspec/changes/archive/**`, which is immutable history.

## Decision

No record is renumbered by this change. The same number can exist in both families; the family prefix disambiguates. A record that moves between families keeps its number — record identity is the (family, number) pair and is stable across family moves.

## Alternatives Considered

- **Renumber on move** — rejected: clean numbers, but invalidates hundreds of annotations and immutable archive references.
- **A single shared number sequence** — rejected: cannot be enforced retroactively and would force renumbering of the existing 93 ADRs and 20 DDRs.

## Consequences

Renumbering would invalidate hundreds of annotations and immutable archive references — hard to reverse. The decision states a property that must hold of the records ("record identity is the (family, number) pair and is stable across family moves"), an invariant of the domain rather than a mechanism, which is why this record is a DDR.

## Provenance

User — the user explicitly stated in the preceding chat that a record keeps its number when it moves between families; the proposal's Additional Notes record it.

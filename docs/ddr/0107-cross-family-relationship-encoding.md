# DDR 0107: Cross-family relationships are family-prefixed and family-isolated; supersedes never crosses families

## Status

Accepted

## Context

The abstract surface (`decision-record-index-machinery`, ADR 0110a) already bound the family-boundary rules: `supersedes` is family-bound; `refs` / `pair-with` / `amends` / `reframes` / `reverses` may cross families; cross-family targets carry the `<family>:NNNN` encoding and `../<family>/NNNN-slug.md` links. This change instantiates those rules for the DDR family without re-deriving them — a pure additive per the abstract surface's contract.

## Decision

A relationship target in the same family is encoded as a bare number (`0002`); a target in the other family carries the explicit family prefix (`ddr:0014`, `adr:0069`) in the record's structured line (`<!-- adr-index: refs adr:0069 -->`) and in entry-line annotations (`— Refs adr:0069`). Cross-family correction-table rows for `amends | reframes | reverses` use `[NNNN](../<family>/NNNN-slug.md)` for the target cell and are written only to the source record's own family index. `supersedes` SHALL NOT cross families: a crossing supersedes is a classification error, resolved by moving a record (reclassification), never executed, surfaced in chat. The `adr-index:` HTML-comment key is retained for both families (declared debt).

## Alternatives Considered

- **Namespaced numbers** (`adr-0002` / `ddr-0002`) — rejected: would invalidate every pre-existing structured line and index annotation.
- **Family directories without a prefix convention** — rejected: a bare target must mean the same family for all pre-existing lines to stay valid.
- **Unified numbering across families** — rejected: would force renumbering of roughly 190 index annotations and immutable archive references.

## Consequences

The encoding appears in every record's structured line and every index annotation; changing it invalidates roughly 190 index annotations — hard to reverse. The rule states domain invariants ("supersedes SHALL NOT cross families", "a bare target means the same family", "a record's entry lives in exactly one index, its own family's") as properties that must hold of the records at all times, which is why this record is a DDR.

## Provenance

Codebase-forced — the abstract surface (`decision-record-index-machinery`) already defines the family-boundary rules; this change instantiates them for the DDR family without re-deriving them.

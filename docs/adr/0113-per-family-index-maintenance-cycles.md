# ADR 0113: Index maintenance runs one cycle per family that received records in the run

## Status

Accepted

## Context

The Step 3 index-maintenance hook maintained one index (`docs/adr/0000-INDEX.md`) with exactly one cycle over the session's ADRs. Once DDR is a first-class family with its own index (ADR 0112), a single combined cycle would have to decide which family's index receives each session record's entry, correction-table row, and supersede-move — coupling the two families' maintenance and breaking per-family cold-build semantics (a cold-built ADR index must never be re-cold-built while a DDR-creating run cold-builds the DDR index independently).

## Decision

After Step 3 writes record files, it enters one index-maintenance cycle per family that received records in the current run (`docs/adr/0000-INDEX.md` or `docs/ddr/0000-INDEX.md`), each cycle's branch chosen by that family's index-file presence (cold build absent / warm splice present). Each cycle covers only its own family's records and writes only its own family's index; when zero records were created in the run, the hook is a no-op for both families. Idempotency is per family: a cold-built ADR index is never re-cold-built, while a DDR-creating run cold-builds the DDR index independently.

## Alternatives Considered

- **A single combined cycle** — rejected: simpler, but couples the families' indexes and cannot cold-build one family while warm-splicing the other.
- **One cycle per record file** — rejected: breaks the session-scoped "exactly one cycle per family per run" contract.

## Consequences

Restructuring the maintenance hook after records accumulate changes how every future run mutates both indexes — hard to reverse. The per-family cycle rule follows from family-isolation reasoning; it is a mechanism choice about how the pipeline maintains indexes, not a domain invariant, which is why this record is an ADR.

## Provenance

Derived — the per-family cycle rule was derived from family-isolation reasoning (each family's index is maintained independently, so each gets its own cycle); the proposal records it, the user did not state it.

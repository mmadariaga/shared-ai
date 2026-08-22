# DDR 0135b: Review findings encoding and loop navigation are separate surfaces

## Status

Accepted

## Context

The correction handoff requires exactly one deterministic findings block and previously said that nothing else is emitted. Read literally, that prohibition conflicts with the review-loop invariant that re-presents the current change's picker after a non-closing transaction.

## Decision

The single-output prohibition governs alternative encodings of review findings only: no separate correction-request block, `change:` header, or acceptance step may duplicate or transform the findings. The subsequently re-presented picker is loop navigation, not review output, another findings encoding, or an acceptance surface.

## Alternatives Considered

- **Suppress picker re-entry after findings** — rejected because it violates the complementary re-entry invariant and strands the loop.
- **Treat the picker as part of the findings payload** — rejected because navigation would become an accidental correction-acceptance surface.

## Consequences

Each review still produces one deterministic handoff payload while every non-closing loop turn remains navigable. The boundary prevents findings from being filtered or confirmed by picker re-entry. This is a DDR because findings encoding and navigation must remain separate properties of every review-loop handoff.

## Provenance

User — the approved design separates findings encoding from loop navigation.

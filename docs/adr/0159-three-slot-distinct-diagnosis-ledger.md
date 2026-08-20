# ADR 0159: Recovery budget is a three-slot distinct-diagnosis ledger

## Status

Accepted

<!-- adr-index: amends 0150 -->

## Context

The prior class-gated three-attempt counter burned the pool on repeated impossible corrections (triggering incident: Step 2 verification asserted a wrapper inventory only Step 3 creates). A plain retry counter cannot stop duplicate diagnoses while still admitting genuinely different causes.

## Decision

Represent the shared budget as three mutually distinct coordinator diagnosis slots per active adapter segment. Derive `diagnosis_key` as the ordered tuple `(artifact path, concrete point, authorized correction boundary)` with the normalization rules in `bounded-worker-recovery`. Cause Locus sits beside the key and does not participate in identity. One new eligible in-scope key spends exactly one slot and receives at most one same-worker continuation. A duplicate key stops before dispatch and before exhaustion. Out-of-scope, unresolved, malformed, vetoed, and transport-loss cases spend zero.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Distinct-diagnosis ledger (chosen) | Stops duplicates; admits new causes | Requires careful key normalization |
| Keep class-gated retry counter | Minimal change | Burns pool on impossible corrections |
| Per-Step reset of the pool | Fresh budget per Step | Specs require segment-scoped accounting |
| Include Cause Locus or worker class in the key | Reflects reassessment | Mints fake new keys for the same cause |

## Consequences

- Segment ledger identity is exact tuple equality after path normalization.
- Duplicate diagnosis reports remaining slots rather than exhaustion.
- Amends the segment-scoped pool model of ADR 0150 from attempt-counter to distinct-diagnosis slots.

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D3
- ADR 0150 — Recovery pool is segment-scoped under composition

# DDR 0152: Cause Locus gates eligibility; unresolved is not out-of-scope

## Status

Accepted

## Context

Recovery eligibility must reflect whether a safe correction lies inside the active worker's authorized boundary. Class-only eligibility blocked legitimate in-scope blocking/unclassified faults and admitted out-of-scope validation failures. Guessing out-of-scope when uncertain hides missing diagnosis and skips human hand-back.

## Decision

When evidence locates the cause, assign `Cause Locus: in-scope` or `out-of-scope` relative to the active worker's authorized boundary. When evidence cannot locate the cause or prove either boundary, record an explicitly unresolved cause with no locus claim. Out-of-scope claims must name artifact and concrete point. Unresolved and out-of-scope both spend zero worker-recovery attempts; only unresolved forbids claiming the out-of-scope owner shortcut without evidence.

Locus is a domain invariant of the cause relative to authorization — an evidence-backed property, not a prose inference from worker `summary`.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Evidence-backed locus with unresolved (chosen) | Honest hand-back; safe zero-spend | Requires dual inspection channels |
| Guess out-of-scope when uncertain | Fast owner shortcut | Hides missing diagnosis |
| Class-only eligibility | Simple gate | Blocks in-scope blocking/unclassified; admits out-of-scope validation |

## Consequences

- Worker class is a diagnostic prior, never the eligibility gate.
- Unresolved causes hand back for human diagnosis without asserting locus.
- Applies to both verifying adapters (independent verification channel) and blind opted-in adapters (phase-static channel).

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D4
- DDR 0151 — Three mutually exclusive routing diagnoses
- ADR 0165 — Dual coordinator inspection channels

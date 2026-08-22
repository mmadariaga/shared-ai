# DDR 0134a: Automatic planning review has two distinct bounded counters

## Status

Accepted

## Context

A reviewer dispatch can fail, be cancelled, or violate the finding contract without completing a review pass. One shared counter would either charge failures as completed review evidence or leave total dispatch cost unbounded.

## Decision

The automatic planning-artifact review loop uses two distinctly named counters: a completed-pass count capped at 3 and a total-attempt count capped at 6. Valid finding sets increment both; failed, cancelled, or contract-violating dispatches increment only total attempts and are retried with fresh reviewers while the total-attempt cap permits. Convergence occurs at `High=0`; either cap can otherwise end the loop without failing the phase, with reviewer failures reported separately from outstanding `High` findings.

## Alternatives Considered

- **Use one shared counter** — rejected because it conflates dispatch reliability with completed review evidence.
- **Stop at the first invalid attempt** — rejected because a transient reviewer failure should not prevent bounded convergence.
- **Fail the phase when a cap is reached** — rejected because authored artifacts remain usable and the feedback gate remains available.

## Consequences

Automatic review cost is bounded at six dispatches and three completed passes. User-requested passes through the feedback gate are not subject to either automatic-loop cap.

## Provenance

User — `openspec/changes/spec-design-review-progress-step/design.md` Decision 3 records the invariant and all three ADR/DDR qualification criteria.

## Related

- `openspec/changes/spec-design-review-progress-step/specs/planning-artifact-review-loop/spec.md`
- `/sai-1-spec` and `/sai-2-design`

<!-- adr-index: refs 0133b -->

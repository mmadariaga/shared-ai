# DDR 0151: Three mutually exclusive routing diagnoses, separate from worker failure classes

## Status

Accepted

## Context

Non-clean closures need a routing category for recovery eligibility, but the closed worker-authored `failure_class` vocabulary already answers a different question (repair boundary prior). Collapsing routing labels into worker classes would break existing worker contracts and domain authority boundaries.

## Decision

Every non-clean closure gets exactly one routing diagnosis from the closed set:

1. `continuation/transport loss` — no continuation result at all
2. `coordinator rejection` — malformed result, or usable non-failed result independently disproven
3. `worker-authored failure` — accepted valid failed worker result (even when technical cause is unresolved)

Worker `failure_class` remains the closed six-value vocabulary and is a diagnostic prior only. Coordinator-authored `outer-envelope-violation` stays reserved for envelope boundaries. Routing diagnoses are domain invariants of closure classification and MUST NOT be added to worker payloads.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Separate routing diagnoses (chosen) | Preserves authority split; deterministic ledger identity | Two classification layers to teach |
| Extend worker `failure_class` with routing labels | One vocabulary | Collapses authorities; breaks worker contracts |
| Free-form diagnosis strings | Flexible prose | Non-deterministic ledger identity and harness drift |

## Consequences

- Coordinators always record exactly one routing diagnosis before eligibility.
- Workers never author routing diagnoses or Cause Locus.
- A valid failed result remains `worker-authored failure` even when the coordinator later locates its technical cause.

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D2
- `openspec/changes/diagnosis-driven-recovery-apply/specs/orchestration-core/spec.md`
- DDR 0152 — Cause Locus gates eligibility

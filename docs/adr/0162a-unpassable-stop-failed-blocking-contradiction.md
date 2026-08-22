# ADR 0162a: Unpassable RED/GREEN STOP maps to failed blocking-contradiction with evidence-backed veto

## Status

Accepted

## Context

Completed STOPs with only a STOP marker were not entering diagnosis reliably. Treating `blocking-contradiction` class alone as an automatic veto blocked false-veto in-scope corrections (E12/E13 false-veto scenarios).

## Decision

An unpassable RED or GREEN STOP returns `status: failed`, `failure_class: blocking-contradiction`, boolean `unrecoverable`, concrete non-raw evidence in `summary`, and `STOP reached? = yes` in the nine-field apply report. The worker sets `unrecoverable: true` only from worker-side evidence that continuation is unsafe. When the veto is false, the coordinator applies Cause Locus and diagnosis-key rules rather than treating the class as an automatic veto. `blocking-contradiction` + `unrecoverable: true` reports blocking contradiction as the primary stopping reason.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Failed STOP with evidence-backed veto (chosen) | First-class non-clean closure; false-veto recoverable | Workers must author evidence carefully |
| Keep STOP as completed with STOP marker only | Smaller worker-card change | STOPs skip diagnosis |
| Class alone vetoes recovery | Simple gate | Blocks false-veto in-scope corrections |

## Consequences

- Unpassable STOPs always enter the shared non-clean-closure diagnosis path.
- True conflicts still stop with human judgment outside the automatic pool.
- Nine-field apply report extension remains unchanged except STOP polarity.

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D7
- DDR 0151b — Three mutually exclusive routing diagnoses
- DDR 0152 — Cause Locus gates eligibility

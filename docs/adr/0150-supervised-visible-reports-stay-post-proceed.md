# ADR 0150: Supervised visible reports stay post-proceed (fetching-body order)

<!-- adr-index: refs 0147; refs ddr:0150 -->

## Status

Accepted

## Context

Explore item 10's only visible progress marks under Auto are existing reports (phase-transition, Supervised sai-1/sai-2 done, autonomy audits). A misread of placement prose could invert those marks to appear before gate auto-proceed, breaking established sequencing relative to next-action (including design overview generation after Continue).

This is change `supervised-artifact-gate-suppression`, Decision D5.

## Decision

Keep explore item 10's existing emission order under supervised mode: after the decision summary, the shared gate auto-executes `next-action` (no picker); phase-transition / Supervised sai-1 done / Supervised sai-2 done / convergence counterparts remain **after** that proceed, exactly where item 10 already places them. Do not reorder to reports-before-auto-proceed. Do not add new suppression-only conversation text.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Post-proceed report order (chosen) | Matches live item 10 behavior and approved delta placement scenario | Implementers must not "fix" placement by moving reports earlier |
| Reports-first then auto-proceed | Reports appear sooner | Reorders item 10's only visible progress marks; breaks overview generation sequencing |
| Leave order unspecified | Smaller design text | Implementers could invert observable marks |

## Consequences

- Placement prose under supervised mode must preserve fetching-body post-proceed order and must not require reports before auto-proceed.
- Structural suites pin post-proceed report-order cues where they already encode placement.
- No new conversation strings at suppression points beyond existing item 10 reports.

## Related

- `openspec/changes/supervised-artifact-gate-suppression/design.md` — Decision D5
- `openspec/changes/supervised-artifact-gate-suppression/specs/artifact-feedback-gate/spec.md` — scenario `supervised placement preserves fetching-body post-proceed report order`
- ADR 0147 — supervised auto-execute next-action

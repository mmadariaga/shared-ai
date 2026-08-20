# ADR 0148: Mode-qualify every user-facing gate surface; leave standalone fetch sites untouched

<!-- adr-index: refs ddr:0150; refs 0028; refs 0147 -->

## Status

Accepted

## Context

If only explore wording gained supervised behavior while main requirements stayed interactive-only, archive sync would leave contradictory SHALL statements. Touching standalone coordinators to pass `mode = interactive` explicitly would add noise without behavior change.

This is change `supervised-artifact-gate-suppression`, Decision D3.

## Decision

Every presentation, free-text, proceed, placement, and machine-feedback "then present gate" requirement is explicitly `mode`-qualified. Standalone `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md` are not edited. Worker coexistence prose is mode-qualified so a supervised worker-loop ending does not imply iteration-0 picker presentation; workers never receive `mode`.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Mode-qualify all surfaces; leave coordinators untouched (chosen) | Spec/main-delta coherence; zero standalone UX drift | Broader prose edit surface in the shared policy and workers |
| Change only explore wording | Smaller diff | Archive sync leaves contradictory interactive-only requirements |
| Pass `mode = interactive` explicitly on coordinators | Makes default visible | Noise; omission already defaults |

## Consequences

- Interactive labels, option order, and Recommended marker stay byte-stable for standalone paths.
- Worker coexistence becomes a documentation cross-reference, not a worker-evaluated branch.
- Planning-artifact-review-loop coexistence scenarios must stay mode-qualified after archive.

## Related

- `openspec/changes/supervised-artifact-gate-suppression/design.md` — Decision D3
- `openspec/changes/supervised-artifact-gate-suppression/specs/planning-artifact-review-loop/spec.md`
- DDR 0150 — mode at fetch site
- ADR 0147 — supervised auto-proceed

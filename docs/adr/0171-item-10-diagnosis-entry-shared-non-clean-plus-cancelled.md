# ADR 0171: Item-10 diagnosis entry is shared non-clean set plus Explore cancellation exception

<!-- adr-index: refs 0168; refs 0167; refs 0158; amends 0168 -->

## Status

Accepted

## Context

ADR 0168 delivered Explore Auto item-10 Diagnosis Round for supervised worker `failed` and (with ADR 0167) `cancelled`. Shared Bounded Recovery in `sai/orchestration/command-runner.md` already treats post-resolution non-clean as structurally valid `failed`, coordinator-disproved `completed`, or STOP-bearing `completed`. Item-10 entry prose still named only `failed` or `cancelled`, so unattended Auto could miss diagnosis on disproved or STOP-bearing completed closures even though the shared contract already names them.

## Decision

Item-10 diagnosis entry triggers SHALL be exactly:

1. The shared Bounded Recovery non-clean set after resolution: structurally valid `failed` (any closed worker failure class), `completed` disproved by coordinator verification, or `completed` carrying STOP.
2. Explore-only addition: post-resolution supervised phase-worker `cancelled` (ADR 0167).

Clean `completed` (not disproved, no STOP), `needs_input`, `progress`, `notice`, and every pre-resolution result never start diagnosis.

Explore instruction prose references `sai/orchestration/command-runner.md` Bounded Recovery for the shared non-clean definition and does not restate the shared three-slot ledger. Diagnosis still spends only `diagnosis_rounds` (ADR 0168); command-runner itself is not edited by this residual change.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Shared non-clean + cancelled exception (chosen) | Single source for post-resolution non-clean; keeps Explore cancellation exception named | Entry prose longer |
| Keep failed/cancelled only | Minimal edit | Misses disproved/STOP completed diagnosis opportunities already named by Bounded Recovery |
| Fold cancelled into generic recovery | One trigger vocabulary | Specs keep cancelled clean everywhere except named item 10 |

## Consequences

- Surgical edits to `sai/commands/explore/instructions.md` entry conditions and matching static tests in `test/explore-pipeline-selector.test.js`.
- No rewrite of the delivered diagnosis spine (counters, Review Engine, five-section feedback, same-worker bound, idea-list pending rules).
- Build coordinator and command-runner remain non-touch for this residual slice.

## Related

- `openspec/changes/diagnosis-driven-recovery-supervised-explore/design.md` — Decision D2
- ADR 0168 — diagnosis spine (Review Engine + same-worker `continue_after_recovery`)
- ADR 0167 — Explore Auto cancellation exception
- ADR 0158 — shared non-clean-closure diagnosis in the command runner

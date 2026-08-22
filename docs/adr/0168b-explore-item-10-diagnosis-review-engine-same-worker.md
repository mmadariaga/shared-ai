# ADR 0168b: Explore item-10 diagnosis uses Review Engine and same-worker continue_after_recovery

<!-- adr-index: refs 0140a; refs 0158b; refs 0167c -->

## Status

Accepted

## Context

Explore Auto item 10 currently stops immediately on supervised spec/design worker `failed` or `cancelled`, leaving the change retryable without diagnosis. Standalone planning coordinators already resume recovery with `continue_after_recovery` and the five-section diagnosis hand-back (`Reported`, `Evidence`, `Cause`, `Correction`, `Verification`). Explore already owns the sole in-session Review Engine for supervised rounds. Inventing a MachineFeedbackAdapter-shaped failure path, a reviewer subagent, Explore write authority, or a replacement-worker recovery would duplicate contracts and break Explore's read-only boundary.

## Decision

When a resolved supervised spec/design worker returns `failed` (any closed class) or, under ADR 0167a, `cancelled`, and the phase `diagnosis_rounds` counter is unused, Explore:

1. Resolves any active phase review item to render `pending` (once).
2. Increments `diagnosis_rounds.spec` or `diagnosis_rounds.design` once (conversation-only; independent of `review_rounds`).
3. Invokes `Review Engine(changeName, sai-1|sai-2)` read-only over current phase artifacts.
4. Forms ordered diagnosis feedback: `Reported`, `Evidence`, `Cause`, `Correction`, `Verification`.
5. If an actionable correction exists and the same worker can be resumed, re-dispatches exactly once via `continue_after_recovery` carrying that diagnosis.
6. Otherwise closes with existing phase guidance; change stays Auto-retryable.

A successful re-dispatch returns to the ordinary phase lifecycle. A later failed/cancelled result from that re-dispatch does not start a second diagnosis. Actionable diagnosis with undeliverable same-worker continuation selects shared `continuation/transport loss`, consumes the diagnosis round, and does not fall through to replacement-worker fallback. Explore never applies corrections directly.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Review Engine + same-worker `continue_after_recovery` (chosen) | Reuses existing channels; keeps Explore read-only | Item-10 prose grows |
| MachineFeedbackAdapter-shaped failure recovery | Familiar finding loop | Wrong channel; confuses review with recovery |
| Replacement worker on diagnosis failure | Higher resume chance | Violates same-worker recovery rule; loses journal continuity |

## Consequences

- `diagnosis_rounds` never appears in worker payloads, journals, artifacts, or `.openspec.yaml`.
- Manual item-9 review loop and ordinary three-round supervised budgets stay unchanged.
- Structural tests pin activation, five-section feedback, single same-worker re-dispatch, counter independence, no Explore writes, and no replacement.

## Related

- `openspec/changes/diagnosis-driven-recovery-supervised-explore/design.md` — Decision D2
- ADR 0140a — Supervised rounds invoke the Review Engine in-session
- ADR 0158b — Shared non-clean-closure diagnosis lives in the command runner
- ADR 0167c — Named Explore Auto cancellation exception in Bounded Recovery

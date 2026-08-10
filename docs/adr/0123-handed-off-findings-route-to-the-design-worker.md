# ADR 0123: Handed-off findings route to the design worker; the loop never applies, forwards, or regenerates

<!-- adr-index: refs 0047; refs ddr:0060 -->

## Status

Accepted

## Context

With the findings block as the loop's sole output (ADR 0122), the pipeline needed a defined route for the handed-off findings: which worker applies them, how proposal/spec findings are authorized, and whether the review transaction itself regenerates. The owning contract previously routed "accepted corrections" — a set that no longer exists — and the review loop's read-only constraint was stated alongside the removed acceptance step. Two candidate routes existed: a live spec-proposal-worker continuation for proposal/spec findings, and loop-triggered regeneration.

## Decision

Findings on `design.md`, `tasks.md`, or `interfaces.md` are applied by the design worker through a writable design-worker transaction (a re-invoked `/sai-2-design` or the supervised design phase's feedback channel). Findings on `proposal.md` or `specs/**` are applied by the design worker's consent-gated spec-amendment path only after explicit user consent. `/sai-1-spec` is not offered for review-loop findings because it creates a new change and cannot amend an existing one. Exactly one overview regeneration follows the design-worker edits only when the overview is already materialized (`overview.state` `current` or `stale`); before first materialization (`unmaterialized` or `failed`), handed-off corrections update only their source artifacts. The review loop itself never applies, forwards, or regenerates: it only prints the findings block and hands the payload to the user.

## Alternatives Considered

- **Spec-worker continuation for proposal/spec findings** — rejected: no spec-proposal worker is live at review time, and `/sai-1-spec` creates new changes rather than consuming existing ones.
- **The loop forwarding or applying corrections itself** — rejected: it violates the read-only constraint and would make the loop a regeneration-integrated surface, contradicting the `change-overview-synchronization` capability's closed transaction list.
- **Loop-triggered regeneration** — rejected: it would break the exactly-once regeneration invariant and let two transactions claim the same regeneration.

## Consequences

- Ownership follows the source artifact's writer: the design phase already holds consent-gated authority to amend `proposal.md` and `specs/**` in place, so the amendment path is the only live, authorized executor for spec findings at review time.
- Regeneration conditioning on `overview.state` preserves the exactly-once regeneration invariant and keeps the loop out of the write path entirely.
- Re-routing later (e.g. restoring a live spec-worker continuation) would change the owning spec, the synchronization spec, and the instruction — the same contract surfaces this decision touches.

## Related

- `openspec/changes/review-loop-findings-auto-handoff/design.md` — Decision D2
- ADR 0047 — the amendment path is distinct from the artifact-feedback-gate, and is the consent-gated executor this decision routes proposal/spec findings through
- DDR 0060 — the `review-loop` token path whose output is the payload routed by this decision

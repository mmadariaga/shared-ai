# ADR 0008: sai-backfill Does Not Generate design.md, tasks.md, or implementation.md

## Status

Accepted

## Context

`/sai-backfill` operates after implementation is already complete. The full SAI workflow
produces five artifact types: `proposal.md`, `specs/`, `design.md`, `tasks.md`, and
`implementation.md`. A post-hoc tool could attempt to reconstruct all five.

## Decision

`/sai-backfill` SHALL NOT generate `design.md`, `tasks.md`, or `implementation.md`.
Only `proposal.md` and `openspec/specs/{capability}/spec.md` files are produced.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Generate all five artifacts | Change appears "complete" in openspec status | `design.md` reconstructed post-hoc reflects what the author thinks they decided, not what the code shows — creates a second source of truth that diverges from the implementation |
| Generate proposal + design only | Captures rationale | `design.md` is still speculative; future agents treat it as authoritative without knowing it was reconstructed |
| Generate proposal + specs only (chosen) | Both derivable from diff with high fidelity | `tasks.md` and `implementation.md` absent — users familiar with full SAI flow will notice the gap |

## Consequences

- `openspec/changes/{name}/` after a backfill contains `.openspec.yaml`, `proposal.md`, and `specs/` only.
- Future agents reading these artifacts cannot mistake reconstructed design rationale as authoritative — it does not exist.
- `/sai-5-review` and `/sai-6-security` can still be run; they operate on the diff, not on `implementation.md`.

## Related

- `openspec/changes/sai-backfill/specs/backfill-proposal-artifact/spec.md`
- ADR 0007 — Diff source selection for sai-backfill

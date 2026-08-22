# ADR 0158b: Shared non-clean-closure diagnosis lives in the command runner

## Status

Accepted

## Context

Apply recovery previously spent a fixed three-attempt pool on class-gated retries without diagnosing every non-clean post-resolution closure. `/sai-build` and any future opted-in adapter would duplicate an Apply-only diagnosis loop. Proposal I1 requires centralizing the post-resolution trigger in one shared seam.

## Decision

Extend `sai/orchestration/command-runner.md` so that after resolution, every non-clean closure enters one diagnosis path before eligibility. Clean `cancelled`, `needs_input`, and pre-resolution failures stay outside recovery. The runner transports the coordinator's closed diagnosis and enforces budget, duplicate, and lifecycle boundaries; it does not inspect artifacts or invent technical evidence.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Shared runner diagnosis (chosen) | One seam for composition inheritance and harness parity | Runner must stay diagnosis-transport only |
| Apply-only diagnosis loop | Smaller immediate diff | Duplicates for build and future adapters |
| Runner-owned technical diagnosis | Fewer coordinator duties | Contradicts coordinator authority |

## Consequences

- All opted-in adapters share one non-clean-closure entry path.
- Coordinators remain responsible for technical evidence; the runner enforces route and budget only.
- Build inherits diagnosis-driven recovery through the existing apply phase adapter without a build-card edit.

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D1
- ADR 0150a — Recovery pool is segment-scoped under composition
- ADR 0083 — Shared coordinator mechanics through phase adapters

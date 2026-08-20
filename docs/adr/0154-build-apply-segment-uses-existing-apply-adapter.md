# ADR 0154: Build apply segment loads through the existing apply phase adapter

<!-- adr-index: refs 0152; refs 0148; refs 0149 -->

## Status

Accepted

## Context

Build phase 2 must execute RED/GREEN Step work with the same isolation and gates as direct `/sai-4-apply`. Loading RED/GREEN bindings in the build launcher would duplicate apply dispatch ownership and risk drift from apply's chained-activation path.

## Decision

The build coordinator declares the apply phase adapter as composition position 1 by referencing the existing apply adapter surface (`sai/commands/apply/coordinator.md` and the chained-activation path from `apply-phase-adapter-extraction`). Build does not load apply RED/GREEN bindings in the build launcher. When the shared runner activates position 1, the apply adapter owns dispatch to `sai-4-red-worker` / `sai-4-green-worker` exactly as direct `/sai-4-apply` does after chained activation. The build launcher only binds the implement-worker for phase 0.

## Alternatives Considered

- **Build launcher pre-binds RED/GREEN** — rejected; duplicates apply ownership and drifts isolation rules.
- **Position 1 is the existing apply adapter; launcher binds implement only** (chosen) — single owner for Step dispatch.

## Consequences

- No build-specific managed worker, binding, or matrix row.
- RED blindness and GREEN test-file prohibition remain apply-owned.
- Apply's near-empty launcher stays near-empty; build's launcher is intentionally not near-empty.

## Provenance

Codebase-forced — `openspec/changes/sai-build-command/design.md`, Decision D2b.

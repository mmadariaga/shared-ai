# ADR 0081: Name shared orchestration contracts explicitly

<!-- adr-index: refs 0004; refs 0075 -->

## Status

Accepted

## Context

The extraction introduces phase-neutral coordinator and lifecycle sources beside phase workers, compatibility loaders, and harness bindings. Generic filenames would make fetch chains and installed projections ambiguous about whether a file defines reusable protocol or phase behavior.

## Decision

Name the shared sources `sai/orchestration/coordinator-contract.md` and `sai/orchestration/worker-lifecycle.md`. Keep phase sources under `sai/orchestration/workers/` and do not use generic `coordinator.md` or `lifecycle.md` filenames.

## Alternatives Considered

- **Use `coordinator.md` and `lifecycle.md`** - shorter, but ambiguous beside phase-specific orchestration files.
- **Keep phase-local copies** - avoids new names, but preserves the duplication this extraction removes.
- **Use explicit contract filenames** (chosen) - makes ownership and fetch intent visible at every source and projection path.

## Consequences

- Routed commands and installed sources have stable, self-describing fetch targets.
- Documentation and tests can distinguish shared contracts from phase adapters without relying on directory context alone.

## Related

- `openspec/changes/extract-sai-orchestration-core/design.md` - Decision D1
- `docs/adr/0004-source-layout-and-install-path-restructure.md`
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md`

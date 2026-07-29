# ADR 0092: Group planning assets by phase without changing harness routing

<!-- adr-index: refs 0082; refs 0088; refs 0090 -->

## Status

Accepted

## Context

Design and implementation planning each have a coordinator body and a caller-neutral invocation loader, but those assets are split between `sai/commands/` and `sai/compat/`. The historical layout obscures phase ownership and forces callers, installation projections, tests, and documentation to describe two source buckets for one planning phase. At the same time, Claude Code and opencode intentionally use routed workers while GitHub Copilot intentionally executes through the Inline Coordinator Adapter.

## Decision

Group the two assets for each planning phase under `sai/commands/design/` and `sai/commands/implement/`, naming them `coordinator.md` and `invocation.md`. Preserve the existing coordinator and invocation responsibilities and change supported callers only to fetch the new locations.

Keep the harness routing boundary unchanged: Claude Code and opencode continue through their routed coordinator and worker bindings, while GitHub Copilot continues through `sai/orchestration/inline-invocation.md`. Project the grouped command tree recursively and retire the superseded managed destinations through the manifest's hash-safe retirement mechanism.

## Alternatives Considered

- **Keep coordinators and invocation loaders in separate source buckets** - avoids path migration but leaves ownership difficult to discover.
- **Group the assets and unify all harnesses behind routed workers** - simplifies one conceptual boundary but violates Copilot's established inline portability decision.
- **Add forwarding shims at the former paths** - reduces immediate breakage for unsupported consumers but preserves the ambiguity this change removes.

## Consequences

- A maintainer can locate both planning entry assets from the phase name alone.
- Supported callers and managed projections must move atomically to the grouped paths.
- Historical installed files require hash-safe retirement, while locally modified copies remain preserved.
- The source-layout change does not alter phase behavior, durable artifacts, or harness dispatch mechanics.

## Related

- `docs/adr/0082-canonical-phase-workers-and-mirrored-bindings.md`
- `docs/adr/0088-implementation-harness-projection-boundaries.md`
- `docs/adr/0090-centralize-copilot-inline-planning-lifecycle.md`

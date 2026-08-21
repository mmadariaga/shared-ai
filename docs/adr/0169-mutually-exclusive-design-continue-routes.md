# ADR 0169: Mutually exclusive Continue routes by flag presence

## Status

Accepted

## Context

The design feedback gate ends with `Continue`, but the correct post-gate action depends on whether the current invocation opted into overview generation. Reusing the generation continuation for an omitted flag would manufacture a language value and emit lifecycle evidence for work that was never requested. Replacing the existing generation route with a second coordinator-owned implementation would duplicate worker lifecycle and transport behavior.

## Decision

The coordinator uses one mutually exclusive route selection. When raw `--overview-lang` is present and the worker has validated a selected language, Continue resumes the same worker through the existing generation-trigger continuation. That route carries the selected `overview_language`, dispatches the unchanged Fetch-based generator once, emits `overview` progress only after successful current-state materialization, and preserves selected-language failure metadata on failure. When the token is absent, Continue closes through exactly one no-generation design terminal: it does not resume the worker for generation, dispatch a generator, emit overview progress, write overview lifecycle state or failure metadata, or synthesize English. Reconciliation is dual: the successful overview-generation terminal reconciles the opted-in route, while the no-generation terminal reconciles the unopted route. Failed, cancelled, and needs-input outcomes preserve the last rendered list.

## Alternatives Considered

- **Always dispatch generation after Continue** — rejected; it makes omission an implicit English opt-in.
- **Ask a second language question at Continue** — rejected; gate 9 is the explore crystallization selector and direct design must remain flag-driven.
- **Use separate coordinator implementations for the two routes** — rejected; the worker and existing continuation transport are the single lifecycle owner.
- **Reconcile both routes from an overview progress event** — rejected; the unopted route has no overview step or progress event.

## Consequences

- Continue has a deterministic, mutually exclusive terminal path for every flag-presence state.
- The opted-in route preserves the existing generator Fetch transport, binding names, five-field envelope, and write scope.
- The unopted route can complete design without creating or falsely validating an overview.
- Task-list reconciliation reflects the route that actually ran rather than an inferred or stale overview result.

## Related content

- `openspec/changes/opt-in-change-overview/specs/pipeline-design-phase-chaining/spec.md`
- `openspec/changes/opt-in-change-overview/specs/localized-overview-generation/spec.md`
- `openspec/changes/opt-in-change-overview/specs/coordinator-progress-ownership/spec.md`
- `sai/commands/design/coordinator.md`
- `sai/policies/todo-structure.md`

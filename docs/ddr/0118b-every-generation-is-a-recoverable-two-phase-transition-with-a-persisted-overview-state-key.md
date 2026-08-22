# DDR 0118b: Every generation is a recoverable two-phase transition with a persisted overview.state key

## Status

Accepted

## Context

`change-overview.md` is a derived artifact: it can be absent (never generated), in progress, failed, current, or stale relative to its sources. File presence alone cannot distinguish those states — a stale record still exists at `change-overview.md`, and a failed or interrupted generation leaves ambiguous file state. Consumers (`sai-status`, `sai-archive`, the `sai-explore` review loop) need a durable signal to decide whether the overview may be presented as the change's review surface.

## Decision

The change's overview state is persisted as `overview.state` in `openspec/changes/{name}/.openspec.yaml`, with exactly one of `unmaterialized | materializing | failed | current | stale`. Every generation is a recoverable two-phase transition: the design worker sets `materializing` immediately before dispatching the generator, and commits `current` only after a successful closed result; a failed first materialization sets `failed`; `stale` is set before the first effective source write of every post-materialization transaction and on regeneration failure. Backfilled changes carry no key. Currentness is the conjunction of the state key and the CLI-reported file presence.

## Alternatives Considered

- **File-presence-only heuristics** — rejected: they cannot distinguish unmaterialized, in-progress, failed, current, and stale overviews.
- **Persisted state key with two-phase transitions** — chosen: interruption or process loss can never leave an unmarked file presented as the review surface, and the conservative stale-before-first-write invariant requires no execution point after the write.

## Consequences

The state vocabulary and its semantics are consumed by four surfaces (design worker, status panel, archive check, explore review loop); changing the contract later means coordinated edits across all of them. The decision states a constraint the pipeline's domain imposes at all times — a generated artifact must never be presented as current without a committed state record — which is why this record is a DDR.

## Provenance

User — the proposal's "Persisted materialization state" bullet and the synchronization spec mandate the key and its transitions. Recorded as Decision 3 in `design.md` with the `ddr` family marker.

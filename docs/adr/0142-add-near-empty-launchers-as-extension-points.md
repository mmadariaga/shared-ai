# ADR 0142: Add near-empty launchers as extension points

## Status

Accepted

## Context

Some workflow wrappers currently carry no shared behavior beyond their harness fetch-skill and boot-adapter loads. Omitting launcher cards for those commands would make the wrapper shape depend on command history and would require a future behavior addition to modify a user-owned wrapper.

## Decision

Ship a `launcher.md` card for every in-scope command, including `sai-4-apply`, `sai-archive`, `sai-backfill`, `sai-commit`, `sai-pr`, `sai-status`, and `sai-worktree`. Keep these seven cards near-empty at creation with no behavior-skill load, worker binding, or routed-card fetch; future shared behavior lands in the existing card rather than changing the wrapper.

## Alternatives Considered

- **Leave the seven wrappers without a launcher** — rejected because it creates per-command shape exceptions.
- **Add launchers only when a command gains behavior** — rejected because future behavior would again require a wrapper change.
- **Add a uniform near-empty launcher for every command** (chosen) — accepts one small projected card per command to keep the extension point stable.

## Consequences

- The launcher inventory is uniform and predictable across both harness projections.
- Near-empty cards incur one fetch without changing current behavior.
- Future additions to these commands can stay outside the frozen wrapper surface.

## Provenance

User — `openspec/changes/thin-command-wrappers/design.md`, Decision: Add near-empty launchers for commands with no shared wiring.

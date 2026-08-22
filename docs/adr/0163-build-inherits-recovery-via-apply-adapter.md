# ADR 0163: Build inherits shared recovery only through the apply phase adapter

## Status

Accepted

## Context

`/sai-build` already activates the apply phase adapter for its apply segment. Duplicating recovery rules on the build card would drift from Apply and contradicts the proposal's explicit no-build-card-edit boundary.

## Decision

Do not modify `sai/commands/build/coordinator.md`. `/sai-build` obtains diagnosis-driven recovery by activating the same apply phase adapter that declares `recovery_policy: true`. Build keeps its composition-owned stops, resolution, re-entry, and fast-track behavior.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Inherit via apply adapter only (chosen) | Behavior-preserving; no drift | Requires thin build compatibility tests |
| Duplicate recovery rules on the build card | Explicit on the card | Proposal forbids; drifts from Apply |

## Consequences

- Build-card prose stays composition-owned; recovery phrases live in runner + apply cards.
- Contract tests assert no build-card edit while apply-segment recovery matches the shared runner.
- Refs ADR 0154b (build apply segment uses existing apply adapter).

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D8
- ADR 0154b — Build apply segment loads through the existing apply phase adapter

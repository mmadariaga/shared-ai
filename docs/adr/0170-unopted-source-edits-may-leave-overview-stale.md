# ADR 0170: Unopted source edits may leave overview stale; never fake current

## Status

Accepted

## Context

An existing Change Overview can be complete and current when a later design invocation begins. If that invocation edits source artifacts without an overview opt-in, it must not regenerate the overview merely to make the task list look complete. At the same time, it must not leave a false `current` claim after effective source changes. Deleting the existing overview would destroy useful prior context, while silently retaining `current` would misrepresent the relationship between sources and projection.

## Decision

The unopted design route does not dispatch generation and does not write overview lifecycle state or failure metadata solely because Continue was selected. If effective source edits make the existing projection no longer authoritative, the existing overview may remain on disk as stale; stale retention is permitted and is reported as stale rather than current. The worker never restores or claims `overview.state: current` on the unopted skip path without the existing verification protocol establishing completeness and consistency. A later explicitly opted-in invocation may perform the normal materialization or regeneration transaction, including its existing stale-before-first-write boundary and diagnostics handling. No failure metadata is invented for work that was not dispatched.

## Alternatives Considered

- **Delete the overview whenever unopted sources change** — rejected; deletion loses the last available projection and is harder to reverse.
- **Leave `overview.state: current` unchanged** — rejected; it creates a false current claim after effective source edits.
- **Regenerate automatically to repair staleness** — rejected; regeneration requires an explicit language opt-in.
- **Write a synthetic skip failure record** — rejected; no generation attempt occurred, so there is no generator or parent failure to classify.

## Consequences

- The repository can contain a retained stale overview after an unopted source-edit transaction, with no false success claim.
- The no-generation route remains side-effect-limited and does not alter the generator's five-field contract or write boundary.
- Users who want a current localized projection explicitly provide `--overview-lang <language>` on a later design invocation.
- Availability and review surfaces can distinguish stale retention from a current overview without treating the stale artifact as a generation failure.

## Related content

- `openspec/changes/opt-in-change-overview/specs/localized-overview-generation/spec.md`
- `openspec/changes/opt-in-change-overview/specs/pipeline-design-phase-chaining/spec.md`
- `sai/commands/design/worker.md`
- `sai/commands/design/change-overview.md`
- ADR 0137 — Change Overview preserves the generation lifecycle and write boundary

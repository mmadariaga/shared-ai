# ADR 0020: Ephemeral in-context technical-learnings memory for the apply coordinator

## Status

Accepted

## Context

`delegate-apply-steps-to-subagent` requires the coordinator to accumulate reusable technical learnings (non-existent symbols, real API signatures, version incompatibilities) reported by each Step-execution subagent, and selectively re-inject relevant entries into later dispatches — since subagents never communicate with each other directly, this memory is the only cross-Step channel. Neither the proposal nor any of the five new capability specs specifies a storage medium.

`apply-coordinator-authority` scopes the coordinator's `implementation.md` writes to checkboxes and the deviations appendix only; it does not license a third write category. No spec or the proposal mentions a sidecar file.

## Decision

Hold accumulated learnings as a running note in the coordinator's own conversation context for the duration of the apply session, incorporated immediately after each Step's verification pass (see ADR 0019). Never write it to `implementation.md` or any other file. Never dump it in full into a dispatch — only entries the coordinator judges relevant to the Step being dispatched are injected.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Append learnings to `implementation.md`'s deviations appendix or a new subsection | Durable across context compaction/session restart | `apply-coordinator-authority` scopes the coordinator's `implementation.md` writes to checkboxes + deviations only; a third write category needs its own spec change, out of scope for this change |
| New sidecar file | Durable; keeps `implementation.md` untouched | Unnecessary artifact for a single-session, session-scoped concern; neither the proposal nor any spec mentions a file |
| Ephemeral, in-coordinator-context only (chosen) | No new file or schema change; matches the specs' literal wording ("held only by the coordinator"); zero risk of violating `apply-coordinator-authority`'s write scope | Lost on context compaction or session restart; a later subagent may re-discover the same friction a prior subagent already resolved |

## Consequences

- If the apply session is compacted or restarted mid-plan, accumulated learnings are lost; the only cost is re-discovery time for a later subagent, not correctness — each subagent independently runs RED→GREEN regardless of injected learnings.
- If a future change wants durability across sessions, it must first extend `apply-coordinator-authority`'s write scope (or introduce a new spec) before persisting learnings anywhere — this ADR's choice is not a permanent constraint, only the correct minimal scope for this change.
- Because the memory is invisible outside the coordinator's own context, no other tool, spec, or downstream artifact can inspect or audit accumulated learnings after the fact.

## Related

- `openspec/changes/delegate-apply-steps-to-subagent/design.md` — Decision D4
- `openspec/changes/delegate-apply-steps-to-subagent/specs/apply-technical-learnings-memory/spec.md`
- `openspec/changes/delegate-apply-steps-to-subagent/specs/apply-coordinator-authority/spec.md` — implementation.md write scope
- `docs/adr/0019-coordinator-gate-ordering-after-subagent-report.md` — incorporation timing

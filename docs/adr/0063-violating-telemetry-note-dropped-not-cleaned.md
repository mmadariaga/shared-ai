# ADR 0063: A contract-violating telemetry note is dropped whole, never trimmed

## Status

Accepted

## Context

Field 9's `note` key is bounded by contract to a short statement of what changed between attempts — never a traceback, a raw file excerpt, or an iteration log. Subagents will sometimes violate that contract. The coordinator, which has already read the offending text into its own context, must decide what to persist into the `## Appendix: Execution Telemetry` table in `implementation.md`.

The whole point of the telemetry mechanism is to add no new pathway for execution noise. A cleaning step is itself such a pathway: it requires the coordinator to reason about failing output in order to decide what to keep.

## Decision

When a `note` violates its contract, write the row with an **empty `note` cell**. Drop the note entirely rather than editing, trimming, or sanitising it, and continue without blocking the workflow.

State the containment guarantee at the scope it actually holds: nothing violating the contract is persisted, and the mechanism adds no new pathway. Do not claim that the coordinator's own context is scrubbed — it cannot be.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Drop the note whole (chosen) | The guarantee is exactly statable and mechanically checkable; no per-row judgment call | Discards a note that may have had a usable sentence in it |
| Sanitise — strip the traceback, keep the prose | Retains whatever was useful | Produces an artifact that *looks* bounded while the bound was a per-row judgment; invites the coordinator to reason about failing output, which is the pathway being avoided |
| Persist as-is and flag it | No information loss; the violation is visible | Writes an iteration log into a committed file that later runs read |

## Consequences

- An empty `note` cell alongside `attempts` > 1 is a legible signal that a note was returned and dropped; the `attempts` and `first_failure` columns still carry the diagnostic value.
- The containment requirement is honest about its limit, so a future reader does not mistake it for a scrub of the coordinator's context.
- No coordinator-side text-processing step exists to drift or be tuned.

## Related

- `openspec/changes/subagent-attempt-instrumentation/design.md` — Decision D5
- `openspec/changes/subagent-attempt-instrumentation/specs/apply-telemetry-containment/spec.md` — "Telemetry adds no new pathway for execution noise"
- `sai/instructions/apply.md` — `## Technical Learnings Memory`

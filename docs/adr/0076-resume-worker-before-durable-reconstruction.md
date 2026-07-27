# ADR 0076: Resume the current planning worker before reconstructing from durable artifacts

<!-- adr-index: pair-with 0075 -->

## Status

Accepted

## Context

Implementation planning can pause for change selection, ADR approval, or another closed decision. Starting a replacement worker after every answer discards useful session context, while persisting an agent ID or task ID would make ephemeral harness state part of the durable workflow contract.

Native continuation can also fail because a background agent or task identifier is stale. Recovery must preserve prior authorized writes and changed-file reporting without making the coordinator read technical artifacts.

## Decision

Resume the same implementation-planning worker first using the harness-owned identifier captured for the current command invocation. Claude Code forwards the answer to the background agent and waits for its next payload; opencode continues the explicit task by task ID.

If continuation fails, dispatch one fresh worker with only the original invocation envelope and an instruction to reconstruct independently from current durable artifacts. Keep the coordinator's accumulated `changed_files` union across fallback. Never persist or reuse the worker identifier across command invocations or chats.

## Alternatives Considered

- **Always start a fresh worker after input** - simpler, but loses session context and duplicates work during normal interaction.
- **Persist the worker identifier in OpenSpec** - enables later lookup, but turns harness-local ephemeral state into a brittle durable dependency.
- **Fail the invocation when resume fails** - avoids fallback complexity, but leaves recoverable artifact-backed work stranded.
- **Resume first, then reconstruct from durable artifacts** (chosen) - preserves normal continuity while keeping artifacts authoritative.

## Consequences

- Each harness binding must expose a concrete continuation operation and a detectable failure path.
- A replacement worker must re-read artifacts itself; the coordinator cannot package technical context for it.
- Live smoke checks remain necessary because structural tests cannot prove cross-turn continuation behavior.

## Related

- `openspec/changes/introduce-implement-coordinator-worker/design.md` - Decision D4
- `openspec/changes/introduce-implement-coordinator-worker/specs/worker-lifecycle-protocol/spec.md`
- `docs/adr/0075-normalized-invocation-envelope-and-lifecycle-payload.md` - paired protocol decision

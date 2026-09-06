# ADR 0180: Liveness, pipe EOF, parent poll, tombstone, no TTL

## Status

Accepted

## Context

Liveness must watch the parent process, never user activity: clock-based killing of live sessions would violate the stated model and add timers that differ across OS families. In-flight reads need a deterministic closed-session signal, and recycled PIDs must never false-positive as live.

## Decision

Combine three exit paths with a tombstone and no idle clocks:

- Pipe EOF is the primary signal covering the normal abandoned-chat path.
- Per-`emit` parent-liveness check plus a 60s timer with PID plus startTime validation is the secondary cover for orphaned pipes; explicit `close` covers intentional shutdown.
- Explicit `close` serves a 5s tombstone naming the closed session before the port goes dead, so in-flight reads get a deterministic closed-session signal.
- No idle TTL, no separate reclaim procedure, no user-activity timers; lingering orphans remain harmless by construction.
- Version mismatch resolves as kill plus respawn plus `restore`, never mixed protocols.

## Alternatives Considered

- **Idle TTL or separate reclaim procedure** — rejected: liveness watches the parent process, never user activity; clock-killing live sessions adds OS-divergent timers.
- **Immediate port close on explicit `close`** — rejected: in-flight reads would find a dead port with no explanation instead of a deterministic closed-session signal.
- **PID-only polling without start-time** — rejected: recycled PIDs would false-positive as live; PID plus startTime declares stale files dead so fresh spawn safely overwrites.

## Consequences

- Live sessions are never killed by clocks; only parent death or explicit close ends them.
- Close-then-dead sequencing is deterministic and testable on both OS families.
- Stale discovery files are declared dead by identity mismatch, keeping overwrite safe.

## Related

- Change `state-machine-sidecar` — `design.md` D6 and Migration Plan rollback hygiene
- ADR 0176 — the per-session ownership whose lifetime this governs
- ADR 0177 — the discovery file whose staleness this declares

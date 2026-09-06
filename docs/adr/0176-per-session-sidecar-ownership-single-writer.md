# ADR 0176: Per-session sidecar ownership with single writer

## Status

Accepted

## Context

Conversational explore state (stage progression, agreement tracking) currently lives in unstructured chat context where transitions depend on LLM judgment. The sidecar must provide deterministic, testable continuity for one explore session without paying discovery cost every turn, while concurrent explores stay isolated and a crash stays recoverable without global coordination.

## Decision

Run one sidecar process per explore session keyed by UUIDv4 `chatId`:

- The main session spawns the sidecar and is its single writer; there are no concurrent writers.
- A second spawn with the same live `chatId` reuses the live session instead of starting a second process.
- State lives in memory for the session lifetime, giving in-memory continuity without per-turn discovery.
- The crash boundary is per session: respawn plus `restore` from the last carried snapshot plus one retry, with no cross-session coordination.

## Alternatives Considered

- **Per-turn ephemeral sidecar with per-turn discovery (Model A)** — rejected: pays discovery cost every turn and provides no in-memory continuity, defeating the determinism and testability motive.
- **Single shared daemon with namespaces, arbitration and version-skew handling (Model C)** — rejected: near-zero writer contention makes arbitration, namespaces and skew handling pure overhead before the hypothesis is proven; isolation by `chatId` is simpler and harmless orphans need no reclamation.

## Consequences

- Concurrent explores are isolated by construction; one session's crash never affects another.
- The writer model stays trivial with no locking or arbitration to test.
- Recovery is session-local and bounded; a crash without a carried snapshot loses that session by design.
- Lingering orphans need no reclamation procedure.

## Related

- Change `state-machine-sidecar` — `design.md` D1, Target State and File Manifest (`bin/sai-state.js`)
- ADR 0177 — session discovery file and announce mechanism this ownership reuses
- ADR 0180 — liveness and close sequencing for the owned session

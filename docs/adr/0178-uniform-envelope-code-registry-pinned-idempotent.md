# ADR 0178: Uniform envelope, code registry, pinned, idempotent

## Status

Accepted

## Context

Each new hosted machine must not introduce new request/response shapes, transport work or discovery work. Sessions must keep stable transition semantics for their lifetime, and retries after transport doubt (for example post-crash) must be safe to replay. Callers must always have a fetchable pointer, even on rejection.

## Decision

Expose every machine through one uniform envelope backed by a code registry:

- Request `emit {machineId@version, event, eventId}` returns `{state, snapshot{state, machineId@version}, next{follow, hint}}`, or `{error: closed-vocab, next: current-pointer}` on rejection; `restore {snapshot}` returns `{state, snapshot, next}`.
- Registry in code (`initialState`, `transition`, `project`, one registration line per machine) keeps adding a machine to a module plus one line.
- Routing is pinned at session start: no mid-session upgrades, no silent version migration.
- Emit is idempotent by caller `eventId` with a bounded per-session store (1000 entries, oldest-first eviction, cleared on `close`).
- Errors use a closed vocabulary and every rejection carries the current-state pointer.
- No cross-machine guards in the sidecar; the caller orchestrates multi-machine flows via separate pinned emissions.

## Alternatives Considered

- **Per-machine envelopes** — rejected: every new machine would introduce new shapes; the uniform envelope keeps later machines free of transport design.
- **Unpinned routing (latest-version-wins)** — rejected: mid-session upgrades would silently change transition semantics.
- **At-least-once emit without idempotency** — rejected: transport doubt after a crash would double-apply transitions.
- **Open-ended error strings without a pointer** — rejected: leaves the caller without a fetch target on rejection.

## Consequences

- A new machine ships with no envelope, transport or discovery change.
- The bounded dedup window is documented in the envelope contract so callers never rely on unbounded dedup.
- Cross-machine composition stays caller-side, keeping the sidecar surface minimal until a second machine proves guards necessary.

## Related

- Change `state-machine-sidecar` — `design.md` D3 and File Manifest (`sai-state/envelope.js`, `sai-state/registry.js`)
- ADR 0179 — the pointer-only `next` shape this envelope carries
- ADR 0181 — the first machine registered on this platform

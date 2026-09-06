# ADR 0177: Loopback ephemeral token file, no TLS

## Status

Accepted

## Context

The sidecar transport must survive the context-compaction rediscovery path, where the caller re-learns coordinates from the session file without conversation history, and must behave identically on Windows and POSIX for both harnesses from one stdlib-only codebase. Concurrent explores must never collide, and stale discovery files must be safely replaceable.

## Decision

Serve the envelope over loopback HTTP on `127.0.0.1` with an ephemeral port and dual discovery:

- Fresh spawn announces `{port, token}` on stdout; later rediscovery reads `$TMPDIR/sai-state/<chatId>.json`.
- The session file carries `{port, token, pid, startTime, sidecarVersion}` as a client-side discovery copy with owner-only permissions (0600 semantics), never as a store.
- Health-check requires both port reachability and process-identity match (pid plus startTime); mismatch declares the file stale and a fresh spawn overwrites it.
- No fixed ports, no deterministic port derivation, and no TLS on loopback: token plus owner-only file provides the needed peer assurance.

## Alternatives Considered

- **Fixed ports or deterministic port derivation** — rejected: collides across concurrent explores and across users on shared hosts; ephemeral assignment avoids an allocation protocol entirely.
- **TLS on loopback** — rejected: adds certificate management for no threat-model gain on `127.0.0.1`.
- **Stdio-only transport** — rejected: does not survive the compaction rediscovery path, where the caller must re-learn coordinates from the session file without history.

## Consequences

- No port allocation protocol to design, test or migrate.
- Fresh-spawn and rediscovery paths agree by construction; stale files are overwritten, never followed.
- The transport stays stdlib-only (`http`, `fs`, process primitives) with one codebase for both OS families and both harnesses.

## Related

- Change `state-machine-sidecar` — `design.md` D2 and Constraints
- ADR 0176 — per-session ownership this discovery serves
- ADR 0180 — stale-file declaration via PID plus startTime validation

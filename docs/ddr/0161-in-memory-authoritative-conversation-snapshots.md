# DDR 0161: In-memory authoritative conversation snapshots

## Status

Accepted

## Context

A session's authoritative state must live in exactly one place across crash recovery and context compaction. A session file that also stores state becomes a second writer and a consistency burden; a durable store contradicts the smallest-surface continuity hypothesis; replaying conversation history fails once compaction has removed that history.

## Decision

Authority lives in exactly one sidecar process's memory; everything else is a copy or a carrier:

- The session file is a client-side discovery copy only (`port`, `token`, `pid`, `startTime`, `sidecarVersion`); it never authoritatively stores state.
- Every response produces a snapshot carried by the caller as opaque bytes `{state, machineId@version}`.
- `restore` validates the carried version: a match restores, a mismatch rejects with the current-state pointer and never silently migrates.

## Alternatives Considered

- **Session file as store** — rejected: the file becomes a second writer and a consistency burden across crash and compaction.
- **Durable store (sqlite or file journal)** — rejected: contradicts the no-persistence scope and adds a store to test and migrate for an unproven hypothesis.
- **History-dependent recovery (replay conversation)** — rejected: fails after compaction when history is gone; the last carried snapshot resumes at the snapshotted state with a consistent pointer.

## Consequences

- Crash without a carried snapshot loses the session by design; recovery is respawn plus `restore` plus one retry.
- The session file can be overwritten freely since it carries no authority.
- Version skew resolves deterministically at the `restore` boundary with no mixed-protocol sessions.

## Related

- Change `state-machine-sidecar` — `design.md` D5 and Non-Goals (no persistence layer)

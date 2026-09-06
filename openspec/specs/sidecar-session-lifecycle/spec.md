# sidecar-session-lifecycle Specification

## Purpose
TBD - created by archiving change state-machine-sidecar. Update Purpose after archive.
## Requirements
### Requirement: Runtime baseline

The sidecar SHALL run on Node >= 22, SHALL depend only on the Node standard library with no native dependencies, and SHALL ship as a single bin distributed via the current `npx` channel.

#### Scenario: Minimum runtime check

- **WHEN** the sidecar starts on a runtime below Node 22 or with a native dependency required
- **THEN** startup is refused with a closed-vocabulary error naming the unmet baseline instead of running in a degraded mode

### Requirement: Per-session ownership and single writer

The platform SHALL run one sidecar process per explore session keyed by `chatId`, SHALL allow only the main session to spawn that sidecar, and SHALL treat that main session as the single writer for the session's state. The caller SHALL generate each `chatId` as a UUIDv4, and spawning with an already-live `chatId` SHALL reuse that session instead of starting a second sidecar.

#### Scenario: Concurrent explores stay isolated

- **WHEN** two explore sessions with different `chatId` values run in one repository
- **THEN** each session owns a separate sidecar and separate state, and neither session's emissions are visible to the other

#### Scenario: Same chatId reuses the session

- **WHEN** the caller spawns with a `chatId` whose sidecar is still live
- **THEN** the spawn reuses the existing session and state instead of starting a second sidecar

### Requirement: Authoritative state, snapshots, and discovery copy

The sidecar process SHALL hold the authoritative in-memory state, SHALL return a conversation-carried snapshot with every response for the agent to carry, and SHALL treat the session file as a client-side discovery copy only, never as the server's store.

#### Scenario: State survives on snapshots not files

- **WHEN** the caller needs the latest state after context compaction mid-chat
- **THEN** the caller rediscovers the sidecar through the session file and continues from the last conversation-carried snapshot via `restore`, without depending on conversation history

### Requirement: Loopback transport and discovery

The sidecar SHALL serve HTTP on `127.0.0.1` with an ephemeral port, SHALL write the port and token to `$TMPDIR/sai-state/<chatId>.json`, SHALL announce the same coordinates on stdout at spawn, SHALL create the session file with owner-only permissions (0600 semantics, closest Windows equivalent), and SHALL NOT use fixed ports, deterministic port derivation, or TLS.

#### Scenario: Fresh spawn is discoverable two ways

- **WHEN** a sidecar spawns for a `chatId`
- **THEN** the caller learns the port and token from the stdout announce and can re-learn them later from the session file for the same `chatId`

#### Scenario: Token file is owner-only

- **WHEN** a sidecar creates the session file
- **THEN** the file grants access to the owning user only on both Windows and POSIX

### Requirement: Liveness and exit

The sidecar SHALL exit on pipe EOF as the primary signal, SHALL validate parent liveness on each `emit` plus a 60-second timer with start-time validation as the secondary signal, SHALL support an explicit `close`, and SHALL NOT implement idle TTL or a separate reclaim procedure; liveness watches the parent process, never user activity.

#### Scenario: Abandoned chat exits without clocks on users

- **WHEN** the owning chat ends without an explicit `close`
- **THEN** the sidecar dies via pipe EOF or the parent poll, and any lingering orphan is harmless by construction with no user-activity timer involved

### Requirement: Explicit close with tombstone and read grace

An explicit `close` SHALL stop transitions immediately and SHALL retain a tombstone for 5 seconds; reads inside that window SHALL receive the tombstone naming the closed session, and after the window the port SHALL be dead.

#### Scenario: Post-close reads see the tombstone then nothing

- **WHEN** the caller reads within 5 seconds after an explicit `close`, and again after the window
- **THEN** the first read receives the tombstone for the closed session and the later read finds the port dead

### Requirement: Crash recovery

The caller SHALL recover a mid-chat crash by respawning the sidecar, restoring from the last conversation-carried snapshot with `restore`, and retrying the failed emission exactly once.

#### Scenario: Mid-chat crash resumes

- **WHEN** the sidecar process dies mid-chat with a prior snapshot carried in conversation
- **THEN** the caller respawns, restores the snapshot, retries once, and continues the session without losing the pinned machine version

### Requirement: Snapshot version validation on restore

Every snapshot SHALL carry its `machineId@version`, and `restore` SHALL validate it against the sidecar version: a matching version restores, and a mismatched version is rejected with the current state's pointer with no silent migration in PoC scope.

#### Scenario: Cross-version snapshot is rejected not migrated

- **WHEN** `restore` receives a snapshot whose version differs from the sidecar version
- **THEN** the restore is rejected with the current state's pointer and no state is migrated

### Requirement: Version mismatch

The caller SHALL kill and respawn the sidecar on a sidecar/caller version mismatch and SHALL never mix protocols across versions.

#### Scenario: Skewed versions never interoperate

- **WHEN** a health-check or response reveals the sidecar version differs from the caller version
- **THEN** the caller kills the sidecar, spawns a matching version, and restores from the last snapshot instead of continuing against the mismatched sidecar

### Requirement: Stale session file

A token health-check SHALL declare a stale session file dead when its port is unreachable or its process identity no longer matches, and a fresh spawn SHALL overwrite the stale file.

#### Scenario: Dead port or recycled PID recovers cleanly

- **WHEN** the session file points at a dead port or a recycled PID
- **THEN** the health-check reports the file dead and the next spawn overwrites it with fresh coordinates instead of connecting to the wrong process

### Requirement: Cross-platform and harness parity

The sidecar SHALL behave identically on Windows and POSIX from one codebase using loopback TCP, `TMPDIR`-relative discovery, and PID polling with nothing Unix-specific, and SHALL offer identical spawn, use, and close behavior to opencode and Claude Code callers with no harness-specific transport.

#### Scenario: Same flow on both harnesses and OS families

- **WHEN** the spawn, emit, health-check, and close sequence runs on Windows and POSIX under opencode and Claude Code
- **THEN** every step succeeds with the same envelope, discovery layout, and exit behavior in all four combinations


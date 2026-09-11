# stage-machine-cli-interface Specification

## Purpose
TBD - created by archiving change replace-state-sidecar-with-cli. Update Purpose after archive.
## Requirements
### Requirement: Local CLI three-verb interface

The stage machine store SHALL provide four CLI verbs via `sai-state` binary:
1. `spawn --key <stable-key>` — Initializes or locates a session, deriving a deterministic UUIDv4 from the stable key, returning `{id}` on success
2. `emit <id> <machineId> <eventJson>` — Applies a transition, accepting the session id, target machine id, and JSON event object, returning minimal wire outcome
3. `reset <id> <machineId>` — Clears only that machine's state to its initialState with an atomic write, leaving other machines in the same session untouched, returning `{reset: <machineId>}` on success
4. `close <id>` — Terminates a session by deleting the session file, returning `{closed: id}` on success

Each verb writes minimal JSON to stdout on success and writes error text to stderr on failure. Exit code 0 indicates success; exit code 1 or 2 indicates failure.

#### Scenario: CLI spawn returns session id

- **WHEN** the caller invokes `sai-state spawn --key <key>` for a new or existing session
- **THEN** the process outputs a JSON `{id}` with exit code 0

#### Scenario: CLI emit returns minimal wire outcome

- **WHEN** the caller invokes `sai-state emit <id> <machineId> <eventJson>`
- **THEN** the process outputs JSON `{stage, next, rejected?, warnings?}` and exits with code 0 on success, or exits with code 1 and outputs `{error: <name>, next: {follow, hint}}` on failure

#### Scenario: CLI reset clears one machine and returns confirmation

- **WHEN** the caller invokes `sai-state reset <id> <machineId>` with a registered machine id
- **THEN** that machine's state is reset to its initialState with an atomic write, other machines in the session remain untouched, and the process outputs `{reset: <machineId>}` with exit code 0

#### Scenario: CLI reset with missing arguments returns usage error

- **WHEN** the caller invokes `sai-state reset` with missing id or machineId
- **THEN** the process exits with code 2 and writes a usage message to stderr

#### Scenario: CLI reset with unknown machine returns error

- **WHEN** the caller invokes `sai-state reset <id>` with a machine id not in the registry
- **THEN** the process outputs `{error: "UNKNOWN_MACHINE"}` with exit code 1

#### Scenario: CLI close deletes and returns confirmation

- **WHEN** the caller invokes `sai-state close <id>`
- **THEN** the session file is deleted from the store directory and the process outputs `{closed: id}` with exit code 0

### Requirement: Deterministic UUID derivation

The `spawn --key <stable-key>` verb SHALL derive a well-formed UUIDv4 from the stable key by hashing with SHA-256, then fixing the version (4) and variant (RFC 4122) nibbles in the resulting string, producing a value that:
- Matches the pattern `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` (case-insensitive)
- Remains stable across multiple invocations with the same key
- Allows callers to predict the session id from the key without a separate lookup

#### Scenario: Same key always derives the same session id

- **WHEN** `spawn --key mykey` is invoked twice
- **THEN** both invocations return the same `{id}` value

#### Scenario: Different keys derive different session ids

- **WHEN** `spawn --key key1` and `spawn --key key2` are invoked
- **THEN** the returned `id` values differ

### Requirement: Session file store on local filesystem

The store SHALL persist each session's state in a JSON file under `$TMPDIR/sai-state/<id>.json` (or platform equivalent) with owner-only permissions (0600 semantics, closest Windows equivalent). File writes SHALL be atomic using temp-file-plus-rename so a process crash mid-write never leaves a truncated session file.

#### Scenario: Session file stores persisted machine state

- **WHEN** `emit` applies a transition and persists the outcome
- **THEN** the session file contains the per-machine ledger and state in JSON form `{createdAt, stateVersion, stateByMachine: {machineId: {state, rev, lastEventId, lastOutcome}}}`

#### Scenario: Reset atomically updates machine state

- **WHEN** `reset <id> <machineId>` is invoked with other machines in the session
- **THEN** the session file is atomically rewritten with only that machine reset to initialState and other machines' state preserved

#### Scenario: Close deletes the session file

- **WHEN** `close <id>` is invoked
- **THEN** the session file is deleted from the store directory

### Requirement: Closed error vocabulary via JSON error field

Every failed emit (invalid event, unknown machine, version mismatch) SHALL return a JSON response carrying a mandatory `error` field with one of the closed-vocabulary values: `INVALID_EVENT`, `UNKNOWN_MACHINE`, `VERSION_MISMATCH`, `ALREADY_RUNNING`, or `READINESS_IS_NOT_INTENT`. The response SHALL also carry the current state's `next` pointer. Exit code SHALL be 1. Reset failures also return `error` with closed-vocabulary values, but without a `next` pointer.

#### Scenario: Invalid machineId returns INVALID_EVENT

- **WHEN** `emit` is called with a missing or unparsable `machineId`
- **THEN** the response carries `{error: "INVALID_EVENT", next: {follow, hint}}`

#### Scenario: Unknown machine returns UNKNOWN_MACHINE

- **WHEN** `emit` is called with a registered `machineId` that is not in the code registry
- **THEN** the response carries `{error: "UNKNOWN_MACHINE", next: {follow, hint}}`

#### Scenario: Reset with unknown machine returns error without pointer

- **WHEN** `reset` is called with a machine id not in the code registry
- **THEN** the response carries `{error: "UNKNOWN_MACHINE"}` with exit code 1 and no `next` field

### Requirement: Minimal wire outcomes

Each CLI verb SHALL return minimal JSON without state serialization:
- `spawn`: `{id}`
- `emit` success: `{stage, next: {follow, hint}, rejected?, warnings?}`
- `emit` failure: `{error: <name>, next: {follow, hint}}`
- `reset` success: `{reset: <machineId>}`
- `reset` failure: `{error: <name>}`
- `close`: `{closed: id}`

The machine's internal state remains in the session file; no snapshot or state object is serialized to stdout.

#### Scenario: Emit response carries no state object

- **WHEN** `emit` applies a transition that advances the stage
- **THEN** the stdout JSON contains only `{stage, next, rejected?, warnings?}` without `state`, `snapshot`, or other internal fields

#### Scenario: Reset response carries only machine id

- **WHEN** `reset` completes successfully
- **THEN** the stdout JSON contains only `{reset: <machineId>}` without `state`, `snapshot`, or other internal fields

### Requirement: Session file version and idempotency

Each session file SHALL carry a `stateVersion` field matching the CLI tool's version. The per-machine ledger (entry.lastEventId, entry.lastOutcome) enables idempotency: re-emitting the same `eventId` returns the identical prior outcome without re-applying the transition.

#### Scenario: Replay of same eventId returns stored outcome

- **WHEN** `emit <id> <machineId> {...eventId: E1...}` is called twice
- **THEN** the second invocation returns the identical JSON response as the first without advancing the machine state

### Requirement: No inter-process HTTP, no port discovery, no tokens

The store SHALL operate as a local-only service with no HTTP server, no listening port, no token file, no parent-process polling, and no health-check endpoint. Session state lives only in the temp directory file; callers locate sessions deterministically via the derived session id (from stable key) or carry the id in conversation state.

#### Scenario: No port or token in spawn response

- **WHEN** `spawn` is invoked
- **THEN** the response contains only `{id}` with no `port`, `token`, `pid`, or `reused` field

#### Scenario: No tombstone or delayed close

- **WHEN** `close` is invoked
- **THEN** the session file is deleted immediately with no tombstone delay, graceful shutdown period, or lingering liveness window


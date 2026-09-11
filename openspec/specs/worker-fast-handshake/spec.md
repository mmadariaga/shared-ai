# worker-fast-handshake Specification

## Purpose
TBD - created by archiving change worker-fast-handshake. Update Purpose after archive.
## Requirements
### Requirement: Handle-First Startup Handshake Timing

The worker SHALL return its handshake as its first non-terminal return before any expensive work, and the coordinator SHALL retain the harness-native handle before opening any guard window.

A handshake is the worker first early return carrying resumable progress before expensive work. A handle is the harness-native resumable identifier, the Claude agent ID or the opencode task_id. A guard window is one snapshot-to-verify span holding guard_base for a single dispatch-to-result stretch. Every routed worker with a declared progress plan or routing-only step map SHALL return its startup progress event as its handshake as soon as prerequisite checks pass and required change or scope resolution completes, and before dispatching any subagent, reading beyond what resolution requires, writing any artifact, or beginning any analysis, research, or review pass. A worker whose adapter declares neither a visual progress plan nor a routing-only step map emits no handshake event and its transport-captured handle is its resumable handle.

#### Scenario: Handshake precedes expensive work

- **WHEN** a routed worker with a progress plan or routing-only map passes prerequisites and resolution
- **THEN** its first non-terminal return SHALL be the handshake and no subagent dispatch, excess read, artifact write, or analysis SHALL precede it

### Requirement: Late Or Duplicate Handshake Is Non-Resumable

The pipeline SHALL treat any late or duplicate handshake as ordinary non-handshake progress that is not marked resumable.

A late or duplicate handshake is any subagent dispatch, resolution-excess read, artifact write, or analysis, research, or review pass occurring before the first non-terminal return. Only the first early return before expensive work counts as the handshake.

#### Scenario: Work before handshake loses resumability

- **WHEN** a worker dispatches a subagent or performs analysis before its first non-terminal return
- **THEN** that later return SHALL be treated as ordinary non-handshake progress and SHALL NOT be marked resumable

### Requirement: Mirrored Harness Handle Capture

Each harness binding SHALL capture and retain its native handle immediately at dispatch return before any guard snapshot or continuation, with no common syntax shared between harnesses.

The Claude binding SHALL retain the agent ID returned immediately by the Agent dispatch with run_in_background true before any guard snapshot or continuation. The opencode binding SHALL retain the task ID returned immediately by the task dispatch before any guard snapshot or continuation. A dispatch cancelled before the native ID returns leaves no handle and its retry starts from zero with a deferred snapshot. Worker-matrix expansion propagates this mirrored behavior to all generated bindings with no per-phase edits.

#### Scenario: Cancelled before handle costs no window

- **WHEN** a dispatch is cancelled before its agent ID or task ID returns
- **THEN** the coordinator SHALL retain no handle, open no guard window, run no snapshot, and retry from zero with a deferred snapshot

### Requirement: Deferred Guard Snapshot With Unchanged Verify

The guard SHALL open its snapshot window only after handle capture and SHALL verify every window as today, preserving HEAD immobility across the expensive stretch.

The coordinator SHALL run the snapshot sub-command only after the dispatch harness-native handle is captured and retained, immediately before the worker expensive work proceeds, and immediately before each same-worker continuation once its handle is retained, holding the returned head SHA as invocation-scoped guard_base for that window only. HEAD movement between dispatch and handle capture is baselined by that deferred snapshot. The coordinator SHALL run the verify sub-command with the window guard_base immediately after every returned worker result before acting on that result. Coordinator-owned mutations always run between windows and never inside one. A replacement dispatch is a new window with its own fresh snapshot. Concurrent batch dispatches are one window with snapshot at batch start once all batch handles are captured and verify at batch close.

#### Scenario: Post-handle window holds immobility

- **WHEN** a handle has been captured and retained for a dispatch-to-result stretch
- **THEN** the guard SHALL snapshot guard_base then and verify that base after every result before the coordinator acts, with no coordinator HEAD mutation inside the window


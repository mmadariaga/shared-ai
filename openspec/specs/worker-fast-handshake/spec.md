# worker-fast-handshake Specification

## Purpose
TBD - created by archiving change worker-fast-handshake. Update Purpose after archive.

## Requirements

### Requirement: Handle-First Startup Handshake Timing

The worker SHALL return event ready as its first nonterminal return before any expensive work on every routed stretch with no per-phase exemption including every RED and GREEN dispatch, and the coordinator SHALL retain the harness-native handle before opening any guard window.

A handshake is the trivial first nonterminal ready return carrying no expensive work and no task content under strict zero with no change name, flags, provenance, or derivatives. The ready return SHALL carry no summary and SHALL carry an empty changed_files list. Every routed worker SHALL return its ready handshake as soon as prerequisite checks pass and required change or scope resolution completes, and before dispatching any subagent, reading beyond what resolution requires, writing any artifact, or beginning any analysis, research, or review pass.

#### Scenario: Handshake precedes expensive work

- **WHEN** any routed worker passes prerequisites and resolution with no exemption
- **THEN** its first nonterminal return SHALL be ready and no subagent dispatch, excess read, artifact write, or analysis SHALL precede it

### Requirement: Late Or Duplicate Handshake Is Non-Resumable

The pipeline SHALL treat any late or duplicate handshake as ordinary non-handshake progress that is not marked resumable, with no per-phase exemption.

A late or duplicate handshake is any subagent dispatch, resolution-excess read, artifact write, or analysis, research, or review pass occurring before the first nonterminal return. Only the first early ready return before expensive work counts as the handshake.

#### Scenario: Work before handshake loses resumability

- **WHEN** a worker dispatches a subagent or performs analysis before its first nonterminal return
- **THEN** that later return SHALL be treated as ordinary non-handshake progress and SHALL NOT be marked resumable

### Requirement: Mirrored Harness Handle Capture

Each harness binding SHALL capture and retain its native handle immediately at dispatch return before any guard snapshot or continuation, with no common syntax shared between harnesses. Handle, then guard snapshot when no guard window is running, then task applies with no guard window opening without a captured handle.

The Claude binding SHALL retain the agent ID returned immediately by the Agent dispatch with run_in_background true before any guard snapshot or continuation. The opencode binding SHALL retain the task ID returned immediately by the task dispatch before any guard snapshot or continuation. A dispatch cancelled before the native ID returns leaves no handle, opens no guard window, and its retry starts from zero, with a deferred snapshot when no guard window is running. Worker-matrix expansion propagates this mirrored behavior to all generated bindings with no per-phase edits.

#### Scenario: Cancelled before handle costs no window

- **WHEN** a dispatch is cancelled before its agent ID or task ID returns and no guard window is running
- **THEN** the coordinator SHALL retain no handle, open no guard window, run no snapshot, and retry from zero with a deferred snapshot

### Requirement: Deferred Guard Snapshot With Unchanged Verify

The guard SHALL open its snapshot window only after handle capture and SHALL verify every window at its closing boundary, preserving HEAD immobility across the expensive stretch with no exemption.

The coordinator SHALL run the snapshot sub-command only after the first dispatch's harness-native handle is captured and retained, immediately before the worker's expensive work proceeds, holding the returned head SHA as invocation-scoped guard_base for that window; later dispatches and same-worker continuations inside a running window SHALL take no new snapshot. HEAD movement between dispatch and handle capture is baselined by that deferred snapshot. The coordinator SHALL run the verify sub-command with the window guard_base immediately before each boundary the no-commit-guard policy lists (human turn, coordinator git mutation, run close) and before acting on it. Coordinator-owned mutations always run between windows and never inside one. A replacement dispatch inherits the running window's guard_base with no new snapshot. A concurrent batch dispatch sits inside one window: a running window continues through it, otherwise the snapshot runs at batch start once all batch handles are captured, and the verify runs at batch close when that close is a boundary, with no batching that breaks withholding.

#### Scenario: Post-handle window holds immobility

- **WHEN** a handle has been captured and retained for the first dispatch of a guard window
- **THEN** the guard SHALL snapshot guard_base then and verify that base immediately before the window's closing boundary, before the coordinator acts, with no coordinator HEAD mutation inside the window

### Requirement: Literal ready example preserves handle-first handshake timing
Adding the literal ready example to the initial dispatch prompt SHALL NOT alter handle-first timing: every routed worker SHALL still return event ready as its first nonterminal return before any expensive work with empty changed_files, and the coordinator SHALL still retain the harness-native handle before any guard snapshot.

#### Scenario: Example leaves timing unchanged
- **WHEN** any routed worker opens a stretch with the example-bearing prompt
- **THEN** its first return SHALL be ready before any subagent dispatch, excess read, artifact write, or analysis

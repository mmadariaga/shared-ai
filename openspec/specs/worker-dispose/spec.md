# worker-dispose Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Dispose is a dispatcher action

Dispose SHALL be an action of the dispatcher on the handle it captured at dispatch, stopping an agent's warming without a model turn: on Claude Code `TaskStop(task_id: <agent ID>)`; on opencode `shell.remove` of the outstanding shell of the agent's session followed by `session.interrupt` of that session. When neither is reachable, the dispatcher SHALL send the message `dispose`. Disposing an unknown, finished, or already disposed agent SHALL be a silent no-op.

#### Scenario: Claude Code dispose
- **WHEN** a Claude Code coordinator disposes a worker
- **THEN** it calls `TaskStop` with the worker's captured agent ID

#### Scenario: opencode API unreachable
- **WHEN** an opencode coordinator cannot reach the session API from its session
- **THEN** it sends the message `dispose` to the worker instead

#### Scenario: Disposing a finished agent
- **WHEN** a dispatcher disposes an agent that already finished or was already disposed
- **THEN** nothing happens and no error is reported

### Requirement: Coordinators dispose workers at close points

Coordinators SHALL dispose each long-lived worker at run close, at a segment boundary before the following segment starts, and when a new worker replaces it. A worker paused on a pending `needs_input` question SHALL stay armed until the answer. The implement, build, plan (and its cycle), deep-review, review, spec, design, audit, and explore Direct Build coordinator cards SHALL fetch `@sai/policies/cache-warming.md`, resolve each worker's timings at every message to it, and dispose their workers at these points.

#### Scenario: Segment boundary in a composite run
- **WHEN** a `/sai-build` segment ends and the next segment is about to start
- **THEN** the finished segment's workers are disposed before the next segment starts

#### Scenario: Pending question keeps the worker armed
- **WHEN** a worker returns `needs_input` and the coordinator escalates the question to the user
- **THEN** the coordinator does not dispose the worker until the answer is forwarded

#### Scenario: Implement close
- **WHEN** `/sai-3-implement` reaches Close
- **THEN** the coordinator disposes the RED and GREEN workers and the live explorer before emitting the `close` event

#### Scenario: Direct Build worker hand-offs
- **WHEN** the explore Direct Build route finishes Step 2b and later Step 6
- **THEN** the coordinator disposes the implementer after Step 2b, the backfill worker after Step 6, and every worker still armed at Close

# worker-dispose Specification

## Purpose
TBD - created by archiving change subagent-cache-warming-core. Update Purpose after archive.

## Requirements

### Requirement: Dispose is a dispatcher action

Dispose SHALL be an action of the dispatcher on the handle it captured at dispatch, stopping an agent's warming without a model turn: on Claude Code `TaskStop(task_id: <agent ID>)`; on opencode `shell.remove` of the outstanding shell of the agent's session followed by `session.interrupt` of that session. When neither is reachable, the dispatcher SHALL send the message `dispose`. The dispatcher SHALL dispose only a handle whose latest real message declared `warming: true`; for any other handle (declared `false`, no declaration, or a lost value) it SHALL do nothing: no stop call, no shell removal, and no `dispose` message. With the warming setting `off` nothing is armed, so nothing SHALL be disposed. A dispose after a `warming: true` declaration that finds nothing left to stop, because the `max` window expired first, SHALL be expected and harmless: it SHALL NOT be an obstacle, SHALL spend no attempt, and SHALL NOT be retried. The same rule SHALL apply on Claude Code and opencode.

#### Scenario: Claude Code dispose
- **WHEN** a Claude Code coordinator disposes a worker whose latest message declared `warming: true`
- **THEN** it calls `TaskStop` with the worker's captured agent ID

#### Scenario: opencode API unreachable
- **WHEN** an opencode coordinator disposes a worker whose latest message declared `warming: true` and cannot reach the session API from its session
- **THEN** it sends the message `dispose` to the worker instead

#### Scenario: Disposing a finished agent
- **WHEN** a dispatcher reaches a dispose point for an agent whose latest real message declared `warming: false` or carried no declaration
- **THEN** it makes no stop call, removes no shell, and sends no `dispose` message

#### Scenario: Window expired before the dispose
- **WHEN** a dispatcher disposes an agent that declared `warming: true` and the stop finds nothing running because the `max` window expired
- **THEN** the result is not an obstacle, spends no attempt, and is not retried

### Requirement: Coordinators dispose workers at close points

Coordinators SHALL dispose each long-lived worker whose latest declaration is `warming: true` at run close, at a segment boundary before the following segment starts, and when a new worker replaces it, under the Dispose rule of `@sai/policies/cache-warming.md`. A worker paused on a pending `needs_input` question SHALL stay armed until the answer. The implement, build, plan (and its cycle), deep-review, review, spec, design, audit, and explore Direct Build coordinator cards SHALL fetch `@sai/policies/cache-warming.md`, resolve each worker's timings at every message to it, keep their dispose points, and dispose their workers at these points only under that rule. An executor SHALL never arm and SHALL NOT be disposed.

#### Scenario: Segment boundary in a composite run
- **WHEN** a `/sai-build` segment ends and the next segment is about to start
- **THEN** the finished segment's workers that declared `warming: true` are disposed before the next segment starts

#### Scenario: Pending question keeps the worker armed
- **WHEN** a worker returns `needs_input` and the coordinator escalates the question to the user
- **THEN** the coordinator does not dispose the worker until the answer is forwarded

#### Scenario: Implement close
- **WHEN** `/sai-3-implement` reaches Close
- **THEN** the coordinator disposes, before emitting the `close` event, each of the RED and GREEN workers and the live explorer whose latest message declared `warming: true`

#### Scenario: Direct Build worker hand-offs
- **WHEN** the explore Direct Build route finishes Step 2b and later Step 6
- **THEN** the coordinator applies the Dispose rule to the implementer after Step 2b, to the backfill worker after Step 6, and to every worker still armed at Close, and disposes no executor

# opencode-subagent-calls Specification

## Purpose
TBD - created by archiving change opencode-v2-subagent-only. Update Purpose after archive.

## Requirements

### Requirement: opencode instructions create subagents with the v2 subagent tool in background mode
Every installable opencode instruction that creates a subagent SHALL use the opencode v2 `subagent` tool as `subagent(agent: <agent>, description: <role label>, prompt: <prompt>, background: true)`, and SHALL NOT name the opencode v1 `task` tool or `task_id`. The `description` SHALL be a short fixed role label: `{{phase}} worker` in the opencode worker binding template, and the agent name (`budget-explorer`, `budget-executor`, `budget-subagent`) in the opencode budget skills. The dispatcher SHALL capture the `sessionID` the call returns as the subagent's handle.

#### Scenario: Binding template creates the worker in the background
- **WHEN** the opencode standalone worker binding template is rendered for a worker
- **THEN** its create call is `subagent(agent: "<worker name>", description: "<phase> worker", prompt: <ready prompt>, background: true)` and the returned `sessionID` is the worker's handle for the run

#### Scenario: Budget skill names the v2 dispatch
- **WHEN** an opencode `budget-explorer`, `budget-executor`, or `budget-subagent` skill is read by a dispatcher
- **THEN** it names `subagent(agent: "<agent name>", description: "<agent name>", prompt: <prompt>, background: true)` and no `task` tool call

### Requirement: opencode continuations reuse the creation agent and the captured sessionID
Every opencode continuation SHALL be `subagent(agent: <agent used at creation>, description: <role label>, sessionID: <captured sessionID>, prompt: <message>, background: true)`. A continuation without `agent` SHALL be treated as invalid. A dispatcher SHALL continue an opencode subagent only after that subagent's completion notification has arrived, and SHALL NOT sleep, poll, or continue a subagent whose last status is `running`, with one exception stated in the opencode standalone worker binding template: a `running` notification whose background-work list holds only `wait.js warm` commands (every entry is the worker's own cache-warm wait) SHALL mark an idle worker, whose message the coordinator SHALL process (a report reference, or a reply without one under `sai/policies/worker-report-transport.md` § Undelivered reports) and which it MAY continue. When the harness refuses such a continuation, the refusal SHALL be one attempt of the step's obstacle: the coordinator SHALL stop the worker's shells with `dispose-shells.js` (which also ends its cache warming) and send the continuation again, and a further failure SHALL follow the replacement and escalation of `sai/policies/obstacle-escalation.md`. The Claude Code worker binding template SHALL stay unchanged, because Claude Code has no `running` notification state.

#### Scenario: Worker continuation carries agent and sessionID
- **WHEN** an opencode coordinator sends a task message to a worker it created
- **THEN** it calls `subagent` with the same `agent` used at creation, the captured `sessionID`, and `background: true`

#### Scenario: No continuation while the subagent is running
- **WHEN** an opencode subagent's last status is `running` with background work other than its own `wait.js warm`, and its completion notification has not arrived
- **THEN** the dispatcher sends it no continuation and does not poll it

#### Scenario: A worker running only its cache-warm wait is idle
- **WHEN** an opencode worker's `running` notification lists only `wait.js warm` commands as background work
- **THEN** the coordinator processes the worker's message and may continue it

#### Scenario: A refused continuation is recovered through dispose-shells
- **WHEN** the harness refuses the continuation of a worker that still reports `running`
- **THEN** the coordinator counts one obstacle attempt, removes the worker's shells with `dispose-shells.js`, and sends the continuation again

### Requirement: Background completion notifications are matched by sessionID
An opencode dispatcher SHALL await each background subagent's completion notification on its own turn, and SHALL dispatch in the background only from a main agent, routed SAI coordinator, or routed SAI worker whose lifetime outlives the child. When several opencode subagents are started in one turn, each SHALL be tracked by its own `sessionID`, and each completion notification SHALL be matched to its subagent by that `sessionID`, in any arrival order. A worker that dispatches its own helper SHALL wait for the helper's completion notification within its own turn before returning its result.

#### Scenario: Parallel audit workers settle in any order
- **WHEN** `/sai-deep-review` creates several opencode audit workers in one turn
- **THEN** each worker is tracked by its own `sessionID` and each completion notification is matched to its worker by that `sessionID`, whatever order they arrive in

#### Scenario: Backfill worker waits for its conflict-scan helper
- **WHEN** the backfill worker dispatches its `budget-explorer` conflict scan in the background
- **THEN** it waits for the helper's completion notification within its own turn and uses the result only after it has arrived

### Requirement: Disposing or stopping an opencode subagent interrupts its session by sessionID
Disposing an opencode worker SHALL remove the outstanding shell of its session and then interrupt that session through the session API (`api/session/:sessionID/interrupt`), both with the captured `sessionID`, falling back to the `dispose` message when the API is not reachable. This dispose SHALL apply to every worker at the points of `sai/policies/worker-lifecycle.md`, whatever the warming setting and the worker's latest `warming` declaration. When the user abandons a running explore route, the opencode session SHALL stop a still-running worker through the session interrupt of its captured `sessionID`.

#### Scenario: Dispose through the session API
- **WHEN** an opencode coordinator disposes a worker, whatever its latest `warming` declaration, and the session API is reachable
- **THEN** it removes the worker session's outstanding shell and interrupts the session at `api/session/:sessionID/interrupt` with the captured `sessionID`

#### Scenario: Session API unreachable
- **WHEN** an opencode coordinator disposes a worker and the session API is not reachable
- **THEN** it sends the worker the `dispose` message

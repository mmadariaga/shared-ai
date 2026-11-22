# claude-continuation-timing Specification

## Purpose
TBD - created by archiving change claude-continuation-after-turn-end. Update Purpose after archive.

## Requirements

### Requirement: Claude Code continuations wait for the completed notification

On Claude Code, a coordinator or dispatcher SHALL send a continuation (`SendMessage` to the captured agent ID) to a routed worker, a budget helper, or the `/sai-explore` explorer only after that agent's `task-notification` with `status: completed` for the turn that returned the message being answered has arrived, whatever the notification's summary. A handback (the `ready` reply or a report reference) alone SHALL NOT mark the turn as ended. The rule SHALL be stated in the `## Continue` section of `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`, the `## Dispatch mode` section of `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, and `skills/claude/budget-subagent/SKILL.md`, and the Claude Code continuation of the explorer two-phase startup in `sai/commands/explore/body.md`.

#### Scenario: Handback before the notification
- **WHEN** a Claude Code coordinator receives a worker's `ready` reply or report reference and the `completed` notification of that turn has not arrived
- **THEN** it sends no continuation to that worker until the `completed` notification arrives

#### Scenario: Explorer continuation after ready and between searches
- **WHEN** a `/sai-explore` session on Claude Code continues its explorer after the ready reply or for a later search
- **THEN** it sends the `SendMessage` only after that explorer's `completed` task notification, matched by task ID, has arrived

### Requirement: A completed notification ends the turn whatever its background work

A `completed` notification whose summary says the agent is waiting on its own background work, such as its armed cache-warm wait, SHALL end the turn: the coordinator SHALL send the continuation without waiting for that background work to finish. A `completed` notification that says the agent has not reported yet SHALL NOT be a result: the coordinator SHALL send no continuation and SHALL keep waiting for the handback under the recovery rules that already apply.

#### Scenario: Agent waiting on its cache-warm wait
- **WHEN** the `completed` notification of a worker's turn says the worker is waiting on its own background work
- **THEN** the coordinator sends the continuation without waiting for that background work

#### Scenario: Notification without a handback
- **WHEN** a `completed` notification says the worker has not reported yet
- **THEN** the coordinator sends no continuation and keeps waiting for the handback

### Requirement: Notifications are matched by task ID

When several Claude Code agents run at once, each continuation SHALL wait for the notification of its own agent, matched by task ID, and another agent's notification SHALL release nothing. Dispatchers SHALL NOT sleep or poll while waiting.

#### Scenario: Parallel agents
- **WHEN** two budget helpers run at once and the `completed` notification of one arrives
- **THEN** only that helper may receive a continuation, and the other helper waits for its own notification

### Requirement: Stop calls and opencode dispatch keep their current rules

A stop call at a dispose point (`TaskStop`) SHALL NOT be a continuation and SHALL NOT wait for a notification. Agents routed through `opencode-dispatch.js` and every opencode-harness dispatch SHALL keep their current sequential-turn rules unchanged, and the worker contracts and the ready prompt SHALL stay unchanged.

#### Scenario: Dispose without waiting
- **WHEN** a Claude Code coordinator reaches a dispose point for a worker whose `completed` notification has not arrived
- **THEN** it issues the `TaskStop` without waiting for the notification

#### Scenario: opencode-routed agent
- **WHEN** a Claude Code coordinator continues an agent whose route query answered `opencode`
- **THEN** the continuation follows `sai/policies/opencode-dispatch.md` unchanged

# claude-continuation-timing Specification

## Purpose
TBD - created by archiving change claude-continuation-after-turn-end. Update Purpose after archive.

## Requirements

### Requirement: A completed notification ends the turn whatever its background work

While a Claude Code coordinator waits for the `completed` notification of a rejected turn, a `completed` notification whose summary says the agent is waiting on its own background work, such as its armed cache-warm wait, SHALL end the turn: the coordinator SHALL resend the message without waiting for that background work to finish. A `completed` notification that says the agent has not reported yet SHALL NOT be a result: the coordinator SHALL send no message because of it and SHALL keep waiting for the handback under the recovery rules that already apply.

#### Scenario: Agent waiting on its cache-warm wait
- **WHEN** the `completed` notification of a worker's rejected turn says the worker is waiting on its own background work
- **THEN** the coordinator resends the message without waiting for that background work

#### Scenario: Notification without a handback
- **WHEN** a `completed` notification says the worker has not reported yet
- **THEN** the coordinator sends no message because of it and keeps waiting for the handback

### Requirement: Notifications are matched by task ID

When several Claude Code agents run at once, each rejected continuation SHALL wait only for the `completed` notification of its own agent, matched by task ID, and another agent's notification SHALL release nothing. Dispatchers SHALL NOT sleep or poll while waiting.

#### Scenario: Parallel agents
- **WHEN** two budget helpers run at once, the message to one of them is rejected, and the `completed` notification of the other arrives
- **THEN** that notification releases no resend, and the rejected helper waits for its own notification

### Requirement: Stop calls and opencode dispatch keep their current rules

A stop call at a dispose point (`TaskStop`) SHALL NOT be a continuation and SHALL NOT wait for a notification. opencode as the main harness, and agents routed through `opencode-dispatch.js`, SHALL keep their current rule of continuing a subagent only after its turn has ended, and the opencode dispatch sources (`sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`, `skills/opencode/budget-*/SKILL.md`, and `sai/policies/opencode-dispatch.md`) SHALL stay unchanged. The worker contracts and the ready prompt SHALL stay unchanged.

#### Scenario: Dispose without waiting
- **WHEN** a Claude Code coordinator reaches a dispose point for a worker whose `completed` notification has not arrived
- **THEN** it issues the `TaskStop` without waiting for the notification

#### Scenario: opencode-routed agent
- **WHEN** a Claude Code coordinator continues an agent whose route query answered `opencode`
- **THEN** the continuation follows `sai/policies/opencode-dispatch.md` unchanged

#### Scenario: opencode main harness
- **WHEN** an opencode coordinator continues a worker it created
- **THEN** it sends the continuation only after the worker's completion notification has arrived

### Requirement: Claude Code continuations use an optimistic send

On Claude Code, a coordinator or dispatcher SHALL send each continuation (`SendMessage` to the captured agent ID) to a routed worker, a budget helper, or the `/sai-explore` explorer as an optimistic send: as soon as the subagent's handback (`event: ready`, a report reference, or a helper's text) arrives, without waiting for the subagent's `completed` notification. This covers the task after `ready`, a later step brief, a fix round, and a follow-up search to a helper. A `completed` notification that arrives after an accepted optimistic send SHALL NOT be a result and SHALL trigger no message.

#### Scenario: Task sent on the ready handback
- **WHEN** a Claude Code coordinator receives a worker's `event: ready` and the `completed` notification of that turn has not arrived
- **THEN** it sends the task to that worker with `SendMessage` at once

#### Scenario: Late notification after an accepted send
- **WHEN** the `completed` notification of a subagent's earlier turn arrives after the coordinator's optimistic send was answered normally
- **THEN** the coordinator sends nothing because of that notification

### Requirement: A rejected continuation is resent once after its completed notification

A continuation SHALL be rejected when the subagent's reply repeats its previous handback (`event: ready` again, or a report reference the coordinator already accepted) instead of answering the new message. After a rejected continuation, the Claude Code coordinator SHALL wait for the `completed` notification (`task-notification` with `status: completed`, whatever its summary) of the turn that returned the repeated reply, matched to the subagent by task ID, and SHALL send the same message again once. When that notification has already arrived by the time the rejection is read, the coordinator SHALL resend at once. A second rejection of the same message SHALL be an obstacle of the current step under `sai/policies/obstacle-escalation.md`, with its existing budget, and a helper whose message is rejected twice SHALL count as a failed helper dispatch. When the `completed` notification of a rejected turn never arrives, the run SHALL wait under the recovery rules that already apply (the report watch for workers, the obstacle budget); no timer, wake process, or tool subcommand SHALL be added.

#### Scenario: Repeated ready after the task
- **WHEN** a worker answers the task message with `event: ready` again and the `completed` notification of that turn has not arrived
- **THEN** the coordinator waits for that notification, matched by task ID, and sends the same task message once more

#### Scenario: Notification already arrived
- **WHEN** the `completed` notification of the rejected turn has already arrived when the coordinator reads the rejection
- **THEN** the coordinator resends the same message at once

#### Scenario: Second rejection
- **WHEN** the resent message is rejected again
- **THEN** the coordinator handles it as an obstacle of the current step under `sai/policies/obstacle-escalation.md`, or counts a helper as a failed helper dispatch

### Requirement: Claude Code continuation timing has a single source

The Claude Code continuation timing (the optimistic send, the rejection signal, the single resend after the matching `completed` notification, the second-rejection obstacle, and the opencode exception) SHALL be stated once, in the `## Continuation timing` section of `sai/policies/worker-lifecycle.md`. The `## Continue` section of `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`, the `## Dispatch mode` section of `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, and `skills/claude/budget-subagent/SKILL.md`, the Claude Code continuation of the explorer two-phase startup in `sai/commands/explore/body.md`, and the Claude Code continuation of `sai/commands/implement/coordinator.md`, `sai/commands/review/coordinator.md`, `sai/commands/audit/coordinator.md`, and `sai/commands/plan/cycle.md` SHALL point to that section and SHALL NOT restate a completed-notification gate. A test SHALL check this single sourcing.

#### Scenario: Claude Code site points to the section
- **WHEN** one of the listed Claude Code dispatch sites is read
- **THEN** it names `sai/policies/worker-lifecycle.md` § Continuation timing and carries no completed-notification gate of its own

#### Scenario: Coordinators keep the opencode wait
- **WHEN** the implement, review, or audit coordinator, or the plan cycle, describes how it continues a worker
- **THEN** it points to § Continuation timing for Claude Code and keeps "after the worker's completion notification has arrived" for opencode only

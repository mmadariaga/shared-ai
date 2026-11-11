# subagent-warming-declaration Specification

## Purpose
TBD - created by archiving change dispose-on-declared-warming. Update Purpose after archive.

## Requirements

### Requirement: Every real subagent message declares its warming state

Every real message a subagent sends to its dispatcher SHALL carry its own line `warming: true` or `warming: false`, stating whether its cache-warming wait is armed when it sends that message. The subagent SHALL arm first and then write the message, so `true` is declared only after the arm succeeded. A subagent SHALL declare `warming: false` when no warming switch reached it, when its `begin` returned `off` (every message while the warming setting is `off`), and when arming failed or was refused. A result, a step report, or a `needs_input` question that keeps the wait armed SHALL declare `warming: true`. A `budget-executor` result SHALL end with `warming: false`. The line SHALL be a diagnostic: it SHALL gate no stop and no dispatch, the dispatcher SHALL keep no value for it, and a message without the line SHALL be read the same way. A real message is any message to or from an agent except the `ok` of a wake, the `ok` of a `dispose`, and a wake's repeat of the last result. `sai/policies/cache-warming.md` SHALL define this diagnostic under `## Warming diagnostic`, for Claude Code and opencode alike.

#### Scenario: Warming setting off
- **WHEN** the warming setting resolves to `off` and a worker returns a step report
- **THEN** the report message declares `warming: false` and the worker arms nothing

#### Scenario: Worker expecting more work with warming active
- **WHEN** the latest task message carried the warming switch and the worker returns a `needs_input` question
- **THEN** the worker arms its wait before replying and the message declares `warming: true`

#### Scenario: Terminal result
- **WHEN** a worker whose `begin` returned timings returns a `completed`, `failed`, or `cancelled` result
- **THEN** the worker arms its wait before replying and the message declares `warming: true`

#### Scenario: Arming fails
- **WHEN** arming fails because there is no shell, a permission is refused, or `wait.js` is missing
- **THEN** that same message declares `warming: false`

### Requirement: Report-path workers declare beside the path

A worker that returns only the path or reference of its report SHALL write the `warming: true|false` line beside that path in its message and SHALL NOT write it inside the report file, because arming happens after the report is written.

#### Scenario: Path-only report
- **WHEN** a worker writes its report file and returns its path
- **THEN** the message carries the path and the `warming` line, and the report file carries no `warming` field

### Requirement: Messages without a warming line arm nothing

When a real message carrying no warming switch reaches a subagent whose wait is armed (for example, a one-shot helper task), the subagent SHALL handle it as normal work and SHALL arm nothing afterwards; the earlier wait SHALL end at its next wake or at the subagent's dispose.

#### Scenario: Helper receives a work order while armed
- **WHEN** a helper whose wait is armed receives a new task message with no warming switch
- **THEN** it completes the task and arms no new wait

# subagent-warming-declaration Specification

## Purpose
TBD - created by archiving change dispose-on-declared-warming. Update Purpose after archive.

## Requirements

### Requirement: Every real subagent message declares its warming state

Every real message a subagent sends to its dispatcher SHALL carry its own line `warming: true` or `warming: false`, stating whether its cache-warming wait is armed when it sends that message. The subagent SHALL arm first and then write the message, so `true` is declared only after the arm succeeded. A subagent SHALL declare `warming: false` when its latest task message carried no `Warming:` line (every message while the warming setting is `off`), when arming failed or was refused, and in a final response (`completed`, `failed`, `cancelled`). A step report or a `needs_input` question that keeps the wait armed SHALL declare `warming: true`. A real message is any subagent message other than the `ok` reply of a wake or of a `dispose`. `sai/policies/cache-warming.md` SHALL define this declaration under `## Warming declaration`, for Claude Code and opencode alike.

#### Scenario: Warming setting off
- **WHEN** the warming setting resolves to `off` and a worker returns a step report
- **THEN** the report message declares `warming: false` and the worker arms nothing

#### Scenario: Worker expecting more work with warming active
- **WHEN** the latest task message carried a `Warming:` line and the worker returns a `needs_input` question
- **THEN** the worker arms its wait before replying and the message declares `warming: true`

#### Scenario: Terminal result
- **WHEN** a worker returns a `completed`, `failed`, or `cancelled` result
- **THEN** the message declares `warming: false` and the worker arms nothing

#### Scenario: Arming fails
- **WHEN** arming fails because there is no shell, a permission is refused, or `wait.js` is missing
- **THEN** that same message declares `warming: false`

### Requirement: Absent or lost declarations count as false

The `ready` reply of the two-phase startup SHALL carry no warming field and SHALL count as `warming: false`, because that dispatch never carries the `Warming:` line. A real message with no `warming` field (for example, from a worker installed at an earlier version) SHALL count as `warming: false`. The dispatcher SHALL keep the latest declared value of each handle in conversation state only, never in the `sai-state` store, and a value lost to a compaction or a resumed run SHALL count as `false`.

#### Scenario: Message from an older worker
- **WHEN** a dispatcher receives a real message that carries no `warming` field
- **THEN** it records that handle's latest value as `warming: false`

#### Scenario: Value lost to a compaction
- **WHEN** the dispatcher resumes after a compaction and no longer holds a handle's latest declaration
- **THEN** it treats that handle as `warming: false`

### Requirement: Wake replies leave the declaration unchanged

A wake reply `ok` SHALL NOT be a real message: it SHALL carry no warming field and SHALL leave the handle's latest declared value unchanged.

#### Scenario: Wake after a true declaration
- **WHEN** a worker that declared `warming: true` replies `ok` to a wake
- **THEN** the dispatcher keeps `warming: true` as that worker's latest declaration

### Requirement: Report-path workers declare beside the path

A worker that returns only the path or reference of its report SHALL write the `warming: true|false` line beside that path in its message and SHALL NOT write it inside the report file, because arming happens after the report is written.

#### Scenario: Path-only report
- **WHEN** a worker writes its report file and returns its path
- **THEN** the message carries the path and the `warming` line, and the report file carries no `warming` field

### Requirement: Messages without a warming line arm nothing

When a real message carrying no `Warming:` line reaches a subagent whose wait is armed (for example, a helper's task message), the subagent SHALL handle it as normal work and SHALL arm nothing afterwards; the earlier wait SHALL end at its next wake.

#### Scenario: Helper receives a work order while armed
- **WHEN** a helper armed by a `warm-up` receives a new task message with no `Warming:` line
- **THEN** it completes the task, declares `warming: false`, and arms no new wait

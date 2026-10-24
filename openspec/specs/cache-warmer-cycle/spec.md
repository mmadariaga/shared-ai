# cache-warmer-cycle Specification

## Purpose
Define same-conversation background waits, fixed-time completion, interruption handling, and honest cache-benefit limitations.

## Requirements

### Requirement: One main-conversation wait per invocation

Each helper wait invocation SHALL perform one logical JavaScript-timer wait, limited to the smaller of the interval and the time remaining until the fixed closing instant. The main agent SHALL launch each invocation in the same conversation as a native background shell task using Claude Code's `run_in_background` or opencode's `background`, with an execution limit covering the interval plus one minute or disabled where supported. Native completion notifications SHALL return control to that main agent; the activity SHALL use no subagent, session API, polling, scheduler, or independent repeated script loop.

#### Scenario: Interval completes before closing
- **WHEN** one wait completes before closing time
- **THEN** the helper returns `continue` and the main agent launches a new wait tool invocation with the unchanged state after receiving the completion notification.

#### Scenario: Final wait is shorter
- **WHEN** less than one interval remains before closing
- **THEN** the helper waits only for the remaining duration and returns `finished` upon reaching closing time.

#### Scenario: Closing time is already reached or wake-up is late
- **WHEN** the helper checks the clock at or beyond closing time, including after a late wake-up
- **THEN** it returns `finished` without launching another wait.

### Requirement: Interruption and capability limits

Cancellation SHALL stop the activity and cancel an outstanding native background task when needed. A tool failure or allowance block SHALL prevent further waits and SHALL be reported when possible. If background execution or its required timeout is unsupported, the skill SHALL report the limitation and stop rather than poll.

#### Scenario: Wait fails
- **WHEN** a wait invocation fails or further requests are blocked
- **THEN** no further wait is launched and the interruption is reported when possible.

#### Scenario: Background wait unavailable
- **WHEN** the harness cannot support the required background wait or execution limit
- **THEN** the skill reports that limitation and stops without periodic status checks.

### Requirement: Completion and benefit boundaries

Before waiting, the skill SHALL show the interval and local closing time and warn once that periodic requests consume allowance, can be blocked, and do not guarantee cache retention or savings. It SHALL disclose possible completion delays from notifications, scheduling, or suspension. On completion it SHALL briefly notify the user and leave previous substantive work paused.

#### Scenario: Activity finishes
- **WHEN** the helper reports `finished`
- **THEN** the skill notifies the user and does not automatically resume the previous task.

#### Scenario: User chooses an interval
- **WHEN** the resolved activity is ready to start
- **THEN** the skill warns that cache retention and savings are unverified rather than claiming the selected interval preserves provider cache.

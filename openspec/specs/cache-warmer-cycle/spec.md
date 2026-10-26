# cache-warmer-cycle Specification

## Purpose
Define same-conversation background waits, fixed-time completion, interruption handling, and honest cache-benefit limitations.

## Requirements

### Requirement: One main-conversation wait per invocation

Each helper wait invocation SHALL perform one logical JavaScript-timer wait, limited to the smaller of the interval and the time remaining until the fixed closing instant. The main agent SHALL launch each invocation in the same conversation as a native background shell task using Claude Code's `run_in_background` or opencode's `background`, according to the active harness's actual background-task behavior. An execution timeout SHALL be relevant only when the harness enforces it on background tasks; a foreground execution limit SHALL NOT be a prerequisite for launching a background wait. Native completion notifications SHALL return control to that main agent; the activity SHALL use no subagent, session API, polling, scheduler, or independent repeated script loop. The activity SHALL retain `wait.js` as its preparation and wait mechanism.

#### Scenario: Interval completes before closing
- **WHEN** one wait completes before closing time
- **THEN** the helper returns `continue` and the main agent launches a new wait tool invocation with the unchanged state after receiving the completion notification.

#### Scenario: Final wait is shorter
- **WHEN** less than one interval remains before closing
- **THEN** the helper waits only for the remaining duration and returns `finished` upon reaching closing time.

#### Scenario: Closing time is already reached or wake-up is late
- **WHEN** the helper checks the clock at or beyond closing time, including after a late wake-up
- **THEN** it returns `finished` without launching another wait.

#### Scenario: Foreground limit does not apply to background waits
- **WHEN** the active harness does not enforce its foreground execution limit on background tasks
- **THEN** the main agent launches the native background wait without treating that limit as a prerequisite.

### Requirement: Interruption and capability limits

Cancellation SHALL stop the activity and cancel an outstanding native background task when needed. The main agent SHALL own continuation and recovery within the same conversation until the fixed closing time or user cancellation. It SHALL treat an interrupted wait as an obstacle rather than completion, and SHALL use judgment to recover and adapt while preserving the original state, including the fixed closing time. A tool failure or an inapplicable execution-limit requirement SHALL NOT by itself end the activity. Exceptional recovery SHALL remain the agent's responsibility rather than a prescribed retry policy in the script. If the environment prevents further activity, the agent SHALL report the interruption when possible without claiming completion, and SHALL continue toward the same closing time when control becomes available again.

#### Scenario: Wait fails
- **WHEN** a wait invocation fails or further requests are blocked
- **THEN** the main agent treats the interruption as an obstacle, preserves the original state and fixed closing time, uses judgment to recover when possible, and reports an environmental interruption without claiming completion when further activity is prevented.

#### Scenario: Background wait unavailable
- **WHEN** the harness cannot currently support the native background wait or an applicable execution limit
- **THEN** the main agent uses judgment to recover without periodic status checks, reports an environmental interruption when further activity is prevented without claiming completion, and continues toward the same fixed closing time when control returns.

#### Scenario: Recovery preserves the goal
- **WHEN** control returns after an interruption before the original fixed closing time and the user has not cancelled
- **THEN** the main agent continues toward that same closing time using the original state rather than restarting the duration.

### Requirement: Completion and benefit boundaries

Before waiting, the skill SHALL show the interval and local closing time and warn once that periodic requests consume allowance, can be blocked, and do not guarantee cache retention or savings. It SHALL disclose possible completion delays from notifications, scheduling, or suspension. The activity SHALL complete only when the fixed closing time is reached or the user cancels. On completion it SHALL briefly notify the user and leave previous substantive work paused.

#### Scenario: Activity finishes
- **WHEN** the helper reports `finished`
- **THEN** the skill notifies the user and does not automatically resume the previous task.

#### Scenario: User chooses an interval
- **WHEN** the resolved activity is ready to start
- **THEN** the skill warns that cache retention and savings are unverified rather than claiming the selected interval preserves provider cache.

#### Scenario: User cancels
- **WHEN** the user cancels the activity before the fixed closing time
- **THEN** the main agent ends the activity, cancels an outstanding native background task if needed, briefly notifies the user, and leaves previous substantive work paused.

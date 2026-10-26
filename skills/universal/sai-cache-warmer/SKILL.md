---
name: sai-cache-warmer
description: Keep this conversation active with periodic waits until a local target time plus one minute; cache retention and savings are not guaranteed.
disable-model-invocation: true
---

# Cache warmer

## Goal

Run only at the user's explicit request for `/sai-cache-warmer` or this workflow.
Keep this conversation active until the fixed closing time or user cancellation.
The main agent owns continuation and recovery throughout that activity; an
interrupted wait is an obstacle to the goal, not completion. Provider, model, subscription and
configuration stay unchanged; no subagent or session API is involved.

## Resolve values

Use `wait.js` beside this installed skill. Run `node "<script-path>" prepare`
with a JSON object on stdin: `{"arguments":"30 min 18:00"}`. Pass the user's
arguments unchanged through a quoted heredoc or safe stdin writer, never shell
interpolation. Empty arguments are allowed. The script accepts a positive
interval (seconds, minutes or hours; a bare number means minutes), a local
`HH:mm` target, `YYYY-MM-DD HH:mm`, or `now + 1h` (also 2h and 3h).
Named `interval` and `target` JSON fields override their respective arguments.

For `needs_input`, preserve all returned `values` (including `resolved_target`,
the exact already-selected target instant) and ask only for the named `fields`:

- Interval: **5 min**, **15 min**, **45 min**.
- Target: **now + 1h**, **now + 2h**, **now + 3h**.

Use Claude Code's `AskUserQuestion` with its automatic free-text Other entry,
or OpenCode's `question` with custom/free-text entry enabled. Each question
explains which value is missing or invalid; include the script's reason and the
other valid value. Offer exactly those three presets, with no extra free-text
option and no chat-rendered menu. Send the answer in the corresponding named
field along with the preserved values, and run `prepare` again.

For `confirm_date`, show `target_local` and ask through the same native picker
whether to use that date: **Yes**, **No**. On Yes, pass the returned `values`
with `date` set to `proposed_date` to `prepare`; this preserves the resolved
target even if midnight passes while waiting for an answer. On No, ask for the
target again with the three target presets and native free-text entry, retaining
only the valid interval and discarding the old target and its `resolved_target`.
An explicit date needs no confirmation. Cancellation ends the activity.

When `ready`, retain the returned `state` unchanged for the whole cycle. Show
the resolved interval and local closing time (target plus one minute), and warn
once: periodic requests consume allowance; provider cache retention and savings
are unverified. Further requests may be blocked before allowance recovers.
No additional approval question is required.

## Wait and continue

Run `node "<script-path>" wait` with `state` as JSON on stdin. Each call waits
once, at most the interval or time remaining until the fixed closing time.
Launch it as a native background shell task: Claude Code Bash
`run_in_background: true`; OpenCode shell `background: true`. Use the actual
background-task behavior of the active harness. An execution timeout is relevant
only if that harness enforces it on background tasks; a foreground execution
limit is not a prerequisite for launching a background wait.

After launch, yield the turn and await the native completion notification.
Use the completed task's output (retrieve it once if the notification omits it).
No periodic status checks, scheduler, shell sleep loop, or independent repeated
script loop: the next invocation is always a new tool call by the main agent
in this same conversation. On `continue`, launch the next `wait` with the same
state. Keep `wait.js` as the preparation and wait mechanism; it rechecks the
clock before each wait and reports `finished` when the fixed closing time has
been reached, including at startup or after a late wake-up.

## Recovery and completion

Use your judgment to recover from obstacles and adapt your approach toward the
goal within this conversation. Preserve the original `state`, including its
fixed closing time, during recovery. A tool failure or an inapplicable
execution-limit requirement does not by itself end the activity. Exceptional
recovery belongs to the agent, not a prescribed retry policy in the script.
If the environment prevents further activity, report the interruption when
possible without claiming completion; continue toward the same closing time
when control becomes available again.

Complete only when the fixed closing time is reached or the user cancels.
On cancellation, cancel an outstanding native background task if needed.
Native notifications, scheduling and machine suspension can delay completion;
exact timing and continuity are not guaranteed. Notify the user briefly when
the activity ends. Leave the previous substantive task paused; completion does
not authorize resuming it.

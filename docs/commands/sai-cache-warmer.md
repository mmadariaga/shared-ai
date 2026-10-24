# `/sai-cache-warmer`

Explicitly keeps the current conversation active with periodic waits in Claude
Code and opencode. It requires Node.js and native background shell completion
notifications, but no OpenSpec setup. It never activates automatically.

Example: `/sai-cache-warmer 30 min 18:00` waits at 30-minute intervals until
18:01 local time. With both values valid, there are no redundant questions.
Omit either value to choose only what is missing through the native picker:

- Interval: 5 min, 15 min, 45 min, or native free-text entry.
- Target: now + 1h, now + 2h, now + 3h, or native free-text entry.

Intervals must be positive; seconds, minutes and hours are accepted. Targets
accept local `HH:mm` or explicit `YYYY-MM-DD HH:mm`. An implicit change of day
requires date confirmation. An explicitly dated target whose one-minute margin
has passed finishes without waiting.

Each script invocation performs one wait. Its completion returns to the main
agent, which launches the next invocation in this same conversation. The
closing time stays fixed; the final wait is shortened. Cancellation or failure
stops the cycle. Completion notifies you without resuming previous work.

Periodic model requests consume allowance and may be blocked before recovery.
Provider cache retention and savings are not guaranteed; the chosen interval
may exceed a provider's cache lifetime. Scheduling, suspension and completion
notifications can delay finishing. The skill does not inspect or change the
provider, model, subscription or configuration.

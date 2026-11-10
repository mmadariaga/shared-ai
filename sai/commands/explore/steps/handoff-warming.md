**Hand-off warming.** At a hand-off close, explore keeps its own prompt cache warm until the user returns with `next-slice` or a fixed deadline passes, so the next slice does not resume cold. The mechanism is the hand-off wait of `@sai/policies/cache-warming.md`; this file owns the decisions around it: when it applies, where the timings come from, the question, and the stop.

Fetch `@sai/policies/cache-warming.md` and follow its § Hand-off wait. Fetch `@sai/policies/tool-resolution.md` to resolve `project-settings.js`.

**Hand-off close.** The successful end of a Plan - Unattended slice (`pipeline-plan-unattended.md` § Close) or of a sliced Manual hand-off (`route-selector.md` § Post-Manual handoff), where the user goes to another chat and returns here with `next-slice`. Run this file as the last step of that close, after its text is printed.

**State.** Keep in conversation state, for the current `/sai-explore` invocation only: `handoff_answer` (unset, `off`, or `{interval, max}`, each value in an accepted form below and counted in minutes when it has no unit, from the user's answers), `handoff_wait` (the chain of the armed wait and the id of its live background task, or unset). Every wake re-arm launches a new background task: replace the task id in `handoff_wait` with the new one at that re-arm (the chain stays), so a stop always targets the live task. Write nothing to a settings file, the `sai-state` store, or the repository; explore stays read-only for repository files.

## Whether to warm

1. **Pending slice.** Warm or ask only when the recorded set holds at least one slice, other than the one just handed off, that is not done. The last slice, a change without slices, and a stopped, blocked, or failed Plan neither ask nor warm: end this file.
2. **Already armed.** When `handoff_wait` is set, end this file: the wait is armed once per hand-off close, and a repeated hand-off text arms nothing.
3. **An earlier answer.** When `handoff_answer` is set, it applies to this hand-off close with no new question: `off` ends this file; `{interval, max}` goes to § Arm.
4. **The setting.** Otherwise run `node <tool-path> warming --provider <provider> --model <model> --role agent --harness <claude|opencode> --json --cwd <project-root>` with the main session's provider and model as the harness states them (omit `--model` when it states none) and the active harness.
   - `origin: none`: no entry applies to the `agent` role. Go to § Question.
   - `warming: "off"` with any other origin: configured off. Neither warm nor ask: end this file.
   - `warming: {interval, max}`: configured. Use that interval, and `max` as the duration, with no question and no TTL notice. Go to § Arm with those timings, without setting `handoff_answer`, so the next hand-off close resolves the setting again.
   - A non-zero exit or unreadable output is `origin: none`.

## Question

Print the harness TTL notice in the chat language, then ask both questions in one native picker call (`@sai/policies/remember.md`).

- **TTL notice.** On Claude Code the prompt cache lasts 1 hour with a Claude subscription and 5 minutes with pay-per-token. On opencode the lifetime depends on the provider, and `/sai-context-cache-ttl-benchmark` measures it. Say that each wake costs two short requests, and that an interval longer than the cache lifetime saves nothing, so the user can pick an interval that fits.
- **Interval** (how often to wake): `30 min (Recommended)`, `4 min`, `No`; free text accepted.
- **Duration** (how long to keep warming, counted from this hand-off close): `4h (Recommended)`, `2h`, `1h`; free text accepted.

Read the answers:

- Interval `No`, or a dismissed picker: no warming, and the duration is ignored. Set `handoff_answer` to `off` and end this file.
- **Accepted forms.** The interval and the duration, whether picked or typed, are each a positive number with an optional unit: `s` or `sec` (seconds), `m` or `min` (minutes), `h` or `hr` (hours). A value with no unit counts in minutes. The picker's `30 min`, `4 min`, `4h`, `2h`, and `1h` and free text such as `20`, `20 min`, and `1.5h` are accepted. A compound such as `1h30` is not accepted. `wait.js begin` converts each value, so keep the answer as the user gave it, without the `(Recommended)` suffix of a picked label.
- An unanswered duration, or an interval given as free text with no duration, is `4h`.
- When a free text is not an accepted form, or the interval exceeds the duration, ask the two questions once more. When the second answer is also invalid, do not warm: say so in one line, set `handoff_answer` to `off`, and end this file.
- A valid pair is `{interval, max}` with `max` the duration. Set `handoff_answer` to it; it applies to every later hand-off close of this invocation with no new question (E7).

## Arm

Arm the hand-off wait as the last tool call of the hand-off close turn, then end the turn with the hand-off text unchanged:

1. Run `begin` in the foreground as `cache-warming.md` § Begin states for the main session, adding `--interval <interval> --max <max> --fixed-deadline` with the timings this file settled (the user's answers in `handoff_answer`, or the setting's `interval` and `max`). The tool sets the deadline `max` minutes from this `begin` and keeps it fixed. A `begin` that prints `off` or fails arms nothing: say so in one line when it failed, leave `handoff_wait` unset, and end this file.
2. Launch `wait.js warm --chain <chain>` in the background, as `cache-warming.md` § Arm, wake, and window states for each harness.
3. Set `handoff_wait` to the background task id and the chain.

The wait is a chain like any other: a wake re-arms with the state it returned and updates the task id in `handoff_wait`, and a real message other than `next-slice` re-arms nothing. The tool ends the wait at the deadline, and no wake follows.

When arming fails (no shell, a missing `wait.js`, a refused permission), say so in one line, leave `handoff_wait` unset, and let the hand-off close continue unchanged.

## Stop

Stop the wait through `cache-warming.md` § Stop your own wait (`TaskStop` with the task id currently held in `handoff_wait` on Claude Code, shell removal of that task's shell on opencode), then unset `handoff_wait`, in these cases:

- `next-slice` fires (`slice.md`): stop the wait before anything else of that turn.
- A new `/sai-explore` invocation starts in the same chat (`body.md`): stop the earlier invocation's wait, and unset `handoff_answer` with it.

With `handoff_wait` unset, nothing is stopped and nothing is reported.

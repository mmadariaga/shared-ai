# ADR 0216: Main-session warming needs a harness session id, and warming ends as the code says

<!-- adr-index: amends 0212 -->

## Status

Accepted. Amends ADR 0212: its decision 4 (the main session's chain follows its harness session id) gains a failure when the id is absent, its decision 3 (only dispose or the `max` window ends warming) is corrected to the behavior of `skills/universal/sai-cache-warmer/wait.js`, and the hand-off timings of its implementation departures are parsed as durations. ADR 0212 itself is not edited, because existing records are never edited in place. The prose of `sai/policies/cache-warming.md` carries the corrected text. The rest of ADR 0212 stays in force.

## Context

`wait.js begin` read `--interval` and `--max` with `Number()`, while the `/sai-explore` hand-off picker offers `30 min` and `4h`. Every answer except `No` failed. A main-session `begin` with no harness session id opened a new chain on each call, so two waits of the main session could be live, which ADR 0212 decision 4 rules out. ADR 0212 decision 3 and `cache-warming.md` also described end conditions that the code does not have: `budget-subagent` was listed as a recipient of the warming switch, while its skills send none with a one-shot task message, and a message without the switch was said to end the earlier wait at its next wake.

## Decision

1. **`begin` parses the timings as durations.** `--interval` and `--max` go through `intervalMilliseconds`, the same parser the wait states use: a positive number with an optional unit (`s`, `m`, `h`), unitless values counted in minutes. `30 min`, `4 min`, `4h`, `2h`, `1h`, `20`, and `20 min` are accepted; `1h30` is rejected as a usage error and the hand-off card asks again under its existing invalid-answer rule. The conversion stays in the tool, and `sai/commands/explore/steps/handoff-warming.md` lists the accepted forms.
2. **A main-session `begin` without a harness session id fails.** The id comes from `--session`, `CLAUDE_CODE_SESSION_ID`, or `OPENCODE_SESSION_ID`. Without one, `begin --role agent` throws a usage error (exit 2) that names the variable and arms nothing, the hand-off `begin` included. `cache-warming.md` already finishes a task unchanged after a non-zero `begin`. A subagent `begin` (`--agent`) needs no session id and behaves as before. A main session whose setting is off still prints `off`.
3. **Warming ends as the code says.** Warming ends on a dispose and when the `max` window closes. It also ends when the setting turns off (the next wake returns `finished`), when a later arm of the chain supersedes the wait, and when the benchmark's cutoff mark is newer than the arm. `budget-subagent` receives the warming switch only on a continuation, because its one-shot task message is followed by its dispose. A message without the switch arms nothing and supersedes nothing: an earlier wait of the chain keeps re-arming at each wake until its window closes or the agent is disposed. `sai/policies/cache-warming.md` states this, and the code stays unchanged for these corrections.

## Alternatives Considered

- **Keeping the new-chain fallback and documenting that two waits can be live** — rejected: it breaks the one-live-wait rule of the main session, and the policy already handles a non-zero `begin` in one line.
- **Converting the hand-off timings to minutes in the card prose** — rejected: the conversion belongs to the tool, which already owns the duration parser.

## Consequences

- A main session without a harness session id gets no cache warming at all, and `begin` says why.
- `1h30` is no longer accepted as a hand-off duration.
- Instructions and tests follow the code: the policy's recipients and end conditions match `wait.js` and the budget skills, and a test pins each accepted and refused form.
- ADR 0212 still reads the older decision 3 and decision 4; this record is the current statement of both.

## Provenance

Change `close-warming-dispose-gaps`, decision "A main-session begin without a session id exits non-zero".

# DDR 0163: The learnings file is coordinator-owned and promoted at every closing report

<!-- ddr-index: amends 0155 -->

## Status

Accepted

## Context

DDR 0155 admitted root `SAI_LEARNINGS.md` to the terminal documentation set
only when the current promotion pass wrote it, and promotion ran once, after a
passing final sweep. A stopped apply run therefore promoted nothing. The runs
that fail are the ones that learn the most: in the analysed session a GREEN
worker reported three verified repository facts in report field 6 and all three
were lost, while a broader, misleading entry on the same subject stayed in the
file and shaped the next plan.

Promoting on a stop leaves the file modified and uncommitted, because a stop
makes no commit. Under 0155 the next run would then start with the file
modified, rewrite it in its own promotion, and fail `apply-step.js inspect`
with a preservation error before its terminal commit.

## Decision

Root `SAI_LEARNINGS.md` is a coordinator-owned file, not unrelated work that a
run must preserve.

- The apply coordinator promotes once at every closing report, stopped or
  completed, from the same candidates and under the same qualification rule.
  The rule is single-sourced in
  `sai/commands/apply/steps/learnings-promotion.md`; the shared stopped report
  is the hook, since it is the one thing every apply stop shares.
- A stop makes no commit. The terminal documentation commit takes the file
  whenever it is modified, exempt from the protected-path exclusion, including
  when it was already modified at run start and when this run's promotion wrote
  nothing.
- `sai/tools/apply-step.js` names the path: a change to it is never a
  preservation error and is never counted among a Step's written files.

This amends DDR 0155's entry for `SAI_LEARNINGS.md` ("only when written by the
current promotion pass"). The rest of 0155 — the closed, terminal-state-derived
set, the preview, and exact-path staging — is unchanged.

## Alternatives Considered

- Promote on a stop only what the coordinator's verification backs: needs a
  definition of backing and a second qualification rule.
- Promote only when a stop is final, after the user declines the retry: a chat
  closed without an answer loses the learnings again.
- Commit the learnings file at each stop: adds a commit gate to every stop.
- Leave the file uncommitted for the user: the next run fails its terminal
  inspection.
- A general coordinator receipt in the tool instead of a named path: the format
  policy fixes the path and it is the only case.

## Consequences

- A stop may record a fact reported by a worker that failed. The qualification
  rule excludes change-specific facts, and a wrong entry is superseded later by
  its key.
- A manual edit of `SAI_LEARNINGS.md` made before a run enters that run's
  terminal commit; with fast-track or `/sai-build` it enters without a question.
- A run that continues after a stop promotes more than once.
- An interruption, a chat that dies without reaching a stop, still promotes
  nothing.

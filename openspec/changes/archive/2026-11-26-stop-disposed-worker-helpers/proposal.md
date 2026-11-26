> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

When a coordinator disposes a routed worker, the helpers that the worker dispatched itself (for example the `budget-explorer` agents of the spec worker's research step) kept running with an armed cache-warm wait. Each wake of such a helper revived the disposed worker, which answered `cache warming stopped`, and that answer reached the coordinator, which ran a turn too: three model turns per wake with no useful work, for up to the one-hour `max` window, while the disposed worker looked alive to the user. It was observed on opencode in a `/sai-explore` → Plan - Unattended run, where the spec worker's three explorers revived it four times during the design segment.

The cause was twofold. The budget-explorer skills on both harnesses told every dispatcher to end each explorer message with the warming switch, contradicting `sai/policies/cache-warming.md` § The switch, which already says a worker that dispatches its own helpers sends none; and `sai/tools/dispose-shells.js` removed only the shells of the sessions it was given, so nothing ended a helper of a disposed worker on opencode. The `/sai-explore` explorer was disposed only at the route end, so it stayed armed through a whole Plan, Direct Build, or Manual route.

## What Changes

- `skills/claude/budget-explorer/SKILL.md` and `skills/opencode/budget-explorer/SKILL.md`, § Warming and dispose: the warming switch is added to the task message and every continuation only by a dispatcher that disposes the explorer (a coordinator or the `/sai-explore` main session), pointing to `sai/policies/cache-warming.md` § The switch as the single source; the disposing dispatcher disposes the explorer at the route start or end, on abandon or stop, and at run close.
- `skills/claude/budget-subagent/SKILL.md` and `skills/opencode/budget-subagent/SKILL.md`: a continued subagent receives the warming switch only when its dispatcher disposes it, per § The switch.
- `sai/policies/cache-warming.md`: § The switch states that workers and `budget-explorer` receive the switch from a dispatcher that disposes them and that a worker never sends it to the helpers it dispatches itself; § Dispose states that the opencode dispose also removes the running shells of every descendant session of the agent and closes their chains.
- `sai/policies/worker-lifecycle.md` § Stop call gains the **Descendant sessions** paragraph, the single source of the opencode cascade.
- `sai/tools/dispose-shells.js`: when the shell listing holds a running shell of a session other than the named ones, the tool reads the session tree of `opencode.db` read-only through `opencode-db.js` (`openOpencodeDatabase`, `opencodeChildren`), removes from the same listing the running shells of every descendant session of each named session, and closes the cache-warm chain of each removed `wait.js warm` shell. The calling session (`OPENCODE_SESSION_ID`) and its ancestors are excluded. Each result carries a `cascade` object `{status, removed, failed, closed, close_failed}` (`status` `ok`, or `unavailable` with a `reason` when the tree cannot be read); the cascade never changes the named session's `status` or the exit code, and it is absent when no running shell lies outside the named sessions. `defaultTree` and `protectedSessions` are exported.
- `sai/commands/explore/body.md` and `sai/commands/explore/steps/route-selector.md`: `/sai-explore` disposes its live explorers when a route starts (the accepted `route-choice` answer, new § Route start) instead of when it ends, closing the helper report directory in the same same-turn batch before the route's first dispatch; entering the `--no-specs` POC lane is not a route start, and a search after a route start creates a new explorer with its ready handshake and a new helper directory.
- `AGENTS.md`: the `dispose-shells.js` row describes the cascade.
- Tests: `test/dispose-shells.test.js` covers the cascade, the protection of the calling session and its ancestors, and the unreadable session tree; the new `test/helper-warming-switch.test.js` checks that the four helper skills limit the switch to a disposing dispatcher; `test/cache-warmer.test.js` follows the new wording.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `worker-dispose`: the opencode stop call cascades to the descendant sessions of a disposed worker.
- `live-explorer`: `/sai-explore` disposes its explorers at route start, and only a disposing dispatcher sends the explorer the warming switch.
- `helper-dispose`: a continued `budget-subagent` receives the warming switch only from a dispatcher that disposes it, and the four helper skills state that limit.

## Impact

- Modified files: `AGENTS.md`, `sai/commands/explore/body.md`, `sai/commands/explore/steps/route-selector.md`, `sai/policies/cache-warming.md`, `sai/policies/worker-lifecycle.md`, `sai/tools/dispose-shells.js`, `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-subagent/SKILL.md`, `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md`, `test/cache-warmer.test.js`, `test/dispose-shells.test.js`.
- New files: `test/helper-warming-switch.test.js`.
- Harnesses: the switch rule applies to Claude Code and opencode; the descendant cascade is opencode only, and Claude Code's `TaskStop` dispose is unchanged.
- Known limitations: on Claude Code, a helper of a disposed worker may stay as an idle subagent until the harness discards it, arming no wait; a search in `/sai-explore` after a route start pays a new explorer `ready` handshake.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Future context: whether Claude Code's `TaskStop` on a worker also stops the subagents that worker started is unverified; a later change may add a Claude Code equivalent once an empirical check answers it.

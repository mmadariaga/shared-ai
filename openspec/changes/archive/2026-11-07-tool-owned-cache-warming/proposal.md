> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

Agents had to remember chain ids, timings, and final-response rules by following prose, and that failed silently: an omitted `--chain` disabled supersession, the policy's own arm template omitted it, a missing Linux harness root surfaced only inside the background wait, a subagent could not know whether its coordinator would reuse it, and the opencode stop call could not be run as written. The tool now owns the cache-warming protocol, and the prose keeps only the few rules an agent follows.

## What Changes

- `skills/universal/sai-cache-warmer/wait.js` gains a foreground `begin` subcommand. A subagent calls `begin --agent <agent> --harness <claude|opencode>` and the tool reads the `model` of the installed agent file; the main session calls `begin --role agent --provider <provider> [--model <model>] --harness <claude|opencode>`. `begin` resolves the timings through `sai/tools/project-settings.js` and the SAI temp root through `sai/tools/temp-root.js`, stores the identity in the chain record, and prints `{chain, warming}` with `warming` as `off` or `{interval, max}`. A missing Linux harness root now fails `begin` in the foreground.
- The main session's chain is derived from the harness session identifier (`CLAUDE_CODE_SESSION_ID` on Claude Code, `OPENCODE_SESSION_ID` on opencode), so a later command invocation in the same chat continues the same chain.
- `warm` requires `--chain <id>` or `--state <token>` and no longer takes `--interval` or `--max`; a `warm` with neither exits 2 in the argv and JSON forms, and a `warm` with no arguments and no input fails after a short grace period instead of hanging. Every arm and every wake resolves the timings again from the stored identity, so a setting turned `off` ends the warming at the next wake and a new interval applies without an agent restart. The `chain` subcommand is removed.
- Every `begin`, arm, and wake refreshes the chain record's modification time, and the record is kept when a window closes or the setting turns off, so the 24-hour prune never reaches a live chain and a reused agent can warm again (this fixes the functional review finding M1).
- `sai/policies/cache-warming.md` is rewritten to the reduced rule set: the `Warming: on, agent {agent}` switch that only a disposing dispatcher sends, `begin` on the first response, arming after every response until dispose or `max`, re-arm and `ok` on a wake, the `warming: true|false` line kept as a diagnostic, and no `warm-up` order and no "final response" classification. Its consumers on both harnesses follow it: the Claude Code and opencode standalone worker binding templates, the `budget-explorer`, `budget-subagent`, and `budget-executor` skills, `sai/policies/{explore-agent,budget-agent,executor-agent,direct-build-report-transport}.md`, and the coordinator cards of audit, explore, Direct Build, implement, merge, plan, and review.
- The explorer shell restriction allows `wait.js begin` beside `warm`; `budget-executor` never receives the switch and never arms.
- New `sai/tools/dispose-shells.js` lists the opencode shells of the project directory through `opencode api`, removes the running shells of one session, lists again to confirm, and prints `{status, removed, failed}`. The opencode stop call in `sai/policies/worker-lifecycle.md` now runs it and falls back to the `dispose` message only on `failed` or `unavailable`; `session.interrupt` is removed. `sai/policies/tool-resolution.md` lists the tool.
- Scope drift (not an implementation error): `begin` accepts user-chosen `--interval` and `--max` for the main session, which fix the chain's timings in place of the setting, and `sai/commands/explore/steps/handoff-warming.md` arms the hand-off wait through `begin` and `warm --chain`. The selected diff evidences this behavior, but the supplied intent statement did not name it.
- Scope drift (not an implementation error): `AGENTS.md` and `docs/project-settings.md` describe the new protocol. The selected diff evidences this behavior, but the supplied intent statement did not name it.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `agent-self-warming`: `begin`, the warming switch, arming until dispose or `max`, the required chain, timings resolved at every arm and wake, chain records kept and refreshed; the dispatcher-resolved timings requirement is removed.
- `subagent-warming-declaration`: the `warming` line becomes a diagnostic that the dispatcher keeps no value for; the requirements on absent, lost, and wake-unchanged declarations are removed.
- `helper-dispose`: helpers are disposed after their result with no warming switch on a one-shot task; the `warm-up` order is removed.
- `live-explorer`: the live explorer receives the warming switch and stays warm between searches until it is disposed.
- `worker-dispose`: the opencode stop call runs `dispose-shells.js`, with the `dispose` message as its fallback only; the tool's behavior is specified.
- `explore-handoff-warming`: the hand-off wait arms through `begin` and `warm --chain`.

## Impact

- New files: `sai/tools/dispose-shells.js`, `test/dispose-shells.test.js`.
- Modified files: `skills/universal/sai-cache-warmer/wait.js`, `sai/policies/cache-warming.md`, `sai/policies/worker-lifecycle.md`, `sai/policies/explore-agent.md`, `sai/policies/budget-agent.md`, `sai/policies/executor-agent.md`, `sai/policies/direct-build-report-transport.md`, `sai/policies/tool-resolution.md`, `sai/orchestration/workers/bindings/claude/standalone-worker-template.md`, `sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`, `skills/claude/budget-explorer/SKILL.md`, `skills/claude/budget-executor/SKILL.md`, `skills/claude/budget-subagent/SKILL.md`, `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-executor/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md`, `sai/commands/audit/coordinator.md`, `sai/commands/explore/body.md`, `sai/commands/explore/direct-build-coordinator.md`, `sai/commands/explore/steps/handoff-warming.md`, `sai/commands/implement/coordinator.md`, `sai/commands/implement/worker-common.md`, `sai/commands/merge/steps/common.md`, `sai/commands/merge/worker.md`, `sai/commands/plan/cycle.md`, `sai/commands/plan/worker-common.md`, `sai/commands/review/coordinator.md`, `AGENTS.md`, `docs/project-settings.md`, `test/cache-warmer.test.js`, `test/implementation-harness-bindings-step-2.test.js`, `test/read-only-shell-grants.test.js`.
- Known limitations: an agent that finishes its task keeps arming until it is disposed or `max` elapses, so a coordinator that disposes late pays wakes bounded by `max`; each agent's first response costs one extra foreground call for `begin`; instructions from an earlier installed version lose warming until reinstall; on opencode, dispose removes every running shell of the worker, not only its wait; the main session keeps waking until `max` after its closing report.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Evidence from the opencode verification (opencode v2.2.6): `opencode api GET "/api/shell?location[directory]=<dir>"` lists running shells with `id`, `pid`, and `metadata.sessionID`; `opencode api DELETE "/api/shell/<id>?location[directory]=<dir>"` returns 204 and the process dies; the removed shell reaches its owning session as an error with `Shell.NotFoundError`; `POST /api/session/<child sessionID>/interrupt` returns 404 `SessionNotFoundError`; no `OPENCODE_*` variable carries the server URL or credentials. This evidence resolves the open question the backlog issue recorded (Q1) and the unverified opencode stop call noted in docs/adr/0202-explorer-is-live-per-coordinator-and-agents-self-warm.md.

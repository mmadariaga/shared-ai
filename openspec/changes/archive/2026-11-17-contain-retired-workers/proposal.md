> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

In an opencode `/sai-build` run, a stalled RED worker resumed its turn about six hours after its coordinator had replaced it and the run had closed. The revived worker edited a test file, attempted a report, and armed a fresh cache-warming chain. opencode cannot abort the in-flight turn of a child session, so the existing stop call (shell removal plus chain close) does not reach that turn, and `wait.js` gave every subagent `begin` an unrelated new chain. Because the harness offers no abort, this change contains a revived worker instead: once its coordinator replaced or ended it, the worker can no longer save reports or start warming again, and the worker contract tells it to stop before writing.

## What Changes

- New `sai/tools/harness-session.js`: the single reader of a subagent's own harness session, `OPENCODE_SESSION_ID` on opencode and `CLAUDE_CODE_AGENT_ID` on Claude Code, returning `null` when the variable is absent or does not match the accepted identifier pattern.
- `skills/universal/sai-cache-warmer/wait.js`: a subagent `begin` records its harness-qualified session (`<harness>:<id>`, from `--session` first, else the environment) on its chain record as `agent_session`. When a chain that carries the same session was closed by a dispose, `begin` returns `{"chain": null, "warming": "off"}`, so the revived worker arms nothing. Without a readable session, `begin` returns a fresh chain as before.
- `sai/tools/transfer.js`:
  - `retire-handle --dir <dir> --handle <id>` records a worker handle as retired in the reserved file `.sai-retired` beside the `.sai-accepted` ledger; recording a recorded handle changes nothing (`already`, `recorded`).
  - `live --dir <dir> [--harness <claude|opencode>]` reports `gone` when the directory no longer exists, `retired` when the caller's own session is recorded as retired, and `live` otherwise, including when the session cannot be read; it exits 0 for every state.
  - `put` refuses a write from a retired handle with exit 1 and writes nothing; when the caller's session cannot be read, the check is skipped.
  - `.sai-retired` is a reserved name, never treated as a report.
- `sai/policies/worker-lifecycle.md`: a "Retire the handle" rule makes every replacement and dispose of a worker that holds a report directory also run `transfer.js retire-handle` with the captured handle, in the same same-turn batch as the stop call and before the report directory closes; § Worker side adds the "Liveness guard": a worker that holds a report directory runs `transfer.js live` before the first file write that follows a shell command and before saving a report, and on `retired` or `gone` it writes nothing, arms nothing, and ends with the stop literal.
- `sai/policies/cache-warming.md` § Begin documents the new `off` case and the unchanged fresh chain for an unreadable session.
- `AGENTS.md` index entry for `worker-lifecycle.md` updated to name the retire and liveness rules.
- Tests in `test/cache-warmer.test.js` and `test/transfer-tool.test.js` cover the session-scoped `begin`, the unreadable-session fallback, `retire-handle` with the `put` refusal, and the three `live` states.
- Scope drift (not an implementation error): a subagent `begin` also accepts an explicit `--session <id>` that takes precedence over the environment; an explicit value outside the accepted identifier pattern counts as unreadable.

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `agent-self-warming`: a subagent `begin` from a session whose chain a dispose closed returns `off`; an unreadable session keeps a fresh chain.
- `transfer-file-transport`: `retire-handle`, `live`, and the `put` refusal for a retired handle.
- `worker-dispose`: coordinators retire the handle at every replacement and dispose, and workers run the liveness guard before writing.

## Impact

- New files: `sai/tools/harness-session.js`.
- Modified files: `sai/tools/transfer.js`, `skills/universal/sai-cache-warmer/wait.js`, `sai/policies/worker-lifecycle.md`, `sai/policies/cache-warming.md`, `AGENTS.md`, `test/cache-warmer.test.js`, `test/transfer-tool.test.js`.
- Claude Code and opencode follow the same rules, each with its own handle: the agent ID on Claude Code, the `sessionID` on opencode. No new user question is introduced.
- Known limitations:
  - A revived worker may still run read-only commands before its first write-time liveness check.
  - On Claude Code, the variable `CLAUDE_CODE_AGENT_ID` is not verified to be exposed to a worker's shell, so on Claude Code the guards read the session as unreadable and keep the earlier behavior. Whether an opencode worker's shell exposes its own child-session id in `OPENCODE_SESSION_ID` is also undecided; it was observed only for a parent session.
  - On Claude Code no warming chain is ever closed (`TaskStop` ends the agent and its wait together), so the `begin` refusal applies only to chains a dispose closed on opencode.

Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Undecided: whether an opencode worker's shell exposes its own child-session id in `OPENCODE_SESSION_ID`; it was observed only for a parent session, and E6 keeps today's behavior when the session cannot be read (affects I3, I4).

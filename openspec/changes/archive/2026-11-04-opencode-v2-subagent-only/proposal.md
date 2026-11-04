> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation against a user-supplied statement of intent. It describes a decision already made, not one being proposed.

## Why

The opencode worker binding and budget skills described the opencode v1 `task` calls, so agents running on opencode v2 translated each call, and a continuation in the documented shape failed with `agent: Missing key`. The doctor also accepted a top-level `subagent_depth` that opencode v2 never reads, giving a false pass. One documented call shape, background dispatch on both harnesses, and a doctor that checks what opencode v2 actually reads remove both failures.

## What Changes

- The opencode standalone worker binding template creates workers with `subagent(agent: "{{workerName}}", description: "{{phase}} worker", prompt: …, background: true)`, captures the returned `sessionID` as the handle, continues with the same `agent`, the captured `sessionID`, and `background: true` only after the worker's completion notification arrives, and disposes through `api/session/:sessionID/interrupt` after removing the outstanding shell, keeping the `dispose` message fallback.
- The opencode budget skills (`budget-explorer`, `budget-executor`, `budget-subagent`) replace the synchronous-only `task` statement with the background dispatch rule: dispatch only from a dispatcher that outlives the child, capture the `sessionID`, and await the completion notification on the dispatcher's own turn without polling.
- The explore, design overview, audit, review, implement, plan cycle, and deep-review cards and the opencode panel-render adapter name the opencode `subagent` tool instead of `task`/`task_id`; the deep-review batch creates opencode audit workers with `background: true`, and an abandoned explore route stops a running opencode worker by session interrupt of its `sessionID`.
- The backfill instructions state that the conflict-scan helper runs in the background on both harnesses and that the worker waits for its completion notification within its own turn.
- The installer's opencode binding census parses initial `subagent(agent: "...")` dispatches and skips continuation calls that carry `sessionID`.
- `bin/doctor.js` passes the depth check only on `experimental.subagent_depth` >= 2 and ignores a top-level `subagent_depth`; it adds an opencode version check, run only when the opencode harness is checked, that errors below 2.2.0 and warns when the binary is absent or its output cannot be parsed.
- ADR 0206 records the opencode v1 retirement, background dispatch on opencode, and the 2.2.0 minimum, amending ADR 0185, with its index entry; `AGENTS.md`, `README.md`, `docs/doctor.md`, and `docs/tool-capabilities.md` state the minimum 2.2.0, the tested 2.2.5, the `experimental`-only depth check, and background dispatch on both harnesses.
- Tests are updated for the new call wording and depth check, and `test/doctor-opencode-version.test.js` covers the version check with the `opencode` binary stubbed.

## Capabilities

### New Capabilities

- `opencode-subagent-calls`: opencode create, continue, notification-matching, and dispose calls use the v2 `subagent` tool in background mode.
- `opencode-doctor-checks`: the doctor checks the installed opencode version against the 2.2.0 minimum, only when the opencode harness is checked.

### Modified Capabilities

- `doctor-at-least-one`: the at-least-one depth requirement is removed and replaced by `Doctor validates experimental.subagent_depth with minimum 2`, which ignores a top-level `subagent_depth`.
- `opencode-agent-census`: the roster parser extracts initial `subagent(agent: "...")` declarations and ignores `sessionID` continuations.
- `change-overview-generation-routing`: the opencode overview dispatch names the background `subagent` call.
- `concurrent-audit-dispatch`: the opencode audit batch uses background `subagent` calls tracked by `sessionID`.
- `worker-fast-handshake`: the opencode binding captures the `sessionID` returned by the background `subagent` dispatch.
- `dispatch-safety-invariant`: the dispatch-mode requirement is removed and replaced by `Dispatch-mode declaration is a binding property on both harnesses`, whose opencode scenario declares background `subagent` dispatch.
- `design-harness-bindings`: opencode notice acknowledgement and design-worker continuation use `subagent` with the creation `agent` and the captured `sessionID`.
- `worker-dispatch-prompt-template`: opencode bindings use background `subagent` dispatch and continue through `subagent` with the captured `sessionID`.
- `security-worker-bindings`: the opencode security binding creates and continues its worker with background `subagent` calls.
- `accessibility-worker-bindings`: the opencode accessibility binding creates and continues its worker with background `subagent` calls.
- `plan-segment-cycle`: opencode segment workers are continued with `subagent`, the creation `agent`, and the captured `sessionID`.
- `implement-new-workers`: opencode RED and GREEN workers are continued with `subagent`, the creation `agent`, and the captured `sessionID`.
- `harness-panel-render-binding`: the opencode progress continuation pairs `todowrite` with a same-worker `subagent` continuation.
- `asymmetry-documentation`: `AGENTS.md` records background dispatch on both harnesses and the retirement of opencode v1 `task` dispatch.

## Impact

- New files: `docs/adr/0206-opencode-dispatches-subagents-in-the-background-through-the-v2-tool.md`, `test/doctor-opencode-version.test.js`.
- Modified files: `AGENTS.md`, `README.md`, `bin/doctor.js`, `bin/install-flow.js`, `docs/adr/0000-INDEX.md`, `docs/doctor.md`, `docs/tool-capabilities.md`, `sai/adapters/opencode/panel-render.md`, `sai/commands/audit/coordinator.md`, `sai/commands/backfill/instructions.md`, `sai/commands/deep-review/coordinator.md`, `sai/commands/design/steps/overview.md`, `sai/commands/explore/body.md`, `sai/commands/explore/steps/slice.md`, `sai/commands/implement/coordinator.md`, `sai/commands/plan/cycle.md`, `sai/commands/review/coordinator.md`, `sai/orchestration/workers/bindings/opencode/standalone-worker-template.md`, `skills/opencode/budget-executor/SKILL.md`, `skills/opencode/budget-explorer/SKILL.md`, `skills/opencode/budget-subagent/SKILL.md`, and 28 test files under `test/`.
- Known limitations: opencode v1 and opencode v2 releases before 2.2.0 lose support; the 2.2.0 minimum is user-declared while the `subagent` signature and background mode were verified only in the opencode 2.2.5 bundle; the version check depends on the `opencode` binary and only warns when it is absent or unparseable; a continuation sent to a running subagent and cancellation of background children when the parent aborts stay unconfirmed and are avoided by design.
- Out of scope: design.md, tasks.md, implementation.md — not generated by /sai-backfill

## Request Additional Notes

Related follow-up work: the sibling children of https://github.com/mmadariaga/shared-ai/issues/322 (issues #328, #329, #330, and #331) carry the other fixes from the same retrospective.

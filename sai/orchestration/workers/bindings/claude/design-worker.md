# Claude Design Worker Binding

Start exactly one background worker with:

`Agent(subagent_type: "sai-2-design-worker", run_in_background: true, prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-2-design-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

Capture the agent ID in coordinator state, await its structured payload, and
bind it as `continuation_reference` for `needs_input`. The identifier is
binding-owned and never worker output.

Forward answers with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`.
Do not use Agent `resume`; continue the same worker.

Forward `continue_after_notice` exactly for design notices.

If continuation or waiting fails, start one fresh background worker and send
the original envelope plus the exact reconstruction fields and instruction to
reconstruct from current durable OpenSpec artifacts. Never package artifacts.

The worker may dispatch only the mandatory `budget-explorer` nested branch and
must retain Agent and Skill access.

On each progress event, update the harness task list so the reported step ids
render `completed` and the leading unmarked step renders `in_progress`, per
the deterministic state derivation of `@sai/policies/todo-structure.md`, by
whatever mechanism the harness's task-list tool provides. Incrementality is a
binding-level optimization, not a normative contract: where the harness tool
supports updating single entries without re-listing the rest, use them; where
it replaces the list wholesale, emit the full list on each update. For
below-threshold plans (fewer than three declared steps), emit no task list at
all.
The task-list tool call originates exclusively from the coordinator session,
never from a worker subagent, per the emission-ownership invariant of
`@sai/policies/todo-structure.md`.

Stamping is coordinator-only per the milestone-stamp annotation section of
`@sai/policies/todo-structure.md`: on the first render, acquire the current
wall-clock time with `date +%H:%M` and attach it as the start stamp of the
first `in_progress` step; on each progress event, acquire one shared time
with `date +%H:%M` and attach it as the closure stamp of every step the
event marks, inheriting it as the start stamp of the leading unmarked step;
on the run-closing `completed` reconciliation, acquire one shared time with
`date +%H:%M` and attach it as the closure stamp of every step reconciled
only when at least one step is stamped. Issue at most one wall-clock call
per render act and none on `needs_input`, `failed`, or `cancelled`. The
calls originate from the coordinator session, never from the worker subagent.

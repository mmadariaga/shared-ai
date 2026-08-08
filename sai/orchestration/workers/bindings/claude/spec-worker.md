# Claude Spec Worker Binding

Start exactly one background worker with:

`Agent(subagent_type: "sai-1-spec-proposal-worker", run_in_background: true, prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-1-spec-proposal-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

Capture the agent ID as binding-owned continuation metadata and await its structured payload. Continue with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`; never use Agent `resume`.

If continuation or waiting fails, start at most one fresh background worker with the complete original envelope and reconstruction state. Never package artifacts or expose binding metadata in worker payloads.

The worker may retain only the binding-owned agent ID and may dispatch only the required budget/explore helper targets.

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

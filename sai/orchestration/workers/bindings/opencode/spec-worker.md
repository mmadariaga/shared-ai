# Opencode Spec Worker Binding

Start exactly one explicit worker with:

`task(subagent_type: "sai-1-spec-proposal-worker", prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-1-spec-proposal-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

Capture `task_id` only as binding-owned continuation metadata. Continue the same task with `task(task_id: "<captured task ID>", prompt: "<selected value>")` and never replace a same-task continuation unless it fails.

If continuation fails, start at most one fresh explicit worker with the complete original envelope and reconstruction state. Never package artifacts or expose binding metadata in worker payloads.

The worker permission allows only the required budget/explore helper targets.

On each progress event, emit one `todowrite` call with the full `todos` array
per `@sai/policies/todo-structure.md`: completed steps carry state
`completed`, the first incomplete step carries `in_progress`, all remaining
steps carry `pending`, and the priority field is filled with a constant for
every entry. Emit no `todowrite` call for below-threshold plans (fewer than
three declared steps). The `todowrite` call originates exclusively from the
coordinator session, never from a worker subagent — opencode disables the tool
for subagents by default and the worker runs as a subagent, per the
emission-ownership invariant of `@sai/policies/todo-structure.md`.

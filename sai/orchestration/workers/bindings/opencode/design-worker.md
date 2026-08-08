# Opencode Design Worker Binding

Start exactly one explicit worker with:

`task(subagent_type: "sai-2-design-worker", prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-2-design-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

Capture and bind `task_id` in coordinator state. For `needs_input`, expose it
only as binding-owned `continuation_reference`.

Continue the same task with `task(task_id: "<captured task ID>", prompt: "<selected value>")`.
For a design notice use the exact prompt `continue_after_notice`. Do not
replace a same-task continuation unless it fails.

On failure, start one fresh explicit worker with the original envelope and
complete reconstruction fields, including opaque history, pending feedback,
and `fast_track_banner_emitted` where applicable. Never package artifacts.

The worker permission denies every task target except `explore`.

On each progress event, emit one `todowrite` call with the full `todos` array
per `@sai/policies/todo-structure.md`: completed steps carry state
`completed`, the first incomplete step carries `in_progress`, all remaining
steps carry `pending`, and the priority field is filled with a constant for
every entry. Emit no `todowrite` call for below-threshold plans (fewer than
three declared steps). The `todowrite` call originates exclusively from the
coordinator session, never from a worker subagent — opencode disables the tool
for subagents by default and the worker runs as a subagent, per the
emission-ownership invariant of `@sai/policies/todo-structure.md`.

# Opencode Implementation Worker Binding

## dispatch_worker

Start exactly one explicit worker with:

`task(subagent_type: "sai-3-implementation-worker", prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-3-implementation-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

This is the binding dispatch operation.

## continue_same_worker

Capture and bind `task_id` in coordinator state. For `needs_input`, expose it
only as the binding-owned `continuation_reference`.

Continue the same task with `task(task_id: "<captured task ID>", prompt: "<selected value>")`.
Do not replace a same-task continuation unless it fails.

## dispatch_one_replacement_worker

On a failed/failure continuation, start at most one fresh worker explicitly to
reconstruct the plan.
The replacement receives only these reconstruction fields:
`original_envelope`, `resolved_change_name`, `opaque_input_history`, and
`durable_artifact_reconstruction_instruction`. Send the complete reconstruction
instruction and fields, never artifact contents or binding metadata.

The nested helper branches use the permitted budget and explore targets.

The worker permission denies every task target except `budget` and `explore`.
Existing-plan simplification and rerun-new-element research use `budget`; ADR
index cold builds use `explore`.

On each progress event, emit one `todowrite` call with the full `todos` array
per `@sai/policies/todo-structure.md`: completed steps carry state
`completed`, the first incomplete step carries `in_progress`, all remaining
steps carry `pending`, and the priority field is filled with a constant for
every entry. Emit no `todowrite` call for below-threshold plans (fewer than
three declared steps). The `todowrite` call originates exclusively from the
coordinator session, never from a worker subagent — opencode disables the tool
for subagents by default and the worker runs as a subagent, per the
emission-ownership invariant of `@sai/policies/todo-structure.md`.

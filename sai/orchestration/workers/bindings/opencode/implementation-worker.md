# Opencode Implementation Worker Binding

## dispatch_worker

Start exactly one explicit worker with:

`task(subagent_type: "sai-3-implementation-worker", prompt: "<original InvocationEnvelope and implementation-worker instruction>")`

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

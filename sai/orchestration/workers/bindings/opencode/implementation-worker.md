# Opencode Implementation Worker Binding

Start exactly one explicit worker with:

`task(subagent_type: "sai-implementation-planning-worker", prompt: "<original InvocationEnvelope and implementation-worker instruction>")`

This is the binding dispatch operation.

The nested helper branches use the permitted budget and explore targets.

Capture and bind `task_id` in coordinator state. For `needs_input`, expose it
only as binding-owned `continuation_reference`.

Continue the same task with `task(task_id: "<captured task ID>", prompt: "<selected value>")`.
Do not replace a same-task continuation unless it fails.

On failure, start one fresh worker explicitly with only the original envelope and
the complete reconstruction instruction and fields. Never package artifacts.

The worker permission denies every task target except `budget` and `explore`.
Existing-plan simplification and rerun-new-element research use `budget`; ADR
index cold builds use `explore`.

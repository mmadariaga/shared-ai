# Opencode Design Worker Binding

Start exactly one explicit worker with:

`task(subagent_type: "sai-design-planning-worker", prompt: "<original InvocationEnvelope and design-worker instruction>")`

Capture and bind `task_id` in coordinator state. For `needs_input`, expose it
only as binding-owned `continuation_reference`.

Continue the same task with `task(task_id: "<captured task ID>", prompt: "<selected value>")`.
For a design notice use the exact prompt `continue_after_notice`. Do not
replace a same-task continuation unless it fails.

On failure, start one fresh explicit worker with the original envelope and
complete reconstruction fields, including opaque history, pending feedback,
and `fast_track_banner_emitted` where applicable. Never package artifacts.

The worker permission denies every task target except `explore`.

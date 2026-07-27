---
name: sai-design-planning-worker
description: Opencode binding for the SAI design-planning worker.
license: MIT
compatibility: opencode
---

# Opencode design-planning worker binding

## Dispatch

Start exactly one explicit worker with:

`task(subagent_type: "sai-design-planning-worker", prompt: "<original InvocationEnvelope and design-worker instruction>")`

Capture and bind the returned `task_id` in coordinator conversation state. The worker payload never contains its own task ID. The task ID and continuation metadata are coordinator-owned and binding-owned, never worker-authored. For `needs_input`, return a bound result containing the worker payload plus `continuation_reference` set to the captured `task_id`.

## Continue

Continue the same task with:

`task(task_id: "<captured task ID>", prompt: "<selected value>")`

Bind a subsequent `needs_input` payload to the same task ID. Never replace same-task continuation with a new task unless task-ID continuation fails.

## Notice continuation

Continue the same task with:

`task(task_id: "<captured task ID>", prompt: "continue_after_notice")`

Wait for the same task's next structured payload and bind it to the same task ID.

## Recovery

If task-ID continuation fails, start one fresh worker explicitly. Send only the original InvocationEnvelope plus: `Reconstruct independently from the current durable OpenSpec artifacts; the prior worker could not be resumed.` Include exact opaque input history, exact pending feedback when present, and `fast_track_banner_emitted`. Capture the replacement task ID. Never package artifact contents into the fallback prompt.

## Nested helper branches

The worker permission must deny every task target except `explore`. It may dispatch only the `explore` subagent.

## Design reconstruction metadata

Reconstruction metadata includes: `opaque_input_history`, `pending_feedback`, `fast_track_banner_emitted`, `resolved_change_name`, and the original `wrapper_echo_value` and `arguments_value` from the invocation envelope.

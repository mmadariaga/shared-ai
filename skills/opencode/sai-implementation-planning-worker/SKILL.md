---
name: sai-implementation-planning-worker
description: Opencode binding for the SAI implementation-planning worker.
license: MIT
compatibility: opencode
---

# Opencode implementation-planning worker binding

## Dispatch

Start exactly one explicit worker with:

`task(subagent_type: "sai-implementation-planning-worker", prompt: "<original InvocationEnvelope and implementation-worker instruction>")`

Capture and bind the returned `task_id` in coordinator conversation state. The worker payload never contains its own task ID. The task ID and continuation metadata are coordinator-owned and binding-owned, never worker-authored. For `needs_input`, return a bound result containing the worker payload plus `continuation_reference` set to the captured `task_id`.

## Continue

Continue the same task with:

`task(task_id: "<captured task ID>", prompt: "<selected value>")`

Bind a subsequent `needs_input` payload to the same task ID. Never replace same-task continuation with a new task unless task-ID continuation fails.

## Recovery

If task-ID continuation fails, start one fresh worker explicitly. Send only the original InvocationEnvelope plus: `Reconstruct independently from the current durable OpenSpec artifacts; the prior worker could not be resumed.` Capture the replacement task ID. Never package artifact contents into the fallback prompt.

## Nested helper branches

The worker permission must deny every task target except `budget` and `explore`. Existing-plan simplification and rerun-new-element research dispatch `budget`; ADR-index cold-build dispatches `explore`. Preserve these nested helper branches and their task availability.

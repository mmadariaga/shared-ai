---
name: sai-implementation-planning-worker
description: Claude Code binding for the SAI implementation-planning worker.
license: MIT
compatibility: claude
---

# Claude implementation-planning worker binding

## Dispatch

Start exactly one background worker with:

`Agent(subagent_type: "sai-implementation-planning-worker", run_in_background: true, prompt: "<original InvocationEnvelope and implementation-worker instruction>")`

Capture the returned agent ID in coordinator conversation state. Await the background worker's structured payload. The worker payload never contains its own ID.

For `needs_input`, return a bound result containing the worker payload plus `continuation_reference` set to the captured agent ID. The continuation reference is binding-owned metadata, not worker output.

## Continue

Forward the selected option value with:

`SendMessage(to: "<captured agent ID>", message: "<selected value>")`

Do not use an Agent `resume` parameter. Wait asynchronously for the same background agent's next structured payload, then bind that payload to the same agent ID when it again needs input.

## Recovery

If `SendMessage` or waiting for the resumed agent fails, start one fresh worker in the background. Send only the original InvocationEnvelope plus: `Reconstruct independently from the current durable OpenSpec artifacts; the prior worker could not be resumed.` Capture the new agent ID. Never package artifact contents into the fallback prompt.

## Nested helper branches

The custom worker's Agent and Skill tools must remain available. Existing-plan simplification and rerun-new-element research dispatch `budget-subagent`; ADR-index cold build dispatches `budget-explorer`.

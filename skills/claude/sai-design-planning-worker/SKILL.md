---
name: sai-design-planning-worker
description: Claude Code binding for the SAI design-planning worker.
license: MIT
compatibility: claude
---

# Claude design-planning worker binding

## Dispatch

Start exactly one background worker with:

`Agent(subagent_type: "sai-design-planning-worker", run_in_background: true, prompt: "<original InvocationEnvelope and design-worker instruction>")`

Capture the returned agent ID in coordinator conversation state. Await the background worker's structured payload. The worker payload never contains its own ID.

For `needs_input`, return a bound result containing the worker payload plus `continuation_reference` set to the captured agent ID. The continuation reference is binding-owned metadata, not worker output.

## Continue

Forward the selected option value with:

`SendMessage(to: "<captured agent ID>", message: "<selected value>")`

Do not use an Agent `resume` parameter. Wait asynchronously for the same background agent's next structured payload, then bind that payload to the same agent ID when it again needs input.

## Notice continuation

Forward the exact fixed acknowledgement with:

`SendMessage(to: "<captured agent ID>", message: "continue_after_notice")`

Wait for the same background agent's next structured payload and bind it to the same agent ID.

## Recovery

If `SendMessage` or waiting for the resumed agent fails, start one fresh worker in the background. Send the original InvocationEnvelope plus: `Reconstruct independently from the current durable OpenSpec artifacts; the prior worker could not be resumed.` Include exact opaque input history, exact pending feedback when present, and `fast_track_banner_emitted`. Capture the new agent ID. Never package artifact contents into the fallback prompt.

## Nested helper branches

The worker must have its Agent and Skill tools available. It may dispatch only the mandatory `budget-explorer` nested branch. All other nested dispatch is prohibited.

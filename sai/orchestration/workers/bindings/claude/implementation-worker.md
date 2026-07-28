# Claude Implementation Worker Binding

## dispatch_worker

Start exactly one background worker with:

`Agent(subagent_type: "sai-implementation-planning-worker", run_in_background: true, prompt: "<original InvocationEnvelope and implementation-worker instruction>")`

Capture the agent ID in coordinator state as the binding-owned
`continuation_reference`, await its structured payload, and expose that
reference for `needs_input`. The identifier is never worker input or output.

## continue_same_worker

Forward answers to the captured reference with
`SendMessage(to: "<captured agent ID>", message: "<selected value>")`.
Continue the same worker. Do not use an Agent `resume` parameter.

## dispatch_one_replacement_worker

If continuation or waiting reports a failed/failure result, start at most one
fresh worker in the background to reconstruct the plan. The replacement receives only these reconstruction
fields: `original_envelope`, `resolved_change_name`, `opaque_input_history`, and
`durable_artifact_reconstruction_instruction`. Send the exact reconstruction
instruction and fields, never artifact contents or binding metadata.

The nested helper branches may dispatch `budget-subagent` for existing-plan simplification and
rerun-new-element research, and `budget-explorer` for ADR-index cold builds.

# Claude Implementation Worker Binding

Start exactly one background worker with:

`Agent(subagent_type: "sai-implementation-planning-worker", run_in_background: true, prompt: "<original InvocationEnvelope and implementation-worker instruction>")`

Capture the agent ID in coordinator state, await its structured payload, and
bind it as `continuation_reference` for `needs_input`. The identifier is
binding-owned and never worker output.

Forward answers with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`.
Do not use an Agent `resume` parameter; continue the same worker.

If continuation or waiting fails, start one fresh worker in the background and send
only the original envelope plus the exact reconstruction instruction and
fields. Never package artifacts or binding metadata in worker output.

The nested helper branches may dispatch `budget-subagent` for existing-plan simplification and
rerun-new-element research, and `budget-explorer` for ADR-index cold builds.

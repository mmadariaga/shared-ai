# Claude Design Worker Binding

Start exactly one background worker with:

`Agent(subagent_type: "sai-design-planning-worker", run_in_background: true, prompt: "<original InvocationEnvelope and design-worker instruction>")`

Capture the agent ID in coordinator state, await its structured payload, and
bind it as `continuation_reference` for `needs_input`. The identifier is
binding-owned and never worker output.

Forward answers with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`.
Do not use Agent `resume`; continue the same worker.

Forward `continue_after_notice` exactly for design notices.

If continuation or waiting fails, start one fresh background worker and send
the original envelope plus the exact reconstruction fields and instruction to
reconstruct from current durable OpenSpec artifacts. Never package artifacts.

The worker may dispatch only the mandatory `budget-explorer` nested branch and
must retain Agent and Skill access.

# Claude Spec Worker Binding

Start exactly one background worker with:

`Agent(subagent_type: "sai-1-spec-proposal-worker", run_in_background: true, prompt: "<original InvocationEnvelope and spec-worker instruction>")`

Capture the agent ID as binding-owned continuation metadata and await its structured payload. Continue with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`; never use Agent `resume`.

If continuation or waiting fails, start at most one fresh background worker with the complete original envelope and reconstruction state. Never package artifacts or expose binding metadata in worker payloads.

The worker may retain only the binding-owned agent ID and may dispatch only the required budget/explore helper targets.

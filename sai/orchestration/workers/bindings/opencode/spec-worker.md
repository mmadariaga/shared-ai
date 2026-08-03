# Opencode Spec Worker Binding

Start exactly one explicit worker with:

`task(subagent_type: "sai-1-spec-proposal-worker", prompt: "<original InvocationEnvelope and spec-worker instruction>")`

Capture `task_id` only as binding-owned continuation metadata. Continue the same task with `task(task_id: "<captured task ID>", prompt: "<selected value>")` and never replace a same-task continuation unless it fails.

If continuation fails, start at most one fresh explicit worker with the complete original envelope and reconstruction state. Never package artifacts or expose binding metadata in worker payloads.

The worker permission allows only the required budget/explore helper targets.

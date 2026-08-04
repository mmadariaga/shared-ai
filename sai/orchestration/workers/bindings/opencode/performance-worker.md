# Opencode Performance Worker Binding

The canonical numbered task identity is `sai-7-performance-worker`.

Start exactly one explicit worker with:

Dispatch the complete original envelope unchanged.

`task(subagent_type: "sai-7-performance-worker", prompt: "<original InvocationEnvelope and performance-worker instruction>")`

Capture `task_id` in coordinator state and expose it only as binding-owned `continuation_reference`. Continuation metadata is binding-owned. Preserve the worker's `summary`, `question`, ordered options, paths, and resolved names. Attempt same-worker continuation first with the same task: continue with `task(task_id: "<captured task ID>", prompt: "<selected value>")` using the exact answer. If same-task continuation fails, start at most one replacement task with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize read-only `explore` for source, diff, tier, and baseline research within the worker's eight-call cap. Every delegated result uses bounded evidence. Authorize only explicitly user-approved, bounded, read-only performance diagnostics in measurement mode; these are authorized read-only diagnostics. Reject generic write-capable delegation, production edits, schema or migration edits, configuration mutation, dependency changes, package installation, and diagnostics without explicit authorization.

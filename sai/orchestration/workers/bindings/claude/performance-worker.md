# Claude Performance Worker Binding

The canonical managed Agent identity is `sai-7-performance-worker`.

Start exactly one background worker with:

Dispatch the complete original envelope unchanged.

`Agent(subagent_type: "sai-7-performance-worker", run_in_background: true, prompt: "<original InvocationEnvelope and performance-worker instruction>")`

Capture the agent ID in coordinator state, await its closed payload, and bind it as `continuation_reference` for `needs_input`. Attempt same-worker continuation first. The identifier is binding-owned and never worker output. Continuation metadata is binding-owned. Preserve the worker's `summary`, `question`, ordered options, paths, and resolved names. Forward exact answers with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`; never use Agent `resume`.

If continuation or waiting fails, start at most one replacement worker with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize read-only `budget-explorer` for source, diff, tier, and baseline research within the worker's eight-call cap. Every delegated result uses bounded evidence. Authorize only explicitly user-approved, bounded, read-only performance diagnostics in measurement mode; these are authorized read-only diagnostics. Reject generic write-capable delegation, production edits, schema or migration edits, configuration mutation, dependency changes, package installation, and diagnostics without explicit authorization.

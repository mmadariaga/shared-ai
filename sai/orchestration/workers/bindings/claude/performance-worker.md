# Claude Performance Worker Binding

The canonical managed Agent identity is `sai-7-performance-worker`.

Start exactly one background worker with:

Dispatch the complete original envelope unchanged.

`Agent(subagent_type: "sai-7-performance-worker", run_in_background: true, prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-7-performance-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

Capture the agent ID in coordinator state, await its closed payload, and bind it as `continuation_reference` for `needs_input`. Attempt same-worker continuation first. The identifier is binding-owned and never worker output. Continuation metadata is binding-owned. Preserve the worker's `summary`, `question`, ordered options, paths, and resolved names. Forward exact answers with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`; never use Agent `resume`.

If continuation or waiting fails, start at most one replacement worker with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize read-only `budget-explorer` for source, diff, tier, and baseline research within the worker's eight-call cap. Every delegated result uses bounded evidence. Authorize only explicitly user-approved, bounded, read-only performance diagnostics in measurement mode; these are authorized read-only diagnostics. Reject generic write-capable delegation, production edits, schema or migration edits, configuration mutation, dependency changes, package installation, and diagnostics without explicit authorization.

On each progress event, update the harness task list so the reported step ids
render `completed` and the leading unmarked step renders `in_progress`, per
the deterministic state derivation of `@sai/policies/todo-structure.md`, by
whatever mechanism the harness's task-list tool provides. Incrementality is a
binding-level optimization, not a normative contract: where the harness tool
supports updating single entries without re-listing the rest, use them; where
it replaces the list wholesale, emit the full list on each update. Emit no task list
at all for a declared plan below the minimum threshold defined by
`@sai/policies/todo-structure.md`.
The task-list tool call originates exclusively from the coordinator session,
never from a worker subagent, per the emission-ownership invariant of
`@sai/policies/todo-structure.md`.

Audit plans receive no Milestone Stamp annotation: render no stamp and make no
stamp-acquisition call, per the milestone-stamp annotation section of
`@sai/policies/todo-structure.md`.

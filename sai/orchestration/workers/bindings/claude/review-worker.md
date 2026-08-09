# Claude Review Worker Binding

Start exactly one background worker with:

`Agent(subagent_type: "sai-5-review-worker", run_in_background: true, prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-5-review-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

Capture the agent ID in coordinator state, await its closed payload, and bind it as `continuation_reference` for `needs_input`. The identifier is binding-owned and never worker output. Forward exact answers with `SendMessage(to: "<captured agent ID>", message: "<selected value>")`; never use Agent `resume`.

If continuation or waiting fails, start at most one fresh background worker with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize exactly two nested branches: read-only `budget-explorer` for source, diff, and glossary research in passes 1-10; and write-capable `budget-subagent` only for Pass 11 mechanical mutation I/O. Mutation batches contain at most 5-6 assigned mutations, run sequentially, and return each mutation exactly once with an outcome from `killed`, `survived`, `pre-check-failed`, or `revert-failed`. Never normalize the Pass 11 branch to read-only exploration.

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

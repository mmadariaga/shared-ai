# Opencode Review Worker Binding

Start exactly one explicit worker with:

`task(subagent_type: "sai-5-review-worker", prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-5-review-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

Capture `task_id` in coordinator state and expose it only as binding-owned `continuation_reference`. Continue with `task(task_id: "<captured task ID>", prompt: "<selected value>")` using the exact answer. If same-task continuation fails, start at most one replacement task with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize exactly two nested branches: read-only `explore` for source, diff, and glossary research in passes 1-10; and write-capable `budget` only for Pass 11 mechanical mutation I/O. Mutation batches contain at most 5-6 assigned mutations, run sequentially, and return each mutation exactly once with an outcome from `killed`, `survived`, `pre-check-failed`, or `revert-failed`. Never normalize the Pass 11 branch to read-only exploration.

On each progress event, emit one `todowrite` call with the full `todos` array
per `@sai/policies/todo-structure.md`: completed steps carry state
`completed`, the first incomplete step carries `in_progress`, all remaining
steps carry `pending`, and a constant priority is used for every entry. Emit
no `todowrite` call for a declared plan below the minimum threshold defined by
`@sai/policies/todo-structure.md`. The `todowrite` call originates
exclusively from the coordinator session, never from a worker subagent —
opencode disables the tool for subagents by default and the worker runs as a
subagent, per the emission-ownership invariant of
`@sai/policies/todo-structure.md`.

Audit plans receive no Milestone Stamp annotation: render no stamp and make no
stamp-acquisition call, per the milestone-stamp annotation section of
`@sai/policies/todo-structure.md`.

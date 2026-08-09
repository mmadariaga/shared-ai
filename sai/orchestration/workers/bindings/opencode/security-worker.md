# Opencode Security Worker Binding

Start exactly one explicit worker with:

`task(subagent_type: "sai-6-security-worker", prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-6-security-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

Capture `task_id` in coordinator state and expose it only as binding-owned `continuation_reference`. Continue with `task(task_id: "<captured task ID>", prompt: "<selected value>")` using the exact answer. If same-task continuation fails, start at most one replacement task with the original envelope and complete reconstruction fields. Never package artifacts or the prior journal.

Authorize read-only `explore` for source, diff, and glossary research within the worker's eight-call cap. Authorize bounded read-only execution only for applicable `npm audit`, `pip-audit`, `mvn dependency-check`, `trivy`, and `osv-scanner` commands. Reject generic write-capable delegation, package installation, dependency updates, production edits, dependency-file edits, configuration mutation, and every command outside this audit allowlist.

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

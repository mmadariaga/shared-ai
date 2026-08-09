# Opencode Accessibility Worker Binding

The canonical numbered task identity is `sai-8-accessibility-worker`.

## dispatch_one_worker

Start exactly one explicit numbered task with:

`task(subagent_type: "sai-8-accessibility-worker", prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-8-accessibility-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

## Closed lifecycle result

Accept only a closed lifecycle result with exactly one of `completed`, `needs_input`, `failed`, or `cancelled` as `status`, plus `summary`, `blocking_summary`, and `changed_files`. A `needs_input` result also contains the worker-authored `question` and ordered `options`. The result must not contain a continuation identifier, runtime command, report content, or binding metadata.

Dispatch the complete original envelope unchanged. Capture `task_id` only as binding-owned continuation metadata and expose it only as `continuation_reference`. Preserve the worker's summary, question, ordered options, paths, and resolved names.

## continue_same_worker

Attempt same-worker continuation first with the same task: `task(task_id: "<captured task ID>", prompt: "<selected value>")`. Forward only the exact selected value, preserving active worker state and adding no binding data, prior answers, or interpretation.

## dispatch_one_replacement_worker

If same-task continuation fails, start at most one replacement task with the original envelope and complete reconstruction fields. The replacement restarts runtime processing and is dispatched without prior authorization, command results, evidence, journal, or artifact content. Never package the prior journal or report content. If replacement also fails, return a closed failure without further dispatch.

Authorize bounded read-only `explore` source research within the worker's eight-call cap and only explicitly authorized scanner commands. Reject generic write-capable delegation, production/configuration/dependency writes, package installation, dependency changes, and unauthorized diagnostics or scanners.

## Progress rendering

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

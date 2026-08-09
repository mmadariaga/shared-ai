# Claude Accessibility Worker Binding

The canonical managed Agent identity is `sai-8-accessibility-worker`.

## dispatch_one_worker

Start exactly one background managed Agent with:

`Agent(subagent_type: "sai-8-accessibility-worker", run_in_background: true, prompt: "Worker contract: Fetch @sai/orchestration/workers/sai-8-accessibility-worker.md and follow it exactly.\n\nInvocationEnvelope:\n<original InvocationEnvelope>")`

## Closed lifecycle result

Accept only a closed lifecycle result with exactly one of `completed`, `needs_input`, `failed`, or `cancelled` as `status`, plus `summary`, `blocking_summary`, and `changed_files`. A `needs_input` result also contains the worker-authored `question` and ordered `options`. The result must not contain a continuation identifier, runtime command, report content, or binding metadata.

Dispatch the complete original envelope unchanged. Capture the agent ID only as binding-owned continuation metadata, await its closed payload, and bind it as `continuation_reference` for `needs_input`. Preserve the worker's summary, question, ordered options, paths, and resolved names.

## continue_same_worker

Attempt same-worker continuation first. Forward only the exact selected value through `SendMessage(to: "<captured agent ID>", message: "<selected value>")`; do not add interpretation, prior answers, or binding data. Preserve active worker state and use no Agent `resume`.

## dispatch_one_replacement_worker

If continuation or waiting fails, start at most one replacement background worker with the original envelope and complete reconstruction fields. The replacement restarts runtime processing and is dispatched without prior authorization, command results, evidence, journal, or artifact content. Never package the prior journal or report content. If replacement also fails, return a closed failure without further dispatch.

Authorize bounded read-only `budget-explorer` source research within the worker's eight-call cap and only explicitly authorized scanner commands. Reject generic write-capable delegation, production/configuration/dependency writes, package installation, dependency changes, and unauthorized diagnostics or scanners.

## Progress rendering

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

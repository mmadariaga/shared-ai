# Opencode Accessibility Worker Binding

The canonical numbered task identity is `sai-8-accessibility-worker`.

## dispatch_one_worker

Start exactly one explicit numbered task with:

`task(subagent_type: "sai-8-accessibility-worker", prompt: "<original InvocationEnvelope and accessibility-worker instruction>")`

## Closed lifecycle result

Accept only a closed lifecycle result with exactly one of `completed`, `needs_input`, `failed`, or `cancelled` as `status`, plus `summary`, `blocking_summary`, and `changed_files`. A `needs_input` result also contains the worker-authored `question` and ordered `options`. The result must not contain a continuation identifier, runtime command, report content, or binding metadata.

Dispatch the complete original envelope unchanged. Capture `task_id` only as binding-owned continuation metadata and expose it only as `continuation_reference`. Preserve the worker's summary, question, ordered options, paths, and resolved names.

## continue_same_worker

Attempt same-worker continuation first with the same task: `task(task_id: "<captured task ID>", prompt: "<selected value>")`. Forward only the exact selected value, preserving active worker state and adding no binding data, prior answers, or interpretation.

## dispatch_one_replacement_worker

If same-task continuation fails, start at most one replacement task with the original envelope and complete reconstruction fields. The replacement restarts runtime processing and is dispatched without prior authorization, command results, evidence, journal, or artifact content. Never package the prior journal or report content. If replacement also fails, return a closed failure without further dispatch.

Authorize bounded read-only `explore` source research within the worker's eight-call cap and only explicitly authorized scanner commands. Reject generic write-capable delegation, production/configuration/dependency writes, package installation, dependency changes, and unauthorized diagnostics or scanners.

# Command Runner

This contract is phase-neutral. The coordinator owns lifecycle routing and does
not perform the technical work delegated to a worker.

## Result Loop

Initialize one invocation-scoped ordered, duplicate-free `changed_files` union.
Dispatch one worker with the phase adapter's `original_envelope` and validate
every returned result before acting on it.

Worker results are closed payloads. A terminal result has exactly one of these
statuses: `completed`, `needs_input`, `failed`, or `cancelled`. Validate the
status, string `summary`, and string-list `changed_files`; `needs_input` also
requires its question, ordered options where applicable, and binding-owned
continuation metadata. A design notice is the separate closed shape
`{event: "notice", message: string, changed_files: string[]}`.

Add every reported path to the invocation-scoped union in first-seen order.
The non-reset enumeration spans input, feedback, notice, progress,
continuation, and recovery, and is never reset.

For `needs_input`, present the exact question and options, forward the exact
answer through the active binding, and process the next result through this
loop. For a notice, invoke the design adapter's notice extension and forward
its fixed acknowledgement. Notices are not a worker status.

A progress event is the separate closed shape
`{event: "progress", step_ids: string[], changed_files: string[]}`: mark the
reported step ids in the adapter-declared plan, ignore undeclared ids not
declared in the plan — the plan is never extended or amended for them — add
every path in `changed_files` to the invocation-scoped union in first-seen
order, and continue the same worker with exactly `continue_after_progress`.
Progress events are not a worker status.

Attempt same-worker continuation first. If it fails, preserve the union and
dispatch at most one replacement worker with the original envelope, exact
opaque input history, pending phase feedback when present, and all required
reconstruction metadata. Replacement reconstruction must have complete phase
state. If any required field is unavailable, return a failed restart request
and do not dispatch a replacement.

The coordinator invokes only these phase-adapter fields, plus the optional
static, ordered `progress_plan` declaration:

- `original_envelope`
- `dispatch_operation`
- `continuation_operation`
- `allowed_nonterminal_extensions`
- `extension_handlers`
- `replacement_reconstruction_fields`
- `terminal_navigation`
- `progress_plan` (optional — static, ordered, fully known at dispatch, immutable for the invocation)

The dispatch passes exactly `wrapper_echo_value` and `arguments_value`; the
progress plan is declared by the phase adapter, is never carried in the
dispatch envelope or in any reconstruction field, and survives same-worker
continuation and replacement-worker reconstruction in invocation-scoped
state.

Terminal behavior is supplied by `terminal_navigation`. The coordinator never
reads artifacts, resolves phase data, or invents phase-specific payload fields.

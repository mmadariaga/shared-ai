# Command Runner

This contract is phase-neutral. The coordinator owns lifecycle routing and does
not perform the technical work delegated to a worker.

## Result Loop

Initialize one invocation-scoped ordered, duplicate-free `changed_files` union.
Dispatch one worker with the phase adapter's `original_envelope` and validate
every returned result before acting on it.

Worker results are closed payloads. A terminal result has exactly one of these
statuses: `completed`, `needs_input`, `failed`, or `cancelled`. `completed`,
`failed`, and `cancelled` are run-closing; `needs_input` is a terminal
lifecycle status that is not run-closing — it pauses the run for the
forwarded answer, and the loop processes the next result. Validate the
status, the offset-bearing ISO-8601 `emitted_on`, string `summary`, and string-list
`changed_files`; `needs_input` also requires its question, ordered options where
applicable, and binding-owned continuation metadata. A design notice is the
separate closed shape
`{event: "notice", emitted_on: string, message: string, changed_files: string[]}`.

Add every reported path to the invocation-scoped union in first-seen order.
The non-reset enumeration spans input, feedback, notice, progress,
continuation, and recovery, and is never reset.

Every closed payload — terminal status, notice, and progress event alike —
carries the worker-authored `emitted_on` immediately after its `status` or
`event` discriminator, in the exact form `YYYY-MM-DDTHH:MM:SS±HH:MM` — local
wall-clock time with the session's numeric UTC offset, never the `Z` designator.
It is mandatory in every result and in every phase; a missing, non-ISO-8601, or
offset-less value is a malformed payload, handled through the same route as any
other closed-shape violation. Forward or record the value verbatim and never
invent, correct, re-derive, or reformat it. It is also the sole source of the
Milestone Stamp: the `HH:mm` a progress task list attaches to a step it renders
`completed` is that step's marking result's `emitted_on` per
`@sai/policies/todo-structure.md`, read straight off the value with no
conversion, so the coordinator issues no wall-clock call and resolves no zone.

For `needs_input`, present the exact question and options, forward the exact
answer through the active binding, and process the next result through this
loop. For a notice, invoke the design adapter's notice extension and forward
its fixed acknowledgement. Notices are not a worker status.

A progress event is the separate closed shape
`{event: "progress", emitted_on: string, step_ids: string[], changed_files: string[]}`: mark the
reported step ids in the adapter-declared plan, recording whether the event
added at least one previously unmarked declared id; ignore undeclared ids not
declared in the plan — the plan is never extended or amended for them — and
add every path in `changed_files` to the invocation-scoped union in first-seen
order. When the adapter declares a `progress_plan` and the event changed the
marked set, apply the progress-event render act from
`@sai/policies/todo-structure.md` before continuing the same worker. A
progress event that changed no marked state performs no render and stamps
nothing. Then continue the same worker with exactly `continue_after_progress`.
Render before resuming, so the user sees the mark before the next stretch of
worker work begins. Progress events are not a worker status.

Attempt same-worker continuation first. If it fails, preserve the union and
dispatch at most one replacement worker with the original envelope, exact
opaque input history, pending phase feedback when present, and all required
reconstruction metadata. Replacement reconstruction must have complete phase
state. If any required field is unavailable, return a failed restart request
and do not dispatch a replacement.

The coordinator invokes only these phase-adapter fields, plus the optional
static, ordered `progress_plan` declaration and the optional static
`recovery_policy` declaration:

- `original_envelope`
- `dispatch_operation`
- `continuation_operation`
- `allowed_nonterminal_extensions`
- `extension_handlers`
- `replacement_reconstruction_fields`
- `terminal_navigation`
- `progress_plan` (optional — static, ordered, fully known at dispatch, immutable for the invocation)
- `recovery_policy` (optional — static boolean, fully known at dispatch, immutable for the invocation)

The dispatch passes exactly `wrapper_echo_value` and `arguments_value`; the
progress plan is declared by the phase adapter, is never carried in the
dispatch envelope or in any reconstruction field, and survives same-worker
continuation and replacement-worker reconstruction in invocation-scoped
state.

Terminal behavior is supplied by `terminal_navigation`. The coordinator never
reads artifacts, resolves phase data, or invents phase-specific payload fields.

## Bounded Recovery

The shared runner owns the bounded same-worker recovery pool. When the phase
adapter declares the optional static `recovery_policy: true`, the runner
creates one invocation-scoped pool of exactly three attempts, immutable for the
invocation. The fixed recovery acknowledgement `continue_after_recovery` is
runner-owned and is not an additional phase-adapter field.

1. Validate every resolved failed outcome against the worker class vocabulary
   — `blocking-contradiction`, `validation-failed`, `generation-error`,
   `dispatch-failed`, `envelope-contract-violation`, and
   `unclassified-worker-fault` — and the boolean veto. Missing or unknown
   failure metadata, or a worker-authored `outer-envelope-violation`, becomes
   a coordinator-authored `outer-envelope-violation`: it spends zero attempts,
   dispatches no replacement, and hands back naming the offending value or the
   missing field.
2. Create the pool only when the adapter declares `recovery_policy: true`;
   otherwise no recovery pool exists and failed outcomes fall through to the
   terminal result path.
3. Eligible classes are only `validation-failed`, `generation-error`,
   `dispatch-failed`, and `envelope-contract-violation`.
   `blocking-contradiction`, `outer-envelope-violation`, and
   `unclassified-worker-fault` spend zero attempts. Blocking contradiction
   takes precedence over a simultaneous veto.
4. Before each attempt, emit conversation text naming the triggering
   failure class and the ordinal attempt (`1 of 3`, `2 of 3`, `3 of 3`);
   then continue the same live worker with `continue_after_recovery`.
   Recovery never dispatches a replacement worker.
5. Deduct each failed recovery continuation from the same pool even when the
   class changes. Continuation loss stops recovery immediately. `needs_input`
   exits recovery without charging that result and resumes the normal input
   loop. `cancelled` never enters recovery. Ordinary continuation loss
   outside recovery retains the existing at-most-one replacement fallback.
6. Preserve one first-seen ordered `changed_files` union and one spent-attempt
   count across initial results, progress, notices, input, normal continuation,
   and recovery. `--fast-track` changes neither the recovery budget nor its
   reporting.
7. Hand-backs name the failure class, attempts spent, and the stopping reason
   (blocking contradiction, worker veto, exhaustion, continuation failure,
   input, or cancellation). Recovery announcements and hand-backs are
   conversation text and never mark, extend, rename, or add progress-plan
   steps.

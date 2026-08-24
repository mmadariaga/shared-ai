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
`{event: "progress", emitted_on: string, step_ids: string[], changed_files: string[]}`.
Mark reported ids against the adapter's declared `progress_plan` when one is
present, or against the declared `step_pointer_map` when the adapter uses a
routing-only map. Ignore ids outside the active declaration — neither a plan
nor a map is extended or amended at runtime. The active declaration is never
extended or amended at runtime. In particular, undeclared step ids
are ignored rather than added to the active declaration. The runner records whether the
event reported at least one previously unmarked declared id before rendering,
and add every path in
`changed_files` to the invocation-scoped union in first-seen order. When a
visual `progress_plan` exists and the event changed its marked set, apply the
progress-event render act from `@sai/policies/todo-structure.md` before
continuing the same worker. A routing-only event performs no render and stamps
nothing. Then continue the same worker with exactly `continue_after_progress`.
Render before resuming when rendering is enabled, so the user sees the mark
before the next stretch of worker work begins. Progress events are not a worker
status.

Attempt same-worker continuation first. If it fails, preserve the union and
dispatch at most one replacement worker with the original envelope, exact
opaque input history, pending phase feedback when present, and all required
reconstruction metadata. Replacement reconstruction must have complete phase
state. If any required field is unavailable, return a failed restart request
and do not dispatch a replacement.

The coordinator invokes only these phase-adapter fields, plus the optional
static, ordered `progress_plan` declaration, the optional static
`recovery_policy` declaration, and the optional static `step_pointer_map`
declaration:

- `original_envelope`
- `dispatch_operation`
- `continuation_operation`
- `allowed_nonterminal_extensions`
- `extension_handlers`
- `replacement_reconstruction_fields`
- `terminal_navigation`
- `progress_plan` (optional — static, ordered, fully known at dispatch, immutable for the active adapter segment; under composition the pre-delta phrase "immutable for the invocation" means immutable for the active adapter segment, and a one-adapter invocation keeps segment scope identical to today's invocation scope; it controls visual task-list rendering only)
- `recovery_policy` (optional — static boolean, fully known at dispatch, immutable for the active adapter segment under the same segment reading as `progress_plan`) (recovery semantics: @sai/policies/bounded-recovery.md)
- `step_pointer_map` (optional — static map from phase progress ids to just-in-time step instruction paths, fully known at dispatch, immutable for the active adapter segment under the same segment reading as `progress_plan`; it may be declared without a visual `progress_plan`)

The dispatch passes exactly `arguments_value`; the
progress plan is declared by the phase adapter, is never carried in the
dispatch envelope or in any reconstruction field, and survives same-worker
continuation and replacement-worker reconstruction in invocation-scoped
state.

Terminal behavior is supplied by `terminal_navigation`. The coordinator never
reads artifacts, resolves phase data, or invents phase-specific payload fields.

## Step-gated pointer delivery

Step-pointer routing is independent from visual progress-plan rendering. A
`progress_plan` supplies the ordered task list and its panel state; a
`step_pointer_map` supplies just-in-time worker instruction routing. An adapter
may declare the pointer map without declaring a progress plan when a supervising
surface must hide the worker plan but still preserve step continuity. In that
shape the runner tracks valid mapped step ids internally, performs no task-list
render, and still derives every pointer deterministically.

When the active adapter declares an optional static `step_pointer_map`, each
progress-event continuation payload sent to the same worker is exactly two
lines: today's protocol continuation line first, then one pointer line derived
deterministically from the mapped phase ids — apply the just-processed event's
marks and take the first mapped step still unmarked in canonical map order;
that second line reads `Active step: <id> — follow <path>` with that step's id
and its mapped path from the static map. With every mapped step marked, the
second line reads exactly `Active step: none — complete remaining work and return your terminal result.` The pointer travels only in this continuation
payload: the materialized binding literal is untouched, and no dispatch
envelope or reconstruction field carries step paths. Continuations that are not
progress continuations — feedback turns, notices, and `continue_after_recovery`
— carry no pointer line, so the worker's active step file persists across them
in its continuous session. When the declaring adapter also requires replacement
reconstruction, that reconstruction state additionally includes the worker's
`active_step_id`, and the replacement's first continuation carries the pointer
line for that step. Render-before-resume ordering is unchanged: the coordinator
renders the progress mark when a visual `progress_plan` exists before sending
the two-line continuation. Without a declared `step_pointer_map`, progress
continuations keep today's exact-literal behavior and no other phase surface
changes.

## Chained phase composition

The shared coordinator contract permits one invocation to execute an ordered
sequence of phase adapters without introducing a new orchestration file and
without relocating this file. Composition obeys exactly three rules:

1. **Ordered multi-adapter invocation** — A single supervising invocation MAY
   declare an ordered sequence of phase adapters as an indexable list and SHALL
   execute them strictly in list order through this Result Loop. The composition
   retains a zero-based position into that list. Activating a segment SHALL
    rebind that segment's adapter fields (including that segment's `progress_plan`,
    `step_pointer_map`, and `recovery_policy` when declared); recovery-ledger creation, scoping, and
   non-inheritance across segments follow `@sai/policies/bounded-recovery.md`.
   The invocation-scoped changed-files
   union initialized by this runner SHALL continue across segment activations
   in first-seen order and SHALL NOT reset at a transition.
   Intra-segment multi-dispatch behavior a phase already owns (for example apply's
   per-dispatch plan selection) remains phase-owned inside the active segment and
   is not a second composition axis.

2. **Non-final terminal navigation resolves to transition** — When a non-final
   phase adapter (position `i` where `i + 1` is still in range) reaches an
   adapter-authorized successful phase completion, its `terminal_navigation`
   SHALL resolve to the composition's authorized transition rather than to that
   phase's standalone pinned completion literal or run-ending stop. The
   authorized transition SHALL name exactly the successor at position `i + 1` and
   that successor's `original_envelope` values the composition authorizes for the
   next segment (including any composition-injected session signals such as
   apply's fast-track boolean). The shared contract SHALL activate only that
   consecutive successor with that envelope. It SHALL NOT skip ahead to a later
   list entry. Only the final adapter's `terminal_navigation` (or the sole
   adapter in a one-adapter invocation) SHALL emit the user-facing
   invocation-closing completion presentation on a successful run. `failed`,
   `cancelled`, malformed worker terminal payloads, and malformed transitions
   SHALL close the supervising invocation without advancing.
   The runner must not infer the next phase or successor from worker summaries,
   artifacts, or `changed_files` text; only the authorized transition names the
   successor.

3. **Chained Isolation Mode does not reset supervisor state** — Entering a
   chained phase adapter's Isolation Mode preamble SHALL isolate that phase's
   worker-facing input as the phase already requires and SHALL NOT clear
   supervisor session state retained by the supervising invocation (including the
   resolved change identity, composition position, invocation-scoped
   changed-files union, and other supervisor-owned session signals the
   composition carries). Worker isolation and supervisor continuity remain
   distinct.

A transition is malformed when it omits the successor identity, names any adapter
other than position `i + 1`, omits an envelope field the successor adapter's
contract requires for dispatch, or duplicates a segment already completed in this
invocation. Handoff of supervisor-retained state is by continuity of the
supervising invocation — not by copying artifact bodies into the transition. The
composition constructs each successor's `original_envelope` directly; it does not
invoke a harness boot adapter or wrapper to produce that envelope. For a chained
apply segment the composition-authorized envelope SHALL carry exactly:
`command_name` set to the apply command identity (it is not a routing or
card-selection input on the chained path — the composition already selected the
apply adapter), and `arguments_value` set to the already-resolved change name.
Worker dispatch inside the apply segment continues to use the runner's
`arguments_value` worker envelope as today. Apply's normalized fast-track
boolean and other supervisor-retained session signals are set by the composition
as session state for that segment and are not required to appear as additional
envelope keys. The historical apply boot-envelope versus worker-dispatch-envelope
seam remains for standalone wrapper boots and is not reopened as a redesign
target by this delta.

The three rules are a delta on the existing shared contract. They do not
authorize explore-supervisor semantics (selector gates, chat-scoped autonomy, or
explore's inline item-10 transition) as the default composition pattern. A
composition with a single phase adapter retains today's one-phase behavior
unchanged.

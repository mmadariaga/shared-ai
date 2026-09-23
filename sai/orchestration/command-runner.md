# Command Runner

Fetch @sai/policies/public-chat.md and follow it exactly.

This contract is phase-neutral. The coordinator owns lifecycle routing and does
not perform the technical work delegated to a worker.

## Result Loop

### Dispatch and task disclosure

Every routed stretch costs two round trips, with no per-phase exemption and no
batching that breaks withholding:

1. **Dispatch without the task.** Dispatch one worker with the minimal envelope:
   the ready prompt plus the base instructions, with strict zero task content —
   no change name, flags, or provenance of any kind. The adapter's
   `original_envelope` (for a standalone invocation, exactly `arguments_value`)
   is the task, and this dispatch withholds it.
2. **Capture the handle.** Retain the harness-native resumable handle captured
   at dispatch return. Handle, then guard snapshot when no guard window is
   running, then task: with no captured handle no guard window opens.
3. **Disclose the task after ready.** When the ready return (`event: ready`)
   arrives, continue the same worker on the retained handle with the task
   (`arguments_value` and derivatives) as a sequential same-worker
   continuation. The task travels only in this continuation and in the opaque
   continuation history, never in the dispatch.
4. **Process results.** Validate every returned result before acting on it
   (§ Validation), handle it by kind (§ Result kinds), and keep continuing the
   same worker until a run-closing result.

When ready never arrives — including a dispatch cancelled before the handle
returns — there is no handle and no guard window opens: relaunch fresh with the
minimal envelope and, when no guard window is running, a deferred snapshot. The relaunch adds no timeout, retry
loop, or new escalation.

### Continuation and replacement

After ready, attempt same-worker continuation first on the retained handle,
resuming with the adapter's existing continuation literals. A cancellation after
the handshake but before expensive work resumes via continue on the captured
handle; a handshake-then-stall with no further progress follows the
continuation/transport-loss path. If continuation fails, preserve the union and
dispatch at most one replacement worker with the minimal envelope, the exact
opaque input history including the task-carrying continuation, pending phase
feedback when present, and all required reconstruction metadata. The replacement
recovers the task solely from that history plus the reconstruction metadata,
since the minimal envelope carries no task content. Replacement reconstruction
must have complete phase state: if any required field is unavailable, return a
failed restart request and dispatch no replacement.

### Validation

Resolve the validator per `@sai/policies/tool-resolution.md` with `<name>` set
to `worker-report-validator.js`, on every Result Loop turn. If no candidate
exists, name the tried candidates and stop: a missing validator never skips
validation and there is no prose fallback. Every validation runs
`node <tool-path> validate --kind <kind>` with the payload on stdin, plus
`--json --cwd` where the tool accepts them — byte-identical whichever candidate
wins, so a single whitelist entry per root covers them. Read its verdict; the
tool owns every field check, so do not re-derive the checks in prose.

Worker payloads carry no time field in any phase; unknown fields are ignored. A
missing required field is a malformed payload, handled through the same route as
any other closed-shape violation.

On a valid result the validator, which owns the only clock, emits an additive
display-only `validated_at` sidecar: the validator-observed validation
timestamp in `YYYY-MM-DDTHH:MM:SS±HH:MM` form — local wall-clock time with the
session's numeric offset, never the `Z` designator, so a machine on UTC writes
`+00:00`. Reception time substitutes emission time; the small transport delta
is accepted as a duration proxy. The sidecar never alters the verdict or the
payload, and an invalid result carries no timestamp. Forward the verdict
verbatim and surface `validated_at` in the coordinator prompt for terminal and progress results at minimum; never
invent, correct, re-derive, or reformat it. It is also the sole source of the
Milestone Stamp: the `HH:mm` a progress task list attaches to a step it renders
`completed` is that step's marking verdict's `validated_at` per
`@sai/policies/todo-structure.md`, read straight off the value with no
conversion, so the coordinator issues no wall-clock call and resolves no zone.

### Result kinds

- **Terminal status** (`--kind terminal`) — exactly one of `completed`,
  `needs_input`, `failed`, or `cancelled`. `completed`, `failed`, and
  `cancelled` close the run; `completed` closes the worker's current dispatch
  phase, but its resumability for recovery ends only when the run closes or a
  segment boundary is crossed (§ Chained phase composition). `needs_input`
  pauses the run instead; the validator also checks its question, ordered
  options where applicable, and binding-owned continuation metadata. For a
  closed option set, present the exact question and options and forward the
  exact answer through the active binding. When a phase explicitly permits an
  empty option set as open input, present its exact question through that
  phase's ordinary conversation channel and forward the user's exact free-form
  answer; do not synthesize options. Either way, process the next result
  through this loop.
- **Notice** (`--kind notice`) — the closed shape
  `{event: "notice", message: string, changed_files: string[]}`. Invoke the
  adapter's declared notice extension and forward its fixed acknowledgement.
  Notices are not a worker status.
- **Progress event** (`--kind progress`) — the closed shape
  `{event: "progress", step_ids: string[], changed_files: string[]}`; not a
  worker status. Mark reported ids against the adapter's declared
  `progress_plan` when one is present; a declared `step_machine` receives them
  per § Step-gated pointer delivery. Reported ids outside the active declaration
  (undeclared ids) are ignored: the active declaration is never extended or
  amended at runtime. The runner records whether the event reported at least one
  previously unmarked declared id before rendering, and adds every path in
  `changed_files` to the union. When a visual `progress_plan` exists and the
  event changed its marked set, apply the progress-event render act from
  `@sai/policies/todo-structure.md` before continuing, so the user sees the mark
  before the next stretch of worker work begins. A routing-only event performs
  no render and stamps nothing. Then continue the same worker with exactly
  `continue_after_progress` (plus the pointer line of § Step-gated pointer delivery when one applies).
- **Nonterminal extension** (`--kind <extension-event>`) — an adapter may
  declare a phase-defined closed nonterminal extension in
  `allowed_nonterminal_extensions`; the tool validates its discriminator,
  `summary`, and every additional field of the adapter's exact extension shape.
  An extension is a pause, not a terminal status: add its paths to the union,
  route its source through the declared coordinator handler, and resume only
  through the handler's exact same-worker continuation. Do not infer a
  question, answer, or mutation from an extension payload. An extension arrives
  only after ready and never replaces it. Each extension's shape and handler
  semantics live in the declaring coordinator card.

### Changed-files union

Initialize one invocation-scoped ordered, duplicate-free `changed_files` union
at invocation start and add every reported path in first-seen order. The
non-reset enumeration spans input, feedback, notice, progress, extension,
continuation, and recovery: the union is never reset.

### Phase-adapter fields

The coordinator invokes only these phase-adapter fields; the last three are
optional static declarations:

- `original_envelope`
- `dispatch_operation`
- `continuation_operation`
- `allowed_nonterminal_extensions`
- `extension_handlers` (the handlers for the adapter's declared nonterminal
  extensions; empty when none are declared)
- `replacement_reconstruction_fields`
- `terminal_navigation`
- `progress_plan` (optional — static, ordered, fully known at dispatch, and immutable for the active adapter segment, which in a one-adapter invocation is the whole invocation; it controls visual task-list rendering only. The plan is never carried in the dispatch envelope or in any reconstruction field, and it survives same-worker continuation and replacement-worker reconstruction in invocation-scoped state.)
- `recovery_policy` (optional — static boolean, fully known at dispatch, immutable for the active adapter segment; recovery semantics: @sai/policies/bounded-recovery.md)
- `step_machine` (optional — static machine id of the form `<name>@<version>`, fully known at dispatch, immutable for the active adapter segment; it may be declared without a visual `progress_plan`. When declared, the coordinator consults the step machine per progress event. See `@sai/policies/stage-machine.md` § Step machines for the operational contract.)

Terminal behavior is supplied by `terminal_navigation`. The coordinator never
reads artifacts, resolves phase data, or invents phase-specific payload fields.

## Step-gated pointer delivery

Step-pointer routing is independent from visual progress-plan rendering. A
`progress_plan` supplies the ordered task list and its panel state; a
`step_machine` supplies just-in-time worker instruction routing. An adapter may
declare a `step_machine` without a progress plan when a supervising surface must
hide the worker plan but still preserve step continuity. In that shape the
runner performs no task-list render and still derives every pointer
deterministically.

When the active adapter declares a `step_machine`, each progress-event
continuation payload sent to the same worker is exactly two lines: the protocol
continuation line first, then one pointer line taken from the machine's
`next.follow` per `@sai/policies/stage-machine.md` § Step machines. The second
line reads `Active step: <id> — follow <path>`. With every step complete, it
reads exactly
`Active step: none — complete remaining work and return your terminal result.`

The pointer travels only in this continuation payload: the materialized binding
literal is untouched, and no dispatch envelope or reconstruction field carries
step paths. Continuations that are not progress continuations — feedback turns,
notices, and `continue_after_recovery` — carry no pointer line, so the worker's
active step file persists across them in its continuous session. When the
declaring adapter also requires replacement reconstruction, that reconstruction
state additionally includes the worker's `active_step_id`, and the replacement's
first continuation carries the pointer line for that step. The coordinator
renders the progress mark, when a visual `progress_plan` exists, before sending
the two-line continuation. Without a `step_machine`, a progress continuation is
exactly `continue_after_progress`.

## Chained phase composition

An invocation may execute an ordered sequence of phase adapters, each segment
through this Result Loop. The composition rules — segment rebinding, consecutive
transitions, and supervisor continuity across segments — live in
`sai/orchestration/composition.md`, which only composition coordinators load. A
one-adapter invocation is a single segment spanning the whole invocation.

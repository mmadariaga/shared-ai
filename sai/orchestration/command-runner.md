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
- `progress_plan` (optional — static, ordered, fully known at dispatch, immutable for the active adapter segment; under composition the pre-delta phrase "immutable for the invocation" means immutable for the active adapter segment, and a one-adapter invocation keeps segment scope identical to today's invocation scope)
- `recovery_policy` (optional — static boolean, fully known at dispatch, immutable for the active adapter segment under the same segment reading as `progress_plan`)

The dispatch passes exactly `wrapper_echo_value` and `arguments_value`; the
progress plan is declared by the phase adapter, is never carried in the
dispatch envelope or in any reconstruction field, and survives same-worker
continuation and replacement-worker reconstruction in invocation-scoped
state.

Terminal behavior is supplied by `terminal_navigation`. The coordinator never
reads artifacts, resolves phase data, or invents phase-specific payload fields.

## Chained phase composition

The shared coordinator contract permits one invocation to execute an ordered
sequence of phase adapters without introducing a new orchestration file and
without relocating this file. Composition obeys exactly three rules:

1. **Ordered multi-adapter invocation** — A single supervising invocation MAY
   declare an ordered sequence of phase adapters as an indexable list and SHALL
   execute them strictly in list order through this Result Loop. The composition
   retains a zero-based position into that list. Activating a segment SHALL
   rebind that segment's adapter fields (including that segment's `progress_plan`
   and `recovery_policy` when declared). When the active segment declares
    `recovery_policy: true`, the shared runner SHALL create one segment-scoped
    three-slot distinct-diagnosis ledger. The ledger permits at most one
    recovery attempt for each new normalized diagnosis key, is bounded to three
    slots for that segment, and is discarded when the segment ends. Each
    eligible composition segment whose active adapter declares
    `recovery_policy: true` receives a fresh three-attempt distinct-diagnosis
    ledger and SHALL NOT inherit a
    depleted ledger from an earlier segment. The invocation-scoped changed-files
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
   consecutive successor with that envelope. It SHALL NOT infer the next phase
   from worker summary text, artifact contents, `changed_files` text, or
   undeclared side channels, and SHALL NOT skip ahead to a later list entry. Only
   the final adapter's `terminal_navigation` (or the sole adapter in a
   one-adapter invocation) SHALL emit the user-facing invocation-closing
   completion presentation on a successful run. `failed`, `cancelled`, malformed
   worker terminal payloads, and malformed transitions SHALL close the
   supervising invocation without advancing.

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
`command_name` set to the apply command identity for shape compatibility with the
apply adapter's existing four-field envelope type (it is not a routing or
card-selection input on the chained path — the composition already selected the
apply adapter), `wrapper_echo_value` set to the empty string (matching the
established opaque-echo convention used by supervised chained design dispatch and
other composition-built envelopes; consumers SHALL NOT parse or reinterpret it),
`arguments_value` set to the already-resolved change name, and
`continuation_reference` absent or empty at segment start. Worker dispatch inside
the apply segment continues to use the runner's two-string worker envelope
(`wrapper_echo_value`, `arguments_value`) as today. Apply's normalized fast-track
boolean and other supervisor-retained session signals are set by the composition
as session state for that segment and are not required to appear as additional
envelope keys. The historical apply boot-envelope versus worker-dispatch-envelope
seam remains for standalone wrapper boots and is not reopened as a redesign
target by this delta.

The three rules are a delta on the existing shared contract. They do not
authorize explore-supervisor semantics (selector gates, chat-scoped autonomy, or
explore's inline item-10 transition) as the default composition pattern. A
composition with a single phase adapter retains today's one-phase behavior
unchanged. Do not edit baseline `openspec/specs/orchestration-core/spec.md` in
this change — the change delta under
`openspec/changes/chainable-apply-phase-adapter/specs/orchestration-core/spec.md`
is the sole authored composition/spec source until archive/sync.

## Bounded Recovery

The shared runner owns diagnosis-driven, bounded same-worker recovery. A static
`recovery_policy: true` enables recovery evaluation for the active adapter
segment; it does not make a result eligible by itself. The fixed
`continue_after_recovery` acknowledgement is runner-owned and is not an
additional phase-adapter field.

1. **Segment-scoped ledger.** For every recovery-eligible composition segment,
   create a fresh ledger with exactly three slots. A slot is consumed only when
   the runner dispatches recovery for a new normalized diagnosis key. A
   diagnosis key can consume at most one slot, the ledger is scoped to the
   active segment, and the ledger is discarded at the segment boundary. A
   one-adapter invocation keeps segment scope identical to the invocation.
   A later eligible segment gets a fresh three-slot ledger and never inherits
   an earlier segment's spent slots.

2. **Post-resolution diagnosis precedes eligibility.** The runner SHALL first
   establish the resolved change identity and validate the closed result. Only
   after that resolution may it diagnose the result, inspect both channels,
   determine Cause Locus, normalize a diagnosis key, and evaluate recovery
   eligibility. A pre-resolution result cannot spend a slot or dispatch
   recovery.

3. **Exactly three routing diagnoses.** The post-resolution diagnosis SHALL
   select exactly one of these routing diagnoses and no other:

   - `continuation/transport loss` — the coordinator cannot receive or resume
     the same worker through the expected transport or continuation path.
   - `coordinator rejection` — the coordinator rejects the received result or
     continuation because its envelope, routing, or coordinator-owned
     contract evidence is invalid.
   - `worker-authored failure` — the worker returned a closed failure outcome
     or otherwise reported an execution failure through its worker-authored
     channel.

   A routing diagnosis is distinct from the worker's `failure_class`. The
   closed worker failure-class vocabulary remains
   `blocking-contradiction`, `validation-failed`, `generation-error`,
   `dispatch-failed`, `envelope-contract-violation`, and
   `unclassified-worker-fault`; a worker-authored `outer-envelope-violation`
   is still a coordinator-owned rejection, never a worker-authorable class.

4. **Cause Locus and dual inspection channels.** Every diagnosis SHALL assign
   exactly one Cause Locus: `in-scope`, `out-of-scope`, or `unresolved`.
   `in-scope` means that the evidence identifies a concrete point in an
   authorized production artifact and the authorized correction boundary
   permits this worker to correct it. `out-of-scope` means that the cause is
   in a test, declared interface, forbidden artifact, external/shared system,
   or any other boundary this Step does not authorize. `unresolved` means the
   evidence cannot establish a concrete point and correction boundary, or the
   two inspection channels do not agree.

   Diagnosis uses both inspection channels before eligibility is evaluated:
   (a) the worker-authored result channel, including its status, failure
   metadata, summary, and reported evidence; and (b) the coordinator-observed
   channel, including transport/continuation state, envelope validation,
   routing state, and the authorized production-scope inspection. Neither
   channel may be omitted or silently substituted for the other. Missing or
   conflicting evidence produces `unresolved` and therefore no recovery
   attempt.

5. **Diagnosis key and normalization.** The diagnosis key is the ordered tuple
   `(artifact path, concrete point, authorized correction boundary)`. It has
   exactly those three components; routing diagnosis, `failure_class`,
   attempt ordinal, timestamps, summaries, and `changed_files` are not key
   components. Before comparison, normalize the tuple deterministically:
   canonicalize the artifact path as a repository-relative path with `/`
   separators and redundant `.` segments removed, trim and collapse
   whitespace in the concrete point, and use the canonical spelling for the
   authorized correction boundary. Preserve component order and repository
   case semantics, and do not infer or reorder missing values. A missing or
   non-concrete component normalizes to no usable key and leaves Cause Locus
   `unresolved`; it must not accidentally match a different diagnosis.

6. **Eligibility is diagnosis-driven.** `failure_class` is a diagnostic prior
   used to focus and order inspection; it is not an eligibility gate. No
   failure-class value alone grants recovery or forces a zero-attempt branch.
   After resolution, both inspection channels, Cause Locus, normalized key,
   worker veto, and ledger state are known, recovery is eligible only when all
   of the following hold: the active segment has `recovery_policy: true`, the
   Cause Locus is `in-scope`, the key is new in that segment's ledger, a slot
   remains, the worker has not set `unrecoverable: true`, and the hand-back
   diagnosis has sufficient evidence for an authorized correction and its
   verification. The coordinator SHALL validate any present `failure_class`
   against the closed vocabulary, but SHALL use that value as a prior rather
   than as the eligibility decision.

7. **Zero-attempt branches and duplicate check.** Spend zero slots and do not
   dispatch recovery when recovery is not enabled, resolution has not
   completed, the closed outcome or its required metadata is rejected, Cause
   Locus is `out-of-scope` or `unresolved`, the worker vetoes continuation,
   the ledger is exhausted, or the result is cancelled. A duplicate normalized
   diagnosis key is checked before dispatch: it spends zero slots, does not
   invoke `continue_after_recovery`, and hands back the existing diagnosis
   rather than creating a second attempt. A coordinator-owned rejection with
   no concrete in-scope correction likewise spends zero slots. These branches
   do not alter the unchanged `changed_files` union.

8. **Dispatch and continuation.** Before an eligible attempt, announce the
   routing diagnosis, failure class, Cause Locus, normalized diagnosis key, and
   the slot ordinal (`1 of 3`, `2 of 3`, or `3 of 3`) in conversation text.
   Atomically
   record the new key and consume its one slot, then resume the same live worker
   with exactly `continue_after_recovery`. Recovery SHALL never dispatch a
   replacement worker. If that recovery continuation loses transport, is
   rejected, or otherwise cannot resume the same worker, stop recovery and
   hand back the diagnosis; do not turn the loss into a replacement dispatch.
   Ordinary continuation loss outside recovery retains the existing at-most-one
   replacement fallback.
   A subsequent diagnosis may be considered only from a successfully resumed
   same-worker result and only if it has a new key and a remaining slot.

9. **Input, cancellation, and hand-back.** If recovery returns `needs_input`,
   exit recovery without charging that result, forward its exact question and
   options through the normal input loop, and retain the segment ledger and
   changed-files union. `cancelled` never enters or re-enters recovery and
   closes as cancelled without a recovery charge. Every recovery continuation
   carries the coordinator diagnosis fields exactly as `Reported`, `Evidence`,
   `Cause`, `Correction`, and `Verification`. A recovery hand-back also names
   the routing diagnosis, `failure_class` when present, Cause Locus,
   `diagnosis_key` (or that it is unresolved), `attempts_spent` (the number of
   attempts spent), and the stopping reason. Stopping reasons are limited to no policy, unresolved or
   out-of-scope cause, duplicate diagnosis, worker veto, exhaustion,
   continuation/transport loss, coordinator rejection, input, or cancellation.
   Recovery announcements and hand-backs are conversation text only; they
   never mark, extend, rename, or add progress-plan steps.

10. **Union and fast-track invariants.** Maintain one first-seen, ordered,
     duplicate-free `changed_files` union across initial results, progress,
     notices, input, normal continuation, segment transitions, and recovery.
     Reset the diagnosis ledger only at an eligible composition-segment
     boundary; never reset the changed-files union. `--fast-track` is unchanged:
     it changes neither the three-slot ledger, distinct-diagnosis accounting,
     eligibility, duplicate handling, same-worker/no-replacement rule,
     changed-files union, nor recovery reporting; its existing fast-track gates
     remain in force.

11. **Step 2 GREEN contract for blind opted-in adapters.** A blind opted-in
    adapter SHALL use the following deterministic, phase-static registry and
    match matrix algorithm. This is the matching algorithm for the registered
    surface.
    The algorithm has no dynamic registration and never reads test-file content.

    1. Require the post-resolution result to carry `unrecoverable` as the
       boolean value `false` exactly. A missing, null, string, numeric, or
       `true` value is not a match.
    2. Read the structured worker-authored `failure_class` and select a
       registered surface only when it is an exact member of that surface's
       `accepted_failure_classes`. The selection MUST resolve to exactly one
       registered surface; zero candidates or more than one candidate is no
       match. A non-accepted, unsupported, or ineligible failure class remains
       unresolved with zero attempts.
    3. A missing or absent `changed_files`, or an empty `changed_files` list,
       remains unresolved with zero attempts. Otherwise require `changed_files`
       to be present as a non-empty string list. Replace `{change-name}` in the
       selected surface's primary and optional path templates with the already
       resolved change name. Every reported path MUST exactly match one of those
       substituted primary or optional templates. Primary-path evidence is
       mandatory: `changed_files` MUST contain at least one substituted primary
       path. If primary-path evidence is omitted or missing, the match remains
       unresolved with zero attempts. No extra or unrelated path is accepted.
    4. A successful match returns `diagnosis_key`: `design-overview-repair` is
       the selected surface label, not a fourth key component. When all checks
       succeed, set Cause Locus to `in-scope` and construct
       `diagnosis_key` from exactly the ordered tuple of the substituted primary
       path, the surface's `concrete_lifecycle_point`, and its
       `authorized_correction_boundary`. The key is not taken from
       `changed_files` ordering or any prose.
    5. When no surface matches, or any match check fails, the result is
       `unresolved`, Cause Locus is `unresolved`, and recovery has zero
       attempts: consume no ledger slot and do not dispatch
       `continue_after_recovery`.

    Summary prose must not supply Cause Locus or `diagnosis_key`. The algorithm
    SHALL never infer a failure class, surface, path, lifecycle point,
    correction boundary, Cause Locus, or `diagnosis_key` from summary prose.
    The sole runtime registry for this algorithm is:

    | surface_id | artifact_path_template | optional_path_templates | concrete_lifecycle_point | authorized_correction_boundary | accepted_failure_classes |
    |---|---|---|---|---|---|
    | design-overview-repair | openspec/changes/{change-name}/change-overview.md | openspec/changes/{change-name}/.openspec.yaml | overview-generation-repair | design-worker-overview-repair | validation-failed, generation-error, dispatch-failed, envelope-contract-violation, blocking-contradiction |

    No other blind surface is registered.

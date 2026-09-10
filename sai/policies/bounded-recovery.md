# Bounded Recovery Policy

This policy extends the shared command runner's Result Loop in
`sai/orchestration/command-runner.md`. It is loaded unconditionally by every
coordinator whose phase adapter opts into recovery (`recovery_policy: true`) or
executes such a segment under composition.

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
   exactly one Cause Locus: `in-scope`, `owner-in-run`, `out-of-scope`, or `unresolved`.
   `in-scope` means that the evidence identifies a concrete point in an
   authorized production artifact and the authorized correction boundary
   permits this worker to correct it. `owner-in-run` means that the evidence
   identifies a concrete point in an authorized production artifact and the
   authorized correction boundary is held by a named worker that is still
   resumable in this run. The coordinator determines the in-run owner roster
   (worker identity, authorized correction boundary, and resumability state)
   from the active run's session state: each worker remains in the roster from
   its initial dispatch until the run or segment boundary ends, and its resumability is tracked
   from its dispatch state (pending dispatch, active, or completed). A worker's
   `completed` status marks its dispatch closed but does not remove it from the
   resumability roster until the run or segment boundary ends. Locus assignment
   reads only from this coordinator-held roster and does not infer missing
   workers or boundaries. When the evidence places the cause across more than
   one in-run owner's authorized correction boundary, Cause Locus is `unresolved`;
   no multi-owner fan-out to multiple workers occurs. `out-of-scope` means that
   the cause is in a test, declared interface, forbidden artifact,
   external/shared system, or any other boundary where no in-run worker holds an
   authorized correction boundary. `unresolved` means the evidence cannot
   establish a concrete point and correction boundary, or the two inspection
   channels do not agree, or the evidence spans multiple in-run owners.

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
   Cause Locus is `in-scope` or `owner-in-run`, the key is new in that segment's
   ledger, a slot remains, the worker has not set `unrecoverable: true`, and the
   hand-back diagnosis has sufficient evidence for an authorized correction and
   its verification. The coordinator SHALL validate any present `failure_class`
   against the closed vocabulary, but SHALL use that value as a prior rather
   than as the eligibility decision.

7. **Zero-attempt branches and duplicate check.** Spend zero slots and do not
   dispatch recovery when recovery is not enabled, resolution has not
   completed, the closed outcome or its required metadata is rejected, Cause
   Locus is `out-of-scope` (meaning no in-run worker holds an authorized
   correction boundary) or `unresolved`, the worker vetoes continuation,
    the ledger is exhausted, or the result is cancelled, except as specified for
    the named Explore Plan (unattended) item-10 route below. Ordinary/generic adapters
    preserve a cancelled result as a clean stop; outside the selector-dispatched
    Explore Plan (unattended) item 10 exception, cancellation closes as cancelled without a
    recovery charge. A duplicate normalized diagnosis key is checked before
    dispatch: it spends zero slots, does not
   invoke `continue_after_recovery`, and hands back the existing diagnosis
   rather than creating a second attempt. A coordinator-owned rejection with
   no concrete in-scope correction likewise spends zero slots. These branches
   do not alter the unchanged `changed_files` union.

8. **Dispatch and continuation.** Before an eligible attempt, announce the
   routing diagnosis, failure class, Cause Locus, normalized diagnosis key, and
   the slot ordinal (`1 of 3`, `2 of 3`, or `3 of 3`) in conversation text.
   Atomically record the new key and consume its one slot, then resume the
   live worker with exactly `continue_after_recovery`. When Cause Locus is
   `in-scope`, resume the same worker that returned the non-clean result. When
   Cause Locus is `owner-in-run`, resume the live worker holding the authorized
   correction boundary identified in the diagnosis. Recovery SHALL never dispatch
   a replacement worker. If that recovery continuation loses transport, is
   rejected, or otherwise cannot resume the target worker, stop recovery and
   hand back the diagnosis; do not turn the loss into a replacement dispatch.
   Ordinary continuation loss outside recovery retains the existing at-most-one
   replacement fallback.
   A subsequent diagnosis may be considered only from a successfully resumed
   target-worker result (the same worker when in-scope, or the owner worker when
   owner-in-run) and only if it has a new key and a remaining slot.

   **Downstream relaunch after owner correction.** When Cause Locus is
   `owner-in-run` and the owner worker returns a successful `completed` status
   from recovery, the owner's correction invalidates the downstream result that
   reported the non-clean outcome. The coordinator SHALL resume the downstream
   worker with exactly `continue_after_recovery_relaunch`, a warm continuation
   carrying the corrected upstream artifacts scoped to recovering from the one
   concrete diagnosed point. Before the relaunch continuation is sent, the
   coordinator SHALL check whether any user-facing gate (such as an
   artifact-feedback gate or approval gate) already accepted artifacts that the
   owner correction has now rewritten; if so, the coordinator SHALL re-present
   that gate with the modified artifacts before resuming the downstream worker,
   preserving the constraint that no approved content is silently mutated. The
   relaunch is a separate work cycle: the downstream worker executes with the
   corrected inputs from the continued state, and a separate diagnosis applies to
   the relaunch result only if a new non-clean outcome is returned. A downstream
   relaunch does not extend or reset the shared three-slot recovery ledger of the
   downstream phase.

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

     **Explore Plan (unattended) item-10 cancellation exception.** Only a selector-dispatched
     Explore Plan (unattended) item 10 may enter an Explore Diagnosis Round; it does not spend
     the shared diagnosis ledger. This applies only after a post-resolution
     supervised phase-worker `status: cancelled`, and only when the phase-keyed,
     conversation-only `diagnosis_rounds.<phase>` is unused.
    On an actionable diagnosis where same-worker continuation cannot be
    delivered, use `continuation/transport loss`, consume the diagnosis round,
    do not use ordinary replacement fallback, close this route as terminal, and
    leave the change retryable for later Plan (unattended) selection. The round is read-only
    and permits at most one diagnosis and at most one same-worker re-dispatch;
     it never uses a replacement worker and never spends the shared three-slot
     ledger. Use only
    `diagnosis_rounds.spec` / `diagnosis_rounds.design`; no other phase key is
    valid. Standalone
    spec/design, Build, manual item-9 review, adapters without the named route,
    and outer user cancellation receive no cancellation recovery.

  10. **Union and fast-track invariants.** Maintain one first-seen, ordered,
      duplicate-free `changed_files` union across initial results, progress,
       notices, input, normal continuation, segment transitions, and recovery.
      Reset the diagnosis ledger only at an eligible composition-segment
      boundary; never reset the changed-files union. `--fast-track` is unchanged:
      it changes neither the three-slot ledger, distinct-diagnosis accounting,
      eligibility, duplicate handling, same-worker/no-replacement rule,
       changed-files union, nor recovery reporting; its existing fast-track gates
       remain in force. Fast-track does not widen the Explore Plan (unattended) item-10 bound:
       it still permits at most one diagnosis round and at most one same-worker
       re-dispatch, never a replacement worker and never a charge to the shared
       three-slot ledger.

    **Planning-adapter recovery surface and channel selection.** A planning
    adapter that opts into bounded recovery SHALL declare both (a) its
    worker-owned, authorized production surface and authorized read set for
    non-clean inspection and (b) the same-worker correction operation and its authorized correction
    boundary. The declaration SHALL be the source of truth for that adapter's
    authorized non-clean read surface. Phase cards SHALL consume this shared
    declaration and SHALL NOT duplicate the runner's ledger, budget, key,
    eligibility, zero-attempt, continuation, or no-replacement rules.

    After resolution, the only results that may trigger planning inspection are
    a structurally valid `failed` result, a `completed` result disproved by
    coordinator evidence, or a `completed` result carrying STOP. These are
    after-resolution non-clean triggers and no other result may authorize
    inspection of the adapter-declared worker-owned surface. A structurally
    valid failed result is one that passes closed-result validation; a malformed
    failed result follows the existing coordinator-rejection path instead.

    The clean route remains artifact-blind. Clean `completed`, `needs_input`,
    `cancelled`, `progress`, and `notice` results, together with every
    pre-resolution result, SHALL NOT inspect artifacts, the adapter-declared
    surface, or the static recovery registry. A `completed` result is clean for
    this purpose only when it is not coordinator-disproved and does not carry
    STOP.

    For each cause surface, channel selection precedes diagnosis-key derivation
    and the two recovery channels SHALL be exclusive. The selected
    planning channel SHALL use both existing inspection channels — the
    worker-authored result channel and the coordinator-observed channel — to
    inspect an in-scope surface within the adapter's authorized worker-owned
    declaration, without also matching any static registry row. The static
    channel SHALL use the existing `design-overview-repair` registry/match
    algorithm only for an outside surface. If an adapter-declared surface is
    authorized but the evidence does not resolve a concrete point and
    correction boundary, Cause Locus SHALL remain `unresolved`, recovery SHALL
    spend zero attempts, and the runner SHALL NOT fall through to a static
    row or use a static fallback.

    Diagnosis is ephemeral conversation state. The runner SHALL NOT persist the
    diagnosis, selected channel, repair markers, attempt counters, or diagnosis
    history in artifacts, worker payloads, worker journals, change metadata, or
    any other durable store. Only the existing invocation/segment runtime state
    needed for the ledger and recovery loop may be retained, and it is discarded
    under the existing segment-boundary rules.

    These planning-surface rules preserve all existing routing, ledger,
    zero-attempt, continuation, registry, and no-replacement invariants. They
    do not alter the static registry/match algorithm below or authorize a second
    registry row.

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

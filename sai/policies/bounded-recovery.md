# Bounded Recovery Policy

This policy extends the Result Loop of `sai/orchestration/command-runner.md`
with diagnosis-driven, bounded same-worker recovery. It applies to every adapter
segment that declares `recovery_policy: true`; that declaration enables recovery
evaluation, it does not make any result eligible. The fixed
`continue_after_recovery` acknowledgement is runner-owned, not a phase-adapter
field.

## Recovery scope and ledger

The **recovery scope** is the Step for a Step-executing adapter (apply) and the
composition segment for an adapter that executes no Steps; a one-adapter
invocation without Steps is one scope.

The `recovery-ledger@1` machine registered in `sai-state/registry.js` keeps the
**ledger** for the active scope: it normalizes diagnosis keys, detects
duplicates, and accounts three worker slots plus the coordinator's own
three-attempt budget. Send it the raw key before every recovery dispatch.
Slots count distinct diagnoses: a slot is consumed only when the machine accepts
a new normalized key. Every reply reports `budgets` as `{worker: {spent, limit}, coordinator: {spent, limit}}` and
names the budget that ran out as `exhausted`, so tallies are always read from
the machine, never recalled from conversation.

Reset the ledger on entry to each recovery scope — on entry to each Step for a
Step-executing adapter, at each composition-segment boundary otherwise — so each
scope starts with a fresh three-slot pool and never inherits an earlier scope's
depleted or remaining slots:

- **Step entry:** send a `step-entry` signal naming the Step instead of a bare
  reset. The machine grants the fresh pool (worker slots and
  coordinator attempts together) only on the first entry to that Step in the
  run; a Step re-entered after a correction or a route retry keeps what it has
  spent.
- **Segment boundary:** run `reset <id> recovery-ledger@1`.

## Clean and non-clean results

The clean route is artifact-blind: a clean `completed` (not disproved by
coordinator evidence and carrying no STOP), `needs_input`, `cancelled`,
`progress`, `notice`, and every pre-resolution result never inspect artifacts,
the adapter-declared surface, or the static registry.

After resolution, exactly three results are **non-clean** and open diagnosis: a
structurally valid `failed` result, a `completed` result disproved by coordinator
evidence, and a `completed` result carrying STOP. A malformed `failed` result
takes the coordinator-rejection path instead.

A planning adapter that opts into recovery declares (a) its worker-owned,
authorized production surface and the authorized read set for non-clean
inspection, and (b) the same-worker correction operation with its authorized
correction boundary. That declaration is the source of truth for the adapter's
non-clean read surface; the phase card cites this policy instead of restating
it.

## Diagnosis

Diagnose only after the runner has established the resolved change identity and
validated the closed result; a pre-resolution result never spends a slot or
dispatches recovery. Diagnosis is ephemeral invocation state: never persist
the diagnosis, selected channel, repair markers, attempt counters, or history in
artifacts, worker payloads, worker journals, change metadata, or any other
project or durable store. The one exception is the `recovery-ledger@1` session
in the `sai-state` store, a per-invocation temporary file outside the project
that holds normalized diagnosis keys and budget tallies until its reset.

1. **Routing diagnosis.** Select exactly one:
   - `continuation/transport loss` — the coordinator cannot receive or resume
     the same worker through the expected transport or continuation path.
   - `coordinator rejection` — the coordinator rejects the result or
     continuation because its envelope, routing, or coordinator-owned contract
     evidence is invalid.
   - `worker-authored failure` — the worker returned a closed failure outcome
     or reported an execution failure through its own channel.

   The routing diagnosis is distinct from the worker's `failure_class`, whose
   closed vocabulary is `blocking-contradiction`, `validation-failed`,
   `generation-error`, `dispatch-failed`, `envelope-contract-violation`, and
   `unclassified-worker-fault`. A worker-authored `outer-envelope-violation` is
   a coordinator rejection, never a worker-authorable class. Validate any
   present `failure_class` against that vocabulary and use it as a prior that
   focuses and orders inspection, not as the eligibility gate: no class value
   alone grants recovery or forces zero attempts.

2. **Channel selection per cause surface.** Channel selection precedes
   diagnosis-key derivation, and the two recovery channels are exclusive for
   each cause surface. When the surface lies inside the adapter's authorized
   read set, the planning channel inspects it without matching any static
   registry row. The static channel uses the phase-static registry below, only for
   a surface outside that read set in a blind adapter. When an
   authorized surface does not resolve to a concrete point and correction
   boundary, Cause Locus stays `unresolved` and there is no fallback to a
   static row.

3. **Dual inspection channels.** Use both before evaluating eligibility:
   (a) the worker-authored result channel — status, failure metadata, summary,
   and reported evidence; and (b) the coordinator-observed channel — transport
   and continuation state, envelope validation, routing state, and the
   authorized production-scope inspection. Neither channel is omitted or
   substituted for the other; missing or conflicting evidence yields
   `unresolved`.

4. **Cause Locus.** Assign exactly one, from ownership. The coordinator reads
   ownership from its in-run roster: every worker dispatched in this run or
   segment, with its authorized correction boundary and its resumability
   (pending dispatch, active, or completed; `completed` closes a dispatch but
   keeps the worker on the roster until the run or segment boundary ends). It
   never infers a missing worker or boundary.
   - `in-scope` — the evidence names a concrete point in an authorized
     production artifact inside the correction boundary of the worker that
     returned the result.
   - `owner-in-run` — the evidence names a concrete point in an authorized
     artifact, production or test, inside the correction boundary of a named
     worker that is still resumable in this run.
   - `out-of-scope` — no in-run worker holds a correction boundary over that
     point: a declared interface, forbidden artifact, external or shared
     system, or any other boundary with no in-run owner.
   - `unresolved` — the evidence cannot establish a concrete point and
     boundary, the two channels disagree, or the cause spans more than one
     in-run owner's boundary (there is no multi-owner fan-out).

   `out-of-scope` is decided by ownership, never by the kind of artifact the
   cause sits in. A cause located in a test file is therefore `owner-in-run`
   whenever a test-owning worker is still resumable in this run, and the
   correction goes to that owner, never to a worker whose contract forbids
   test files.

5. **Diagnosis key.** The key is exactly the ordered tuple
   `(artifact path, concrete point, authorized correction boundary)`; the
   routing diagnosis, `failure_class`, attempt ordinal, timestamps, summaries,
   and `changed_files` are not components. The ledger machine normalizes it
   (repository-relative `/` path without redundant `.` segments, collapsed
   whitespace in the concrete point, canonical boundary spelling, component
   order and repository case preserved). A missing or non-concrete component
   gives no usable key and leaves Cause Locus `unresolved`.

## Eligibility

A recovery attempt is eligible only when all of these hold:

- the active segment declares `recovery_policy: true`;
- the result is non-clean, post-resolution, and passed closed-result
  validation;
- Cause Locus is `in-scope` or `owner-in-run`;
- the machine accepts the key as new in the scope's ledger — duplicates are
  rejected before dispatch;
- a slot remains;
- the worker did not set `unrecoverable: true`; and
- the diagnosis carries enough evidence for an authorized correction and its
  verification.

Every other case spends zero slots, sends no `continue_after_recovery`, and
hands back the diagnosis with its stopping reason. A duplicate key returns
`duplicate diagnosis` and hands back the existing diagnosis. The coordinator's
own budget follows the same rule: a coordinator attempt carries the normalized
diagnosis key, a key already attempted in this scope spends zero and returns
`duplicate diagnosis`, and an attempt without a concrete key spends zero and
returns `unresolved cause`.

## Recovery attempt

1. Announce the routing diagnosis, failure class, and Cause Locus in
   conversation text.
2. Consult the machine with the raw key. It records the key and returns the
   slot ordinal (`1 of 3`, `2 of 3`, or `3 of 3`); announce the normalized key
   and the ordinal.
3. Resume the target worker with exactly `continue_after_recovery`, carrying
   the diagnosis fields `Reported`, `Evidence`, `Cause`, `Correction`, and
   `Verification`. The target is the worker that returned the result when Cause
   Locus is `in-scope`, and the worker holding the correction boundary when it
   is `owner-in-run`.
4. Consider a further diagnosis only from a successfully resumed target-worker
   result, and only with a new key and a remaining slot.

Recovery never dispatches a replacement worker. When the recovery continuation
cannot resume the target, stop recovery and hand back the diagnosis. Ordinary
continuation loss outside recovery keeps the runner's at-most-one replacement
fallback.

A `needs_input` returned during recovery exits recovery without a charge; its
question and options go through the normal input loop, and the ledger is kept.
A `cancelled` result never enters or re-enters recovery: it closes as cancelled
without a recovery charge, except in the Explore exception below.

**Downstream relaunch after owner correction.** When an `owner-in-run` owner
returns `completed` from recovery, its correction invalidates the downstream
result that reported the non-clean outcome. Before relaunching, re-present any
user-facing gate (artifact feedback, approval) that already accepted artifacts
the correction rewrote, so no approved content changes silently. Then resume the
downstream worker with exactly `continue_after_recovery_relaunch`: a warm
continuation carrying the corrected upstream artifacts, scoped to the one
diagnosed point. The relaunch is a separate work cycle, diagnosed only if it
returns a new non-clean result, and it neither extends nor resets the downstream
scope's ledger.

## Hand-back and reporting

A hand-back names the routing diagnosis, `failure_class` when present, Cause
Locus, `diagnosis_key` (or that it is unresolved), attempts spent
(`attempts_spent`, read from the machine's `budgets`), and one stopping reason:
no policy, unresolved or out-of-scope cause, duplicate diagnosis, worker veto,
exhaustion, continuation/transport loss, coordinator rejection, input, or
cancellation.

Recovery announcements and hand-backs are conversation text only: recovery
never marks, extends, renames, or adds progress-plan steps.

`--fast-track` changes nothing here: neither the three-slot pool, key
accounting, eligibility, duplicate handling, the no-replacement rule, nor
recovery reporting, and its own gates stay in force.

## Explore Plan (unattended) item-10 exception

Ordinary adapters keep a `cancelled` result as a clean stop, except in one
place: a selector-dispatched Explore Plan (unattended) item 10.
There, after a post-resolution supervised phase-worker `status: cancelled`, the
cancelled phase may enter one Explore Diagnosis Round when the phase-keyed,
conversation-only `diagnosis_rounds.<phase>` is unused. Only
`diagnosis_rounds.spec` and `diagnosis_rounds.design` are valid keys.

The Explore Plan (unattended) item 10 round does not spend the shared
diagnosis ledger. It is read-only and permits at most one diagnosis and at most one
same-worker re-dispatch; it never uses a replacement worker, and `--fast-track`
does not widen it. When an actionable diagnosis cannot be delivered because
same-worker continuation fails, record `continuation/transport loss`, consume
the round, close the route as terminal with no replacement fallback, and leave
the change retryable for a later Plan (unattended) selection.

Standalone spec and design, Build, manual item-9 review, adapters without this
named route, and outer user cancellation get no cancellation recovery.

## Static registry for blind adapters

A blind adapter matches a cause surface outside its read set through this
deterministic, phase-static registry and match matrix. The match algorithm has
no dynamic registration and never reads test-file content:

1. Require `unrecoverable` to be exactly the boolean `false`; a missing, null,
   string, numeric, or `true` value is no match.
2. Select the registered surface whose `accepted_failure_classes` contains the
   structured worker-authored `failure_class` exactly. Zero or several
   candidates is no match; a non-accepted, unsupported, or ineligible failure
   class stays unresolved with zero attempts.
3. A missing or empty `changed_files` stays unresolved with zero attempts.
   Otherwise substitute the resolved change name for `{change-name}` in the
   surface's primary and optional path templates; every reported path must
   match one of them exactly, and no extra or unrelated path is accepted.
   Primary-path evidence is mandatory: `changed_files` must contain at least
   one substituted primary path, and when primary-path evidence is missing the
   match stays unresolved with zero attempts.
4. A successful match returns `diagnosis_key`: `design-overview-repair` names
   the matched surface. Cause Locus becomes `in-scope`, and the key is the ordered tuple of
   the substituted primary path, the surface's `concrete_lifecycle_point`, and
   its `authorized_correction_boundary`. The surface label is not a fourth key
   component, and the key never comes from `changed_files` order or prose.
5. Any failed check leaves the result and Cause Locus `unresolved` with zero
   attempts: no ledger slot and no `continue_after_recovery`.

Summary prose must not supply Cause Locus or `diagnosis_key`; the algorithm
never infers a failure class, surface, path, lifecycle point, correction
boundary, Cause Locus, or `diagnosis_key` from prose. No other blind surface is
registered. The sole runtime registry for this algorithm is:

| surface_id | artifact_path_template | optional_path_templates | concrete_lifecycle_point | authorized_correction_boundary | accepted_failure_classes |
|---|---|---|---|---|---|
| design-overview-repair | openspec/changes/{change-name}/change-overview.md | openspec/changes/{change-name}/.openspec.yaml | overview-generation-repair | design-worker-overview-repair | validation-failed, generation-error, dispatch-failed, envelope-contract-violation, blocking-contradiction |

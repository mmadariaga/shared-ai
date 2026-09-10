# bounded-worker-recovery Specification

## Purpose
TBD - created by archiving change bounded-worker-recovery. Update Purpose after archive.
## Requirements
### Requirement: Preserve Plan cancellation recovery

The bounded worker-recovery policy SHALL refer to the selector-dispatched Plan (unattended) item-10 exception and SHALL preserve its no-replacement, same-worker, retryable behavior.

#### Scenario: Plan recovery cannot continue

- **WHEN** Plan diagnosis cannot deliver its actionable continuation
- **THEN** the existing continuation-loss result remains terminal for the attempt and the change remains retryable.

### Requirement: Optional recovery policy declaration
The shared phase-adapter contract SHALL accept an optional static `recovery_policy` declaration alongside the optional `progress_plan`. The declaration SHALL be fully known at dispatch, immutable for the invocation segment, and presence-only for opt-in: the shared contract SHALL own the fixed recovery budget, non-clean-closure trigger, routing diagnoses, cause-locus rules, and failure rules. For this change, the design overview lifecycle, the standalone spec adapter, and the standalone design adapter MAY declare the policy; the spec and design adapters SHALL additionally declare their worker-owned artifact surface and whether correction is a same-worker re-dispatch. An adapter that omits `recovery_policy` SHALL retain the current continuation and replacement-worker behavior and SHALL emit no recovery-specific terminal lines. The presence of the policy SHALL not make an out-of-scope, unresolved, vetoed, malformed, duplicate, cancelled, or transport-lost result recoverable.

#### Scenario: Standalone spec opts into the shared route
- **WHEN** the spec coordinator dispatches its phase adapter with `recovery_policy: true`
- **THEN** the shared runner SHALL make the three-slot diagnosis ledger available only after non-clean closure inspection establishes an eligible in-scope cause
- **AND** the spec coordinator SHALL not define a second recovery loop

#### Scenario: Standalone design opts into the shared route
- **WHEN** the design coordinator dispatches its phase adapter with `recovery_policy: true`
- **THEN** the shared runner SHALL apply the same planning diagnosis route to main design artifacts and preserve the existing overview-generation route
- **AND** the design coordinator SHALL not define a second recovery loop

#### Scenario: An adapter without policy is unchanged
- **WHEN** a coordinator dispatches an adapter that does not declare `recovery_policy`
- **THEN** the shared runner SHALL perform zero recovery attempts
- **AND** it SHALL preserve the existing terminal hand-back and replacement-worker rules
- **AND** it SHALL emit no recovery announcement or recovery-specific terminal line

#### Scenario: Explore and Build do not opt into planning recovery
- **WHEN** Explore Auto or Build runs without a standalone spec/design adapter segment
- **THEN** this capability SHALL add no recovery write or new phase-specific recovery loop to either surface
- **AND** Build SHALL inherit only the behavior of the existing adapter it activates

#### Scenario: An adapter without policy remains unchanged
- **WHEN** a routed adapter omits `recovery_policy`
- **THEN** the shared runner SHALL perform zero recovery attempts
- **AND** it SHALL preserve that adapter's existing terminal hand-back and replacement-worker rules

### Requirement: Standalone planning artifacts are recovery surfaces

The bounded-recovery capability SHALL support the following worker-owned planning surfaces when their standalone phase adapter opts into recovery: the spec worker owns `proposal.md`, `specs/**`, and permitted root `GLOSSARY.md` updates; the design worker owns `design.md`, `tasks.md`, and `interfaces.md`; the existing design overview surface remains governed by its current overview-generation contract. The coordinator SHALL inspect these surfaces only after a non-clean closure, SHALL never repair them, and SHALL send any in-scope or owner-in-run correction back through the same worker or the owner worker.

#### Scenario: Spec surface identifies an in-scope cause
- **WHEN** a failed spec result is followed by coordinator evidence locating a safe correction in `proposal.md` or `specs/**`
- **THEN** the coordinator SHALL assign `Cause Locus: in-scope` when the diagnosis key is new
- **AND** SHALL permit one same-worker recovery continuation

#### Scenario: Design surface identifies an in-scope cause
- **WHEN** a failed main design result is followed by coordinator evidence locating a safe correction in `design.md`, `tasks.md`, or `interfaces.md`
- **THEN** the coordinator SHALL assign `Cause Locus: in-scope` when the diagnosis key is new
- **AND** SHALL permit one same-worker recovery continuation

#### Scenario: Previous-phase cause is out of scope
- **WHEN** coordinator inspection proves that a design failure is caused by contradictory `proposal.md` or `specs/**`
- **THEN** the coordinator SHALL determine whether the cause is out-of-scope (no in-run owner holds the correction boundary) or owner-in-run (an in-run owner holds the correction boundary)
- **AND** if out-of-scope, SHALL name that prior-phase artifact and concrete point as out of scope, spend zero recovery slots, and not repair that artifact
- **AND** if owner-in-run, SHALL route recovery to the owner worker as the first consumer for a prior-phase cause

#### Scenario: Planning coordinator never becomes the artifact writer
- **WHEN** an in-scope or owner-in-run planning diagnosis is selected
- **THEN** the coordinator SHALL send the diagnosis and correction boundary to the same worker (in-scope) or the owner worker (owner-in-run)
- **AND** SHALL not write any phase artifact, glossary entry, `.openspec.yaml` value, or recovery marker

### Requirement: Inspection and phase-static recovery channels are mutually exclusive

The bounded-recovery capability SHALL keep its independent-verification and phase-static repair-surface channels distinct on a per-surface basis. When the suspected cause surface is within the coordinator's authorized artifact-read set for the active closure, the coordinator SHALL use the inspection-derived Cause Locus and diagnosis key and SHALL not also match a phase-static surface for that cause surface. When the suspected cause surface is outside that read set, an opted-in adapter that remains blind to that surface SHALL use the registered phase-static repair-surface row when its closed-field and path criteria match. A single adapter MAY therefore use inspection for its main planning artifacts and phase-static matching for a separate overview surface it is not authorized to read. If inspection is authorized for the suspected surface but cannot establish a concrete safe cause, the result SHALL be unresolved with zero attempts and SHALL not fall back to the phase-static row. Channel selection SHALL occur before key derivation, so one closure has at most one diagnosis key.

#### Scenario: Standalone design overview failure uses the phase-static key
- **WHEN** the standalone design coordinator receives a non-clean overview-generation result whose `changed_files` includes `change-overview.md`, while its authorized planning-artifact read set does not include that overview surface
- **THEN** it SHALL use the registered `design-overview-repair` row and its fixed `overview-generation-repair` diagnosis key
- **AND** it SHALL not attempt inspection-derived keying for that overview closure

#### Scenario: The same design adapter inspects its main artifacts
- **WHEN** the same standalone design adapter receives a non-clean result whose suspected cause is in `design.md`, `tasks.md`, or `interfaces.md`
- **THEN** it SHALL use coordinator inspection to derive the Cause Locus and diagnosis key
- **AND** it SHALL not match `design-overview-repair` for that main-artifact closure

#### Scenario: Authorized inspection does not fall back to blind matching
- **WHEN** standalone design inspection is authorized but cannot establish a concrete cause or safe correction
- **THEN** the coordinator SHALL record an unresolved cause and spend zero attempts
- **AND** SHALL not use the `design-overview-repair` row as a fallback

### Requirement: Planning recovery keeps the shared ledger and tiebreak

Standalone spec and design recovery SHALL use the shared segment-scoped ledger of exactly three mutually distinct normalized diagnosis keys. `failure_class` SHALL be a worker-authored diagnostic prior, not an eligibility gate. Coordinator artifact evidence SHALL be authoritative when it disagrees with worker `failure_class` or `summary`, but SHALL not override `unrecoverable: true`, which remains a worker-authored veto on continuation. Duplicate, unresolved, out-of-scope, vetoed, malformed, cancelled, and continuation/transport-loss outcomes SHALL spend zero additional slots; a new clear in-scope diagnosis with `unrecoverable: false` SHALL spend one slot and receive at most one same-worker continuation.

#### Scenario: Three distinct diagnoses remain the maximum
- **WHEN** a standalone planning segment reaches three distinct eligible diagnosis keys
- **THEN** it SHALL not dispatch a fourth recovery continuation
- **AND** it SHALL hand back with the diagnoses and slots spent

#### Scenario: A changed class does not evade a duplicate
- **WHEN** a later planning failure changes `failure_class` but identifies the same artifact, concrete point, and correction boundary
- **THEN** the coordinator SHALL treat it as a duplicate diagnosis
- **AND** SHALL spend no additional slot even when capacity remains

#### Scenario: Worker and coordinator disagree on safety
- **WHEN** the worker reports `unrecoverable: false` but coordinator inspection cannot prove a safe in-scope correction
- **THEN** the coordinator SHALL use an unresolved or out-of-scope hand-back
- **AND** SHALL spend zero recovery slots without overriding the evidence

#### Scenario: Worker veto remains non-overridable
- **WHEN** the worker returns `unrecoverable: true` but coordinator inspection appears to identify a clear safe in-scope correction
- **THEN** the coordinator SHALL retain the worker veto
- **AND** SHALL spend zero recovery slots and SHALL not continue the worker

### Requirement: Bounded same-worker recovery

For an opted-in adapter, the coordinator SHALL use one segment-scoped ledger of at most three distinct diagnosis slots. The three-attempt cap is a derived consequence of one attempt per slot, not a separate counter. An eligible in-scope non-clean closure SHALL be continued only on the still-live worker, using the active binding's normal continuation operation and the fixed shared protocol acknowledgement `continue_after_recovery`. The route SHALL carry exactly one of the shared routing diagnoses — `worker-authored failure`, `coordinator rejection`, or `continuation/transport loss` — together with the coordinator's `Cause Locus`. Recovery SHALL never dispatch a replacement worker; this prohibition is scoped to the recovery path, while ordinary non-recovery continuation failures SHALL retain the existing replacement-worker fallback. An out-of-scope cause SHALL spend zero attempts and SHALL not be made recoverable by rewriting its worker failure class. Recovery SHALL never reset the changed-file union, and SHALL return to the existing terminal hand-back when the recovery path stops without a completed result.

#### Scenario: A recoverable failure gets a same-worker continuation

- **WHEN** an opted-in worker returns `status: failed` with a recoverable failure class, `unrecoverable: false`, and remaining budget
- **THEN** the coordinator SHALL announce the recovery attempt
- **AND** SHALL continue the same worker using the fixed shared protocol acknowledgement `continue_after_recovery`
- **AND** SHALL not dispatch a replacement worker

#### Scenario: A recoverable in-scope failure gets a same-worker continuation

- **WHEN** an opted-in worker returns `status: failed` with any valid worker class, `unrecoverable: false`, coordinator evidence places a clear safe cause and correction inside the worker's authorized scope, and the diagnosis key is new
- **THEN** the coordinator SHALL announce the selected routing diagnosis and cause locus
- **AND** SHALL continue the same worker using the fixed shared protocol acknowledgement `continue_after_recovery`
- **AND** SHALL not dispatch a replacement worker

#### Scenario: The shared pool caps recovery

- **WHEN** successive recovery failures remain eligible and the worker does not veto recovery
- **THEN** the coordinator SHALL spend no more than one attempt for each of three distinct diagnosis keys in the active segment
- **AND** SHALL hand back after the third distinct slot if no coordinator-verified clean result is returned

#### Scenario: An out-of-scope cause spends zero attempts

- **WHEN** coordinator inspection establishes that the cause names an artifact and concrete point outside the worker's authorized scope
- **THEN** the coordinator SHALL spend zero recovery attempts
- **AND** SHALL not send a worker correction through `continue_after_recovery`
- **AND** SHALL hand back or invoke only the explicitly authorized owner repair route

#### Scenario: A recovery continuation fails

- **WHEN** the same-worker continuation operation fails while a recovery attempt is running
- **THEN** the routing diagnosis SHALL be `continuation/transport loss`
- **AND** the coordinator SHALL abort recovery immediately
- **AND** SHALL not dispatch a replacement worker
- **AND** SHALL fall through to the existing hand-back with the attempts already spent

#### Scenario: Ordinary continuation failure keeps replacement fallback

- **WHEN** an opted-in invocation encounters a continuation failure outside the bounded recovery path
- **THEN** the coordinator SHALL retain the existing at-most-one replacement-worker fallback and reconstruction rules
- **AND** the recovery-only prohibition on replacement dispatch SHALL not apply to that ordinary path

#### Scenario: A recovery result returns needs_input

- **WHEN** a recovery continuation returns `needs_input`
- **THEN** the coordinator SHALL consume no recovery attempt for that result
- **AND** SHALL exit recovery and resume the normal needs-input loop with the same worker

#### Scenario: A later failure changes class

- **WHEN** a recovery continuation returns a failed result whose class differs from the original class
- **THEN** the coordinator SHALL compare the coordinator-owned diagnosis key rather than the class alone
- **AND** it SHALL spend one remaining slot only when the concrete diagnosis is new, without creating a class-specific budget

### Requirement: Recovery may re-dispatch overview generation within the pool
For an eligible overview-generation `validation-failed`, `generation-error`, or `dispatch-failed`, the same worker MAY re-dispatch the overview generator during a recovery continuation when worker-side diagnosis establishes that retry is safe. Such a nested generation dispatch SHALL be part of the existing recovery attempt, SHALL not start a new source-modifying transaction, and SHALL be exempt from the ordinary one-regeneration-per-effective-transaction limit. For `envelope-contract-violation`, the worker SHALL verify overview soundness before its first failed return: a sound overview SHALL remain eligible only for in-place reporting repair, while an unsound overview SHALL set `unrecoverable: true` and receive zero recovery attempts. The three-attempt invocation pool SHALL be the only retry bound; a recovery re-dispatch SHALL not create an additional regeneration budget or replacement worker.

#### Scenario: Validation failure recovers by regenerating
- **WHEN** overview generation returns `failure_class: validation-failed` and the worker's recovery continuation re-dispatches generation
- **THEN** the nested generation dispatch SHALL consume one recovery attempt
- **AND** a validated successful result SHALL return `completed` through the same worker
- **AND** the recovery re-dispatch SHALL not count as a second ordinary regeneration for the source-modifying transaction

#### Scenario: Generation error recovery remains pool-bounded
- **WHEN** overview generation returns `failure_class: generation-error` and recovery re-dispatches generation more than once
- **THEN** every nested dispatch SHALL consume the shared recovery pool
- **AND** no more than three total recovery attempts SHALL run in the invocation
- **AND** the ordinary one-regeneration rule SHALL not create an additional retry allowance

#### Scenario: Unsound envelope violation is vetoed before recovery
- **WHEN** a malformed generator envelope is detected and the worker verifies before its first failed return that the existing overview is unsound
- **THEN** the worker SHALL return `failure_class: envelope-contract-violation` with `unrecoverable: true`
- **AND** the coordinator SHALL spend zero recovery attempts
- **AND** the terminal hand-back SHALL report zero attempts spent and the worker veto

### Requirement: Recovery eligibility and worker veto

For an opted-in adapter, the shared runner SHALL make a valid worker result eligible when the worker has not set `unrecoverable: true`, coordinator inspection establishes a clear safe correction inside the active worker's authorized scope or inside an in-run owner's authorized scope, and the coordinator-derived `diagnosis_key` is new. The worker-authored `failure_class` SHALL be treated as a prior that can focus diagnosis, but SHALL not be the eligibility gate: `blocking-contradiction` and `unclassified-worker-fault` MAY enter recovery when their established Cause Locus is `in-scope` or `owner-in-run`, while an otherwise eligible class SHALL receive zero when its Cause Locus is out-of-scope or unresolved. A coordinator rejection of a usable completed report SHALL use the phase's validation-failure accounting when the coordinator identifies a clear in-scope or owner-in-run correction; its routing diagnosis SHALL remain `coordinator rejection`, and its unique diagnosis key SHALL consume one ledger slot. A malformed result, including a malformed continuation result, SHALL be `coordinator rejection` with coordinator-authored `failure_class: outer-envelope-violation`, `Cause Locus: out-of-scope`, and zero additional attempts. A continuation operation that cannot be delivered or produces no result SHALL be `continuation/transport loss` with `Cause Locus: out-of-scope`; it SHALL stop recovery without charging an additional attempt. A worker result that emits the coordinator-reserved `outer-envelope-violation` SHALL be rejected as an output-contract violation and SHALL receive zero attempts. Any out-of-scope or unresolved cause SHALL receive zero attempts regardless of its failure class. A failed result carrying `unrecoverable: true` SHALL veto all remaining recovery attempts. The worker SHALL set that veto only when worker-side evidence establishes that continuation cannot safely repair the failure; the coordinator SHALL not override it. When `failure_class: blocking-contradiction` and `unrecoverable: true` occur together, the blocking contradiction SHALL take precedence as the reported stopping reason.

Coordinator inspection that establishes Cause Locus SHALL use exactly one of two evidence channels, selected by the active phase adapter's authority model — never by parsing worker `summary` prose:

#### Scenario: Blocking contradiction bypasses recovery

- **WHEN** an opted-in worker returns `failure_class: blocking-contradiction`
- **THEN** the coordinator SHALL spend zero recovery attempts
- **AND** SHALL hand back immediately for human judgment over the conflicting sources

#### Scenario: Worker veto stops the remaining pool

- **WHEN** a failed worker result sets `unrecoverable: true`
- **THEN** the coordinator SHALL abort the remaining recovery attempts without spending them
- **AND** SHALL report vetoed recovery rather than budget exhaustion

#### Scenario: Blocking contradiction takes precedence over veto

- **WHEN** a failed result carries both `failure_class: blocking-contradiction` and `unrecoverable: true`
- **THEN** the coordinator SHALL spend zero recovery attempts
- **AND** SHALL report blocking contradiction as the stopping reason
- **AND** SHALL not report the veto as the primary cause

#### Scenario: Verifying adapter establishes locus from independent verification

- **WHEN** an opted-in verifying adapter (Apply) receives a non-clean worker result and the coordinator's Verification Checklist, baseline, allowed-file, or report comparison locates a clear safe correction inside the active worker's authorized scope or inside an in-run owner's authorized scope
- **THEN** the coordinator SHALL assign `Cause Locus: in-scope` or `Cause Locus: owner-in-run` from that independent verification evidence
- **AND** SHALL derive `diagnosis_key` from the verified artifact path, concrete point, and correction boundary
- **AND** SHALL NOT treat worker `summary` prose as sufficient locus evidence

#### Scenario: Design overview failure matches the registered phase-static surface

- **WHEN** a design invocation with `recovery_policy: true` returns a valid failed result with `unrecoverable: false`, `failure_class` in `{validation-failed, generation-error, dispatch-failed, envelope-contract-violation, blocking-contradiction}`, and `changed_files` non-empty containing the substituted primary overview path and only surface-allowed paths
- **THEN** the coordinator SHALL match surface `design-overview-repair` without reading change artifacts and without parsing `summary` prose
- **AND** SHALL assign `Cause Locus: in-scope` with `diagnosis_key` equal to `(openspec/changes/{change-name}/change-overview.md, overview-generation-repair, design-worker-overview-repair)` after change-name substitution
- **AND** SHALL permit one new ledger slot and one same-worker `continue_after_recovery` when the key is new

#### Scenario: Empty or missing changed_files does not match any surface

- **WHEN** a design failed result satisfies the class and `unrecoverable: false` criteria for `design-overview-repair` but `changed_files` is missing or empty
- **THEN** the coordinator SHALL record an explicitly unresolved cause with no Cause Locus claim
- **AND** SHALL spend zero recovery attempts
- **AND** SHALL NOT authorize overview recovery solely from class and veto

#### Scenario: Non-overview design failure with empty changed_files stays unresolved

- **WHEN** a design worker fails while authoring `tasks.md` or another non-overview artifact, returns an accepted overview class with `unrecoverable: false`, and reports empty or missing `changed_files`
- **THEN** the coordinator SHALL NOT match `design-overview-repair`
- **AND** SHALL leave the cause unresolved with zero recovery attempts

#### Scenario: Design overview match succeeds with primary path and optional state carrier only

- **WHEN** a design failed result satisfies the class and `unrecoverable: false` criteria and `changed_files` lists the substituted primary `change-overview.md` path and optionally `openspec/changes/{change-name}/.openspec.yaml` only
- **THEN** the coordinator SHALL treat the surface match as successful
- **AND** the diagnosis_key primary path remains the overview path even when `.openspec.yaml` is also listed

#### Scenario: Non-empty changed_files outside the surface prevents a match

- **WHEN** a design failed result would otherwise match `design-overview-repair` by class and veto, but `changed_files` contains any path outside the surface's primary and optional templates
- **THEN** the coordinator SHALL record an explicitly unresolved cause with no Cause Locus claim
- **AND** SHALL spend zero recovery attempts

#### Scenario: changed_files omits the primary overview path

- **WHEN** a design failed result lists only `openspec/changes/{change-name}/.openspec.yaml` in `changed_files` (no primary overview path) with an accepted class and `unrecoverable: false`
- **THEN** the coordinator SHALL record an explicitly unresolved cause
- **AND** SHALL spend zero recovery attempts

#### Scenario: Design failure with a non-accepted class is unmatched

- **WHEN** a design failed result carries `unrecoverable: false` and a `failure_class` outside `design-overview-repair`'s accepted set (for example `unclassified-worker-fault`)
- **THEN** the coordinator SHALL record an explicitly unresolved cause
- **AND** SHALL spend zero recovery attempts and SHALL NOT invent a surface match from `summary` prose

#### Scenario: Blind opted-in adapter leaves unmatched failures unresolved

- **WHEN** a blind opted-in adapter receives a failed worker result whose closed fields do not match any registered phase-static authorized repair surface
- **THEN** the coordinator SHALL record an explicitly unresolved cause with no Cause Locus claim
- **AND** SHALL spend zero recovery attempts and SHALL NOT invent an out-of-scope claim from `summary` prose

#### Scenario: E8 worker veto stops the remaining pool

- **WHEN** a failed worker result sets `unrecoverable: true`
- **THEN** the coordinator SHALL abort the remaining recovery attempts without spending them
- **AND** SHALL report the worker veto rather than budget exhaustion

#### Scenario: E9 blocking contradiction takes precedence

- **WHEN** a failed result carries both `failure_class: blocking-contradiction` and `unrecoverable: true`
- **THEN** the coordinator SHALL spend zero recovery attempts
- **AND** SHALL report blocking contradiction as the stopping reason
- **AND** SHALL not report the veto as the primary cause

#### Scenario: In-scope blocking contradiction is not an eligibility veto

- **WHEN** a failed result carries `failure_class: blocking-contradiction`, `unrecoverable: false`, and coordinator evidence proves a clear safe cause and correction inside the worker's authorized scope
- **THEN** the coordinator SHALL retain the worker class and route diagnosis separately
- **AND** it SHALL permit one new diagnosis-key ledger slot and one same-worker recovery continuation

#### Scenario: In-scope unclassified fault uses coordinator diagnosis

- **WHEN** a failed result carries `failure_class: unclassified-worker-fault`, `unrecoverable: false`, and coordinator evidence locates a clear safe cause and correction inside the worker's authorized scope or inside an in-run owner's authorized scope
- **THEN** the coordinator SHALL use its Cause Locus and diagnosis key to determine eligibility
- **AND** it SHALL permit one new ledger slot rather than handing back solely because the worker class is unclassified

#### Scenario: Out-of-scope validation is not reclassified as recoverable

- **WHEN** coordinator evidence identifies a plan, verification, fixture, or other artifact outside the worker's authorized scope as the cause
- **THEN** the coordinator SHALL name that artifact and concrete point in the hand-back
- **AND** SHALL spend zero recovery attempts even if the worker class is `validation-failed`

#### Scenario: Continuation loss has a fixed locus and accounting

- **WHEN** the recovery continuation cannot be delivered or produces no result
- **THEN** the shared runner SHALL select `continuation/transport loss` with `Cause Locus: out-of-scope`
- **AND** SHALL spend zero additional attempts, dispatch no replacement from recovery, and hand back with the attempts already spent

#### Scenario: Worker verifies its own repair

- **WHEN** a worker continues after an in-scope or owner-in-run recovery announcement
- **THEN** the worker SHALL inspect and verify the relevant artifact or lifecycle state before returning `completed`
- **AND** the phase coordinator MAY perform its independent verification without delegating that verification back to the worker

### Requirement: Recovered overview state is committed
When a design-worker recovery continuation repairs an overview-generation failure and returns `status: completed`, the worker SHALL commit `overview.state: current`, clear both `overview.failure_kind` and `overview.failure_details`, and include `openspec/changes/{change-name}/.openspec.yaml` in the invocation's ordered changed-file union. This successful recovery commit SHALL occur only after the worker verifies the overview and its source relationship; it supersedes the prior `failed` or `stale` diagnostic state for that attempt. A recovery that does not return `completed` SHALL retain the existing failure-state mapping for its terminal route.

#### Scenario: First materialization recovers to current
- **WHEN** first materialization persisted `overview.state: failed` and diagnostic keys, then a same-worker recovery continuation returns `completed`
- **THEN** the design worker SHALL commit `overview.state: current`
- **AND** SHALL clear `overview.failure_kind` and `overview.failure_details`
- **AND** SHALL report `.openspec.yaml` in the changed-file union

#### Scenario: Regeneration recovers to current
- **WHEN** regeneration persisted `overview.state: stale` and diagnostic keys, then a same-worker recovery continuation returns `completed`
- **THEN** the design worker SHALL commit `overview.state: current`
- **AND** SHALL clear `overview.failure_kind` and `overview.failure_details`
- **AND** SHALL report `.openspec.yaml` in the changed-file union

### Requirement: Recovery reporting is visible but not plan state

Before every recovery attempt, the coordinator SHALL validate one coordinator-only closure-diagnosis record containing exactly one routing diagnosis from the shared closed set, a coordinator-owned `diagnosis_key`, an optional worker `failure_class`, a known `Cause Locus` or an unresolved-cause marker, attempts spent, and evidence references. It SHALL then emit conversation text containing the selected routing diagnosis, the `Cause Locus` when established, the failure class when one exists, and the key's ordinal against the fixed ledger, formatted as attempt `1`, `2`, or `3` of `3`. An out-of-scope hand-back SHALL name the artifact and concrete point supporting the boundary when an artifact cause exists, SHALL report zero additional attempts, and SHALL use `continuation failure` for a transport-only boundary with no fabricated artifact claim. If recovery stops without completion, the terminal hand-back SHALL separately report the number of slots spent, the number of ledger slots remaining, and the reason recovery stopped; it SHALL name the diagnosis, Cause Locus when established, and failure class when applicable, distinguishing duplicate diagnosis from an exhausted ledger, worker veto, blocking contradiction, continuation failure, ordinary input, cancellation, and out-of-scope cause. A duplicate-diagnosis hand-back SHALL preserve a positive remaining-slot count when applicable and SHALL never report ledger exhaustion. These messages SHALL follow the ambient language policy and SHALL not be treated as protocol literals.

#### Scenario: Attempt spend is announced

- **WHEN** the coordinator is about to invoke an in-scope recovery continuation
- **THEN** it SHALL announce the selected diagnosis and cause locus before invoking it
- **AND** the announcement SHALL name the failure class when applicable and the attempt ordinal against the pool of `3`
- **AND** the announcement SHALL be conversation text rather than a progress event

#### Scenario: E10 exhausted recovery explains the hand-back

- **WHEN** the third distinct in-scope diagnosis slot fails without a coordinator-verified clean result
- **THEN** the terminal hand-back SHALL name the diagnosis, failure class when applicable, `3` slots spent, and ledger exhaustion

#### Scenario: Exhausted recovery explains the hand-back

- **WHEN** the third recovery attempt fails without a completed result
- **THEN** the terminal hand-back SHALL name the failure class, `3` attempts spent, and budget exhaustion

#### Scenario: Vetoed recovery explains the hand-back

- **WHEN** a worker vetoes the remaining recovery pool
- **THEN** the terminal hand-back SHALL name the failure class, the attempts spent before the veto, and the worker veto as the stopping reason

#### Scenario: Out-of-scope hand-back identifies its boundary

- **WHEN** an out-of-scope cause is found before a recovery continuation
- **THEN** the hand-back SHALL name the artifact and concrete point that place the cause outside worker scope
- **AND** SHALL report zero attempts spent

#### Scenario: Duplicate hand-back reports remaining ledger capacity

- **WHEN** recovery stops because a later closure repeats an existing diagnosis key before all three slots are spent
- **THEN** the hand-back SHALL report the slots spent, the positive slots remaining, and duplicate diagnosis as the stopping reason
- **AND** it SHALL not report ledger exhaustion or spend another slot

#### Scenario: Recovery does not mutate the progress plan

- **WHEN** a recovery announcement or terminal hand-back is emitted
- **THEN** it SHALL not mark, extend, rename, or add any progress-plan step
- **AND** undeclared recovery identifiers SHALL not be invented

### Requirement: Invocation-scoped accounting and lifecycle boundaries

The coordinator SHALL add every `changed_files` path reported by the original result, progress event, normal continuation, recovery continuation, and terminal result to one ordered, duplicate-free union that is never reset by recovery. The recovery budget SHALL belong to the active invocation segment: notices, progress events, and normal `needs_input` turns SHALL not reset it. A pre-resolution outer-envelope failure SHALL spend zero attempts and SHALL retain its pre-resolution payload shape. A `cancelled` result SHALL be treated as a clean user-requested stop and SHALL never enter diagnosis or recovery. The `--fast-track` signal SHALL alter neither the recovery budget nor its visibility.

#### Scenario: Changed files survive recovery

- **WHEN** a worker reports paths before and during recovery
- **THEN** the coordinator SHALL preserve their first-seen order in the final union
- **AND** SHALL include later paths only once

#### Scenario: Intervening events do not reset budget

- **WHEN** notices, progress events, or normal input turns occur between failed results
- **THEN** the coordinator SHALL retain the number of recovery attempts already spent
- **AND** SHALL retain the same remaining budget

#### Scenario: E2 cancellation bypasses diagnosis

- **WHEN** a worker returns `status: cancelled` after a prior non-clean result or during a recovery continuation
- **THEN** the coordinator SHALL stop cleanly without assigning a new diagnosis
- **AND** SHALL spend no additional recovery attempt

#### Scenario: Explore diagnosis entry for non-clean completed uses only diagnosis_rounds

- **WHEN** Explore item 10 runs a Diagnosis Round after coordinator-disproved `completed` or STOP-bearing `completed`
- **THEN** only `diagnosis_rounds.spec` or `diagnosis_rounds.design` increments
- **AND** the route does not spend a shared three-slot recovery-ledger slot or create a replacement worker

#### Scenario: Fast-track does not widen non-clean completed diagnosis bounds

- **WHEN** an opted-in invocation includes `--fast-track`
- **THEN** Explore item-10 diagnosis entry for disproved or STOP-bearing `completed`, when applicable, retains the one diagnosis-round and one same-worker re-dispatch bound

#### Scenario: Cancellation bypasses recovery

- **WHEN** a worker returns `status: cancelled`
- **THEN** the coordinator SHALL stop cleanly without announcing or spending a recovery attempt

#### Scenario: Fast-track does not change recovery

- **WHEN** an opted-in invocation includes `--fast-track`
- **THEN** the coordinator SHALL apply the same cause-locus, zero-attempt, three-slot-ledger, and reporting rules as a normal invocation

### Requirement: Same-harness lifecycle parity

Claude Code and opencode routed adapters that declare `recovery_policy` SHALL expose identical non-clean-closure diagnosis categories, cause-locus semantics, zero-attempt exceptions, recovery budget, continuation acknowledgement, event and cancellation boundaries, changed-file union, and terminal reporting. Neither harness SHALL dispatch a replacement worker for the recovery path. Harness-specific binding mechanics MAY differ.

#### Scenario: Both supported harnesses recover identically

- **WHEN** equivalent opted-in invocations encounter the same worker classification, coordinator rejection, or continuation loss
- **THEN** both harnesses SHALL select the same routing diagnosis and cause-locus result
- **AND** both SHALL spend the same bounded recovery pool and reach the same protocol outcome

### Requirement: Recovery budget is a distinct-diagnosis ledger

The shared three-slot recovery budget SHALL be represented as three mutually distinct diagnosis slots for the active adapter segment. A coordinator SHALL derive a stable `diagnosis_key` before spending a slot as the exact ordered tuple `(artifact path, concrete point, authorized correction boundary)`. `artifact path` SHALL be a normalized repo-relative path or `<none>` when the cause has no artifact; `concrete point` SHALL identify the Step and the exact field, command, assertion, or lifecycle boundary implicated by the evidence; and `authorized correction boundary` SHALL identify the worker scope and permitted correction surface. Cause Locus SHALL remain beside the key in the closure-diagnosis record and SHALL not participate in key identity. Path normalization SHALL use `/`, remove a leading `./`, reject `..` traversal, and collapse only non-semantic whitespace; it SHALL preserve command arguments, selectors, operators, targets, and pass/fail polarity. Two keys SHALL be equal only when every tuple field is exactly equal after that normalization. A coordinator SHALL derive the key from its evidence, not worker prose, and SHALL not include the worker class or routing label in the tuple. Each new eligible in-scope key SHALL consume exactly one slot and receive at most one same-worker continuation. A later result with the same key SHALL be treated as a duplicate diagnosis and SHALL stop recovery before dispatch, without consuming a remaining slot or being reported as exhaustion. Out-of-scope, unresolved, malformed, vetoed, and continuation-transport-loss cases SHALL consume zero recovery slots; a `blocking-contradiction` or `unclassified-worker-fault` MAY consume one only when `unrecoverable: false`, the coordinator proves an in-scope cause and safe correction, and the key is new.

#### Scenario: Three distinct diagnoses are the maximum

- **WHEN** an active apply segment encounters three eligible in-scope closures with three different coordinator diagnosis keys
- **THEN** it SHALL permit no more than one recovery continuation for each key
- **AND** it SHALL not create a fourth slot or reset the ledger at a new Step

#### Scenario: Duplicate diagnosis stops with budget remaining

- **WHEN** a recovery continuation returns a non-clean closure whose normalized diagnosis key matches an earlier key
- **THEN** the coordinator SHALL stop before another continuation
- **AND** it SHALL report duplicate diagnosis with the unused slot count preserved rather than reporting pool exhaustion

#### Scenario: A changed failure class does not evade duplicate detection

- **WHEN** a later result changes from one eligible worker `failure_class` to another but coordinator evidence identifies the same concrete cause and correction boundary
- **THEN** the coordinator SHALL treat it as the existing diagnosis key
- **AND** SHALL stop without spending another recovery slot

#### Scenario: Worker prose does not change diagnosis-key equality

- **WHEN** two non-clean closures have the same artifact path, concrete Step point, and authorized correction boundary but different worker summaries or failure-class prose
- **THEN** the coordinator SHALL derive equal `diagnosis_key` tuples
- **AND** the second closure SHALL stop as a duplicate before spending a slot

#### Scenario: A different concrete point creates a new diagnosis key

- **WHEN** two otherwise similar non-clean closures identify different concrete fields, commands, assertions, or lifecycle points
- **THEN** the coordinator SHALL derive unequal `diagnosis_key` tuples
- **AND** the later closure MAY spend one remaining slot only if its locus is in-scope, its correction is safe, and its worker veto is false

#### Scenario: Locus reassessment does not change diagnosis-key equality

- **WHEN** two closures identify the same normalized artifact path, concrete point, and authorized correction boundary but carry different Cause Locus values — the first unresolved and the later `in-scope`
- **THEN** the coordinator SHALL derive equal `diagnosis_key` tuples
- **AND** the later closure SHALL stop as a duplicate and SHALL not consume a second slot for the unchanged concrete cause

### Requirement: Explore Auto cancellation exception is named and one-shot

The shared bounded-recovery contract SHALL name selector-dispatched Explore Auto item 10 as the sole exception to the default clean-cancellation prohibition. In that route only, a post-resolution supervised phase-worker `cancelled` result MAY enter the Explore Diagnosis Round, using a phase-keyed conversation-only `diagnosis_rounds` counter, with at most one read-only diagnosis and at most one same-worker re-dispatch. It SHALL never use a replacement worker and SHALL not make cancellation recoverable for standalone spec or design adapters, Build, the manual item-9 review loop, adapters without the named Explore route, or outer user cancellation.

#### Scenario: Explore Auto cancellation is diagnosable after Auto authorization

- **WHEN** the user has selected `Auto`, item 10 supervision is active, and its resolved phase worker returns `cancelled`
- **THEN** the route permits the named Explore Diagnosis Round when that phase counter is unused
- **AND** it may forward one actionable diagnosis to the same worker without treating the result as a new user cancellation decision

#### Scenario: ordinary cancellation remains a clean stop

- **WHEN** a standalone adapter, Build, the manual review loop, or an outer user action returns or produces `cancelled`
- **THEN** the result enters no diagnosis or recovery route and consumes no recovery budget

#### Scenario: Explore continuation loss is terminal and retryable

- **WHEN** an Explore Diagnosis Round establishes an actionable correction but same-worker continuation cannot be delivered
- **THEN** the route records `continuation/transport loss`, consumes the diagnosis round, dispatches no replacement worker, and leaves the change retryable

### Requirement: Downstream relaunch after owner correction

When Cause Locus is `owner-in-run` and the owner worker returns a successful `completed` status from recovery, the owner's correction invalidates the downstream result that reported the non-clean outcome. The coordinator SHALL resume the downstream worker with exactly `continue_after_recovery_relaunch`, a warm continuation carrying the corrected upstream artifacts scoped to recovering from the one concrete diagnosed point. Before the relaunch continuation is sent, the coordinator SHALL check whether any user-facing gate (such as an artifact-feedback gate or approval gate) already accepted artifacts that the owner correction has now rewritten; if so, the coordinator SHALL re-present that gate with the modified artifacts before resuming the downstream worker, preserving the constraint that no approved content is silently mutated. The relaunch is a separate work cycle: the downstream worker executes with the corrected inputs from the continued state, and a separate diagnosis applies to the relaunch result only if a new non-clean outcome is returned. A downstream relaunch does not extend or reset the shared three-slot recovery ledger of the downstream phase.

#### Scenario: Owner worker returns successful correction
- **WHEN** an owner worker returns `completed` from an `owner-in-run` recovery continuation
- **THEN** the coordinator SHALL invalidate the downstream result and resume the downstream worker with `continue_after_recovery_relaunch` carrying corrected artifacts
- **AND** the downstream worker SHALL execute in a separate work cycle with independent diagnosis

#### Scenario: Gate re-surface preserves approved content
- **WHEN** an owner correction has rewritten artifacts already approved at a user-facing gate
- **THEN** the coordinator SHALL re-present that gate with the modified artifacts before the downstream relaunch continuation
- **AND** SHALL preserve the constraint that no approved content is silently mutated


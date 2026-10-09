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

For an opted-in adapter, the coordinator SHALL use one recovery-scope-scoped ledger of at most three distinct diagnosis slots. The recovery scope SHALL be the Step for a Step-executing adapter and the composition segment for an adapter that executes no Steps; every reference to the segment ledger SHALL mean the ledger of the active recovery scope. The three-attempt cap is a derived consequence of one attempt per slot, not a separate counter. An eligible in-scope non-clean closure SHALL be continued only on the still-live worker, using the active binding's normal continuation operation and the fixed shared protocol acknowledgement `continue_after_recovery`. The route SHALL carry exactly one of the shared routing diagnoses — `worker-authored failure`, `coordinator rejection`, or `continuation/transport loss` — together with the coordinator's `Cause Locus`. Recovery SHALL never dispatch a replacement worker unless the phase card declares an exception for a corrective dispatch; apply declares one, a fresh RED worker for a test-located cause in a Step that had no RED dispatch. This prohibition is scoped to the recovery path, while ordinary non-recovery continuation failures SHALL retain the existing replacement-worker fallback. An out-of-scope cause SHALL spend zero attempts and SHALL not be made recoverable by rewriting its worker failure class. Recovery SHALL never reset the changed-file union, and SHALL return to the existing terminal hand-back when the recovery path stops without a completed result.

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
- **THEN** the coordinator SHALL spend no more than one attempt for each of three distinct diagnosis keys in the active recovery scope
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

#### Scenario: Each Step of a Step-executing adapter gets a fresh pool

- **WHEN** a Step-executing adapter enters a new Step after an earlier Step consumed recovery slots
- **THEN** the coordinator SHALL send the Step-guarded `step-entry` signal naming that Step so the newly entered Step receives a fresh three-slot pool and inherits no depleted or remaining slot

#### Scenario: A re-entered Step draws no second pool

- **WHEN** a Step-executing adapter re-enters a Step it already entered in this run, after a correction or a route retry
- **THEN** the coordinator SHALL keep the slots and coordinator attempts already spent in that Step and SHALL grant no second pool

#### Scenario: An adapter that executes no Steps keeps segment scope

- **WHEN** an opted-in adapter that executes no Steps crosses a composition-segment boundary
- **THEN** the coordinator SHALL reset the ledger at that segment boundary exactly as before

#### Scenario: A phase-declared corrective dispatch is the only replacement in recovery

- **WHEN** an apply Step that had no RED dispatch fails with a cause located in a test
- **THEN** the coordinator SHALL dispatch a fresh RED worker for that correction under apply's declared exception, and no other recovery path dispatches a replacement worker

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

For an opted-in adapter, the shared runner SHALL make a valid worker result eligible when the worker has not set `unrecoverable: true` (or that veto was lifted by an accepted `authorized-veto-override`), coordinator inspection establishes a clear safe correction inside the active worker's authorized scope or inside an in-run owner's authorized scope, and the coordinator-derived `diagnosis_key` is new. The worker-authored `failure_class` SHALL be treated as a prior that can focus diagnosis, but SHALL not be the eligibility gate: `blocking-contradiction` and `unclassified-worker-fault` MAY enter recovery when their established Cause Locus is `in-scope` or `owner-in-run`, while an otherwise eligible class SHALL receive zero when its Cause Locus is out-of-scope or unresolved. A coordinator rejection of a usable completed report SHALL use the phase's validation-failure accounting when the coordinator identifies a clear in-scope or owner-in-run correction; its routing diagnosis SHALL remain `coordinator rejection`, and its unique diagnosis key SHALL consume one ledger slot. A malformed result, including a malformed continuation result, SHALL be `coordinator rejection` with coordinator-authored `failure_class: outer-envelope-violation`, `Cause Locus: out-of-scope`, and zero additional attempts. A continuation operation that cannot be delivered or produces no result SHALL be `continuation/transport loss` with `Cause Locus: out-of-scope`; it SHALL stop recovery without charging an additional attempt. A worker result that emits the coordinator-reserved `outer-envelope-violation` SHALL be rejected as an output-contract violation and SHALL receive zero attempts. Any out-of-scope or unresolved cause SHALL receive zero attempts regardless of its failure class. A failed result carrying `unrecoverable: true` SHALL veto all remaining recovery attempts unless the user lifts that veto through an accepted `authorized-veto-override` in apply: the user's explicit authorization, exactly one veto per event, recorded in the recovery ledger and changing neither budgets nor history. After the lift, the remaining eligibility conditions SHALL decide the result within the Step's remaining budget. The worker SHALL set that veto only when worker-side evidence establishes that continuation cannot safely repair the failure; the coordinator SHALL not override it on its own judgment, and neither `--fast-track` nor a session commit grant SHALL supply the user's authorization. When `failure_class: blocking-contradiction` and `unrecoverable: true` occur together, the blocking contradiction SHALL take precedence as the reported stopping reason.

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

#### Scenario: A user-authorized override lifts one veto without renewing budgets

- **WHEN** an apply worker result sets `unrecoverable: true` and the user's explicit lift is recorded as an accepted `authorized-veto-override` for that Step
- **THEN** the veto SHALL no longer block eligibility, and the remaining eligibility conditions SHALL decide the result within the Step's remaining budget
- **AND** neither budget SHALL be renewed by the lift

#### Scenario: The coordinator alone cannot lift a veto

- **WHEN** a worker veto is active and no explicit user authorization for that Step has been recorded, including under `--fast-track` or an active session commit grant
- **THEN** the veto SHALL keep vetoing all remaining recovery attempts

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

The coordinator SHALL add every `changed_files` path reported by the original result, progress event, normal continuation, recovery continuation, and terminal result to one ordered, duplicate-free union that is never reset by recovery or by a recovery-scope reset. The recovery budget SHALL belong to the active recovery scope — the Step for a Step-executing adapter, the composition segment for an adapter that executes no Steps: notices, progress events, and normal `needs_input` turns SHALL not reset it. A pre-resolution outer-envelope failure SHALL spend zero attempts and SHALL retain its pre-resolution payload shape. A `cancelled` result SHALL be treated as a clean user-requested stop and SHALL never enter diagnosis or recovery. The `--fast-track` signal SHALL alter neither the recovery budget nor its visibility.

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

#### Scenario: A recovery-scope reset never touches the changed-files union

- **WHEN** the ledger is reset on entry to a new recovery scope after earlier results reported changed paths
- **THEN** the coordinator SHALL preserve the first-seen ordered union of those paths unchanged

### Requirement: Same-harness lifecycle parity

Claude Code and opencode routed adapters that declare `recovery_policy` SHALL expose identical non-clean-closure diagnosis categories, cause-locus semantics, zero-attempt exceptions, recovery budget, continuation acknowledgement, event and cancellation boundaries, changed-file union, and terminal reporting. Neither harness SHALL dispatch a replacement worker for the recovery path, except for a corrective dispatch that the phase card declares as an exception, which SHALL be identical on both harnesses. Harness-specific binding mechanics MAY differ.

#### Scenario: Both supported harnesses recover identically

- **WHEN** equivalent opted-in invocations encounter the same worker classification, coordinator rejection, or continuation loss
- **THEN** both harnesses SHALL select the same routing diagnosis and cause-locus result
- **AND** both SHALL spend the same bounded recovery pool and reach the same protocol outcome

### Requirement: Recovery budget is a distinct-diagnosis ledger

The shared three-slot recovery budget SHALL be represented as three mutually distinct diagnosis slots for the active recovery scope — the Step for a Step-executing adapter, the composition segment for an adapter that executes no Steps. A coordinator SHALL derive a stable `diagnosis_key` before spending a slot as the exact ordered tuple `(artifact path, concrete point, authorized correction boundary)`. `artifact path` SHALL be a normalized repo-relative path or `<none>` when the cause has no artifact; `concrete point` SHALL identify the Step and the exact field, command, assertion, or lifecycle boundary implicated by the evidence; and `authorized correction boundary` SHALL identify the worker scope and permitted correction surface. Cause Locus SHALL remain beside the key in the closure-diagnosis record and SHALL not participate in key identity. Path normalization SHALL use `/`, remove a leading `./`, reject `..` traversal, and collapse only non-semantic whitespace; it SHALL preserve command arguments, selectors, operators, targets, and pass/fail polarity. Two keys SHALL be equal only when every tuple field is exactly equal after that normalization. A coordinator SHALL derive the key from its evidence, not worker prose, and SHALL not include the worker class or routing label in the tuple. Each new eligible in-scope or owner-in-run key SHALL consume exactly one slot and receive at most one continuation on the authorized worker. A later result with the same key SHALL be treated as a duplicate diagnosis and SHALL stop recovery before dispatch, without consuming a remaining slot or being reported as exhaustion. Out-of-scope, unresolved, malformed, vetoed, and continuation-transport-loss cases SHALL consume zero recovery slots; a `blocking-contradiction` or `unclassified-worker-fault` MAY consume one only when `unrecoverable: false`, the coordinator proves an in-scope or owner-in-run cause and safe correction, and the key is new.

#### Scenario: Three distinct diagnoses are the maximum

- **WHEN** an active recovery scope encounters three eligible closures with three different coordinator diagnosis keys
- **THEN** it SHALL permit no more than one recovery continuation for each key
- **AND** it SHALL not create a fourth slot inside that recovery scope

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
- **AND** the later closure MAY spend one remaining slot only if its locus is in-scope or owner-in-run, its correction is safe, and its worker veto is false

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

### Requirement: The recovery ledger is owned by a registered stage machine

The per-recovery-scope recovery ledger SHALL be owned by the `recovery-ledger@1` stage machine registered in `sai-state/registry.js`. Before spending a slot the coordinator SHALL consult that machine with the raw ordered tuple `(artifact path, concrete point, authorized correction boundary)`, and the machine SHALL perform the normalization, key-equality comparison, duplicate detection and slot accounting. Normalization SHALL canonicalize the artifact path as a repository-relative path with `/` separators and a leading `./` removed, and SHALL trim and collapse non-semantic whitespace in the concrete point. The machine SHALL report a consumed slot through the existing emit wire `stage` field as a string ordinal, and SHALL report every zero-slot outcome through the existing `rejected` field carrying a value from the closed stopping-reason vocabulary. The machine SHALL route to no step file and SHALL always return `next.follow` as `none`. The machine SHALL additionally own the coordinator's own attempt budget for the same recovery scope: three coordinator attempts per recovery scope, tracked in machine state as `coordinator_attempts` and counted separately from the three worker slots. A coordinator-attempt signal SHALL carry the same ordered diagnosis tuple as a worker attempt and SHALL be normalized and compared against a coordinator-owned key ledger for the scope: a signal with no concrete key SHALL spend zero attempts and reject with `unresolved cause`, a key already attempted at coordinator level in that scope SHALL spend zero attempts and reject with `duplicate diagnosis`, and only a new key SHALL spend one attempt and report the resulting ordinal through the existing `stage` field; once three attempts are spent it SHALL reject the next coordinator attempt through the existing `rejected` field with `exhaustion` and SHALL spend nothing. Entering a new recovery scope SHALL clear the ledger — for a Step-executing adapter through a `step-entry` signal naming the Step, for an adapter that executes no Steps through `reset <id> recovery-ledger@1` at each composition-segment boundary — clearing the worker slots and the coordinator attempts together and leaving every other machine in the same session untouched. A `step-entry` signal SHALL grant that fresh pair of budgets only on the first entry to that Step in the run, reporting `step_entry` as `first`; a Step already entered SHALL report `step_entry` as `re-entry` and SHALL retain the worker slots and coordinator attempts already spent in it; a signal carrying no usable Step identifier SHALL report `step_entry` as `unidentified` and SHALL grant nothing. Every machine outcome, including the read-only projection, SHALL report `budgets` as `{worker: {spent, limit}, coordinator: {spent, limit}}`, and an exhaustion SHALL additionally report `exhausted` as `worker` or `coordinator` naming which budget ran out. `bin/sai-state.js` SHALL carry the closed machine-authored observability field set `budgets`, `exhausted`, `step_entry`, `retry_grant`, `retry_cycle`, `attempt_history`, `veto`, and `veto_override` verbatim onto the emit wire, into the persisted merged wire, and into the stored last outcome. The machine SHALL retain the active Step and ordered exhausted-cycle history for an apply Step scope. The machine SHALL accept `{kind: authorized-step-retry, step: "Step N", authorized: true}` only when the named Step is active and already entered and at least one budget is exhausted. On acceptance it SHALL archive the exhausted cycle's normalized worker and coordinator keys and both spent tallies in `attempt_history`, clear both active ledgers and counters together, and return `retry_grant: granted` with the next cycle number. An unaccepted event SHALL change neither budgets nor history. The coordinator SHALL retain ownership of constructing the diagnosis and assigning Cause Locus.

#### Scenario: Distinct diagnosis keys consume successive slots

- **WHEN** the coordinator consults `recovery-ledger@1` with three tuples that differ after normalization
- **THEN** the machine SHALL report the ordinals for the first, second and third slot in turn through the wire `stage` field
- **AND** it SHALL carry no `rejected` value for any of the three

#### Scenario: A duplicate normalized key spends no slot

- **WHEN** the coordinator consults the machine with a tuple that differs only in a leading `./`, in path separators, or in non-semantic whitespace from a tuple already in the recovery-scope ledger
- **THEN** the machine SHALL reject it as a duplicate diagnosis
- **AND** it SHALL leave the consumed slot count unchanged

#### Scenario: A fourth distinct key reports exhaustion

- **WHEN** the coordinator consults the machine with a fourth tuple that is distinct from the three already recorded in the recovery-scope ledger
- **THEN** the machine SHALL reject it as exhaustion
- **AND** it SHALL create no fourth slot

#### Scenario: The segment boundary clears only the ledger

- **WHEN** the coordinator opens an eligible recovery scope — a first `step-entry` signal for a Step-executing adapter, a `reset <id> recovery-ledger@1` at an eligible composition-segment boundary otherwise
- **THEN** the next consult SHALL report the first slot ordinal again
- **AND** every other machine registered in the same session SHALL retain its state

#### Scenario: Coordinator attempts are counted against a three-attempt budget

- **WHEN** the coordinator consults `recovery-ledger@1` with a fourth coordinator-attempt signal carrying a fourth distinct diagnosis key inside one recovery scope
- **THEN** the machine SHALL reject it as `exhaustion` without increasing the recorded coordinator attempts

#### Scenario: The coordinator budget is separate from the worker slots

- **WHEN** coordinator attempts are spent inside a recovery scope that still holds unused worker slots
- **THEN** the machine SHALL leave the worker slot accounting unchanged and report only the coordinator ordinal

#### Scenario: A reset clears both budgets

- **WHEN** the ledger machine opens a new recovery scope, by a segment-boundary reset or by a first `step-entry` signal for a Step
- **THEN** its state SHALL return to an empty worker ledger and zero coordinator attempts together

#### Scenario: A repeated coordinator diagnosis spends no attempt

- **WHEN** the coordinator consults the machine with a coordinator-attempt signal whose normalized key was already attempted at coordinator level in that scope
- **THEN** the machine SHALL reject it as `duplicate diagnosis` and SHALL leave the recorded coordinator attempts unchanged

#### Scenario: A keyless coordinator attempt is an unresolved cause

- **WHEN** the coordinator consults the machine with a coordinator-attempt signal carrying no concrete diagnosis key
- **THEN** the machine SHALL reject it as `unresolved cause` and SHALL spend no coordinator attempt

#### Scenario: A first Step entry grants both budgets and a re-entry keeps them

- **WHEN** the machine receives a `step-entry` signal naming a Step already entered in this run after slots and attempts were spent in it
- **THEN** the machine SHALL report `step_entry` as `re-entry` and SHALL preserve the spent worker slots and coordinator attempts instead of granting a second budget

#### Scenario: An unidentified Step entry grants nothing

- **WHEN** the machine receives a `step-entry` signal whose Step identifier is absent, empty, blank, or not a string
- **THEN** the machine SHALL report `step_entry` as `unidentified` and SHALL leave both budgets exactly as they were

#### Scenario: Every outcome reports both budget tallies

- **WHEN** the coordinator receives any `recovery-ledger@1` outcome, including a read-only projection
- **THEN** that outcome SHALL carry `budgets` as `{worker: {spent, limit}, coordinator: {spent, limit}}`

#### Scenario: An exhaustion names the budget that ran out

- **WHEN** a coordinator attempt is rejected as exhaustion while worker slots remain unspent
- **THEN** the outcome SHALL carry `exhausted` as `coordinator` alongside the tallies spent on each budget

#### Scenario: Observability fields reach the emit wire

- **WHEN** a `recovery-ledger@1` signal is emitted through `bin/sai-state.js`
- **THEN** the emitted payload and the stored last outcome SHALL carry the machine's `budgets`, `exhausted`, `step_entry`, `retry_grant`, `retry_cycle`, and `attempt_history` values verbatim

#### Scenario: Unauthorized retry preserves the exhausted cycle

- **WHEN** an authorized retry event is missing authorization, names a non-active Step, or arrives before either budget is exhausted
- **THEN** the machine SHALL reject it without clearing ledgers, changing budgets, or appending attempt history

#### Scenario: Accepted retry archives and renews a cycle

- **WHEN** an authorized retry event names the active exhausted Step
- **THEN** the machine SHALL archive the exhausted cycle with its keys and tallies, return `retry_grant: granted`, and reset both budgets to zero spent

#### Scenario: Re-entry preserves archived history

- **WHEN** the coordinator sends ordinary `step-entry` after an accepted retry
- **THEN** the machine SHALL report `re-entry`, retain the archived cycle history, and not grant another budget

#### Scenario: Veto record and override outcomes reach the emit wire

- **WHEN** a `veto` or `authorized-veto-override` signal for `recovery-ledger@1` is emitted through `bin/sai-state.js` and the machine accepts it
- **THEN** the emitted response SHALL carry the machine's `veto: recorded` or `veto_override: granted` value verbatim
- **AND** the persisted merged wire and the stored last outcome SHALL carry the same value

### Requirement: Cause Locus is decided by ownership, not artifact kind

The shared bounded-recovery policy SHALL decide `out-of-scope` by ownership and never by the kind of artifact the cause sits in. `out-of-scope` SHALL mean that no in-run worker holds an authorized correction boundary over the concrete point — a declared interface, forbidden artifact, external or shared system, or any other boundary with no in-run owner. `owner-in-run` SHALL mean that the evidence identifies a concrete point in an authorized artifact, production or test, whose authorized correction boundary is held by a named worker still resumable in this run. A cause located in a test file SHALL therefore be `owner-in-run` whenever a test-owning worker is still resumable in this run, and the correction SHALL be routed to that owner and never to a worker whose contract forbids test files. The coordinator SHALL read ownership only from its in-run owner roster and SHALL NOT infer a missing worker or boundary. This classification SHALL reach every consumer of the shared policy, including the Direct Build (unattended) route, whose single implementer already owns both tests and production and whose behavior is therefore unchanged.

#### Scenario: A test-located cause with a resumable test owner is owner-in-run

- **WHEN** coordinator evidence places a concrete point in a test file whose authorized correction boundary is held by a worker still resumable in this run
- **THEN** the coordinator SHALL assign `Cause Locus: owner-in-run` and route the correction to that owner rather than classifying the cause out-of-scope for being a test

#### Scenario: No in-run owner makes the cause out-of-scope

- **WHEN** coordinator evidence places a concrete point at a boundary over which no worker in the in-run roster holds an authorized correction boundary
- **THEN** the coordinator SHALL assign `Cause Locus: out-of-scope`, spend zero worker-recovery attempts, and use the hand-back route

#### Scenario: Direct Build is inside the classification radius with no behavior change

- **WHEN** the Direct Build (unattended) route applies the shared Bounded Recovery policy to a test-located cause
- **THEN** the cause SHALL remain inside its single implementer's correction boundary exactly as before, because that implementer already owns both tests and production

### Requirement: Recovery hand-backs read budget tallies from the ledger response

A recovery hand-back SHALL take `attempts_spent` and the remaining capacity from the ledger machine's response rather than from recalled conversation text. The machine SHALL supply those tallies on every outcome as `budgets` — `{worker: {spent, limit}, coordinator: {spent, limit}}` — and SHALL name the budget that ran out as `exhausted` on an exhaustion, so a long unattended run never has to remember what each budget spent. When an authorized Step retry has occurred, the hand-back SHALL also read the retained `attempt_history` and report the prior cycles and new cycle from the ledger response. These temporary values SHALL never enter project artifacts.

#### Scenario: An escalation names both tallies from the store

- **WHEN** a hand-back reports the attempts spent after a bounded recovery stops without completion
- **THEN** the coordinator SHALL take the worker and coordinator tallies from the ledger response's `budgets` rather than from conversation memory

#### Scenario: An exhaustion hand-back names the exhausted budget

- **WHEN** a hand-back reports exhaustion inside a recovery scope
- **THEN** it SHALL name the exhausted budget from the response's `exhausted` value rather than inferring which budget ran out

#### Scenario: An authorized retry hand-back reports retained cycles

- **WHEN** the coordinator reports a Step after an authorized retry
- **THEN** it SHALL take prior cycle history and the new cycle from the ledger response rather than reconstructing them from conversation memory

### Requirement: Authorized Step retry is an apply-only recovery exception

The shared recovery policy SHALL permit the authorized-step-retry event only for the active Step scope governed by apply. The exception SHALL renew both budgets together without changing recovery eligibility, worker ownership, verification, commit gates, safe-operations confirmations, or the no-automatic-chain rule. Other phase adapters, ordinary Step re-entry, and `--fast-track` SHALL receive no equivalent automatic grant.

#### Scenario: Apply alone can renew an exhausted Step

- **WHEN** apply receives explicit authorization for its active exhausted Step
- **THEN** only that Step's ledger cycle is archived and renewed while all other recovery scopes retain their existing behavior

### Requirement: Unattended runtime repair follows existing precedence

The selected Plan - Unattended and Direct Build - Unattended routes, and the Direct Build close of `/sai-5-review` and `/sai-review`, SHALL apply the unattended resilience rule to a non-clean outcome only after task disclosure and after existing dispatch, startup, replacement, payload-validation, accepted-result, review, feedback, and role-specific one-shot handling. Where that existing handling would end the run, or the route names none, the rule SHALL apply before stopping. A finding or feedback continuation SHALL belong to its existing review/fix-round loop, not to the rule's extra corrections.

#### Scenario: Existing lifecycle handling wins

- **WHEN** a worker produces a valid result or the event belongs to dispatch, startup, replacement, review, feedback, or a role-specific one-shot path
- **THEN** the route uses that existing handling first and applies the rule only where that handling would end the run or names none

#### Scenario: Invalid payload is not trusted

- **WHEN** active validation rejects a returned payload
- **THEN** the route trusts neither its status, progress, nor changed-files report for repair or advancement

#### Scenario: Existing handling would end the run

- **WHEN** a valid `failed` or `cancelled` result reaches a point where the route's existing handling would end the run or names no handling
- **THEN** the route applies the resilience rule before stopping

### Requirement: Runtime repair requires verified same-worker safety

An automatic correction SHALL be eligible only while the resilience rule answers yes: agreed content is unchanged, the correction stays inside the authorization envelope, writes land only on the slice paths, it needs no unavailable information, the planned process continues, and the failed step has an attempt left with a new diagnosis. The coordinator SHALL correct input it authored and re-dispatch; otherwise it SHALL continue the current subagent through a continuation its contract accepts, or hand off to the budget agent under the recovery-path criteria of `sai/policies/unattended-runtime-recovery.md`. The correction SHALL be grounded in the observed error and verified state, and its goal SHALL be the failed step's check.

#### Scenario: A safe correction is available

- **WHEN** a post-disclosure failure satisfies every invariant of the resilience rule
- **THEN** the correction goes to the current subagent or to the budget agent, the route runs the step check through the step's owner, and the attempt is logged

#### Scenario: Recovery evidence is incomplete

- **WHEN** any invariant is unknown or false
- **THEN** the affected work stops without automatic correction and without a new authorization

### Requirement: Runtime repair consumes the shared diagnosis allowance

An attempt SHALL be charged on the route's existing counter immediately before it is sent, and each failed step SHALL allow three attempts shared between the two recovery paths. Plan - Unattended SHALL charge the active phase's `diagnosis_rounds.spec` or `diagnosis_rounds.design`. Direct Build - Unattended SHALL charge `diagnosis_rounds.direct_build` keyed by the failed step's scope: `direct-build` for the implementer across Steps 1–2, `backfill` across Steps 3–6, and `archive` across Steps 7–8. The Direct Build close of `/sai-5-review` and `/sai-review` SHALL count three attempts per close in conversation without adding a fix-loop round. A route diagnosis or Bounded Recovery continuation for the same scope SHALL be an attempt on the same counter.

#### Scenario: A Plan phase uses its existing allowance

- **WHEN** an attempt is selected for a Plan - Unattended spec or design worker
- **THEN** the attempt is charged on that phase's existing counter rather than on a second recovery budget

#### Scenario: A Direct Build implementer uses one slice allowance

- **WHEN** an attempt is selected for a Direct Build implementer during Steps 1–2
- **THEN** the implementation and functional-fix stretches share the three attempts of the `direct-build` key rather than receiving a counter per step

#### Scenario: A spent allowance cannot stack

- **WHEN** progress, a question answer, a continuation, a review round, a transport retry, a replacement, a step transition, a delivery failure, or a repeated error follows a charged attempt
- **THEN** the route does not refund or reset the counter, and it grants no attempt beyond the three of that scope

#### Scenario: The review close uses one correction

- **WHEN** an attempt is selected during the Direct Build close of `/sai-5-review` or `/sai-review`
- **THEN** it counts toward the three attempts of that close and no fix-loop round is added

### Requirement: Runtime repair uses worker-compatible continuations

A correction SHALL reach a worker only through a continuation form that worker's contract already accepts. Plan - Unattended spec and design workers SHALL use the existing `continue_after_recovery` record, the Direct Build implementer SHALL use its verification-note contract, and every other worker SHALL use its ordinary fresh-result request or its route-defined correction feedback. Repair content SHALL be input to the worker, never a new result shape or execute order. A Direct Build execute order that failed SHALL be issued again only after the no-effect check verifies that it changed nothing, and an order whose mutation completed or whose state is partial or unknown SHALL never be issued again.

#### Scenario: A compatible Plan worker resumes

- **WHEN** a Plan spec or design worker has a concrete in-boundary correction and accepts `continue_after_recovery`
- **THEN** the coordinator forwards the ordered `Reported`, `Evidence`, `Cause`, `Correction`, and `Verification` record to that same worker

#### Scenario: A one-shot worker cannot be replayed

- **WHEN** a Direct Build backfill or archive execute order completed its mutation or left a partial or unknown state
- **THEN** no order is issued again and the route stops reporting the exact state

#### Scenario: A failed order without effect is issued again

- **WHEN** a Direct Build execute order fails and the no-effect check verifies that it changed nothing
- **THEN** the cause is corrected through the recovery path and a new order is issued to the step's owner

### Requirement: Fresh repaired results gate ordinary progression

The active validator SHALL validate a fresh result exactly as received before the coordinator acts on it. The coordinator SHALL infer neither success, changed files, nor completed phases, steps, or slices from a correction note or rejected result, SHALL union only paths established by normal route evidence, and SHALL advance only when ordinary completion conditions pass.

#### Scenario: A repaired result is valid

- **WHEN** a same-worker correction returns a fresh result that passes the active validator
- **THEN** the route resumes ordinary lifecycle handling and advances only after its normal completion checks pass

#### Scenario: A repaired result remains invalid

- **WHEN** the fresh result is malformed or fails active validation
- **THEN** the route treats the work as uncompleted and does not infer progress from the invalid result

### Requirement: Ineligible runtime repair stops without a routine question

When the resilience rule answers no because an invariant blocks the correction, the attempts are spent, the diagnosis repeats, a foreign change appears, or an execute order left a completed, partial, or unknown state, the route SHALL preserve earlier validated work, keep the affected step or phase pending, and stop without a routine "how should I proceed?" question. The stop notice SHALL state what failed, what is done and what is pending including known partial effects and unverified state, which invariant blocked the correction, and what the user must decide. It SHALL not roll back automatically, retry an unchecked action, or claim completion.

#### Scenario: Repair fails after the charge

- **WHEN** a charged attempt cannot be delivered or returns an invalid or still-failing result and the step's three attempts are spent
- **THEN** the route stops the affected work with its last validated state

#### Scenario: Existing gates remain required

- **WHEN** an automatic correction reaches a Plan review or approval boundary or a Direct Build scope, execution-order, or local-commit boundary
- **THEN** the route keeps the existing gate and obtains any required confirmation before its action

### Requirement: The recovery ledger tracks worker vetoes and authorized veto overrides

The `recovery-ledger@1` stage machine SHALL track a worker `unrecoverable: true` veto for the active apply Step instead of leaving it to prose.
- It SHALL accept `{kind: veto, step: "Step N"}` only when the named Step is identified, active, and already entered. Acceptance records that Step as the active veto, returns `veto: recorded`, and spends neither budget.
- It SHALL accept `{kind: authorized-veto-override, step: "Step N", authorized: true}` only when all of these hold: the event carries `authorized: true`, the named Step is active and already entered, and a veto is active for that Step. Acceptance clears that single active veto, appends the Step identifier to `veto_lifts`, and returns `veto_override: granted`. It SHALL change neither the worker or coordinator budgets, nor the key ledgers, nor `attempt_history`.
- It SHALL reject an override through the existing `rejected` field and change no state when: authorization is missing (`explicit authorization required`), the Step is unidentified (`unidentified Step`), the Step is not active (`Step is not active`), or no veto is active (`no active veto`).
- A first `step-entry` into a Step SHALL clear any active veto.
- Renewing budgets SHALL stay exclusive to `authorized-step-retry`.

#### Scenario: Recording a veto spends nothing

- **WHEN** the coordinator sends `{kind: veto, step: "Step 1"}` while Step 1 is the active entered Step
- **THEN** the machine SHALL return `veto: recorded` with Step 1 as the active veto
- **AND** both budgets SHALL report zero additional spend

#### Scenario: An override without an active veto is rejected

- **WHEN** the coordinator sends an authorized `authorized-veto-override` for the active Step while no veto is active for it
- **THEN** the machine SHALL reject it with `no active veto`
- **AND** budgets, attempt history, and `veto_lifts` SHALL be unchanged

#### Scenario: An unauthorized override leaves the veto active

- **WHEN** an `authorized-veto-override` event for the vetoed active Step omits `authorized: true`
- **THEN** the machine SHALL reject it with `explicit authorization required`
- **AND** the veto SHALL remain active and the budgets unchanged

#### Scenario: One override lifts exactly one veto

- **WHEN** an accepted override has lifted Step 1's veto and a second override for Step 1 arrives before any new veto
- **THEN** the machine SHALL reject the second override with `no active veto`
- **AND** a later `veto` event for Step 1 SHALL make a veto active again that only a new accepted override lifts

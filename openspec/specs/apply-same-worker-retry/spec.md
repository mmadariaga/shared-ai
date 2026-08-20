# apply-same-worker-retry Specification

## Purpose

Defines the same-worker retry contract for `/sai-4-apply`: coordinator validation failure continues the same GREEN worker session with the failing path and evidence — capped at 3 continuations, never a fresh dispatch — and exhaustion escalates to the human.
## Requirements
### Requirement: validation-failure-continues-same-green-worker

The apply phase adapter SHALL declare `recovery_policy: true` (per `@sai/orchestration/command-runner.md` Bounded Recovery), opting the invocation into the shared bounded same-worker recovery ledger of exactly three mutually distinct diagnosis slots. Each new eligible in-scope diagnosis receives at most one attempt; a duplicate diagnosis stops recovery before dispatch and before exhaustion, even if a slot remains. When the coordinator's own verification or path comparison disproves a GREEN worker's result, the coordinator SHALL inspect the non-clean closure and assign the shared `coordinator rejection` diagnosis. It SHALL assign a `Cause Locus` only when concrete evidence proves the cause is inside or outside the GREEN worker's authorized scope, and SHALL continue the SAME GREEN worker session only when the correction is clear, safe, current-Step, and inside the GREEN worker's authorized non-test scope. If the boundary cannot be established, it SHALL hand back with an unresolved cause and zero attempts rather than guessing. The coordinator SHALL NOT dispatch a fresh worker for the correction; same-worker recovery continuation is the only worker correction channel, and recovery never dispatches a replacement worker.

The shared ledger's trigger is a worker-returned `failed` outcome with `unrecoverable: false` and a coordinator-proven clear safe in-scope cause, or a coordinator-disproved result that SHALL be admitted under the existing validation-failure accounting after the coordinator establishes that same in-scope condition. A coordinator-disproved result SHALL carry the structured routing diagnosis, cause locus, and recovery content — `Reported` / `Evidence` / `Cause` / `Correction` / `Verification` per `apply-coordinator-verification` — in the `continue_after_recovery` continuation and SHALL spend one slot only when its coordinator diagnosis identity is new. A worker-returned failed outcome and a coordinator-disproved result SHALL share the same ledger; the budget is not doubled per source. A duplicate diagnosis SHALL stop before continuation and before exhaustion. A `Cause Locus: out-of-scope` or unresolved result SHALL spend zero attempts and SHALL not be converted into a validation failure merely to obtain recovery. Any worker veto SHALL stop recovery regardless of the worker failure class.

The same shared route SHALL accept a recoverable non-clean RED result through the same RED worker session when coordinator evidence places the cause inside the RED worker's plan-authorized test or RED-stub scope. The coordinator SHALL continue that same RED worker under the shared acknowledgement once those eligibility conditions are established. RED continuation SHALL retain split-flow blindness and SHALL never authorize production edits. An unpassable RED or GREEN STOP carrying `failure_class: blocking-contradiction` SHALL follow the shared `Recovery eligibility and worker veto` requirement: it spends zero attempts when `unrecoverable: true` or when Cause Locus is out-of-scope or unresolved, but may spend one new diagnosis-key slot when `unrecoverable: false` and the coordinator proves a clear safe in-scope correction.

#### Scenario: coordinator disproves a GREEN result

- **WHEN** the coordinator's Verification Checklist re-run or path comparison contradicts the GREEN worker's report
- **THEN** the coordinator admits the contradiction to the shared recovery pool as `validation-failed` for accounting, continues the same GREEN worker session with the failing path and evidence, and does not dispatch a fresh worker

#### Scenario: Coordinator-disproved completion consumes one ledger slot

- **WHEN** coordinator verification disproves a completed GREEN report, establishes a clear safe in-scope correction, and derives a new diagnosis key
- **THEN** the coordinator SHALL assign `coordinator rejection`, record the key, and spend exactly one of the three diagnosis slots
- **AND** it SHALL continue the same GREEN worker once rather than leaving slot accounting optional

#### Scenario: GREEN boundary cannot be established

- **WHEN** the coordinator's evidence disproves a GREEN result but cannot establish whether the cause is inside or outside the worker's authorized scope
- **THEN** the coordinator uses `coordinator rejection` with an explicitly unresolved cause and no Cause Locus claim
- **AND** spends zero attempts, does not continue the worker, and surfaces the issue for human intervention

#### Scenario: RED result has an in-scope recoverable discrepancy

- **WHEN** a RED worker result is non-clean but the coordinator can identify a clear, safe current-Step correction inside the RED worker's authorized test or RED-stub scope
- **THEN** the coordinator continues the same RED worker session through `continue_after_recovery`
- **AND** the continuation cannot include the GREEN implementation body or authorize production edits

#### Scenario: Out-of-scope plan defect is not a worker retry

- **WHEN** a verification assertion in `implementation.md` is the concrete cause and lies outside the active worker's authorization
- **THEN** the coordinator spends zero worker-recovery attempts
- **AND** may use only the bounded coordinator-owned plan-artifact repair route from `apply-coordinator-verification`

#### Scenario: no fresh dispatch on validation failure

- **WHEN** a GREEN or eligible RED worker result fails coordinator validation
- **THEN** no new worker session is started; the correction rides the same session's recovery continuation

#### Scenario: shared recovery pool is declared

- **WHEN** the apply phase adapter is read after this change lands
- **THEN** it declares `recovery_policy: true`, and the shared pool of exactly three attempts is immutable for the active segment

#### Scenario: worker-failed and coordinator-disproven share one pool

- **WHEN** a worker returns `failed` and later a coordinator-disproven completed result enters recovery in the same Step cycle
- **THEN** both deductions come from the same three-slot diagnosis ledger, which is never doubled

#### Scenario: Duplicate diagnosis stops before exhaustion

- **WHEN** a later GREEN or RED non-clean closure has the same coordinator diagnosis identity as an earlier recovery closure
- **THEN** the coordinator SHALL stop before dispatching another continuation
- **AND** it SHALL preserve any unused diagnosis slot and report duplicate diagnosis rather than exhaustion

#### Scenario: Completed STOP is a recovery trigger but not an automatic retry

- **WHEN** a completed apply report carries `STOP reached? = yes`
- **THEN** the coordinator SHALL diagnose the non-clean closure before eligibility
- **AND** an out-of-scope, unresolved, vetoed, or blocking diagnosis SHALL spend zero attempts and SHALL not be forced into the GREEN recovery route

### Requirement: retry-cap-of-three

Same-worker recovery continuation on an eligible validation failure or other eligible shared diagnosis SHALL use at most three mutually distinct diagnosis slots in the active apply phase-adapter segment, per the shared bounded recovery ledger. All Steps and report-handling cycles in that active segment draw from the same ledger; starting a new Step, RED dispatch, GREEN dispatch, or report cycle SHALL not reset or multiply it. Each new diagnosis key receives one continuation at most, never a new dispatch. A duplicate diagnosis SHALL stop before another continuation and before ledger exhaustion. An out-of-scope or unresolved cause, a blocking contradiction with `unrecoverable: true`, a worker veto, or a continuation/transport loss SHALL spend zero additional attempts beyond any already spent before that stopping event; an in-scope blocking contradiction with `unrecoverable: false` follows `bounded-worker-recovery`'s `Recovery eligibility and worker veto` requirement and may spend one new slot. Exhaustion of all three distinct slots SHALL follow the shared exhaustion hand-back before the human escalation rule.

#### Scenario: first continuation does not converge

- **WHEN** the first continuation returns and coordinator validation still fails with an in-scope eligible cause
- **THEN** the coordinator continues the same worker a second time, still within the same session and the same pool

#### Scenario: third continuation does not converge

- **WHEN** three continuations of the same authorized worker session have not produced a coordinator-validated clean result
- **THEN** the coordinator does not issue a fourth continuation, reports the shared exhaustion hand-back, and escalates per the exhaustion rule

#### Scenario: A new Step does not reset the apply pool

- **WHEN** one apply Step has spent recovery attempts and a later Step in the same active apply segment reaches an eligible non-clean closure
- **THEN** the later Step uses only the remaining segment-scoped budget
- **AND** it does not receive a fresh three-slot diagnosis ledger

### Requirement: exhaustion-escalates-to-human

After the 3-attempt recovery pool is exhausted without convergence, the coordinator SHALL escalate the conflict to the human: for GREEN the decision is whether the fault is the implementation, the test, or the interface; for RED the decision is whether the test/stub contract, testing context, or source boundary is contradictory. The coordinator SHALL NOT mark the Step's checkboxes, propose a commit, or advance to the next Step while the conflict is open. The presentation SHALL comply with `@sai/policies/question-context.md` and preserve the GREEN-conflict and RED-stop halt semantics.

#### Scenario: cap exhaustion raises the three-way question

- **WHEN** the 3-attempt pool is exhausted without a coordinator-verified clean result
- **THEN** the coordinator surfaces the relevant RED or GREEN conflict to the human, marks no checkboxes, and proposes no commit until the human decides

#### Scenario: conflict stays open during escalation

- **WHEN** the conflict is open
- **THEN** the coordinator neither advances the Step nor dispatches a new worker for it


# apply-same-worker-retry Specification

## Purpose

Defines the same-worker retry contract for `/sai-4-apply`: coordinator validation failure continues the same GREEN worker session with the failing path and evidence — capped at 3 continuations, never a fresh dispatch — and exhaustion escalates to the human.

## Requirements

### Requirement: validation-failure-continues-same-green-worker

The apply phase adapter SHALL declare `recovery_policy: true` (per `@sai/command-runner.md` Bounded Recovery), opting the invocation into the shared bounded same-worker recovery pool of exactly three attempts. When the coordinator's own verification or path comparison disproves a GREEN worker's result, the coordinator SHALL continue the SAME GREEN worker session through the shared recovery acknowledgement (`continue_after_recovery`), supplying the failing path and the coordinator evidence. The coordinator SHALL NOT dispatch a fresh worker for the correction; same-worker recovery continuation is the only correction channel, and recovery never dispatches a replacement worker. This replaces the previous Known-False Report Recovery fresh Recovery Dispatch for GREEN worker results.

The shared pool's trigger is a worker-returned `failed` outcome validated against the class vocabulary (`validation-failed`, `generation-error`, `dispatch-failed`, `envelope-contract-violation`). A coordinator-disproven result SHALL be admitted to the same pool as follows: the coordinator classifies the contradiction as `validation-failed` for pool accounting (the class is coordinator-assigned for this admission, never worker-authored), carries the structured diagnosis — `Reported` / `Evidence` / `Cause` / `Correction` / `Verification` per `apply-coordinator-verification` — in the `continue_after_recovery` continuation, and deducts the attempt from the same three-attempt pool. A worker-returned `failed` outcome and a coordinator-disproven result SHALL share the same pool; the pool is not doubled.

#### Scenario: coordinator disproves a GREEN result

- **WHEN** the coordinator's Verification Checklist re-run or path comparison contradicts the GREEN worker's report
- **THEN** the coordinator admits the contradiction to the shared recovery pool as `validation-failed` for accounting, continues the same GREEN worker session with the failing path and evidence, and does not dispatch a fresh worker

#### Scenario: no fresh dispatch on validation failure

- **WHEN** a GREEN worker result fails coordinator validation
- **THEN** no new worker session is started; the correction rides the same session's recovery continuation

#### Scenario: shared recovery pool is declared

- **WHEN** the apply phase adapter is read after this change lands
- **THEN** it declares `recovery_policy: true`, and the shared pool of exactly three attempts is immutable for the invocation

#### Scenario: worker-failed and coordinator-disproven share one pool

- **WHEN** a GREEN worker returns `failed` and later a coordinator-disproven completed result enters recovery in the same Step cycle
- **THEN** both deductions come from the same three-attempt pool, which is never doubled

### Requirement: retry-cap-of-three

Same-worker recovery continuation on validation failure SHALL be capped at 3 attempts per Step/report handling cycle, per the shared bounded recovery pool. Each attempt is a continuation of the same session, never a new dispatch. The cap counts recovery attempts, not terminal results. Exhaustion of the pool SHALL follow the shared exhaustion hand-back before the human escalation rule.

#### Scenario: first continuation does not converge

- **WHEN** the first continuation returns and coordinator validation still fails
- **THEN** the coordinator continues the same GREEN worker a second time, still within the same session and the same pool

#### Scenario: third continuation does not converge

- **WHEN** three continuations of the same GREEN worker session have not produced a coordinator-validated result
- **THEN** the coordinator does not issue a fourth continuation, reports the shared exhaustion hand-back, and escalates per the exhaustion rule

### Requirement: exhaustion-escalates-to-human

After the 3-attempt recovery pool is exhausted without convergence, the coordinator SHALL escalate the conflict to the human: the decision is whether the fault is the implementation, the test, or the interface. The coordinator SHALL NOT mark the Step's checkboxes, propose a commit, or advance to the next Step while the conflict is open. The presentation SHALL comply with `@sai/policies/question-context.md` and preserve the GREEN-conflict halt semantics.

#### Scenario: cap exhaustion raises the three-way question

- **WHEN** the 3-attempt pool is exhausted without convergence
- **THEN** the coordinator surfaces the conflict to the human with the implementation/test/interface decision, and marks no checkboxes and proposes no commit until the human decides

#### Scenario: conflict stays open during escalation

- **WHEN** the conflict is open
- **THEN** the coordinator neither advances the Step nor dispatches a new worker for it

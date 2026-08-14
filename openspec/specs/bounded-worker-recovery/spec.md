# bounded-worker-recovery Specification

## Purpose
TBD - created by archiving change bounded-worker-recovery. Update Purpose after archive.
## Requirements
### Requirement: Optional recovery policy declaration
The shared phase-adapter contract SHALL accept an optional static `recovery_policy` declaration alongside the optional `progress_plan`. The declaration SHALL be fully known at dispatch, immutable for the invocation, and presence-only for opt-in: the shared contract SHALL own the fixed recovery budget and failure rules rather than allowing a phase to multiply or retune them. For this change, the declaration is a reusable seam, but only the design overview lifecycle has eligible failure classes; another adapter MAY declare it, yet its non-overview failures SHALL remain ineligible and receive no recovery attempts until a later change extends the eligibility contract. An adapter that omits `recovery_policy` SHALL retain the current continuation and replacement-worker behavior and SHALL emit no recovery-specific terminal lines.

#### Scenario: An opted-in adapter enables recovery
- **WHEN** a coordinator dispatches a phase adapter that declares `recovery_policy`
- **THEN** the shared runner SHALL make the three-attempt recovery pool available for eligible failed results in that invocation
- **AND** the coordinator SHALL not add a second phase-specific recovery loop

#### Scenario: An adapter without policy is unchanged
- **WHEN** a coordinator dispatches an adapter that does not declare `recovery_policy`
- **THEN** the shared runner SHALL perform zero recovery attempts
- **AND** it SHALL preserve the existing terminal hand-back and replacement-worker rules
- **AND** it SHALL emit no recovery announcement or recovery-specific terminal line

#### Scenario: Design overview lifecycle opts in
- **WHEN** the design coordinator enters its worker-owned overview-generation lifecycle
- **THEN** its phase adapter SHALL declare `recovery_policy`
- **AND** overview-generation failures SHALL be eligible for the shared same-worker recovery rules
- **AND** the audit, review, security, performance, and accessibility adapters SHALL remain unchanged when they omit the declaration

#### Scenario: A non-overview opt-in is inert
- **WHEN** a non-design adapter declares `recovery_policy` but returns an `unclassified-worker-fault`
- **THEN** the declaration SHALL be accepted as a forward-compatible seam
- **AND** the shared runner SHALL spend zero recovery attempts
- **AND** the adapter SHALL use the existing terminal and replacement-worker behavior

### Requirement: Bounded same-worker recovery
For an opted-in adapter, the coordinator SHALL use one invocation-scoped pool of at most three recovery attempts. An eligible failed worker result SHALL be continued only on the still-live worker, using the active binding's normal continuation operation and the fixed shared protocol acknowledgement `continue_after_recovery`. That acknowledgement is owned by the shared runner and is not an additional phase-adapter field. Recovery SHALL never dispatch a replacement worker; this prohibition is scoped to the recovery path, while ordinary non-recovery continuation failures SHALL retain the existing replacement-worker fallback. Recovery SHALL never reset the changed-file union, and SHALL return to the existing terminal hand-back when the recovery path stops without a completed result.

#### Scenario: A recoverable failure gets a same-worker continuation
- **WHEN** an opted-in worker returns `status: failed` with a recoverable failure class, `unrecoverable: false`, and remaining budget
- **THEN** the coordinator SHALL announce the recovery attempt
- **AND** SHALL continue the same worker using the fixed shared protocol acknowledgement `continue_after_recovery`
- **AND** SHALL not dispatch a replacement worker

#### Scenario: The shared pool caps recovery
- **WHEN** successive recovery failures remain eligible and the worker does not veto recovery
- **THEN** the coordinator SHALL spend no more than three recovery attempts in the invocation
- **AND** SHALL hand back after the third spent attempt if no completed result is returned

#### Scenario: A recovery continuation fails
- **WHEN** the same-worker continuation operation fails while a recovery attempt is running
- **THEN** the coordinator SHALL abort recovery immediately
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
- **THEN** the coordinator SHALL deduct the attempt from the same shared pool
- **AND** SHALL not create a new class-specific budget

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
For this change, the shared runner SHALL make only overview-generation `validation-failed`, `generation-error`, `dispatch-failed`, and `envelope-contract-violation` results eligible for the common pool. `blocking-contradiction`, `outer-envelope-violation`, and `unclassified-worker-fault` SHALL receive zero attempts and hand back immediately. A failed result carrying `unrecoverable: true` SHALL veto all remaining recovery attempts. The worker SHALL set that veto only when worker-side inspection establishes that continuation cannot safely repair the failure; the coordinator SHALL not override it or attempt blind verification. When `failure_class: blocking-contradiction` and `unrecoverable: true` occur together, the blocking contradiction SHALL take precedence as the reported stopping reason.

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

#### Scenario: Worker verifies its own repair
- **WHEN** a worker continues after a recovery announcement
- **THEN** the worker SHALL inspect and verify the relevant artifact or lifecycle state before returning `completed`
- **AND** the coordinator SHALL remain artifact-blind and SHALL not re-derive the repair or changed files

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
Before every recovery attempt, the coordinator SHALL emit a conversation-text announcement containing the failure class that triggered the attempt and its ordinal against the fixed pool, formatted as attempt `1`, `2`, or `3` of `3`. If recovery stops without completion, the terminal hand-back SHALL name the failure class, the number of attempts spent, and the reason recovery stopped, distinguishing an exhausted pool, a worker veto, blocking contradiction, continuation failure, and a normal `needs_input` or cancellation exit. These messages SHALL follow the ambient language policy and SHALL not be treated as protocol literals.

#### Scenario: Attempt spend is announced
- **WHEN** the coordinator is about to invoke a recovery continuation
- **THEN** it SHALL announce that attempt before invoking it
- **AND** the announcement SHALL name the triggering failure class and the attempt ordinal against the pool of `3`
- **AND** the announcement SHALL be conversation text rather than a progress event

#### Scenario: Exhausted recovery explains the hand-back
- **WHEN** the third recovery attempt fails without a completed result
- **THEN** the terminal hand-back SHALL name the failure class, `3` attempts spent, and budget exhaustion

#### Scenario: Vetoed recovery explains the hand-back
- **WHEN** a worker vetoes the remaining recovery pool
- **THEN** the terminal hand-back SHALL name the failure class, the attempts spent before the veto, and the worker veto as the stopping reason

#### Scenario: Recovery does not mutate the progress plan
- **WHEN** a recovery announcement or terminal hand-back is emitted
- **THEN** it SHALL not mark, extend, rename, or add any progress-plan step
- **AND** undeclared recovery identifiers SHALL not be invented

### Requirement: Invocation-scoped accounting and lifecycle boundaries
The coordinator SHALL add every `changed_files` path reported by the original result, progress event, normal continuation, recovery continuation, and terminal result to one ordered, duplicate-free union that is never reset by recovery. The recovery budget SHALL belong to the invocation: notices, progress events, and normal `needs_input` turns SHALL not reset it. A `cancelled` result SHALL be treated as a clean user-requested stop and SHALL never enter recovery. The `--fast-track` signal SHALL alter neither the recovery budget nor its visibility.

#### Scenario: Changed files survive recovery
- **WHEN** a worker reports paths before and during recovery
- **THEN** the coordinator SHALL preserve their first-seen order in the final union
- **AND** SHALL include later paths only once

#### Scenario: Intervening events do not reset budget
- **WHEN** notices, progress events, or normal input turns occur between failed results
- **THEN** the coordinator SHALL retain the number of recovery attempts already spent
- **AND** SHALL retain the same remaining budget

#### Scenario: Cancellation bypasses recovery
- **WHEN** a worker returns `status: cancelled`
- **THEN** the coordinator SHALL stop cleanly without announcing or spending a recovery attempt

#### Scenario: Fast-track does not change recovery
- **WHEN** an opted-in invocation includes `--fast-track`
- **THEN** the coordinator SHALL apply the same three-attempt pool and reporting rules as a normal invocation

### Requirement: Same-harness lifecycle parity
Claude Code and opencode routed adapters that declare `recovery_policy` SHALL expose identical recovery semantics, and neither harness SHALL dispatch a replacement worker for the recovery path. The exact budget, continuation acknowledgement, event and cancellation boundaries, changed-file union, and terminal reporting requirements are owned by the preceding requirements in this capability and SHALL not be redefined by the parity requirement. Harness-specific binding mechanics MAY differ.

#### Scenario: Both supported harnesses recover identically
- **WHEN** equivalent opted-in invocations encounter the same failed worker classification
- **THEN** both harnesses SHALL spend the same bounded recovery pool and reach the same protocol outcome
- **AND** each SHALL use only its own binding's same-worker continuation mechanism

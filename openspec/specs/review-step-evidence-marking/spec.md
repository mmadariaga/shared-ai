# Review Step Evidence Marking Specification

## Purpose

TBD — placeholder purpose. Define when the `review` progress step is marked and the evidence-marked carve-out it establishes for coordinator reconciliation.

## Requirements

### Requirement: review-step-marked-only-by-a-no-high-pass

The `review` progress step of the spec plan (`spec-progress-plan`) and of the design plan (`design-coordinator`) SHALL be marked exactly when a completed worker-owned review pass over that phase's reviewed artifact set reports `High=0`, and never otherwise. `Medium` and `Low` findings SHALL NOT block marking.

Marking SHALL be performed by the phase worker through an ordinary progress event carrying the id `review`, exactly as every other step is marked. The coordinator SHALL NOT become a second marking source, and the deterministic state derivation of `sai/policies/todo-structure.md` SHALL remain untouched.

The evidence SHALL come from the pass itself, never from artifact existence, artifact contents, repository state, plan progression, or the completion of any command. A pass whose reviewer failed, was cancelled, or violated the severity contract produces no evidence and SHALL leave the step unmarked.

#### Scenario: a no-High pass marks the step

- **WHEN** a completed worker-owned review pass reports `High=0`
- **THEN** the worker SHALL emit a progress event carrying `review` and the coordinator SHALL mark that step `completed`

#### Scenario: a pass with High findings does not mark

- **WHEN** a completed pass reports at least one `High` finding
- **THEN** no progress event carrying `review` SHALL be emitted and the step SHALL remain unmarked

#### Scenario: Medium and Low findings do not block marking

- **WHEN** a completed pass reports only `Medium` and/or `Low` findings
- **THEN** the step SHALL be marked, because `High=0`

#### Scenario: an empty completed pass marks

- **WHEN** a completed pass returns no findings at all
- **THEN** the step SHALL be marked, because `High=0`

#### Scenario: a failed, cancelled, or contract-violating attempt does not mark

- **WHEN** a reviewer fails, is cancelled, or returns a finding whose severity violates the closed vocabulary
- **THEN** the step SHALL remain unmarked and the outcome SHALL be reported distinctly from outstanding `High` findings

#### Scenario: marking is worker-owned

- **WHEN** the `review` step becomes `completed`
- **THEN** the transition SHALL have originated from a worker progress event, not from coordinator reasoning, artifact reads, or a terminal payload

#### Scenario: a user-requested pass carries the same evidence value

- **WHEN** a pass requested by the user from the feedback gate reports `High=0` while the step is unmarked
- **THEN** the step SHALL be marked, exactly as an automatic pass would have marked it

#### Scenario: a user-requested pass always marks before reconciliation

- **WHEN** a user-requested pass reports `High=0` during a feedback turn
- **THEN** its progress event SHALL be received, marked, and rendered while the gate is still open — that is, strictly before the phase's reconciliation trigger fires
- **AND** the coordinator SHALL handle that event as an ordinary progress-event update, marking the step, re-rendering the list, and stamping it exactly as it stamps any other progress-event update

### Requirement: progress-marks-are-monotonic

A progress mark, once made in an invocation, SHALL NOT be reverted, cleared, or re-opened for the remainder of that invocation. Progress events only add step ids to the marked set; no event, feedback turn, artifact edit, or later review pass SHALL remove one.

#### Scenario: a later feedback edit does not revert the review mark

- **WHEN** the user supplies feedback that changes an artifact after a pass already reported `High=0`
- **THEN** the `review` step SHALL remain marked

#### Scenario: a later pass with High findings does not revert the review mark

- **WHEN** a further pass over the edited artifacts reports at least one `High` finding after the step was already marked
- **THEN** the `review` step SHALL remain marked, because marks are monotonic within an invocation

#### Scenario: a consistency re-edit does not revert an earlier artifact step

- **WHEN** writing `specs/**` forces a consistency re-edit of `proposal.md` after the `proposal` step was marked
- **THEN** the `proposal` step SHALL remain marked and the path SHALL simply appear in the `specs` batch's `changed_files`

### Requirement: an-unmarked-review-step-signals-no-no-high-pass

The `review` step of the spec plan (`spec-progress-plan`) and of the design plan (`design-coordinator`) SHALL be designated **evidence-marked** for the purposes of `coordinator-progress-ownership`'s reconciliation carve-out. This designation SHALL be the sole source of that carve-out's scope, and it SHALL cover no step of any other declared plan.

On a **successful** reconciliation — one whose outcome at the phase's reconciliation trigger is successful — a run that ended without any completed review pass reporting `High=0` SHALL leave `review` unmarked while every other step of the plan renders `completed`. The cause MAY be outstanding `High` findings, reviewer failures that exhausted the total-attempt cap before convergence, no completed pass at all, or a combination of those conditions. The unmarked step does not distinguish those causes on its own; the worker's reported outcome SHALL identify total-attempt-cap exhaustion when applicable and report reviewer failures separately from outstanding `High` findings.

The observable signal SHALL be scoped to that successful case: after a successful reconciliation, `review` is the one step not rendered `completed`. On a `failed` or `cancelled` outcome the whole list freezes instead, so `review` may be one of several steps not rendered `completed` and carries no distinguishing signal. The step SHALL NOT be claimed to render a distinct failure, warning, or debt state, because the state vocabulary is unchanged and holds only `pending`, `in_progress`, and `completed`.

The carve-out SHALL apply only to the evidence-marked `review` step; every other unmarked step SHALL still be reconciled to `completed`.

#### Scenario: completed-pass-cap exhaustion leaves the step unmarked

- **WHEN** the completed-pass cap is reached with `High` findings still outstanding and reconciliation runs on a successful outcome
- **THEN** every other unmarked step SHALL render `completed` and `review` SHALL remain unmarked

#### Scenario: total-attempt-cap exhaustion leaves the step unmarked and preserves each cause

- **WHEN** the total-attempt cap is reached without convergence, whether no pass completed or fewer than three passes completed, and reconciliation runs on a successful outcome
- **THEN** `review` SHALL remain unmarked
- **AND** the worker's reported outcome SHALL name total-attempt-cap exhaustion and report reviewer failures separately from any outstanding `High` findings

#### Scenario: a failed generation close leaves more than one step unmarked

- **WHEN** `/sai-2-design`'s overview generation fails, so the outcome at the reconciliation trigger is `failed`
- **THEN** the list SHALL freeze exactly as last rendered, leaving both `overview` and a still-unmarked `review` not rendered `completed`
- **AND** no claim SHALL be made that `review` is the only step not rendered `completed`

#### Scenario: a failed or cancelled close never marks review

- **WHEN** the outcome at the reconciliation trigger is `failed` or `cancelled`
- **THEN** the list SHALL remain exactly as last rendered and `review` SHALL NOT be marked

#### Scenario: no other plan's step is evidence-marked

- **WHEN** the evidence-marked designation is resolved
- **THEN** it SHALL cover exactly the `review` step of the spec plan and of the design plan
- **AND** no step of `implement-progress-plan`, of the four audit plans, or of the apply step projection SHALL be covered

# Planning Artifact Review Loop Specification

## Purpose

TBD — placeholder purpose. Define the worker-owned automated artifact review loop for the spec and design planning phases.

## Requirements

### Requirement: worker-owned-review-pass

The spec-proposal worker and the design worker SHALL each own an automated artifact review of the artifacts their own phase just wrote. A **review pass** is one complete unit: exactly one reviewer run plus the worker's processing of every finding that run returns. Per-finding processing SHALL NOT increment the pass count.

The pass's **reviewed set** — the artifacts it judges and the only artifacts its findings may target — SHALL be, for the spec phase, `proposal.md` and every `specs/**/*.md` of the resolved change; and for the design phase, `design.md`, `tasks.md`, and `interfaces.md` of the resolved change. The reviewer additionally receives a read-only **reference set** as defined by `reviewer-isolation-and-read-only-input`.

The first pass SHALL run only after the phase's own pre-completion verification and decision-summary derivation have finished, and before the worker returns its terminal `completed` payload. The review pass is therefore strictly the last act of the phase's forward sequence, which is why `review` is the plan step that follows `validation` in the spec plan and `interfaces` in the design plan.

Concretely: the spec worker SHALL run its first pass only after `proposal.md` is non-empty, at least one non-empty `specs/**/*.md` exists, and artifact verification, the self-consistency and source-grounding checks, and decision-summary derivation are complete — that is, after the `validation` progress event. The design worker SHALL run its first pass only after `design.md`, `tasks.md`, and `interfaces.md` verify successfully and its decision summary has been derived — that is, after the `interfaces` progress event — and before the coordinator's feedback gate and before overview generation.

Every pass SHALL close with the base-form severity tally single-sourced in `sai/policies/artifact-review-contract.md`.

#### Scenario: spec worker runs a pass before completing

- **WHEN** the spec worker has written a non-empty `proposal.md` and at least one non-empty `specs/**/*.md`
- **THEN** it SHALL run a review pass over exactly that artifact set before returning `completed`

#### Scenario: validation precedes review in the spec phase

- **WHEN** the spec worker runs its first review pass
- **THEN** artifact verification, the self-consistency and source-grounding checks, and decision-summary derivation SHALL already be complete
- **AND** the `validation` progress event SHALL already have been emitted, so any `review` event necessarily follows it

#### Scenario: interfaces precedes review in the design phase

- **WHEN** the design worker runs its first review pass
- **THEN** `design.md`, `tasks.md`, and `interfaces.md` SHALL already have verified successfully and the design decision summary SHALL already have been derived
- **AND** the `interfaces` progress event SHALL already have been emitted, so any `review` event necessarily follows it

#### Scenario: design worker runs a pass before completing

- **WHEN** the design worker has written and verified `design.md`, `tasks.md`, and `interfaces.md`
- **THEN** it SHALL run a review pass over exactly those three artifacts before returning `completed`
- **AND** the pass SHALL run before the coordinator's feedback gate and before overview generation

#### Scenario: per-finding processing does not count as a pass

- **WHEN** a single reviewer run returns several findings and the worker processes them one at a time
- **THEN** the whole reviewer run plus all of that processing SHALL count as exactly one pass

### Requirement: reviewer-isolation-and-read-only-input

Each pass SHALL create one fresh reviewer, independent of the routed lifecycle, of the worker's own session, and of every prior reviewer.

A reviewer's input SHALL consist of exactly two parts, both freshly read from disk (or taken verbatim from the invocation envelope) in their current state at the start of that pass:

- the **reviewed set** — the artifacts the pass judges, as defined by `worker-owned-review-pass`; and
- the **reference set** — read-only intent and constraint context that the reviewer judges the reviewed set against but never reports findings on.

The reference set SHALL be, for the spec phase, the verbatim resolved request the worker received in its invocation envelope (for a supervised run, the complete `Ready to Propose` block), or **empty** when the envelope carried only a change name; and, for the design phase, the change's `proposal.md` and every `specs/**/*.md`, freshly read.

Admitting verbatim envelope text into the spec-phase reference set is an authorized decision. The resolved request is not "the conversation" for the purposes of this requirement: it is the invocation's own closed input — one of the two strings the worker itself received — fixed before the run began, carrying no turn history, no user or worker reasoning, and no later answers. The prohibition below continues to exclude the surrounding conversation, every subsequent turn, and the worker's own deliberation.

The reviewer SHALL NOT receive anything else: not the conversation, the worker's reasoning or journal, prior reviewer state, lifecycle bindings, continuation references, binding dispatch metadata, or unrelated repository content.

The reviewer SHALL be strictly read-only: it SHALL NOT create, modify, or delete any file, and it SHALL NOT be granted write capability. Every artifact edit arising from a finding SHALL be made by the phase worker.

The reviewer SHALL evaluate artifact-to-artifact consistency across the reviewed set, testability of requirements and scenarios, and unsupported assumptions. When the reference set is non-empty it SHALL additionally evaluate coverage of that set's intent and constraints by the reviewed set.

When the reference set is empty, the intent-coverage axis SHALL NOT apply and its absence SHALL NOT downgrade the pass: such a pass is a full completed pass on its remaining axes, it increments the completed-pass count, and it supplies the same marking evidence as any other completed pass. It SHALL mark `review` when it reports `High=0`, per `review-step-evidence-marking`.

Every finding's artifact location SHALL name a file of the reviewed set; a reviewer SHALL NOT report a finding against a reference-set file, because that file is not the artifact this phase is authoring.

#### Scenario: each pass gets a new reviewer

- **WHEN** a second or third pass runs
- **THEN** the worker SHALL create a fresh reviewer rather than continuing the previous one
- **AND** the new reviewer SHALL receive no state from any prior reviewer

#### Scenario: artifacts are re-read for every pass

- **WHEN** a pass begins after the worker accepted edits from an earlier pass
- **THEN** the reviewer SHALL receive both the reviewed set and the reference set as freshly read at the start of that pass, in their current state

#### Scenario: spec pass input set

- **WHEN** a spec-phase reviewer is created
- **THEN** its reviewed set SHALL be `proposal.md` plus every `specs/**/*.md` of the resolved change
- **AND** its reference set SHALL be the verbatim resolved request from the invocation envelope, or empty when the envelope carried only a change name

#### Scenario: design pass input set

- **WHEN** a design-phase reviewer is created
- **THEN** its reviewed set SHALL be `design.md`, `tasks.md`, and `interfaces.md` of the resolved change
- **AND** its reference set SHALL be that change's `proposal.md` and every `specs/**/*.md`, freshly read

#### Scenario: an invocation carrying only a change name

- **WHEN** `/sai-1-spec my-change` is invoked with no request text, so the spec-phase reference set is empty
- **THEN** the reviewer SHALL evaluate artifact-to-artifact consistency, testability, and unsupported assumptions, and SHALL NOT be required to evaluate intent coverage
- **AND** the resulting pass SHALL be a full completed pass that increments the completed-pass count
- **AND** it SHALL mark `review` when it reports `High=0`

#### Scenario: design coverage of an approved requirement is reviewable

- **WHEN** a design-phase reviewer finds that `design.md` and `tasks.md` leave a requirement of the change's `specs/**` uncovered
- **THEN** it SHALL be able to report that as a finding, because the reference set supplies the requirement
- **AND** the finding's artifact location SHALL name `design.md` or `tasks.md`, never the spec file

#### Scenario: reviewer receives no worker reasoning

- **WHEN** a reviewer is created
- **THEN** its input SHALL exclude the conversation, the worker's reasoning and journal, and any continuation or binding metadata

#### Scenario: reviewer writes nothing

- **WHEN** a reviewer identifies a correction
- **THEN** it SHALL return that correction as a finding and SHALL NOT edit any file

### Requirement: findings-follow-the-shared-contract

Every finding a reviewer returns SHALL conform to the shared artifact review finding contract single-sourced in `sai/policies/artifact-review-contract.md`: the five ordered fields, the closed `High` / `Medium` / `Low` severity vocabulary and its assignment criteria, the severity-prefixed review-scoped identifier scheme, and the base-form summary tally. This capability SHALL reuse that contract by reference and SHALL NOT restate the severity criteria, the finding shape, the identifier scheme, or the tally form.

Findings SHALL be processed by the phase worker under its existing per-item feedback rules in `sai/policies/artifact-feedback-gate.md`, in full and without exception: each item is evaluated independently for legitimacy, legitimate items are applied within the phase's artifact-only scope, every discarded item is reported with the specific reason it was not applied, and the step's decision summary is recomputed from the updated artifacts.

A pass that accepted at least one edit SHALL therefore re-run the phase's pre-completion artifact verification and recompute the decision summary before the run closes, so the summary the coordinator prints always traces to the artifacts as they stand. A pass that accepted no edit SHALL require neither. This re-verification SHALL NOT re-open, revert, or re-report the already-marked `validation` step (spec phase) or the already-marked artifact-writing steps (design phase), and SHALL NOT emit a progress event carrying those ids, because marks are monotonic per `review-step-evidence-marking`.

#### Scenario: an accepted finding forces re-verification and a fresh summary

- **WHEN** the worker accepts at least one finding and edits an artifact
- **THEN** it SHALL re-run the phase's pre-completion artifact verification and recompute the decision summary from the updated artifacts before the run closes

#### Scenario: re-verification does not re-open an earlier step

- **WHEN** re-verification runs after a review-driven edit and the `validation` step is already marked
- **THEN** `validation` SHALL remain marked
- **AND** no progress event carrying `validation` SHALL be emitted

#### Scenario: a pass that changed nothing needs no recomputation

- **WHEN** a completed pass discards every finding, or returns none
- **THEN** no re-verification and no summary recomputation SHALL be required

#### Scenario: a finding carries the contract's fields

- **WHEN** a reviewer returns a finding
- **THEN** it SHALL carry the identifier, severity, artifact location, issue statement, and recommended correction defined by the shared contract

#### Scenario: findings are applied only within artifact-only scope

- **WHEN** the worker accepts a finding
- **THEN** it SHALL edit only the artifacts of the reviewed set
- **AND** it SHALL NOT write project source, configuration, or any file outside that set

#### Scenario: a discarded finding is reported with a reason

- **WHEN** the worker judges a finding illegitimate
- **THEN** it SHALL report the finding and the specific reason it was not applied

### Requirement: automatic-loop-caps

The automatic review loop SHALL be governed by exactly two counters, which SHALL be named distinctly wherever they appear and SHALL NOT be referred to by a single shared word:

- the **completed-pass count** — capped at 3. It SHALL be incremented only by a completed pass, meaning one whose reviewer returned a valid finding set under the shared contract, including an empty one.
- the **total-attempt count** — capped at 6, twice the completed-pass cap. It SHALL be incremented by every reviewer dispatch, whether that dispatch completed or not.

A completed pass reporting `High=0` SHALL end the automatic loop as converged. A completed pass reporting at least one `High` finding SHALL cause another automatic dispatch while both caps still permit one. `Medium` and `Low` findings SHALL be processed and reported but SHALL NOT cause another dispatch.

An attempt whose reviewer fails, is cancelled, or violates the severity contract SHALL increment the total-attempt count only, SHALL NOT increment the completed-pass count, and SHALL NOT end the automatic loop: the worker SHALL dispatch a fresh reviewer and retry while the total-attempt cap permits.

The automatic loop SHALL therefore end in exactly one of three ways:

- **convergence** — a completed pass reports `High=0`;
- **completed-pass-cap exhaustion** — the completed-pass count reaches 3 with `High` findings outstanding. This is a non-failure outcome: the worker processes every finding of the final pass, dispatches no further automatic reviewer, and closes the run `completed` with the outstanding findings and dispositions reported;
- **total-attempt-cap exhaustion** — the total-attempt count reaches 6 without convergence and without the completed-pass cap being reached. This is also a non-failure outcome: `review` stays unmarked, and the report SHALL identify total-attempt-cap exhaustion, enumerate reviewer failure, cancellation, or contract-violation causes, and report any outstanding `High` findings separately rather than conflating them with reviewer failures.

#### Scenario: a High finding causes another automatic dispatch

- **WHEN** a completed pass reports at least one `High` finding, the completed-pass count is below 3, and the total-attempt count is below 6
- **THEN** the worker SHALL dispatch another automatic reviewer over the resulting artifacts

#### Scenario: a no-High pass ends the automatic loop

- **WHEN** a completed pass reports `High=0`
- **THEN** the worker SHALL dispatch no further automatic reviewer, and the loop SHALL end as converged

#### Scenario: Medium and Low findings never extend the loop

- **WHEN** a completed pass reports `Medium` or `Low` findings but no `High` finding
- **THEN** those findings SHALL be processed and reported
- **AND** the worker SHALL dispatch no further automatic reviewer

#### Scenario: a failed attempt is retried and does not advance the completed-pass count

- **WHEN** the first automatic dispatch's reviewer fails, is cancelled, or violates the severity contract
- **THEN** the total-attempt count SHALL be 1 and the completed-pass count SHALL be 0
- **AND** the worker SHALL dispatch a fresh reviewer rather than ending the automatic loop

#### Scenario: completed-pass-cap exhaustion is not a failure

- **WHEN** the third completed pass still reports at least one `High` finding
- **THEN** the worker SHALL dispatch no further automatic reviewer
- **AND** the run SHALL close `completed` with those findings and dispositions reported

#### Scenario: total-attempt-cap exhaustion is not a failure

- **WHEN** six reviewer dispatches have been made and the loop has neither converged nor reached three completed passes
- **THEN** the worker SHALL dispatch no further automatic reviewer
- **AND** `review` SHALL remain unmarked
- **AND** total-attempt-cap exhaustion and every reviewer failure, cancellation, or contract violation SHALL be reported distinctly from any outstanding `High` findings

#### Scenario: the two counters are never conflated

- **WHEN** the loop's limits are described in any surface
- **THEN** the completed-pass count and the total-attempt count SHALL each be named explicitly
- **AND** no single word SHALL be used to denote both

### Requirement: user-requested-additional-passes

Once the automatic loop has ended — by convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion — the user MAY request further review passes without limit through the coordinator-owned prose feedback gate defined by `sai/policies/artifact-feedback-gate.md`. User-requested passes SHALL be subject to neither the completed-pass cap nor the total-attempt cap, which govern only the automatic loop. A pass requested that way SHALL follow this capability's pass definition, isolation, and finding contract unchanged, and SHALL be indistinguishable from an automatic pass in its evidence value.

Requesting a pass SHALL NOT change the ownership, picker, labels, or iteration counter of the feedback gate: the coordinator continues to own the gate and forwards only the supplied feedback text to the same worker.

#### Scenario: the user asks for another pass after an automatic cap ends the loop

- **WHEN** the user supplies feedback at the gate asking for another review pass
- **THEN** the worker SHALL run a further pass under the same rules
- **AND** neither the completed-pass cap nor the total-attempt cap SHALL limit how many such passes the user may request

#### Scenario: the gate is unchanged

- **WHEN** a user-requested pass runs
- **THEN** the feedback gate's picker, option labels, iteration counter, and ownership SHALL remain exactly as `sai/policies/artifact-feedback-gate.md` defines them

### Requirement: a-failed-attempt-completes-no-pass-and-is-retried

A reviewer that fails, is cancelled, or returns a finding whose severity is missing or outside the closed `High` / `Medium` / `Low` set SHALL NOT produce a completed pass: no finding from that attempt SHALL be processed, no severity SHALL be coerced to a default, and the attempt SHALL produce no marking evidence, so it can neither mark nor clear the `review` step.

Such an attempt SHALL increment the total-attempt count only and SHALL leave the completed-pass count unchanged, per `automatic-loop-caps`. It SHALL NOT end the automatic loop: the worker SHALL dispatch a fresh reviewer and retry while the total-attempt cap permits. The worker SHALL NOT reuse the failed reviewer or carry any of its state into the retry.

The worker SHALL report such an outcome distinctly from a completed pass that carries `High` findings, naming the cause as a reviewer failure, a reviewer cancellation, or a reviewer output-contract violation; for a contract violation it SHALL preserve the offending finding's reviewer-supplied identifier and the verbatim offending severity value or `missing`. The worker SHALL NOT repair the artifacts on the reviewer's behalf and SHALL NOT fabricate findings.

A failed, cancelled, or contract-violating attempt SHALL NOT prevent the run from closing: the artifacts remain available and the coordinator's feedback gate is still presented.

#### Scenario: reviewer fails or is cancelled

- **WHEN** a reviewer returns a failure or cancellation
- **THEN** the worker SHALL report that the attempt did not complete a pass and SHALL process no finding from it
- **AND** the total-attempt count SHALL advance while the completed-pass count SHALL NOT
- **AND** the worker SHALL dispatch a fresh reviewer while the total-attempt cap permits
- **AND** the run SHALL still close through its ordinary terminal lifecycle status

#### Scenario: reviewer violates the severity contract

- **WHEN** a reviewer returns a finding whose severity is missing or outside `High`, `Medium`, or `Low`
- **THEN** the worker SHALL reject the whole attempt, process no finding from it, and coerce no default severity
- **AND** it SHALL report the cause as a reviewer output-contract violation, preserving the reviewer-supplied identifier and the verbatim offending value or `missing`

#### Scenario: a failed attempt is distinguishable from outstanding High findings

- **WHEN** the worker reports the review outcome
- **THEN** a reviewer failure, cancellation, or contract violation SHALL be reported distinctly from a completed pass carrying `High` findings

### Requirement: the-shared-contract-enumerates-this-surface

`sai/policies/artifact-review-contract.md` opens by enumerating the artifact review surfaces bound by the contract. Because the worker-owned planning review loop is a third such surface, that enumeration SHALL be extended to name it, so the policy does not describe its own reach inaccurately.

The edit SHALL be confined to the enumeration. The severity vocabulary and assignment criteria, the finding shape, the identifier scheme, and the summary tally form SHALL remain byte-for-byte unchanged, and the `review-finding-format` capability that owns them normatively SHALL NOT be modified.

#### Scenario: the enumeration names the worker-owned loop

- **WHEN** `sai/policies/artifact-review-contract.md` is read after this change
- **THEN** its surface enumeration SHALL name the worker-owned planning review loop alongside the manual `sai-explore` post-crystallization review loop and the supervised pipeline's independent reviewers

#### Scenario: the contract's normative body is untouched

- **WHEN** the amended policy is compared with its prior text
- **THEN** the only difference SHALL be the surface enumeration
- **AND** the severity criteria, finding shape, identifier scheme, and tally form SHALL be unchanged

### Requirement: coexistence-with-existing-review-surfaces

The worker-owned review loop SHALL coexist with, and SHALL NOT replace, the coordinator-owned prose feedback gate or the supervised pipeline's own independent review convergence loop.

In the supervised `start-pipeline` flow, explore's independent review convergence loop (`pipeline-independent-review`, `pipeline-convergence-loop`, `pipeline-iteration-bound`) SHALL remain unchanged, and the worker-owned pass SHALL run in addition to it. Because the supervised flow declares no progress plan, no list renders there and step marking has no application, while the worker still emits its progress event per the coordinator contract's plan-independent obligations.

This duplication is an explicitly accepted trade-off. In the worst case for one supervised spec run, the worker-owned layer dispatches 6 total attempts to obtain at most 3 completed passes, and the unchanged supervised layer then dispatches its 3 passes, for up to 9 reviewer dispatches over the same artifacts.

The worker-owned loop SHALL NOT use, alter, or depend on the `MachineFeedbackAdapter` of `sai/policies/artifact-feedback-gate.md`, which remains owned by the supervised pipeline.

#### Scenario: the prose feedback gate still runs

- **WHEN** the worker-owned automatic loop ends by convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion
- **THEN** the coordinator SHALL still present the prose feedback gate at iteration 0, unchanged

#### Scenario: the supervised pipeline keeps its own loop

- **WHEN** the spec worker runs under `start-pipeline` supervision
- **THEN** explore's independent review convergence loop SHALL be unchanged
- **AND** the worker-owned pass SHALL run in addition to it

#### Scenario: marking has no application under supervision

- **WHEN** the worker emits a progress event carrying `review` in the supervised flow
- **THEN** the event's `changed_files` SHALL still join the supervision report and the worker SHALL still be continued with `continue_after_progress`
- **AND** no list SHALL render and no step SHALL be marked, because no adapter-declared plan is in force

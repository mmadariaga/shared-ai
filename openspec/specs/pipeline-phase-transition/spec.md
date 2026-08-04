# pipeline-phase-transition Specification

## Purpose

TBD - created by archiving change extend-pipeline-supervision-to-sai-2. Update Purpose after archive.

## Requirements

### Requirement: The spec-phase outcome is reported before the design phase begins

Before the chained design phase is dispatched, the pipeline SHALL emit a phase-transition report of the completed spec-phase outcome. The report SHALL state that the spec phase converged, the number of spec review passes used, and that the last completed spec review found no `High` findings, carrying the non-blocking-edit qualification when applicable per the spec-phase convergence reporting. Spec convergence remains a spec-phase ending that triggers the spec-phase autonomy audit log the `pipeline-autonomy-audit-log` capability produces, and the transition report SHALL surface that log at this transition even though the supervised run continues into the design phase. This report is the user's visibility checkpoint between the two phases of the long-lived single-token run and SHALL be presented before any design worker is dispatched.

#### Scenario: transition report precedes design dispatch
- **WHEN** the supervised spec phase converges and the pipeline is about to enter the design phase
- **THEN** explore emits the phase-transition report of the completed spec-phase outcome before dispatching the design worker
- **AND** the report states the number of spec review passes used and that the last completed spec review found no `High` findings
- **AND** when the converging pass accepted `Medium` or `Low` edits, the report states that the resulting artifact state was not re-reviewed rather than claiming the edited state is free of `High` findings

#### Scenario: transition report carries the spec-phase audit log
- **WHEN** explore emits the phase-transition report after auto-answering one or more spec-phase questions
- **THEN** the report presents the spec-phase autonomy audit log with each auto-answer, its answer, and its grounding citation
- **AND** it states the auto-answered and escalated counts for the spec phase

### Requirement: Design chaining occurs only on spec-phase convergence

The pipeline SHALL dispatch the design worker only when the spec phase converged. When the spec phase ends by cap exhaustion with outstanding `High` findings, reviewer failure, reviewer cancellation, a severity-contract violation, or a `failed` or `cancelled` spec worker, the pipeline SHALL report that spec-phase outcome — including the spec-phase autonomy audit log — and SHALL NOT enter the design phase, so design never consumes specs that still carry high-severity findings. On such a non-convergent ending the change's tracked-set state follows the completion rule of the `explore-pipeline-supervision` capability: a `failed` or `cancelled` spec worker leaves the change uncompleted and retryable by a later `start-pipeline`, while cap exhaustion, reviewer failure, reviewer cancellation, or a severity-contract violation leave the spec worker `completed`, so the change reaches supervised completion and its follow-up is an independently invoked `/sai-2-design` on the existing specs or a user-initiated revision rather than an automatic re-run.

#### Scenario: spec cap exhaustion does not transition to design
- **WHEN** the spec phase terminates as cap exhaustion with at least one outstanding `High` finding
- **THEN** explore reports the cap-exhausted spec outcome and its audit log
- **AND** it does not dispatch the design worker
- **AND** the spec worker having returned `completed`, the change reaches supervised completion and is not re-offered by a later `start-pipeline`

#### Scenario: spec reviewer failure does not transition to design
- **WHEN** the spec phase ends because a reviewer returned `review_failed`, `review_cancelled`, or a severity-contract violation
- **THEN** explore reports that independent review did not complete and does not enter the design phase

#### Scenario: failed or cancelled spec worker does not transition to design
- **WHEN** the supervised spec worker returns `failed` or `cancelled`
- **THEN** explore reports that outcome and its audit log and dispatches no design worker
- **AND** the change remains uncompleted and retryable by a later `start-pipeline`, which resumes at the spec phase since it never converged

### Requirement: A single start-pipeline run spans both phases

A single `start-pipeline` invocation SHALL cover the spec phase and, on spec convergence, the chained design phase, without a second token. The phase-transition report SHALL mark the boundary between the two phases within that one run, and the design phase SHALL execute under the same active-supervision interval as the spec phase.

#### Scenario: one token drives both phases
- **WHEN** the user sends `start-pipeline` and the selected change's spec phase converges
- **THEN** the same invocation proceeds through the phase transition into the design phase
- **AND** the user is not required to send `start-pipeline` again to begin design

# pipeline-phase-transition Specification

## Purpose

TBD - created by archiving change extend-pipeline-supervision-to-sai-2. Update Purpose after archive.

## Requirements

### Requirement: The spec-phase outcome is reported before the design phase begins

Before the chained design phase is dispatched, the pipeline SHALL emit a phase-transition report of the completed spec-phase outcome. On convergence, the report SHALL state that the spec phase converged, the number of spec review rounds used, and that the last completed round found no `High` findings, carrying the non-blocking-edit qualification when applicable per the spec-phase convergence reporting. On cap exhaustion, the phase-transition report is the one-line cap-exhaustion report carrying the last round's finding counts, per the `supervised-review-reporting` capability. Both transition endings trigger the spec-phase autonomy audit log the `pipeline-autonomy-audit-log` capability produces, and the transition report SHALL surface that log at this transition even though the supervised run continues into the design phase. This report is the user's visibility checkpoint between the two phases of the long-lived single-token run and SHALL be presented before any design worker is dispatched.

#### Scenario: transition report precedes design dispatch
- **WHEN** the supervised spec phase converges and the pipeline is about to enter the design phase
- **THEN** explore emits the phase-transition report of the completed spec-phase outcome before dispatching the design worker
- **AND** the report states the number of spec review rounds used and that the last completed round found no `High` findings
- **AND** when the converging round accepted `Medium` or `Low` edits, the report states that the resulting artifact state was not re-reviewed rather than claiming the edited state is free of `High` findings

#### Scenario: cap-exhausted transition report precedes design dispatch
- **WHEN** the supervised spec phase ends by cap exhaustion and the pipeline is about to enter the design phase
- **THEN** explore emits the one-line cap-exhaustion report carrying the last round's finding counts before dispatching the design worker
- **AND** it does not classify the ending as failure and does not assert that `High` findings remain in the current state

#### Scenario: transition report carries the spec-phase audit log
- **WHEN** explore emits the phase-transition report after auto-answering one or more spec-phase questions
- **THEN** the report presents the spec-phase autonomy audit log with each auto-answer, its answer, and its grounding citation
- **AND** it states the auto-answered and escalated counts for the spec phase

### Requirement: Design chaining occurs on spec-phase convergence or cap exhaustion

The pipeline SHALL dispatch the design worker when the spec phase converged or ended by cap exhaustion. When the spec phase ends with a `failed` or `cancelled` spec worker, the pipeline SHALL report that spec-phase outcome — including the spec-phase autonomy audit log — and SHALL NOT enter the design phase. Reviewer failure, reviewer cancellation, and severity-contract violation are not possible spec-phase endings in the in-session model and have no design-chaining consequence. On a `failed` or `cancelled` spec worker the change's tracked-set state follows the completion rule of the `explore-pipeline-supervision` capability: the change remains uncompleted and retryable by a later `Auto` selection, which resumes at the spec phase since it never converged.

#### Scenario: spec cap exhaustion transitions to design
- **WHEN** the spec phase terminates as cap exhaustion after the last round's findings were applied
- **THEN** explore reports the cap-exhausted spec outcome with its one-line count report and audit log
- **AND** it dispatches the design worker, because the run continues after cap exhaustion

#### Scenario: failed or cancelled spec worker does not transition to design
- **WHEN** the supervised spec worker returns `failed` or `cancelled`
- **THEN** explore reports that outcome and its audit log and dispatches no design worker
- **AND** the change remains uncompleted and retryable by a later `Auto` selection, which resumes at the spec phase since it never converged

### Requirement: A single Auto run spans both phases

A single selector-dispatched `Auto` invocation SHALL cover the spec phase and, on spec-phase convergence or cap exhaustion, the chained design phase, without another selector action. The phase-transition report SHALL mark the boundary between the two phases within that one run, and the design phase SHALL execute under the same active-supervision interval as the spec phase.

#### Scenario: one token drives both phases
- **WHEN** the user selects `Auto` and the selected change's spec phase converges or ends by cap exhaustion
- **THEN** the same invocation proceeds through the phase transition into the design phase
- **AND** the user is not required to select `Auto` again to begin design

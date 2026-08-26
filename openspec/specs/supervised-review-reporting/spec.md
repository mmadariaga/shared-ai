# supervised-review-reporting Specification

## Purpose

TBD - seeded from delta spec `supervised-review-reporting` in change `supervised-in-situ-review`.

## Requirements

### Requirement: Report Plan attempt terminology

Supervised review reports SHALL identify their counters, cap exhaustion, retry guidance, and autonomy records as belonging to Plan (unattended) attempts while preserving the existing report contents and ordering.

#### Scenario: Plan reaches a report boundary

- **WHEN** a Plan review phase converges, exhausts its cap, or stops
- **THEN** the existing report and retry guidance are emitted under the Plan terminology.

### Requirement: cap-exhaustion-one-line-report

When a phase's three-round cap is exhausted, the pipeline SHALL report cap exhaustion as one line carrying the last round's finding counts (the shared contract's base-form tally `Summary: High=<count> Medium=<count> Low=<count>` of the last completed round), and the run SHALL continue. The one-line report SHALL NOT assert that `High` findings remain in the current artifact state, SHALL NOT classify the outcome as failure, and SHALL NOT present remediation or retry prompts for it; the run simply continues to the next phase. Exhaustion is the third completed round of the phase's Auto attempt still containing at least one `High` finding after findings were applied, per `supervised-review-rounds`; this requirement owns only the report shape and continuation, not the counting rule.

#### Scenario: cap exhaustion is reported as one line

- **WHEN** a phase's three-round cap is exhausted after the last round's findings were applied
- **THEN** the pipeline reports one line carrying the last round's finding counts
- **AND** the run continues without a failure classification or remediation prompt

#### Scenario: spec cap exhaustion report precedes the design phase

- **WHEN** the spec phase ends by three-round cap exhaustion
- **THEN** the one-line report is emitted before the chained design phase proceeds
- **AND** the run continues to design as if the review loop had not stopped

#### Scenario: design cap exhaustion report precedes completion

- **WHEN** the design phase ends by three-round cap exhaustion
- **THEN** the one-line report is emitted before supervised completion
- **AND** the run ends through the ordinary terminal lifecycle

### Requirement: no-per-round-report-blocks

The supervised pipeline SHALL NOT emit per-round report blocks, a findings history, an unvalidated-changes flag, or a loose list of outstanding `High` findings for auto-mode review rounds. The pipeline SHALL NOT render deterministic pass blocks per round, SHALL NOT preserve an ordered findings history across rounds, SHALL NOT mark accepted edits as unvalidated, and SHALL NOT list standalone `High` findings after the loop. The only review-outcome reporting is the convergence report and the cap-exhaustion one-line report.

#### Scenario: no per-round report blocks are emitted

- **WHEN** the supervised pipeline completes a review round
- **THEN** it does not emit a per-round report block for that round
- **AND** it does not accumulate round-local report blocks into a findings history

#### Scenario: no unvalidated-changes flag is tracked

- **WHEN** accepted edits change artifacts during a review round
- **THEN** the pipeline does not track or report an unvalidated-changes flag for those edits
- **AND** the convergence report carries the counts and the not-re-reviewed qualification when applicable, while the cap-exhaustion report remains the one-line count report the owning requirement defines

#### Scenario: no loose High list is reported

- **WHEN** a phase's review loop ends
- **THEN** the pipeline does not report a standalone list of outstanding `High` findings
- **AND** cap exhaustion reporting is limited to the one-line count report

### Requirement: autonomy-audit-and-escalation-remain

The autonomy audit log and worker-question escalation SHALL remain in force across the in-session review rounds: auto-answered questions are recorded and reported at every phase ending, and below-threshold or ungrounded worker questions are escalated to the user unchanged. The in-session review SHALL NOT remove, replace, or silence the autonomy audit log or the escalation path.

#### Scenario: autonomy audit log is presented at phase endings

- **WHEN** a supervised phase ends by convergence or cap exhaustion after one or more questions were auto-answered
- **THEN** the pipeline presents the phase's autonomy audit log in the conversation
- **AND** it reports the auto-answered and escalated counts

#### Scenario: worker questions are still escalated

- **WHEN** the phase worker returns `needs_input` and the question is below threshold or ungrounded
- **THEN** the pipeline escalates the exact question and options to the user unchanged
- **AND** it continues the same worker only with the user's answer

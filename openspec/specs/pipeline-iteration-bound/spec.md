# pipeline-iteration-bound Specification

## Purpose

Define the bounded number of independent review passes for supervised spec artifacts.

## Requirements

### Requirement: Convergence is capped at three review passes

The pipeline SHALL dispatch at most three review passes for one supervised spec execution. The initial review is pass one; a pass consists of one review and the feedback processing of that review's findings, while the cap SHALL count review passes rather than the number of findings or per-item feedback continuations.

#### Scenario: multiple findings occur in one pass
- **WHEN** one review pass returns multiple findings that require separate feedback continuations
- **THEN** all of those continuations belong to the same review pass
- **AND** they consume only one of the three allowed passes

#### Scenario: third pass still has High findings
- **WHEN** the third review pass returns at least one `High` finding
- **THEN** its findings receive normal feedback processing
- **AND** the pipeline dispatches no fourth review pass

### Requirement: Cap exhaustion is a non-failure terminal outcome

If the third review pass contains any `High` finding, the pipeline SHALL terminate the convergence loop without declaring convergence and without classifying cap exhaustion as worker or reviewer failure. It SHALL hand control back with every `High` finding from the final pass intact, including each finding's artifact location, issue statement, recommended correction, and feedback disposition.

#### Scenario: cap is exhausted
- **WHEN** feedback processing for a third pass that contained `High` findings completes
- **THEN** supervision reports that the review-pass cap was exhausted
- **AND** it reports every `High` finding from that pass with its feedback disposition
- **AND** it does not claim that no `High` findings remain
- **AND** the generated artifacts remain available for user-directed follow-up

### Requirement: Early convergence does not consume unused passes

The pipeline SHALL stop immediately after feedback processing for the first completed pass with no `High` findings and SHALL NOT dispatch unused review passes merely to reach the cap. Accepted `Medium` or `Low` edits from that pass SHALL remain non-blocking and SHALL be reported as not re-reviewed.

#### Scenario: initial review has no High findings
- **WHEN** the first review pass contains no `High` finding
- **THEN** the pipeline completes feedback processing for that pass
- **AND** it terminates as converged after one pass
- **AND** it identifies any accepted non-blocking edits as not re-reviewed

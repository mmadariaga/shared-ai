# pipeline-review-severity Specification

## Purpose

Define the closed severity contract for pipeline-driven artifact review.

## Requirements

### Requirement: Every pipeline artifact review finding has a closed severity

Each finding returned by a pipeline-driven artifact review SHALL contain exactly one severity value from the closed set `High`, `Medium`, or `Low`. The reviewer SHALL NOT omit severity or emit another value.

#### Scenario: reviewer returns findings
- **WHEN** a pipeline-driven artifact reviewer returns one or more findings
- **THEN** every finding contains exactly one of `High`, `Medium`, or `Low`
- **AND** the result contains no finding with a missing or out-of-set severity

### Requirement: A severity contract violation is handled as review failure

A `review_complete` result containing any finding that violates the closed severity contract — severity missing, or a value outside `High`, `Medium`, `Low` — SHALL be handled as `review_failed` and SHALL follow the existing review-failure path of the `pipeline-independent-review` capability without introducing a new result variant or terminal outcome. The pipeline SHALL NOT evaluate the severity stop condition against such a pass, SHALL NOT drop the offending finding and process the remaining findings, and SHALL NOT coerce the offending finding to a default severity. The violation SHALL be reported as a reviewer output-contract defect rather than as a reviewer crash or cancellation.

#### Scenario: finding omits severity
- **WHEN** a reviewer returns `review_complete` and at least one finding carries no severity value
- **THEN** the pass is handled as `review_failed`
- **AND** the severity stop condition is not evaluated for that pass
- **AND** no finding from that pass is assigned a default severity

#### Scenario: finding carries an out-of-set severity
- **WHEN** a reviewer returns `review_complete` and at least one finding carries a severity outside `High`, `Medium`, or `Low`, such as `Critical`
- **THEN** the pass is handled as `review_failed`
- **AND** the pipeline does not treat the value as equivalent to any in-set severity

#### Scenario: malformed finding accompanies well-formed findings
- **WHEN** a `review_complete` result contains one contract-violating finding alongside findings with valid severities
- **THEN** the whole pass is handled as `review_failed`
- **AND** the pipeline does not process the well-formed findings as a partial pass
- **AND** it does not silently suppress the contract-violating finding

#### Scenario: violation is distinguished in reporting
- **WHEN** a pass is handled as `review_failed` because of a severity contract violation
- **THEN** supervision reports the cause as a reviewer output-contract violation
- **AND** it does not report the cause as a reviewer crash or cancellation

### Requirement: Only High findings block convergence

A pipeline-driven artifact review pass SHALL satisfy the severity stop condition only when it returns no `High` findings. `Medium` and `Low` findings SHALL remain visible and SHALL pass through normal feedback processing, but SHALL NOT prevent convergence.

#### Scenario: pass contains only non-blocking findings
- **WHEN** a completed review pass contains one or more `Medium` or `Low` findings and no `High` finding
- **THEN** the pass satisfies the severity stop condition
- **AND** every returned finding remains available for feedback processing and reporting

#### Scenario: pass contains a High finding
- **WHEN** a completed review pass contains at least one `High` finding
- **THEN** the pass does not satisfy the severity stop condition

### Requirement: Severity levels have shared pipeline artifact criteria

The pipeline artifact reviewer SHALL assign `High` when leaving the finding uncorrected would allow a materially incorrect, incomplete, or out-of-scope implementation, violate an explicit constraint, preserve a normative contradiction, or leave required behavior too untestable to implement reliably. It SHALL assign `Medium` to a material clarity, coverage, consistency, or testability weakness that should be corrected but does not, on the reviewed evidence, prevent a bounded correct implementation or violate explicit scope. It SHALL assign `Low` to a precision, readability, or maintainability improvement with no material effect on implementation correctness or scope.

#### Scenario: finding can materially misdirect implementation
- **WHEN** an artifact defect could authorize materially incorrect, incomplete, or out-of-scope implementation if left unchanged
- **THEN** the reviewer assigns `High`

#### Scenario: finding is material but non-blocking
- **WHEN** an artifact has a meaningful clarity, coverage, consistency, or testability weakness but still supports bounded correct implementation
- **THEN** the reviewer assigns `Medium`

#### Scenario: finding has no material implementation effect
- **WHEN** a finding improves precision, readability, or maintainability without materially affecting implementation correctness or scope
- **THEN** the reviewer assigns `Low`

### Requirement: Pipeline review severity is locally scoped

The `High`, `Medium`, and `Low` vocabulary SHALL apply only to pipeline-driven artifact review. It SHALL NOT alter the manual review-loop output format or replace the severity vocabularies of `sai-5-review`, `sai-6-security`, or `sai-7-performance`.

#### Scenario: review runs outside pipeline artifact supervision
- **WHEN** a manual review loop or `sai-5-review`, `sai-6-security`, or `sai-7-performance` runs
- **THEN** that command retains its existing finding format and severity vocabulary

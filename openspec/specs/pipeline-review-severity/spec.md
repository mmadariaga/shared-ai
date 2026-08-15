# pipeline-review-severity Specification

## Purpose

Define the closed severity contract for pipeline-driven artifact review.

## Requirements

### Requirement: Every pipeline artifact review finding has a closed severity

Each finding formed by a supervised review round SHALL contain exactly one severity value from the closed set `High`, `Medium`, or `Low`. Findings SHALL NOT omit severity or carry another value.

#### Scenario: a review round returns findings
- **WHEN** a supervised review round forms one or more findings
- **THEN** every finding contains exactly one of `High`, `Medium`, or `Low`
- **AND** the round produces no finding with a missing or out-of-set severity

### Requirement: Only High findings block convergence

A supervised review round SHALL satisfy the severity stop condition only when it returns no `High` findings. `Medium` and `Low` findings SHALL remain visible and SHALL pass through normal feedback processing, but SHALL NOT prevent convergence.

#### Scenario: round contains only non-blocking findings
- **WHEN** a completed review round contains one or more `Medium` or `Low` findings and no `High` finding
- **THEN** the round satisfies the severity stop condition
- **AND** every returned finding remains available for feedback processing and reporting

#### Scenario: round contains a High finding
- **WHEN** a completed review round contains at least one `High` finding
- **THEN** the round does not satisfy the severity stop condition

### Requirement: Severity levels have shared pipeline artifact criteria

Supervised review rounds SHALL assign `High`, `Medium`, or `Low` per the assignment criteria of the shared review finding contract defined by the `review-finding-format` capability and single-sourced in `sai/policies/artifact-review-contract.md`. The pipeline SHALL use the same criteria every artifact review uses; it SHALL NOT define a pipeline-specific variant of the criteria inline.

#### Scenario: finding can materially misdirect implementation
- **WHEN** an artifact defect, left uncorrected, would allow a materially incorrect, incomplete, or out-of-scope implementation
- **THEN** the round assigns `High` per the shared contract criteria

#### Scenario: finding is material but non-blocking
- **WHEN** an artifact has a meaningful clarity, coverage, consistency, or testability weakness but still supports bounded correct implementation
- **THEN** the round assigns `Medium` per the shared contract criteria

#### Scenario: finding has no material implementation effect
- **WHEN** a finding improves precision, readability, or maintainability without materially affecting implementation correctness or scope
- **THEN** the round assigns `Low` per the shared contract criteria

### Requirement: Artifact review severity vocabulary scope

The `High`, `Medium`, and `Low` vocabulary SHALL apply to artifact review — supervised review rounds and the `sai-explore` manual review loop — per the shared `review-finding-format` contract. It SHALL NOT replace the severity vocabularies of `sai-5-review`, `sai-6-security`, `sai-7-performance`, or `sai-8-accessibility`.

#### Scenario: supervised review rounds use the shared vocabulary
- **WHEN** a supervised review round runs
- **THEN** it assigns severities from the shared vocabulary per the shared contract

#### Scenario: manual review loop uses the shared vocabulary
- **WHEN** the manual post-crystallization review loop (`review-loop-navigation`) reviews artifacts
- **THEN** it uses the same shared `High`, `Medium`, and `Low` vocabulary per the shared contract

#### Scenario: audit commands retain their own vocabularies
- **WHEN** `sai-5-review`, `sai-6-security`, `sai-7-performance`, or `sai-8-accessibility` runs
- **THEN** that command retains its existing finding format and severity vocabulary

# resilience-check Specification

## Purpose
Define the resilience review check itself: what it flags (unbounded retries, missing timeouts, idempotency, fallback), how its severities are gated, its no-surface recording, and the Resilience Surface Triage section of the review report.

## Requirements

### Requirement: Resilience pass SHALL be the single owner for retries, timeouts, circuit-breaker, idempotency and fallback
Resilience owns these points; Correctness and Performance-triage MUST NOT duplicate them.

#### Scenario: Single ownership applied
- **WHEN** a diff contains retry, timeout, circuit-breaker, idempotency or fallback behavior
- **THEN** the finding is reported under Resilience and omitted from Correctness and Performance-triage

### Requirement: Resilience pass SHALL apply only to resilience surface
The pass SHALL apply only to external I/O, retryable handlers, consumers and queues, and timeout boundaries; UI files without I/O are exempt.

#### Scenario: Surface scoping
- **WHEN** the diff touches only UI files without I/O
- **THEN** Resilience records no surface with no findings

### Requirement: Resilience check SHALL flag unbounded retries
Unbounded or infinite retry on paths with cascade, loss or duplication risk MUST be flagged.

#### Scenario: Unbounded retry flagged
- **WHEN** a retryable handler retries without bound on a critical path
- **THEN** Resilience reports the unbounded retry with impact

### Requirement: Resilience check SHALL flag missing timeouts on critical I/O
Critical external calls without timeouts MUST be flagged; non-critical missing timeouts are High or Medium.

#### Scenario: Missing critical timeout flagged
- **WHEN** a critical external I/O call has no timeout
- **THEN** Resilience reports the missing timeout with cascade risk

### Requirement: Resilience check SHALL require idempotency only when retry, redelivery or double submit is possible
The check SHALL require idempotency only when retry, redelivery or double submit is possible. Without retry, redelivery or double submit, absent idempotency is not a finding.

#### Scenario: Conditional idempotency enforced
- **WHEN** a consumer has real retry or redelivery without idempotency
- **THEN** Resilience reports missing idempotency with loss or duplication risk

### Requirement: Resilience check SHALL flag absent fallback where impact warrants it
The check SHALL flag absent fallback where impact warrants it. Absent fallback without impact is High or Medium, never Critical alone.

#### Scenario: Fallback gap flagged by impact
- **WHEN** a critical dependency has no fallback and failure has real impact
- **THEN** Resilience reports the absent fallback with impact

### Requirement: Resilience severities SHALL be gated by cascade, loss or duplication risk with impact
Severities SHALL be gated by cascade, loss or duplication risk with impact. Critical applies only for cascade, loss or duplication risk with real impact; otherwise High or Medium.

#### Scenario: Severity gated
- **WHEN** a resilience gap has no cascade, loss or duplication risk with impact
- **THEN** Resilience reports at most High or Medium

### Requirement: Resilience check SHALL never require a pattern absent from the repo
The check SHALL never require a pattern absent from the repo. When the repo has no retry, timeout, circuit-breaker, idempotency or fallback convention, at most Question or Low applies, never Critical.

#### Scenario: No-convention restraint
- **WHEN** the repo has no established retry or timeout convention
- **THEN** Resilience reports at most Question or Low

### Requirement: Diffs without resilience surface SHALL be recorded as no surface
Diffs without resilience surface SHALL be recorded as no surface. Docs-only, comments, CSS without I/O, or renames produce no findings and are recorded as no surface, not as an empty pass.

#### Scenario: No surface recorded
- **WHEN** the diff is docs-only with no I/O, handler, consumer, or timeout boundary
- **THEN** Resilience records no surface with no findings

### Requirement: Review report SHALL carry Resilience Surface Triage

The report SHALL record resilience in a `Resilience:` line under Coverage Notes, not a separate Resilience Surface Triage section. It SHALL include the outcome even when no relevant surface exists, affected areas with file paths when present, and relevant idempotency and no-existing-pattern notes. Findings SHALL remain in Findings with Category Resilience and existing severity and no-convention limits. This recording SHALL add no audit recommendation.

#### Scenario: Triage reported
- **WHEN** Resilience evaluates a diff
- **THEN** Coverage Notes records a `Resilience:` outcome, affected areas and constraint notes, including no surface when appropriate

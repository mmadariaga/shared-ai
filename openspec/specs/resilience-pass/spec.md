# resilience-pass Specification

## Purpose
TBD - created by archiving change add-resilience-review-pass. Update Purpose after archive.
## Requirements
### Requirement: Resilience review pass
The review SHALL include a dedicated Resilience pass that reviews fault-tolerance of the diff's I/O paths: missing timeouts, unbounded retries, missing circuit-breaker, non-idempotent retry/redelivery handlers, and missing fallback or degraded path.
#### Scenario: I/O diff with missing timeout
- **WHEN** the diff adds external I/O, a handler, or a consumer without a timeout
- **THEN** the review SHALL raise a Resilience finding naming the path and the missing bound

### Requirement: Exclusive resilience ownership
Retry, timeout, circuit-breaker, idempotency, and fallback defects SHALL belong exclusively to the Resilience pass; the Correctness pass and the Performance-triage pass SHALL NOT duplicate them and SHALL assess only their own scope.
#### Scenario: Retry defect is raised once
- **WHEN** the diff contains an unbounded retry
- **THEN** the defect SHALL appear only as a Resilience finding and never as a Correctness or Performance finding

### Requirement: Resilience severity mapping
Resilience findings SHALL use Category Resilience on the standard scale, with Critical reserved strictly for cascade or outage, data loss, or duplicate side-effects with concrete impact; all other Resilience findings SHALL be High, Medium, Low, or Question by blast radius.
#### Scenario: Non-cascading retry defect
- **WHEN** a retry defect has no cascade, loss, or duplicate side-effect impact
- **THEN** its severity SHALL NOT be Critical

### Requirement: Resilience exemptions as pass rules
The pass SHALL yield no findings for docs or CSS-only diffs without I/O; frontend code without external I/O SHALL be out of scope; cases with no existing resilience pattern SHALL be capped at Question or Low; idempotency findings SHALL be raised only when retry or redelivery exists. These exemptions SHALL act as pass rules and never as findings.
#### Scenario: Docs-only diff
- **WHEN** the diff touches only docs with no I/O
- **THEN** the pass SHALL emit no Resilience findings

### Requirement: Mutation analysis renumbered to Pass 12
Mutation Analysis SHALL run as Pass 12 after passes 1–11, and the review report template SHALL list Resilience as a finding category with the Mutation Analysis section headed Pass 12.
#### Scenario: Report rendered after this change
- **WHEN** the review report includes the mutation section
- **THEN** the section SHALL be headed Mutation Analysis (Pass 12) with Resilience available as a finding category


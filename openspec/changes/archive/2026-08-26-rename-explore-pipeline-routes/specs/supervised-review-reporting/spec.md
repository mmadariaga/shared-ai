## MODIFIED Requirements

### Requirement: Report Plan attempt terminology

Supervised review reports SHALL identify their counters, cap exhaustion, retry guidance, and autonomy records as belonging to Plan (unattended) attempts while preserving the existing report contents and ordering.

#### Scenario: Plan reaches a report boundary

- **WHEN** a Plan review phase converges, exhausts its cap, or stops
- **THEN** the existing report and retry guidance are emitted under the Plan terminology.

## MODIFIED Requirements

### Requirement: Reset rounds per Plan attempt

The supervised review-round counters SHALL reset for each new Plan (unattended) attempt and SHALL retain the existing independent spec/design budgets and retry semantics.

#### Scenario: a new Plan attempt starts

- **WHEN** a new Plan attempt begins after a prior attempt ends
- **THEN** the existing review-round counters restart for that attempt without changing the phase budgets.

## MODIFIED Requirements

### Requirement: Chain design only from Plan

The existing sai-1-to-sai-2 phase transition SHALL belong to Plan (unattended), preserving its active token, supervised gates, review rounds, and design retry behavior.

#### Scenario: Plan chains to design

- **WHEN** supervised sai-1 converges under Plan
- **THEN** the existing design worker is chained without dispatching implementation.

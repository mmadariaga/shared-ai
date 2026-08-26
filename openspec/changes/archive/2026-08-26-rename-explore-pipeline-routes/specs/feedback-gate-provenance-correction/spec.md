## MODIFIED Requirements

### Requirement: Attribute supervised feedback to Plan

Supervised artifact-feedback processing SHALL identify its selector-dispatched route as Plan (unattended) and SHALL preserve existing finding provenance, correction, continuation, and worker-ownership rules.

#### Scenario: supervised feedback is recorded

- **WHEN** a Plan worker receives artifact feedback
- **THEN** the existing feedback contract applies without changing provenance or correction behavior.

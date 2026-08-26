## MODIFIED Requirements

### Requirement: Use named route projections

The mode-specific idea-list projection SHALL identify Plan (unattended), Build (unattended), and Manual using their stable identities and SHALL preserve each route's existing ordered steps and completion transitions.

#### Scenario: route stages remain ordered

- **WHEN** a selected route is rendered
- **THEN** its fixed existing steps appear in order under the corresponding new route identity.

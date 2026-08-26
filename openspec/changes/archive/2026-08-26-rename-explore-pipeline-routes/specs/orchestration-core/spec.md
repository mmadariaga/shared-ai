## MODIFIED Requirements

### Requirement: Separate Plan and Build ownership

The orchestration contract SHALL identify Plan (unattended) as the supervised sai-1/sai-2 route and Build (unattended) as the direct implementation route. Explore SHALL retain no direct write scope, and each route SHALL retain its existing worker-owned boundaries.

#### Scenario: orchestration selects a route

- **WHEN** a route is explicitly selected
- **THEN** dispatch and mutation ownership follow the corresponding existing route contract.

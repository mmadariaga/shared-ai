## MODIFIED Requirements

### Requirement: Keep delegated writes behind explicit route selection

Explore SHALL remain directly read-only. The explicit Plan (unattended) route MAY dispatch only its existing supervised workers, and the explicit Build (unattended) route MAY dispatch only its existing fast-lane workers under their closed ownership contracts.

#### Scenario: route authorization is explicit

- **WHEN** a crystallization selector answer is received
- **THEN** only an explicitly selected Plan or Build route may dispatch its authorized workers.

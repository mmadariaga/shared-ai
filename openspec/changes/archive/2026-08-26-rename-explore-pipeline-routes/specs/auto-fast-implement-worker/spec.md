## MODIFIED Requirements

### Requirement: Attribute implementation to Build

The existing `sai-autofast-implement-worker` SHALL be documented as the implementation worker for Build (unattended). Its worker identity and protocol marker SHALL remain unchanged, and its existing code-only exclusions SHALL remain in force.

#### Scenario: Build dispatches implementation

- **WHEN** Build reaches its implementation step
- **THEN** the existing implement worker receives the same block-driven request under the Build route.

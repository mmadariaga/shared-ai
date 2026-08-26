## MODIFIED Requirements

### Requirement: Attribute archive execution to Build

Build (unattended) SHALL use the existing archive worker's read-only preparation followed by one validated sync, archive move, owned staging, and pre-authorized local commit continuation.

#### Scenario: Build completes archive execution

- **WHEN** Build reaches archive execution
- **THEN** the existing archive order and one-commit boundary remain unchanged under `build-unattended`.

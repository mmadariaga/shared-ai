## MODIFIED Requirements

### Requirement: Attribute backfill execution to Build

Build (unattended) SHALL use the existing backfill worker's read-only preparation followed by coordinator validation and one explicit execute continuation. The backfill worker SHALL write only the validated draft set during that continuation.

#### Scenario: Build prepares backfill drafts

- **WHEN** Build reaches backfill preparation
- **THEN** the existing backfill prepare and validated execute boundaries remain unchanged under the Build route.

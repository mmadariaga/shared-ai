# discovery-questions Specification

## Purpose
TBD - created by archiving change explore-own-maturation. Update Purpose after archive.
## Requirements
### Requirement: Explore change stage SHALL own open discovery questions

While the stage is Explore change, explore SHALL ask the open questions that shape the idea. The stage SHALL NOT advance on explore's own judgment that the idea is solid.

#### Scenario: Open questions stay in Explore change
- **WHEN** the current stage is Explore change and the idea is still taking shape
- **THEN** explore asks open discovery questions and keeps the stage in Explore change

### Requirement: Solid idea SHALL trigger a direct ask to move to Review edge cases

Once the idea is solid, explore SHALL ask directly whether to move to Review edge cases. A declining answer SHALL stay in Explore change and later advancement SHALL use the existing next-step path.

#### Scenario: Direct ask with decline staying put
- **WHEN** the idea is solid and the user declines the move to Review edge cases
- **THEN** the stage stays in Explore change and a later next-step request advances it


## REMOVED Requirements

### Requirement: Dedicated Auto-fast hands mutation role

The Auto-fast pipeline previously dispatched a dedicated hands worker to materialize validated drafts, synchronize specifications, move the archive directory, stage owned paths, and create the local commit.

#### Scenario:

- **WHEN** Auto-fast reached its mutation stage
- **THEN** the pipeline dispatched the dedicated hands worker with a closed execution order

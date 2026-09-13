# concurrent-store-safety Specification

## Purpose
TBD - created by archiving change fix-sai-state-concurrent-emit-merge. Update Purpose after archive.
## Requirements
### Requirement: Concurrent emit merges sibling state by maximum revision

The store SHALL re-read the session file just before writing an emit outcome, preserve every sibling machine entry by maximum `rev`, merge the target machine `done[]` by union in canonical step order without duplicating, derive stage and pointer from the merged state, and persist the merged record with an incremented revision.

#### Scenario: Concurrent emits to different machines preserve both done sets

- **WHEN** two emits target different machines on the same session id from the same stale snapshot
- **THEN** the persisted file SHALL contain both machines done sets with each requested step id present

### Requirement: Concurrent reset replaces only the target entry

The store SHALL re-read the session file just before writing a reset, preserve every non-target machine entry by maximum `rev`, and replace only the target machine with its initial state and an incremented revision.

#### Scenario: Reset between sibling read and write preserves the sibling

- **WHEN** a reset for one machine lands between a sibling emit read and write on the same session id
- **THEN** the persisted file SHALL contain the reset target at initial state and the sibling entry with its emitted marks intact


# human-override Specification

## Purpose
TBD - created by archiving change coordinator-led-unblock. Update Purpose after archive.
## Requirements
### Requirement: Explicit human unblock re-attempts with a new key
The coordinator SHALL re-attempt an exhausted block on an explicit human unblock order naming a viable point, SHALL require a new artifact path, concrete point, and correction boundary key, SHALL open the new invocation itself, and SHALL reuse the current implementation.md and worktree state when the plan is unchanged.

#### Scenario: Human order reopens a viable block
- **WHEN** an explicit human unblock order names a viable point with a new diagnosis key
- **THEN** the coordinator re-attempts the block and reuses the unchanged plan and worktree state

### Requirement: Non-viable blocks stay blocked with reason
The coordinator SHALL keep the run blocked with the routing diagnosis, failure class when present, locus state, keys and ordinals spent, and stopping reason when the point is non-viable, the evidence is unrecoverable, safe-operations denies the repair, or the Step N contract is missing, and SHALL never bypass safe-operations confirmations or commit and verification gates on a human order.

#### Scenario: Unsafe human order stays blocked
- **WHEN** a human unblock order names a non-viable point or safe-operations denies the repair
- **THEN** the coordinator stays blocked and reports the routing diagnosis with the stopping reason


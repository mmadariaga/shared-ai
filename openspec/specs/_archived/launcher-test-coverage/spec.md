# launcher-test-coverage Specification

## Purpose
Define the launcher test coverage that keeps the forward-only archive guard and the specs-write guard separately enforced, with the `IMMUTABLE_HISTORY` exclusion scan-scope only.

## Requirements

### Requirement: Launcher tests SHALL enforce forward-only guard separation
The command launcher test suite SHALL assert the separate forward-only archive guard and the specs-write guard without reusing the IMMUTABLE_HISTORY scan exclusion as permission. The IMMUTABLE_HISTORY exclusion SHALL remain scan-scope only.
#### Scenario: Archive bypass is covered without reusing the exclusion
- **WHEN** the forward-only history guard test inspects sai/commands/archive/instructions.md
- **THEN** it asserts the immutability error, the authorized creation allowlist, and that IMMUTABLE_HISTORY does not authorize edits
#### Scenario: Specs-write guard is covered
- **WHEN** the specs-write guard test inspects sai/commands/archive/instructions.md
- **THEN** it asserts the active-change block, the proposal-flow direction, and the legitimate-flow allowlist

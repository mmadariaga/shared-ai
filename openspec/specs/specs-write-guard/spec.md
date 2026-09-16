# specs-write-guard Specification

## Purpose
Define the guard that blocks direct writes to `openspec/specs/` when no active change exists, directing the author to the proposal flow.

## Requirements

### Requirement: Direct specs writes SHALL require an active change
Direct writes to openspec/specs/ without an active change SHALL be blocked with a no-active-change error directing to the proposal flow. Legitimate specs writes via the proposal flow SHALL stay allowed.
#### Scenario: Specs write without active change is blocked
- **WHEN** a direct write targets openspec/specs/ with no active change reported by openspec list --json
- **THEN** the write is blocked with No active change directing to /sai-1-spec and the proposal flow
#### Scenario: Proposal-flow specs writes stay allowed
- **WHEN** a specs change flows through delta specs in openspec/changes/{name}/specs synced through openspec archive
- **THEN** the write is allowed and is not flagged as a violation

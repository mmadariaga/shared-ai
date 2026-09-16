# archive-immutability-guard Specification

## Purpose
TBD - created by archiving change review-close-archive-guard. Update Purpose after archive.

## Requirements

### Requirement: Archived history SHALL reject direct edits outside the authorized archive flow
Edits under openspec/changes/archive/ outside the authorized sai-archive creation flow SHALL be blocked with an immutable-history error naming the offending path and the authorized creation primitive. Normal sai-archive creation of archive/YYYY-MM-DD-{name}/ via openspec archive <name> --yes --json SHALL stay allowed.
#### Scenario: Direct archive edit is blocked
- **WHEN** a direct edit targets a file under openspec/changes/archive/ outside the authorized flow
- **THEN** the edit is blocked with Archived history is immutable naming the path and the sai-archive creation primitive
#### Scenario: Normal archive creation stays allowed
- **WHEN** sai-archive creates archive/YYYY-MM-DD-{name}/ via openspec archive <name> --yes --json
- **THEN** the creation is allowed and is not flagged as a violation

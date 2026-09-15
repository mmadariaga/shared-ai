# coordinator-allowlist Specification

## Purpose
TBD - created by archiving change shared-tool-execution-permissions. Update Purpose after archive.
## Requirements
### Requirement: Coordinator Minimal Grant

Each worker-coordinator Claude wrapper (`sai-1-spec`, `sai-2-design`, `sai-3-implement`, `sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`, `sai-build`, `sai-review`) SHALL permit exactly the validator, guard, and stage-store `node` tools in both roots and no other `node` invocation.

#### Scenario: Coordinator runs validator and guard
- **WHEN** a coordinator runs the result validator every turn and guard snapshot/verify every window
- **THEN** execution proceeds with no interactive permission prompt

### Requirement: Unchanged Execution Surface

`sai-4-apply`, `sai-commit`, `sai-archive`, `sai-backfill`, and `sai-merge` SHALL keep their current execution surface unchanged.

#### Scenario: Unchanged wrappers untouched
- **WHEN** the change is applied
- **THEN** those five wrappers gain no new `node` entry under this change


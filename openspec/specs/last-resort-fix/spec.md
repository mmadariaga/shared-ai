# last-resort-fix Specification

## Purpose
TBD - created by archiving change coordinator-led-unblock. Update Purpose after archive.
## Requirements
### Requirement: Bounded infra-only coordinator repair as last resort
The coordinator MAY perform at most one bounded infra-only repair per active segment only after the RED owner retry returns unpassable or unrecoverable with no RED or GREEN safe path remaining, and the repair SHALL write only test setup, adapter, or seed scaffolding and SHALL never write assertion bodies, expected values, or production semantics.

#### Scenario: Last-resort repair fixes adapter scaffolding
- **WHEN** the RED owner retry is unpassable and no worker-safe correction path remains
- **THEN** the coordinator performs at most one infra-only repair limited to setup, adapter, or seed scaffolding

### Requirement: Self-edit prohibition with mandatory verification
The coordinator SHALL forbid self-edit while a worker-safe correction exists, SHALL track the repair separately from the three-slot worker ledger with no slot consumed, SHALL preserve Step headings, checkbox semantics, prohibitions, and Coverage Signature, SHALL add each touched path to the invocation-scoped changed-files union, and SHALL follow the repair with mandatory independent coordinator verification plus the normal checklist, scratch, baseline, allowed-file, changed-path, and report comparisons.

#### Scenario: Repair is verified independently
- **WHEN** the coordinator completes a last-resort infra-only repair
- **THEN** independent coordinator verification runs and all normal comparisons pass before the Step advances


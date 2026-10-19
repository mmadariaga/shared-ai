# last-resort-fix Specification

## Purpose
TBD - created by archiving change coordinator-led-unblock. Update Purpose after archive.

## Requirements

### Requirement: Bounded infra-only coordinator repair as last resort
The coordinator MAY perform at most one bounded infra-only repair per active segment only after the RED owner retry returns unpassable with no RED or GREEN safe path remaining, and the repair SHALL write only test setup, adapter, or seed scaffolding that lives outside test files and SHALL never write assertion bodies, expected values, production semantics, or a test file. A worker `unrecoverable: true` veto SHALL NOT trigger the repair. A cause inside a test file that the RED worker may not write SHALL stop the run for the user.

#### Scenario: Last-resort repair fixes adapter scaffolding
- **WHEN** the RED owner retry is unpassable and no worker-safe correction path remains
- **THEN** the coordinator performs at most one infra-only repair limited to setup, adapter, or seed scaffolding

#### Scenario: A cause inside an unwritable test file stops for the user
- **WHEN** the RED worker is unpassable and the cause lies inside a test file its contract does not let it write
- **THEN** the coordinator writes nothing and stops the run to ask the user

### Requirement: Self-edit prohibition with mandatory verification
The coordinator SHALL forbid self-edit while a worker-safe correction exists, SHALL track the repair separately from the three-slot worker ledger with no slot consumed, SHALL preserve Step headings, checkbox semantics, prohibitions, and Coverage Signature, SHALL add each touched path to the invocation-scoped changed-files union, and SHALL follow the repair with mandatory independent coordinator verification plus the normal checklist, scratch, baseline, allowed-file, changed-path, and report comparisons.

#### Scenario: Repair is verified independently
- **WHEN** the coordinator completes a last-resort infra-only repair
- **THEN** independent coordinator verification runs and all normal comparisons pass before the Step advances

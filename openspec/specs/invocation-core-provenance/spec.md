# Invocation Core Provenance Specification

## Purpose

TBD — seeded from the `repair-copilot-contract-prose` delta spec.

## Requirements

### Requirement: Shared invocation cores name their routed worker consumers

The active invocation-core inventory SHALL consist only of existing files matching `sai/commands/*/invocation.md`. The deleted `sai/commands/implement/invocation.md` SHALL not be treated as an active invocation core or as a current implementation consumer. Every remaining active invocation core SHALL identify its corresponding routed phase worker and SHALL not describe a retired inline caller or deleted adapter as active.

For this capability, the active invocation-core inventory is every file matching `sai/commands/*/invocation.md`. Each active shared invocation core SHALL describe its active consumer as the corresponding routed phase worker: the spec-proposal, design-planning, implementation-planning, review, security, performance, or accessibility worker. It SHALL not describe a retired inline caller or the deleted inline adapter as an active consumer. The single maintained retired-party prose guard defined by `routed-contract-truth` SHALL include this inventory; this capability does not define a second guard.

#### Scenario: Corrected invocation-core content names the routed consumer

- **WHEN** a reviewer examines each corrected invocation core in the active inventory
- **THEN** its opening consumer description identifies the corresponding routed phase worker as the active consumer
- **AND** it contains no inline-caller or retired-adapter party to the current contract

#### Scenario: Corrected invocation-core content preserves the existing core contract

- **WHEN** a reviewer compares a corrected invocation core with its existing contract
- **THEN** it retains its ownership exclusions, ordered instruction loads, audit-policy-only boundaries where present, and argument passthrough
- **AND** no prerequisite, lifecycle, feedback, navigation, or technical-workflow responsibility moves into the invocation core

#### Scenario: The shared retired-party guard covers every invocation core

- **WHEN** the single maintained retired-party prose guard defined by `routed-contract-truth` audits the active invocation-core inventory
- **THEN** it checks every matching `sai/commands/*/invocation.md` file
- **AND** it reports the offending file and line if a retired-party pattern is reintroduced

#### Scenario: Retired implementation invocation is absent from the active inventory

- **WHEN** the invocation-core inventory is audited
- **THEN** `sai/commands/implement/invocation.md` is absent and the guard covers only the remaining existing invocation cores.

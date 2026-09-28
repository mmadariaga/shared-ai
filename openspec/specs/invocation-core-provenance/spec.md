# Invocation Core Provenance Specification

## Purpose

Keep every remaining invocation core truthful about its active consumer.

## Requirements

### Requirement: Invocation cores name no retired party

The active invocation-core inventory SHALL consist only of existing files matching `sai/commands/*/invocation.md`; today that is `sai/commands/apply/invocation.md`, fetched by the apply coordinator. The deleted spec, design, implement, review, security, performance, and accessibility invocation cores SHALL not be treated as active invocation cores or as current consumers. No remaining active invocation core SHALL describe a retired inline caller or the deleted inline adapter as active. The single maintained retired-party prose guard defined by `routed-contract-truth` SHALL include this inventory; this capability does not define a second guard.

#### Scenario: Invocation-core content names no retired party

- **WHEN** a reviewer examines each corrected invocation core in the active inventory
- **THEN** it contains no inline-caller or retired-adapter party to the current contract

#### Scenario: The shared retired-party guard covers every invocation core

- **WHEN** the single maintained retired-party prose guard defined by `routed-contract-truth` audits the active invocation-core inventory
- **THEN** it checks every matching `sai/commands/*/invocation.md` file
- **AND** it reports the offending file and line if a retired-party pattern is reintroduced

#### Scenario: Retired implementation invocation is absent from the active inventory

- **WHEN** the invocation-core inventory is audited
- **THEN** the retired spec, design, implement, review, security, performance, and accessibility invocation cores are absent and the guard covers only the remaining existing invocation cores.

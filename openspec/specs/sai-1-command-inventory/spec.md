# sai-1-command-inventory Specification

## Purpose
TBD - created by archiving change consolidate-sai-1-spec-flow. Update Purpose after archive.

## Requirements

### Requirement: Both harness inventories enumerate sai-review

The Claude Code and opencode command inventories SHALL include `sai-review`, `to-backlog`, and `from-backlog` and SHALL report twenty-one manifest-declared commands: nineteen SAI commands and the two conversation-preserving backlog invocations.

#### Scenario: Harness command enumeration runs

- **WHEN** either supported harness enumerates the manifest-declared command set
- **THEN** the result includes `sai-review`, `to-backlog`, and `from-backlog` and contains twenty-one commands.

### Requirement: Both harness inventories enumerate sai-retire-docs

The Claude Code and opencode command inventories SHALL enumerate `/sai-retire-docs` as the same utility command and SHALL include it in their mirrored command counts.

#### Scenario: The new utility is present in both inventories

- **WHEN** either harness enumerates installed command projections
- **THEN** the result SHALL contain one `sai-retire-docs` utility entry matching the other harness

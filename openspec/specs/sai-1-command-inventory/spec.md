# sai-1-command-inventory Specification

## Purpose
TBD - created by archiving change consolidate-sai-1-spec-flow. Update Purpose after archive.

## Requirements

### Requirement: Both harness inventories enumerate sai-review

The Claude Code and OpenCode command inventories SHALL include `sai-review` and `to-backlog` and SHALL report twenty manifest-declared commands: nineteen SAI commands and the conversation-preserving to-backlog invocation.

#### Scenario: Harness command enumeration runs

- **WHEN** either supported harness enumerates the manifest-declared command set
- **THEN** the result includes `sai-review` and `to-backlog` and contains twenty commands.

### Requirement: Both harness inventories enumerate sai-retire-docs

The Claude Code and opencode command inventories SHALL enumerate `/sai-retire-docs` as the same utility command and SHALL include it in their mirrored command counts.

#### Scenario: The new utility is present in both inventories

- **WHEN** either harness enumerates installed command projections
- **THEN** the result SHALL contain one `sai-retire-docs` utility entry matching the other harness

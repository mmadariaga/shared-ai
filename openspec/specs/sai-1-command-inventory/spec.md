# sai-1-command-inventory Specification

## Purpose
TBD - created by archiving change consolidate-sai-1-spec-flow. Update Purpose after archive.

## Requirements

### Requirement: Both harness inventories enumerate sai-review

The Claude Code and opencode command inventories SHALL include `sai-review` and SHALL report nineteen manifest-declared commands.

#### Scenario: Harness command enumeration runs

- **WHEN** either supported harness enumerates the manifest-declared command set
- **THEN** the result SHALL include `sai-review` and contain nineteen commands.

### Requirement: Both harness inventories enumerate sai-retire-docs

The Claude Code and opencode command inventories SHALL enumerate `/sai-retire-docs` as the same utility command and SHALL include it in their mirrored command counts.

#### Scenario: The new utility is present in both inventories

- **WHEN** either harness enumerates installed command projections
- **THEN** the result SHALL contain one `sai-retire-docs` utility entry matching the other harness

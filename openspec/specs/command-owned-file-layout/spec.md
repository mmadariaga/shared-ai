# command-owned-file-layout Specification

## Purpose
TBD: define the canonical layout for command-owned instruction files.

## Requirements

### Requirement: Command-owned instruction files SHALL live beside the command that consumes them

The canonical source layout MUST place the design overview generation instruction under `sai/commands/design/` and the ADR/DDR index templates under `sai/commands/implement/`, retaining their established filenames.

#### Scenario: Resolve the command-owned source files

- **WHEN** the source inventory resolves the overview instruction or either decision-record index template
- **THEN** it SHALL resolve `sai/commands/design/change-overview.md`, `sai/commands/implement/adr-index.template.md`, or `sai/commands/implement/ddr-index.template.md` respectively, and SHALL not resolve the former `sai/` root paths

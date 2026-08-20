# command-owned-file-layout Specification

## Purpose
TBD: define the canonical layout for command-owned instruction files.

## Requirements

### Requirement: Command-owned instruction files SHALL live beside the command that consumes them

The canonical source layout MUST place the design overview generation instruction under `sai/commands/design/` and the ADR/DDR index templates under `sai/commands/implement/`, retaining their established filenames.

Runtime consumers that name the overview generation instruction — including the design-worker overview-generation dispatch Fetch target and any path named inside the workflow schema's `change-overview` embedded `instruction:` text — SHALL resolve `sai/commands/design/change-overview.md`. They SHALL NOT resolve or project the retired root path `sai/change-overview.md` as the live contract location.

The workflow schema has no separate artifact `path` field for the generation contract source; the live contract location appears only inside the embedded `instruction:` prose (and in design-worker dispatch Fetch targets). That embedded `instruction:` text SHALL name `sai/commands/design/change-overview.md` as the generation contract and SHALL NOT name the retired `sai/change-overview.md` destination as the live contract location.

#### Scenario: Resolve the command-owned source files

- **WHEN** the source inventory resolves the overview instruction or either decision-record index template
- **THEN** it SHALL resolve `sai/commands/design/change-overview.md`, `sai/commands/implement/adr-index.template.md`, or `sai/commands/implement/ddr-index.template.md` respectively, and SHALL not resolve the former `sai/` root paths

#### Scenario: overview-generation dispatch Fetch targets the command-owned path

- **WHEN** the design worker transports the shared overview-generation contract to the generation subagent
- **THEN** the Fetch target is `@sai/commands/design/change-overview.md`
- **AND** the dispatch does not Fetch `@sai/change-overview.md` or any other retired root path as the live contract

#### Scenario: workflow schema instruction names the command-owned overview path

- **WHEN** the workflow schema's `change-overview` embedded `instruction:` text names the generation contract source
- **THEN** that text names `sai/commands/design/change-overview.md`
- **AND** it does not name the retired `sai/change-overview.md` destination as the live contract location

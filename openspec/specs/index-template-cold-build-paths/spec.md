# index-template-cold-build-paths Specification

## Purpose
TBD: define canonical template paths for implementation cold builds.

## Requirements

### Requirement: Implementation cold builds SHALL read index templates from the implement command directory

The Step 3 cold-build branch MUST read the ADR template from `sai/commands/implement/adr-index.template.md` and the DDR template from `sai/commands/implement/ddr-index.template.md` by exact path, without inlining their boilerplate.

#### Scenario: Build a missing decision-record index

- **WHEN** Step 3 creates an ADR or DDR index because that family index is absent
- **THEN** it SHALL read the corresponding command-owned template from `sai/commands/implement/` and use that template as the canonical section skeleton

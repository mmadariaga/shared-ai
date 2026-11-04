# index-template-cold-build-paths Specification

## Purpose
Defines the canonical template paths from which a missing ADR or DDR index is built.

## Requirements

### Requirement: A missing index SHALL be built from the templates in the implement command directory

The folder-and-index step of `sai/policies/decision-record-creation.md` MUST read the ADR template from `sai/commands/implement/adr-index.template.md` and the DDR template from `sai/commands/implement/ddr-index.template.md` by exact path, without inlining their boilerplate.

#### Scenario: Build a missing decision-record index

- **WHEN** the decision-record creation policy creates an ADR or DDR index because that family index is absent
- **THEN** it SHALL read the corresponding command-owned template from `sai/commands/implement/` and use that template as the canonical section skeleton

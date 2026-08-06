# adr-creation-decision Specification

## Purpose
TBD - created by archiving change enforce-audit-step-append-verification. Update Purpose after archive.

## Requirements

### Requirement: Step 3 SHALL decide ADR creation by project ADR culture before asking

When `/sai-3-implement` Step 3 validates a design decision against the three ADR/DDR criteria (hard to reverse, surprising without context, real trade-off), it SHALL resolve creation in this order: first, only when all three criteria hold, Step 3 SHALL check whether the project already maintains ADRs/DDRs; when the project already maintains ADRs/DDRs, Step 3 SHALL create the `docs/adr/NNNN-slug.md` (or `docs/ddr/NNNN-slug.md`) file directly without asking the user; when the project does not maintain ADRs/DDRs, Step 3 SHALL ask the user whether to create the file and SHALL create it only upon explicit approval. The project-culture check SHALL precede the ask, so the ask is never the default action for a qualifying decision in a project that maintains ADRs/DDRs.

#### Scenario: Project maintains ADRs and decision qualifies

- **WHEN** a design decision meets all three ADR criteria and the project already maintains ADRs/DDRs
- **THEN** Step 3 SHALL create the ADR/DDR file directly without asking the user

#### Scenario: Project has no ADR culture and decision qualifies

- **WHEN** a design decision meets all three ADR criteria and the project does not maintain ADRs/DDRs
- **THEN** Step 3 SHALL ask the user whether to create the ADR/DDR file
- **AND** SHALL create the file only if the user explicitly approves

#### Scenario: Decision does not qualify

- **WHEN** a design decision does not meet all three ADR criteria
- **THEN** Step 3 SHALL NOT create an ADR/DDR file and SHALL NOT ask the user

# sai-1-entry-path-parity Specification

## Purpose
TBD - created by archiving change consolidate-sai-1-spec-flow. Update Purpose after archive.

## Requirements

### Requirement: Standalone and supervised sai-1 parity

Standalone and Explore-supervised sai-1 execution SHALL use the same lifecycle result union, permitted write surface, progress identifiers, and pointer map.

#### Scenario: The same spec phase runs through both entry paths

- **WHEN** a change is processed by standalone execution and by Explore supervision
- **THEN** both paths SHALL preserve the same worker lifecycle and artifact-ownership rules.

### Requirement: Entry-path presentation differences

The standalone coordinator SHALL retain its interactive artifact feedback gate and mandatory stop, while Explore SHALL retain supervised gate parameters, autonomy, diagnosis, review-round state, and the existing transition to design.

#### Scenario: Supervision completes the spec phase

- **WHEN** Explore supervises a clean sai-1 completion
- **THEN** it SHALL apply its supervised transition behavior without creating design or implementation artifacts during the spec phase.

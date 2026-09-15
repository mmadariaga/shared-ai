# design-coordinator-text Specification

## Purpose
TBD - created by archiving change fix-design-reconciliation-label. Update Purpose after archive.
## Requirements
### Requirement: Pre-gate completion leaves task list unchanged

The design coordinator documentation SHALL state that a pre-gate completed result never reconciles the rendered task list on either overview-lang route.

#### Scenario: Pre-gate completed does not trigger reconciliation

- **WHEN** the design worker returns pre-gate completed
- **THEN** the coordinator leaves the task list exactly as last rendered

### Requirement: Post-gate terminals reconcile explicitly

The design coordinator documentation SHALL state that successful post-gate terminals reconcile unmarked steps, preserving the evidence-marked review carve-out on the opted-in route and reconciling the unopted plan on the absent-token route.

#### Scenario: Post-gate success reconciles unmarked steps

- **WHEN** the feedback gate proceeds through Continue to a successful post-gate terminal
- **THEN** the coordinator reconciles every eligible unmarked step per the selected route

### Requirement: Absent-token Continue states reconciliation

The design coordinator documentation SHALL state that the absent-token Continue closes a no-generation terminal without materialization and reconciles all unmarked steps in the unopted plan.

#### Scenario: Unopted Continue reconciles without generation

- **WHEN** Continue is selected without overview-lang
- **THEN** the coordinator closes the no-generation terminal and reconciles all unmarked steps in the unopted plan


# adr-creation-decision — Spec

## Purpose

Decide consistently when a design decision earns a persistent ADR or DDR record.

## Requirements

### Requirement: Every criteria-evaluation surface resolves the family by the routing test

Every instruction surface that evaluates the three ADR/DDR criteria SHALL resolve a qualifying decision's family by the ordered routing test and SHALL NOT leave the ADR-vs-DDR choice open. The three criteria, the ordered routing test, and the never-leave-the-choice-open rule SHALL be single-sourced in `sai/policies/adr-ddr-criteria.md`; a fetching instruction surface SHALL fetch that policy and SHALL NOT restate them inline. The active design step authority at `sai/commands/design/steps/design.md` SHALL own the design-side evaluation and record the resolved family. The implementation instruction and worker step remain the execution surfaces for the recorded family, while the spec command's coordinator, worker, and step surfaces SHALL NOT carry a criteria-evaluation surface because the `/sai-1-spec` phase authors no design decisions. The phrase "ADR/DDR" SHALL name the evaluation surface (the two-family criteria check) and SHALL NOT be used to leave the family unresolved.

#### Scenario: design.md Decisions evaluation resolves the family

- **WHEN** `/sai-2-design` evaluates a Decision against the three criteria and all three hold
- **THEN** the design instruction directs the design agent to resolve the family by the ordered routing test defined in `sai/policies/adr-ddr-criteria.md` and record it as `**Record family**: adr|ddr`

#### Scenario: The criteria and routing test are single-sourced

- **WHEN** `sai/commands/design/steps/design.md` and `sai/commands/implement/steps/artifact-analysis.md` are read at their criteria-evaluation surfaces
- **THEN** each fetches `sai/policies/adr-ddr-criteria.md` and neither restates the three criteria or the ordered routing test inline

#### Scenario: sai-1 carries no criteria-evaluation surface

- **WHEN** `sai/commands/spec/coordinator.md`, `sai/commands/spec/worker.md`, and the active files under `sai/commands/spec/steps/` are read
- **THEN** they contain no `## ADR/DDR Proposal Check` section, no restatement of the three criteria or the ordered routing test, and no cross-reference to a deleted ADR/DDR section

#### Scenario: step-owned-criteria-surface-resolves-family

- **WHEN** a design step evaluates all three ADR/DDR criteria
- **THEN** it resolves and records `**Record family**: adr|ddr` through the canonical routing test.

### Requirement: Make non-qualifying decisions a no-op

A decision that fails any of the three ADR/DDR criteria SHALL create no record and SHALL ask no creation question, regardless of index state.

#### Scenario: Failed qualification

- **WHEN** any ADR/DDR criterion is not satisfied
- **THEN** the flow neither creates a decision record nor asks about creating one

### Requirement: Skip creation for a decision that already has a record

Before creating a record, the creator SHALL look in the resolved family's records, in `docs/<family>/` and its `archive/` folder, for a record that already cites the decision: its `## Provenance` section names the change in backticks and the decision's title. When one exists, it SHALL create no record for that decision, ask nothing, and list the decision as skipped in the closing report. A later run on the same change SHALL NOT re-create a record that already cites the change.

#### Scenario: Decision already recorded

- **WHEN** a qualifying decision is already cited by a record of its family whose `## Provenance` names the change and the decision's title
- **THEN** the creator creates no second record, asks nothing, and lists the decision as skipped in the closing report

### Requirement: Number a new record from the inventory

The first record a run creates in a family SHALL take the inventory's `next_number` as its `NNNN`. Each further record of that family in the same run SHALL take the next consecutive number.

#### Scenario: First record of a run

- **WHEN** a run creates its first record in a family whose inventory reports `next_number` `0042`
- **THEN** the record is created as `docs/<family>/0042-slug.md`

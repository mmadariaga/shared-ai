# adr-creation-decision — Spec

## Requirements

### Requirement: Every criteria-evaluation surface resolves the family by the routing test

Every instruction surface that evaluates the three ADR/DDR criteria SHALL resolve a qualifying decision's family by the ordered routing test and SHALL NOT leave the ADR-vs-DDR choice open. The three criteria, the ordered routing test, and the never-leave-the-choice-open rule SHALL be single-sourced in `sai/policies/adr-ddr-criteria.md`; a fetching instruction surface SHALL fetch that policy and SHALL NOT restate them inline. The active design step authority at `sai/commands/design/steps/design.md` SHALL own the design-side evaluation and record the resolved family. The implementation instruction and worker step remain the execution surfaces for the recorded family, while `sai/commands/spec/instructions.md` SHALL NOT carry a criteria-evaluation surface because the `/sai-1-spec` phase authors no design decisions. The phrase "ADR/DDR" SHALL name the evaluation surface (the two-family criteria check) and SHALL NOT be used to leave the family unresolved.

#### Scenario: design.md Decisions evaluation resolves the family

- **WHEN** `/sai-2-design` evaluates a Decision against the three criteria and all three hold
- **THEN** the design instruction directs the design agent to resolve the family by the ordered routing test defined in `sai/policies/adr-ddr-criteria.md` and record it as `**Record family**: adr|ddr`

#### Scenario: The criteria and routing test are single-sourced

- **WHEN** `sai/commands/design/steps/design.md`, `sai/commands/implement/instructions.md`, and `sai/commands/implement/steps/artifact-analysis.md` are read at their criteria-evaluation surfaces
- **THEN** each fetches `sai/policies/adr-ddr-criteria.md` and neither restates the three criteria or the ordered routing test inline

#### Scenario: sai-1 carries no criteria-evaluation surface

- **WHEN** `sai/commands/spec/instructions.md` is read
- **THEN** it contains no `## ADR/DDR Proposal Check` section, no restatement of the three criteria or the ordered routing test, and no cross-reference from the Complexity Derivation Rubric to a deleted ADR/DDR section

#### Scenario: step-owned-criteria-surface-resolves-family

- **WHEN** a design step evaluates all three ADR/DDR criteria
- **THEN** it resolves and records `**Record family**: adr|ddr` through the canonical routing test.

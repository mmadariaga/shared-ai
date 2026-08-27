# adr-creation-decision — Spec

## Requirements

### Requirement: Every criteria-evaluation surface resolves the family by the routing test

Every instruction surface that evaluates the three ADR/DDR criteria SHALL resolve a qualifying decision's family by the ordered routing test and SHALL NOT leave the ADR-vs-DDR choice open. The three criteria, the ordered routing test, and the never-leave-the-choice-open rule SHALL be single-sourced in `sai/policies/adr-ddr-criteria.md`; a fetching instruction surface SHALL fetch that policy and SHALL NOT restate them inline. The active design step authority at `sai/commands/design/steps/design.md` SHALL own the design-side evaluation and record the resolved family. The implementation instruction and worker step remain the execution surfaces for the recorded family, while the spec command's coordinator, worker, and step surfaces SHALL NOT carry a criteria-evaluation surface because the `/sai-1-spec` phase authors no design decisions. The phrase "ADR/DDR" SHALL name the evaluation surface (the two-family criteria check) and SHALL NOT be used to leave the family unresolved.

#### Scenario: design.md Decisions evaluation resolves the family

- **WHEN** `/sai-2-design` evaluates a Decision against the three criteria and all three hold
- **THEN** the design instruction directs the design agent to resolve the family by the ordered routing test defined in `sai/policies/adr-ddr-criteria.md` and record it as `**Record family**: adr|ddr`

#### Scenario: The criteria and routing test are single-sourced

- **WHEN** `sai/commands/design/steps/design.md`, `sai/commands/implement/instructions.md`, and `sai/commands/implement/steps/artifact-analysis.md` are read at their criteria-evaluation surfaces
- **THEN** each fetches `sai/policies/adr-ddr-criteria.md` and neither restates the three criteria or the ordered routing test inline

#### Scenario: sai-1 carries no criteria-evaluation surface

- **WHEN** `sai/commands/spec/coordinator.md`, `sai/commands/spec/worker.md`, and the active files under `sai/commands/spec/steps/` are read
- **THEN** they contain no `## ADR/DDR Proposal Check` section, no restatement of the three criteria or the ordered routing test, and no cross-reference to a deleted ADR/DDR section

#### Scenario: step-owned-criteria-surface-resolves-family

- **WHEN** a design step evaluates all three ADR/DDR criteria
- **THEN** it resolves and records `**Record family**: adr|ddr` through the canonical routing test.

### Requirement: Resolve the record family before the culture gate

Implementation planning SHALL evaluate the three ADR/DDR criteria and resolve exactly one record family before applying the creation culture gate. A recorded `**Record family**: adr|ddr` marker in `design.md` SHALL be used when present; otherwise the canonical ordered routing test SHALL be used. The user SHALL never be asked to choose between ADR and DDR.

#### Scenario: Family resolution precedes culture evaluation

- **WHEN** a decision satisfies all three criteria and its family is resolved
- **THEN** the implementation flow checks only that resolved family's culture signal before deciding creation

### Requirement: Use the resolved family's physical index as the sole culture signal

The creation decision MUST inspect only `docs/adr/0000-INDEX.md` for the `adr` family or `docs/ddr/0000-INDEX.md` for the `ddr` family. Other records, the other family's index, and files outside the recognized locations MUST NOT establish culture.

#### Scenario: Existing resolved-family index

- **WHEN** the resolved family's physical `0000-INDEX.md` exists
- **THEN** a qualifying decision is created directly without an approval question

### Requirement: Require approval when the resolved-family index is absent

When a decision satisfies all three criteria but the resolved family's physical index is absent, implementation planning SHALL ask for explicit approval before creating the record, regardless of whether records exist elsewhere or no records exist. Approved creation SHALL use the cold-build branch.

#### Scenario: Missing resolved-family index

- **WHEN** a qualifying decision has no resolved-family index
- **THEN** the flow asks for approval naming the resolved family and creates nothing unless approval is explicit

### Requirement: Make non-qualifying decisions a no-op

A decision that fails any of the three ADR/DDR criteria SHALL create no record and SHALL ask no creation question, regardless of index state.

#### Scenario: Failed qualification

- **WHEN** any ADR/DDR criterion is not satisfied
- **THEN** the flow neither creates a decision record nor asks about creating one

# adr-creation-decision Specification

## Purpose
TBD - created by archiving change enforce-audit-step-append-verification. Update Purpose after archive.

## Requirements

### Requirement: Step 3 SHALL resolve the record family before deciding record creation

When `/sai-3-implement` Step 3 validates a design decision against the three ADR/DDR criteria (hard to reverse, surprising without context, real trade-off), it SHALL resolve creation in this order: first, only when all three criteria hold, Step 3 SHALL resolve the record family for the decision — reading the decision's `**Record family**` marker from `design.md` when present, and applying the ordered routing test when the marker is absent — then Step 3 SHALL check whether the project already maintains ADRs/DDRs; when the project already maintains records, Step 3 SHALL create the record file at `docs/<family>/NNNN-slug.md` (where `<family>` is `adr` or `ddr`) directly without asking the user; when the project does not maintain records, Step 3 SHALL ask the user whether to create the record — a closed yes/no on creation that names the resolved family (e.g. "This decision qualifies as a DDR. Do you want me to create it?") and SHALL NOT offer an ADR-vs-DDR choice — and SHALL create it only upon explicit approval. The project-culture check SHALL precede the ask, so the ask is never the default action for a qualifying decision in a project that maintains records.

#### Scenario: Project maintains records and decision qualifies

- **WHEN** a design decision meets all three ADR/DDR criteria, has a resolved family, and the project already maintains ADRs/DDRs
- **THEN** Step 3 SHALL create the record at `docs/<family>/NNNN-slug.md` directly without asking the user

#### Scenario: Project has no record culture and decision qualifies

- **WHEN** a design decision meets all three ADR/DDR criteria, has a resolved family, and the project does not maintain ADRs/DDRs
- **THEN** Step 3 SHALL ask the user whether to create the record as a closed yes/no choice, naming the resolved family
- **AND** SHALL create the file only if the user explicitly approves
- **AND** SHALL NOT offer "ADR or DDR" as an alternative in the ask

#### Scenario: Decision does not qualify

- **WHEN** a design decision does not meet all three ADR/DDR criteria
- **THEN** Step 3 SHALL NOT create a decision-record file and SHALL NOT ask the user

### Requirement: The ordered routing test resolves a qualifying decision's record family

The record family of a decision that meets all three ADR/DDR criteria SHALL be resolved by the ordered routing test — a total, order-sensitive test with no tie case:

1. **DDR test (evaluated first)**: the decision encodes a **domain invariant** — a constraint the pipeline's domain imposes that must hold of the pipeline's artifacts, records, or behavior at all times, stated as a property of the domain rather than as the mechanism that upholds it (for example, "a record's entry lives in exactly one index, its own family's"; "every finding carries a severity-prefixed identifier"; "supersedes SHALL NOT cross families"). When the decision encodes a domain invariant, the family is `ddr`.
2. **ADR test (evaluated second)**: otherwise — the decision is a choice about how the pipeline is built (layout, mechanism, tooling, ordering, policy) that does not state a domain invariant — the family is `adr`.

The test is ordered: a decision that both encodes a domain invariant and involves a mechanism or policy choice resolves to `ddr`, because the DDR test is evaluated first; no decision can therefore tie and none leaves room for improvisation. The routing test resolves the family only — the three criteria still decide whether a record is created at all.

#### Scenario: Decision encodes a domain invariant

- **WHEN** a qualifying design decision states a constraint that must hold of the pipeline's artifacts, records, or behavior at all times (e.g. "a record's entry lives in exactly one index")
- **THEN** the ordered routing test resolves the family to `ddr`

#### Scenario: Decision is a mechanism choice without a domain invariant

- **WHEN** a qualifying design decision chooses a layout, mechanism, tooling, ordering, or policy for how the pipeline is built and states no domain invariant
- **THEN** the ordered routing test resolves the family to `adr`

#### Scenario: Decision both encodes an invariant and involves a mechanism

- **WHEN** a qualifying design decision can be read both as encoding a domain invariant and as choosing a mechanism
- **THEN** the DDR test is evaluated first and the family resolves to `ddr` — the test is ordered, so there is no tie

#### Scenario: Routing resolves the family, criteria decide creation

- **WHEN** the ordered routing test resolves a family for a decision that meets none of the three criteria
- **THEN** no record is created — the routing test never licenses a record on its own

### Requirement: sai-2 records the resolved family in design.md; sai-3 reads it

During `/sai-2-design`, every Decision in `design.md`'s `## Decisions` section that meets all three ADR/DDR criteria SHALL carry the pinned sub-field `**Record family**: adr|ddr`, whose value is resolved by the ordered routing test; the `**Record family**` label is pinned byte-exact so two independent design runs emit the same parseable token. During `/sai-3-implement` Step 3, the family for a qualifying decision SHALL be read from that marker; Step 3 SHALL NOT re-decide the family for a decision that carries one. When a qualifying decision carries no marker (the design predates this requirement, or the decision surfaced only at implementation time), Step 3 SHALL apply the ordered routing test itself to resolve the family.

#### Scenario: Marker present in design.md

- **WHEN** `design.md` records `**Record family**: ddr` for a qualifying decision
- **THEN** Step 3 SHALL create the record under `docs/ddr/` and SHALL NOT re-run the routing test for that decision

#### Scenario: Marker absent in design.md

- **WHEN** Step 3 validates a qualifying decision whose `design.md` entry carries no `**Record family**` marker
- **THEN** Step 3 SHALL apply the ordered routing test to resolve the family before creating the record

### Requirement: Every criteria-evaluation surface resolves the family by the routing test

Every instruction surface that evaluates the three ADR/DDR criteria SHALL resolve a qualifying decision's family by the ordered routing test and SHALL NOT leave the ADR-vs-DDR choice open. The three criteria, the ordered routing test, and the never-leave-the-choice-open rule SHALL be single-sourced in `sai/policies/adr-ddr-criteria.md`; a fetching instruction surface SHALL fetch that policy and SHALL NOT restate them inline. Exactly two instruction surfaces evaluate the criteria: `sai/commands/design/instructions.md`'s `## Decisions` evaluation, which records the resolved family per the design.md marker requirement, and `sai/commands/implement/instructions.md` Step 3, which acts on the recorded family. `sai/commands/spec/instructions.md` SHALL NOT carry a criteria-evaluation surface, because the `/sai-1-spec` phase authors no design decisions. The phrase "ADR/DDR" SHALL name the evaluation surface (the two-family criteria check) and SHALL NOT be used to leave the family unresolved.

#### Scenario: design.md Decisions evaluation resolves the family

- **WHEN** `/sai-2-design` evaluates a Decision against the three criteria and all three hold
- **THEN** the design instruction directs the design agent to resolve the family by the ordered routing test defined in `sai/policies/adr-ddr-criteria.md` and record it as `**Record family**: adr|ddr`

#### Scenario: The criteria and routing test are single-sourced

- **WHEN** `sai/commands/design/instructions.md` and `sai/commands/implement/instructions.md` are read at their criteria-evaluation surfaces
- **THEN** each fetches `sai/policies/adr-ddr-criteria.md` and neither restates the three criteria or the ordered routing test inline

#### Scenario: sai-1 carries no criteria-evaluation surface

- **WHEN** `sai/commands/spec/instructions.md` is read
- **THEN** it contains no `## ADR/DDR Proposal Check` section, no restatement of the three criteria or the ordered routing test, and no cross-reference from the Complexity Derivation Rubric to a deleted ADR/DDR section

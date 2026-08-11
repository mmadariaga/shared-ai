# explore-handoff-edge-cases Specification

## Purpose

TBD

## Requirements

### Requirement: Every Ready to Propose block carries an Edge Cases section

Every single-change or per-slice `Ready to Propose` block emitted by `sai-explore` SHALL include a dedicated `**Edge Cases**` section after the existing `**Key constraints**` section. The section SHALL reproduce the agreed edge-case identifiers and behavior statements in order, and SHALL contain exactly one `- None` bullet when the block has no attributed edge cases.

#### Scenario: A single-change handoff includes agreed edge cases

- **WHEN** an agreed edge-case list exists and a single-change `Ready to Propose` block is emitted
- **THEN** the block contains an `**Edge Cases**` section with the agreed `E1`…`En` entries in their established order

#### Scenario: An empty list still emits the section

- **WHEN** no in-scope edge cases are agreed for a handoff
- **THEN** the `Ready to Propose` block contains `**Edge Cases**` followed by exactly `- None`

### Requirement: Sliced handoffs mechanically attribute one agreed list per slice

When crystallization emits multiple per-slice blocks, `sai-explore` SHALL use the one agreed edge-case list for the whole idea and mechanically partition it by the slice whose user-facing behavior owns each scope boundary. Each `E` item SHALL be emitted in exactly one slice's `**Edge Cases**` section, preserving its global identifier, wording, and order; no slice may trigger a new review or independently rewrite the list.

#### Scenario: Edge cases are attributed without being lost or duplicated

- **WHEN** a sliced idea has agreed edge cases and its ordered blocks are emitted
- **THEN** each edge case appears in the `**Edge Cases**` section of its owning slice exactly once, with the same `E` identifier and behavior statement
- **AND** a slice with no attributed cases emits `- None`

### Requirement: Non-change edge cases remain Non-Goals

The handoff SHALL NOT include an edge case that does not define behavior or a scope boundary for the proposed change. Such an item SHALL remain represented as a Non-Goal in the exploration's non-goal handling and SHALL NOT be assigned an `E` identifier or copied into any `**Edge Cases**` section.

#### Scenario: Explicit non-goals are excluded from the handoff

- **WHEN** exploration identifies a possible edge case that is explicitly outside the proposed change
- **THEN** it remains a Non-Goal and is absent from every `**Edge Cases**` section

#### Scenario: Only excluded cases produce None

- **WHEN** all discussed edge cases are outside the change's scope boundary
- **THEN** every emitted handoff block uses `**Edge Cases**` with `- None`

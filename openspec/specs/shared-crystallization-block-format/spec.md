# Shared Crystallization Block Format Specification

## Purpose

Canonical Ready to Propose block format shared by explore crystallization and its spec-phase consumers.

## Requirements

### Requirement: Canonical Ready to Propose block format

The `Ready to Propose` block format — the crystallized handoff between explore and spec phases — SHALL be single-sourced and canonicalized in `sai/policies/ready-to-propose-format.md`. The specification file defines the mandatory structure, field order, mandatory sections, field rules, OpenSpec exclusions, and provenance citation rules. Explore's crystallization protocol SHALL reference this policy file via fetch directive and emit blocks conforming to its specified structure without restating inline template text. The wording-preserved rule for Edge Cases and Implementation Details SHALL mean identifiers and order, not source language, and SHALL NOT block translation under the crystallization language gate.

#### Scenario: format is single-sourced in policy file

- **WHEN** explore emits a `Ready to Propose` block via the crystallization protocol
- **THEN** the block conforms to the structure defined in `sai/policies/ready-to-propose-format.md`
- **AND** the crystallization protocol file references the policy via fetch directive rather than containing inline format specification

#### Scenario: multiple consuming surfaces reference the same policy

- **WHEN** a second consuming surface needs to reference the `Ready to Propose` block format
- **THEN** it fetches `@sai/policies/ready-to-propose-format.md` by reference
- **AND** no format duplication occurs across multiple files

#### Scenario: wording preservation permits gate translation

- **WHEN** agreed E1-En and I1-In statements are emitted under the crystallization language gate
- **THEN** identifiers and order are preserved while the statement language follows the chosen block language

### Requirement: Behavior is unchanged

The extraction of the format specification to a policy file SHALL be behavior-preserving. The extraction itself SHALL NOT rename, reorder, remove, or add any field, change any content rule, or alter any parsing or consumption rule. A field MAY enter the block only through a change that amends `sai/policies/ready-to-propose-format.md`. The optional `**Request Additional Notes**` field is such an amendment: a block that omits it SHALL remain byte-for-byte identical to a block emitted before the field existed.

#### Scenario: emitted blocks remain identical

- **WHEN** explore crystallizes a `Ready to Propose` block that carries no Request Additional Notes content
- **THEN** the block's field names, order, content rules, and markup remain unchanged from prior emissions
- **AND** the block remains consumable by all existing downstream surfaces

### Requirement: Optional non-normative Request Additional Notes field

The `Ready to Propose` block format in `sai/policies/ready-to-propose-format.md` SHALL define an optional `**Request Additional Notes**` field of free Markdown (paragraphs or bullets). When present, the field SHALL follow `**Implementation Details**` and immediately precede `**Overview language**`, which SHALL remain the last line before the `---` separator. The field SHALL sit outside the five mandatory sections and SHALL be omitted entirely, with no label and no `- None`, when it has no content. It SHALL carry only user-agreed context that fits no other field. It SHALL NOT duplicate another field's content, and it SHALL NOT carry an obligation: binding agreements SHALL go to `**Edge Cases**`, `**Implementation Details**`, or `**Key constraints**`. In a sliced crystallization set, each per-slice block SHALL carry only its own slice's notes or omit the field. Consumers SHALL derive no requirement, scenario, or mandatory scope from the field.

#### Scenario: Field sits before the Overview language line

- **WHEN** an emitted block carries Request Additional Notes content
- **THEN** the `**Request Additional Notes**` label appears after `**Implementation Details**` and immediately before `**Overview language**`, which stays the last line before `---`

#### Scenario: Empty field is omitted

- **WHEN** the conversation left no agreement that fits outside the official fields
- **THEN** the emitted block contains no `**Request Additional Notes**` label and no `- None` placeholder for it

#### Scenario: Obligations stay out of the notes field

- **WHEN** a conversation agreement imposes an obligation on the change
- **THEN** it is emitted under `**Edge Cases**`, `**Implementation Details**`, or `**Key constraints**` and never under `**Request Additional Notes**`

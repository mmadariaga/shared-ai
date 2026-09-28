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

The `Ready to Propose` block format in `sai/policies/ready-to-propose-format.md` SHALL define an optional `**Request Additional Notes**` field of free Markdown (paragraphs or bullets). When present, the field SHALL follow `**Implementation Details**` and immediately precede `**Overview language**`, which SHALL remain the last line before the `---` separator. The field SHALL sit outside the five mandatory sections. When it has no content, it SHALL be omitted entirely, with no label and no `- None`.

The field rule SHALL define the field positively as discussed, agreed context that could influence implementation and fits no other field. It SHALL name these non-exhaustive examples: future behavior agreed on but excluded from this change; related follow-up work, such as PBIs or tickets; and other agreed context of this kind, including points left explicitly undecided.

The rule SHALL treat a non-goal and its detail as two facts. The non-goal is a binding exclusion that goes to `**Key constraints**`, and its detail goes to `**Request Additional Notes**`. The pair SHALL NOT count as duplication. A requirement that describes future behavior outside this change SHALL go to the notes field as future context. The field SHALL NOT carry an obligation of this change: binding agreements SHALL go to `**Edge Cases**`, `**Implementation Details**`, or `**Key constraints**`. Each fact SHALL be carried once, in the field that owns it.

The rule SHALL define an emission sweep that runs before the block is printed. The sweep is complete when every discussed-and-excluded topic whose detail goes beyond its non-goal in `**Key constraints**` has that detail in `**Request Additional Notes**`. The sweep SHALL live only in the policy's field rule, and block-emitting surfaces SHALL inherit it by reference. In a sliced crystallization set, each per-slice block SHALL sweep only its own slice's content and carry only its own slice's notes, or omit the field. Any example in the rule SHALL be generic and illustrative. Consumers SHALL derive no requirement, scenario, or mandatory scope from the field.

#### Scenario: Field sits before the Overview language line

- **WHEN** an emitted block carries Request Additional Notes content
- **THEN** the `**Request Additional Notes**` label appears after `**Implementation Details**` and immediately before `**Overview language**`, which stays the last line before `---`

#### Scenario: Empty field is omitted

- **WHEN** the conversation left no content that meets the field definition or the emission-sweep criterion
- **THEN** the emitted block contains no `**Request Additional Notes**` label and no `- None` placeholder for it

#### Scenario: Obligations stay out of the notes field

- **WHEN** a conversation agreement imposes an obligation on the change
- **THEN** it is emitted under `**Edge Cases**`, `**Implementation Details**`, or `**Key constraints**` and never under `**Request Additional Notes**`

#### Scenario: Non-goal detail is carried in the notes field

- **WHEN** a conversation excludes a topic from the change and also agrees on detail about how that excluded behavior should work later
- **THEN** the exclusion is emitted under `**Key constraints**` and the detail under `**Request Additional Notes**`, and the pair is not treated as duplication

#### Scenario: Emission sweep runs before the block is printed

- **WHEN** a block-emitting surface is about to print a `Ready to Propose` block
- **THEN** it verifies that every discussed-and-excluded topic whose detail goes beyond its non-goal in `**Key constraints**` has that detail in `**Request Additional Notes**` before emission

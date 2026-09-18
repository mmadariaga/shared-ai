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

The extraction of the format specification to a policy file SHALL be behavior-preserving. The `Ready to Propose` blocks emitted by explore's crystallization protocol SHALL remain byte-for-byte identical to blocks emitted prior to this change. No field is renamed, reordered, removed, or added; no content rule is changed; no parsing or consumption rule is altered.

#### Scenario: emitted blocks remain identical

- **WHEN** explore crystallizes a `Ready to Propose` block after the format extraction
- **THEN** the block's field names, order, content rules, and markup remain unchanged from prior emissions
- **AND** the block remains consumable by all existing downstream surfaces

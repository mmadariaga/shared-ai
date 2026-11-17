# Shared Step Contract Section Format Specification

## Purpose

This capability single-sources the per-step interfaces contract format so design and apply consumers generate and interpret it consistently.

## Requirements

### Requirement: Canonical step contract section format for interfaces.md

The `## Step N` section format for `interfaces.md` — the per-step contract specifying public signatures and test assertions — SHALL be single-sourced and canonicalized in `sai/policies/step-contract-format.md`. The specification file defines the section structure (heading, Interfaces field, Test assertions field), field rules, omission rule for steps with no interface surface, the anchoring rule tying assertions to `specs/**/*.md` requirements, per-step keying rules, and all constraints. Design's interfaces step SHALL reference this policy file via fetch directive and emit step sections conforming to its specified structure without restating inline template text.

#### Scenario: format is single-sourced in policy file

- **WHEN** design generates `interfaces.md` via the interfaces step
- **THEN** each `## Step N` section conforms to the structure defined in `sai/policies/step-contract-format.md`
- **AND** the interfaces step file references the policy via fetch directive rather than containing inline format specification

#### Scenario: apply's routing tree consumes consistent format

- **WHEN** apply's routing tree evaluates step contracts to route Steps
- **THEN** it encounters `## Step N` sections matching the canonical format defined in `sai/policies/step-contract-format.md`
- **AND** the routing tree's exact-match lookup for `## Step N` sections remains reliable

### Requirement: Omission rule is preserved

The omission rule — steps that introduce neither a modified interface nor a testable assertion are omitted; when no step admits a contract, the file contains the `None — no step contracts` sentinel — is single-sourced in the policy file and SHALL be applied identically by all consuming surfaces. No step contract is authored inline in any command file.

#### Scenario: omission rule applied consistently

- **WHEN** design generates an `interfaces.md` with steps that have no interface surface
- **THEN** those steps are omitted per the rule defined in `sai/policies/step-contract-format.md`
- **AND** if all steps are omitted, the file contains the `None — no step contracts` sentinel as sole content

### Requirement: Behavior is unchanged

The extraction of the format specification to a policy file SHALL be behavior-preserving: the extraction itself changed no section structure, renamed, reordered, removed, or added no field, and altered no omission rule or anchoring rule. Later format changes are made in `sai/policies/step-contract-format.md` itself and recorded by their own requirements, such as the list form of `**Test assertions**` with its optional `[smoke-test]` mark; an `interfaces.md` written in an earlier form that a later change keeps valid SHALL remain consumable.

#### Scenario: generated interfaces.md remains identical

- **WHEN** design generates `interfaces.md` with the format the policy defines
- **THEN** the file's section structure, per-step keying, omission rule, and anchoring rule are the ones the policy states, with no change introduced by the extraction
- **AND** the file remains consumable by all existing downstream surfaces

### Requirement: Assertions anchor to the proposal under skip_specs
For a change whose `.openspec.yaml` sets `skip_specs: true`, `sai/policies/step-contract-format.md` SHALL let each test assertion cite a statement of `proposal.md`, by its section heading and the statement's wording, instead of a `specs/**/*.md` requirement or scenario. Changes with spec files SHALL keep anchoring assertions to specs.

#### Scenario: A no-specs change anchors assertions to the proposal
- **WHEN** design writes `interfaces.md` for a change with `skip_specs: true`
- **THEN** each test assertion cites a `proposal.md` statement by section heading and wording

### Requirement: Test assertions are a list with an optional smoke-test mark
`sai/policies/step-contract-format.md` SHALL define the `**Test assertions**` field of each `## Step N` section of `interfaces.md` as a Markdown list with one assertion per item, each item keeping the existing anchoring rule. An item MAY start with the prefix `[smoke-test]`, which marks an assertion that guards critical behavior: its failure leaves the system useless for its main purpose, or the behavior charges, pays, moves, or computes money. An item that meets neither condition SHALL carry no mark. The policy SHALL be the single source of the mark and its criterion. A `**Test assertions**` field written in the earlier prose form, one paragraph with no list, SHALL stay valid and SHALL carry no mark. The template at `openspec/schemas/sai-workflow/templates/interfaces.md` SHALL show the list form with one marked and one unmarked item.

#### Scenario: Assertions are written as a list
- **WHEN** design writes the `**Test assertions**` of a step
- **THEN** each assertion is its own list item, anchored as the policy requires

#### Scenario: Earlier prose form stays valid
- **WHEN** a consumer reads an `interfaces.md` whose `**Test assertions**` is one prose paragraph
- **THEN** the field is valid and holds no smoke-test mark

#### Scenario: Template shows both item kinds
- **WHEN** `openspec/schemas/sai-workflow/templates/interfaces.md` is read
- **THEN** its `**Test assertions**` scaffold shows one item prefixed `[smoke-test]` and one unmarked item

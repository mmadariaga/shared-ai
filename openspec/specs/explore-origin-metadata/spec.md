# explore-origin-metadata Specification

## Purpose
TBD - created by archiving change record-explore-origin-telemetry. Update Purpose after archive.

## Requirements

### Requirement: Planning and backfill persist explore_origin

When a validated block carries `**Explore origin**`, the spec worker, the backfill worker (including the Direct Build prepare route), and the Direct Build coordinator SHALL persist the validator's `explore_origin` list in the change's `.openspec.yaml` as the flat flow list `explore_origin: [<sessionID>, <sessionID>]`, in the block's order. The Direct Build coordinator SHALL pass the stored block's `Explore origin` unchanged to backfill, and the backfill coordinator SHALL accept the key in both canonical metadata forms. A spec refinement run with no block SHALL leave an existing `explore_origin` as it is. The key SHALL be telemetry provenance only: it SHALL add no requirement and no scope and SHALL never set `prior_intent`.

#### Scenario: the spec worker writes the list
- **WHEN** the spec worker processes a validated block carrying `**Explore origin**: opencode ses_a, ses_b`
- **THEN** the change's `.openspec.yaml` reads `explore_origin: [ses_a, ses_b]` and that path is listed in `changed_files`

#### Scenario: a refinement keeps the existing list
- **WHEN** the spec worker refines a change with no block and its `.openspec.yaml` already holds `explore_origin`
- **THEN** the `explore_origin` key stays unchanged

### Requirement: The metadata reader returns explore_origin as an ordered list

`sai/tools/openspec-yaml.js` SHALL read a top-level `explore_origin: [...]` flat flow list and return it as `explore_origin`, an array of session IDs in file order with surrounding quotes and blanks removed. When the key is absent, `explore_origin` SHALL be an empty array.

#### Scenario: the list is read in order
- **WHEN** `.openspec.yaml` contains `explore_origin: [ses_a, "ses_b"]`
- **THEN** the reader returns `explore_origin` as `["ses_a", "ses_b"]`

#### Scenario: an absent key reads as empty
- **WHEN** `.openspec.yaml` has no `explore_origin` key
- **THEN** the reader returns `explore_origin` as an empty array

### Requirement: The harness of a persisted explore_origin id is inferred from its shape

`.openspec.yaml` SHALL keep the `explore_origin` ids bare, without a harness prefix. `sai/tools/openspec-yaml.js` SHALL export `exploreOriginHarness(id)`, which SHALL return `opencode` for an id matching `ses_...`, `claude` for a UUID, and `null` for any other id, and SHALL export the `OPENCODE_SESSION` and `CLAUDE_SESSION` patterns it uses.

#### Scenario: each id shape maps to its harness
- **WHEN** `exploreOriginHarness` receives `ses_a`, a UUID, and `abc`
- **THEN** it returns `opencode`, `claude`, and `null` respectively

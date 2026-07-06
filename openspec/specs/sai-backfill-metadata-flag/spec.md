## ADDED Requirements

### Requirement: .openspec.yaml MUST declare backfilled: true

`sai/instructions/backfill.md` Phase 5a MUST write a `backfilled: true` field into `openspec/changes/{name}/.openspec.yaml` alongside the existing `schema` and `created` keys. The `backfilled` field MUST be a boolean literal `true`; the field MUST NOT be omitted, MUST NOT be set to a string or any other type, and MUST NOT be conditionally written.

#### Scenario: backfilled key is present and true

    - **WHEN** `/sai-backfill` writes `openspec/changes/{name}/.openspec.yaml` during Phase 5a
    - **THEN** the file MUST contain a line `backfilled: true` and MUST still contain the existing `schema:` and `created:` keys

#### Scenario: backfilled key is read by archive and other consumers

    - **WHEN** a downstream tool reads `openspec/changes/{name}/.openspec.yaml`
    - **THEN** the `backfilled` key MUST be present with boolean value `true` and parsers MUST be able to read it as a boolean (not a string)

### Requirement: backfilled is a binary flag for now

The `backfilled` field MUST be a binary boolean. The field MUST NOT carry additional metadata such as `backfilled_at`, `base_sha`, or any other companion key. Adding richer metadata is a future change and is out of scope for this capability.

#### Scenario: No companion metadata keys

    - **WHEN** the agent writes `.openspec.yaml` in Phase 5a
    - **THEN** the file MUST contain exactly one `backfilled` key with value `true` and MUST NOT contain any key whose name starts with `backfilled_` (e.g. `backfilled_at`, `backfilled_from`)

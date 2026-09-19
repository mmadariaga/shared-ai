# sai-backfill-metadata-flag Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements

### Requirement: .openspec.yaml MUST declare backfilled: true

`sai/commands/backfill/instructions.md` Phase 5a MUST write a `backfilled: true` field into `openspec/changes/{name}/.openspec.yaml` alongside the existing `schema` and `created` keys. The `backfilled` field MUST be a boolean literal `true`; the field MUST NOT be omitted, MUST NOT be set to a string or any other type, and MUST NOT be conditionally written.

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

### Requirement: Direct Build Validates .openspec.yaml Against Both Canonical Forms

The Direct Build (unattended) spec-review step SHALL validate a prepared `openspec/changes/{name}/.openspec.yaml` against the canonical forms defined in `sai/commands/backfill/instructions.md` section 6a rather than against the capability schema. The three-key form (`schema`, `created` as a `YYYY-MM-DD` date only, `backfilled: true`) SHALL validate for a run with no usable intent context, and the four-key form (those three keys plus `prior_intent: true`) SHALL validate for a run with usable intent context. Each form SHALL validate under its own condition, and no other key SHALL be accepted.

#### Scenario: A prepared draft carries the four-key intent form

- **WHEN** the spec-review step validates a prepared `.openspec.yaml` from a backfill run that had usable intent context
- **THEN** the four-key form including `prior_intent: true` validates, while a three-key draft from a run without usable intent context also validates under its own condition

# direct-build-schema-scope Specification

## Purpose
TBD - created by archiving change direct-build-schema-writes. Update Purpose after archive.
## Requirements
### Requirement: Schemas are shipped product scope

The Direct Build flow SHALL treat `openspec/schemas/**` as shipped product scope writable by the step-1 implementer, because the tree is byte-copied into every consumer project and enforced by contract tests. The implementer SHALL be permitted to create and modify files under `openspec/schemas/**` in step 1, while `openspec/specs/**`, `openspec/changes/**`, and `openspec/config.yaml` SHALL stay forbidden or reserved.

#### Scenario: Product schema fix runs under implementer

- **WHEN** the implementer receives a block requiring a schemas product fix
- **THEN** it writes under `openspec/schemas/**` and reports those paths in changed_files

### Requirement: Contract tests enforce the schemas-allowed boundary

The repository SHALL maintain contract tests that assert the implementer ban permits `openspec/schemas/**` while keeping `openspec/specs/**`, `openspec/changes/**`, and `openspec/config.yaml` forbidden or reserved, assert the step-1 detector excludes `openspec/schemas/**` while flagging the still-forbidden paths, assert explore instructions state the schemas-allowed boundary, assert backfill and archive keep their closed file sets with no schemas duplication, and assert the final commit stages the implementer union including schemas files. The suite MUST fail when the boundary regresses to the total ban or widens beyond schemas.

#### Scenario: Boundary regression fails contract tests

- **WHEN** total-ban wording returns or schemas permission is removed
- **THEN** the contract tests fail

### Requirement: Final commit includes schema files

The Direct Build archive execution SHALL stage only the supplied OWNED paths including reconstructed artifacts, synced main specs, and the implementer's unioned changed paths, which SHALL include modified `openspec/schemas/**` files when the implementer changed them. The pre-authorized local commit MUST include those schema files and MUST never include unrelated dirty files.

#### Scenario: Schema files enter the pre-authorized commit

- **WHEN** the implementer union contains schemas files
- **THEN** archive execution stages them with artifacts and specs in the local commit


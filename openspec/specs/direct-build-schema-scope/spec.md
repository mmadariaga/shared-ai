# direct-build-schema-scope Specification

## Purpose
TBD - created by archiving change direct-build-schema-writes. Update Purpose after archive.

## Requirements

### Requirement: Schemas are shipped product scope
The Direct Build flow SHALL treat any repository artifact required by the crystallized block as writable by the step-1 implementer, regardless of file format, including shipped product schemas under `openspec/schemas/**` as product scope. The implementer SHALL NOT directly modify `openspec/specs/**`, SHALL NOT create planning artifacts, SHALL NOT run a mutating git command, and SHALL NOT dispatch subagents, with proposal, specs, design, tasks, and metadata reconstructed later by backfill.

#### Scenario: Required artifact runs under implementer
- **WHEN** the implementer receives a block requiring a prompt, policy, or schema artifact
- **THEN** it writes that required artifact and reports those paths in changed_files

#### Scenario: Product schema fix runs under implementer
- **WHEN** the implementer receives a block requiring a schemas product fix
- **THEN** it writes under `openspec/schemas/**` and reports those paths in changed_files

### Requirement: Contract tests enforce the schemas-allowed boundary
The repository SHALL maintain contract tests that assert the implementer uses the repository-artifact scope while keeping direct `openspec/specs/**` modification forbidden, assert the step-1 scope delegates published-spec protection to the shared policy, assert explore instructions state the repository-artifact implementer boundary, assert backfill and archive keep their closed file sets with no schemas duplication, and assert the final commit stages the implementer union including required artifact files. The suite SHALL fail when the boundary regresses to the narrow allowlist or permits direct published-spec edits.

#### Scenario: Boundary regression fails contract tests
- **WHEN** narrow allowlist wording returns or direct published-spec permission appears
- **THEN** the contract tests fail

### Requirement: Final commit includes schema files
The Direct Build archive execution SHALL stage only the supplied OWNED paths including reconstructed artifacts, synced main specs, and the implementer's unioned changed paths, which SHALL include modified required artifact files including `openspec/schemas/**` files when the implementer changed them. The pre-authorized local commit SHALL include those artifact files and SHALL never include unrelated dirty files.

#### Scenario: Artifact files enter the pre-authorized commit
- **WHEN** the implementer union contains required artifact files
- **THEN** archive execution stages them with artifacts and specs in the local commit

#### Scenario: Schema files enter the pre-authorized commit
- **WHEN** the implementer union contains schemas files
- **THEN** archive execution stages them with artifacts and specs in the local commit

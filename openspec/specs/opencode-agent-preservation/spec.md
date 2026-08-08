# Opencode Agent Preservation Specification

## Purpose

Define file-based ownership for installer-provisioned opencode agents — the installer never writes configuration agent keys, and doctor and uninstall identify managed agent files by body-and-non-tunable-frontmatter identity under the tunable-seed lifecycle.

## Requirements

### Requirement: Existing opencode agent definitions are user-owned
The installer SHALL treat an existing key in the opencode `agent` map as user-owned, including keys that have repository-provided defaults. The installer SHALL NOT write any `agent` key — the narrowed merge performs only the SAI external-directory permission merge and never inserts, overwrites, normalizes, or repairs an existing definition. A merge that adds other entries SHALL preserve the existing definition and unrelated configuration content.

#### Scenario: Customized managed agent is preserved
- **WHEN** a parseable opencode configuration contains an expected managed agent with a customized model, variant, or other fields
- **THEN** installation SHALL complete without an incompatible-agent error and the existing agent definition SHALL remain unchanged

#### Scenario: Customized default helper agent is preserved
- **WHEN** a parseable opencode configuration contains an existing installer-provisioned helper agent with a customized definition
- **THEN** installation SHALL leave that definition unchanged and SHALL NOT process it as a merge target

#### Scenario: Fully populated configuration remains byte-identical
- **WHEN** every installer-provisioned agent name already exists in the selected opencode configuration
- **THEN** installation SHALL make no agent-key configuration write and the selected file SHALL remain byte-for-byte unchanged except for any SAI permission merge

### Requirement: Doctor validates projected opencode worker agent files
Doctor SHALL validate each manifest-projected opencode worker agent file against its bundled source by comparing only the body and the non-tunable frontmatter: tunable lines (`model`, `variant`) MUST be stripped from both the destination and the source before the comparison. A missing file SHALL be reported as an error with re-install remediation, a body-or-non-tunable-frontmatter divergence SHALL be reported as an error naming the file, and an exact-compatible file (body and non-tunable frontmatter match) SHALL be reported as valid. The "rename or remove the conflicting definition" wording is retired because the new installer overwrites the body and non-tunable frontmatter and emits a console notice rather than blocking installation. Doctor SHALL NOT validate worker presence in the opencode configuration agent map.

#### Scenario: Compatible projected worker files are accepted
- **WHEN** every projected opencode worker agent file exists with content matching its bundled source after tunable lines are stripped
- **THEN** doctor SHALL report those agent records with `ok` severity
- **AND** doctor SHALL not report a tunable-only difference as an error

#### Scenario: Missing worker agent file is reported
- **WHEN** a projected opencode worker agent file is absent
- **THEN** doctor SHALL report that agent as an error identifying it as missing
- **AND** the message SHALL match the regular expression `/re-?install/i`

#### Scenario: Incompatible body or non-tunable frontmatter is reported
- **WHEN** a projected opencode worker agent file exists but its body or non-tunable frontmatter differs from its bundled source
- **THEN** doctor SHALL report that agent as an error identifying it as incompatible
- **AND** the message SHALL NOT carry the rename-or-remove remediation, because the installer overwrites and continues

### Requirement: Regression tests protect agent ownership semantics
The automated test suite SHALL cover installation and doctor behavior for customized existing agents, the permission-only merge, and the absence of any agent-key insertion. The tests SHALL verify that ordinary installer-managed file replacement behavior is unaffected, and SHALL assert that a config carrying the three helper-agent keys is left byte-for-byte unchanged and triggers the migration notice.

#### Scenario: Installer regression coverage confirms no agent-key writes
- **WHEN** the installation regression suite runs cases with customized existing agents and configs carrying the three helper-agent keys
- **THEN** it SHALL verify that existing definitions are unchanged, that no agent key is added to any config, and that the migration notice fires when the keys are present

#### Scenario: Doctor regression coverage distinguishes present from missing names
- **WHEN** the doctor regression suite runs against customized and incomplete opencode configurations
- **THEN** it SHALL verify that present customized names are `ok` and absent names remain errors, with no config-agent validation performed

### Requirement: Opencode collision-policy documentation matches ownership semantics
The accepted opencode collision-policy statements in `docs/adr/0077-harness-specific-worker-bindings.md` and `docs/adr/0088-implementation-harness-projection-boundaries.md` SHALL describe the seven projected opencode worker agent files and the three projected generic agent files (`explore`, `executor`, `budget`), the `tunable-seed` lifecycle (create when absent with the shipped tunables, overwrite body and non-tunable frontmatter on subsequent installs while preserving the destination's tunable values placed per the structural anchor in `agent-tunable-ownership`, emit a console notice when a body overwrite occurs), and the body-and-non-tunable identity rule used by doctor and uninstall; SHALL describe the configuration merge as covering only the external-directory permission; and SHALL avoid stating that customized opencode worker definitions are preserved by name in the configuration. Their Claude worker and ordinary managed-file collision statements SHALL remain unchanged.

#### Scenario: Affected ADRs describe current opencode ownership
- **WHEN** the affected ADRs are read after this change is applied
- **THEN** their opencode sections SHALL refer to the projected worker and generic agent files
- **AND** SHALL state the tunable-seed lifecycle and the body-and-non-tunable identity rule
- **AND** SHALL describe the configuration merge as covering only the external-directory permission, not any agent entries

#### Scenario: Non-opencode safety policy remains documented
- **WHEN** the affected ADRs describe Claude worker files or ordinary managed destinations
- **THEN** they SHALL continue to document collision protection, no-overwrite behavior, and guarded ownership handling for those surfaces

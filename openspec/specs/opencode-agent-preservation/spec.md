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
The automated test suite SHALL cover installation and doctor behavior: customized existing agent definitions, the permission-only merge, the absence of any agent-key insertion, and the three projected-file outcomes doctor reports for opencode worker agents (compatible, missing, and body-or-non-tunable-frontmatter divergence). The tests SHALL verify that ordinary installer-managed file replacement behavior is unaffected, and SHALL assert that a config carrying the three helper-agent keys is left byte-for-byte unchanged and triggers the migration notice.

#### Scenario: Installer regression coverage confirms no agent-key writes
- **WHEN** the installation regression suite runs cases with customized existing agents and configs carrying the three helper-agent keys
- **THEN** it SHALL verify that existing definitions are unchanged, that no agent key is added to any config, and that the migration notice fires when the keys are present

#### Scenario: Doctor regression coverage distinguishes the three projected-file outcomes
- **WHEN** the doctor regression suite runs against projected agent file trees whose worker files are compatible, missing, or divergent in body or non-tunable frontmatter
- **THEN** it SHALL verify that compatible projected files are `ok`, missing files remain errors, and body-or-non-tunable-frontmatter-divergent files are reported as incompatible errors
- **AND** no config-agent validation is performed

### Requirement: Opencode collision-policy documentation matches ownership semantics
Current documentation in `docs/skills.md` SHALL describe the projected generic agents as `budget-explorer`, `budget-executor`, and `budget-subagent`, the tunable-seed lifecycle, and the managed-content protections used by doctor and uninstall. Global installation SHALL leave project-local definitions and legacy configuration keys unchanged and document their manual migration. Historical decision records SHALL remain historical evidence rather than being rewritten for the rename.

#### Scenario: Affected ADRs describe current opencode ownership
- **WHEN** current migration documentation and the affected historical ADRs are read after this change is applied
- **THEN** current documentation SHALL refer to the renamed projected generic agent files and historical ADRs SHALL retain their historical content; SHALL state the tunable-seed lifecycle and the body-and-non-tunable identity rule; SHALL describe the configuration merge as covering only the external-directory permission, not any agent entries

#### Scenario: Non-opencode safety policy remains documented
- **WHEN** historical ADRs describe Claude worker files or ordinary managed destinations
- **THEN** they SHALL continue to document collision protection, no-overwrite behavior, and guarded ownership handling for those surfaces

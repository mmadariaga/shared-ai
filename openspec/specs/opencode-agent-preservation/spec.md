# Opencode Agent Preservation Specification

## Purpose

Define name-based ownership and default bootstrapping for installer-provisioned opencode agents.

## Requirements

### Requirement: Existing opencode agent definitions are user-owned
The installer SHALL treat an existing key in the opencode `agent` map as user-owned, including keys that have repository-provided defaults. It MUST NOT compare an existing definition with a repository default, reject it as an incompatible collision, overwrite it, normalize it, or repair any of its fields. A merge that adds other entries SHALL preserve the existing definition and unrelated configuration content.

#### Scenario: Customized managed agent is preserved
- **WHEN** a parseable opencode configuration contains an expected managed agent with a customized model, variant, or other fields
- **THEN** installation SHALL complete without an incompatible-agent error and the existing agent definition SHALL remain unchanged

#### Scenario: Customized default helper agent is preserved
- **WHEN** a parseable opencode configuration contains an existing installer-provisioned helper agent with a customized definition
- **THEN** installation SHALL leave that definition unchanged while processing other agent names

#### Scenario: Fully populated configuration remains byte-identical
- **WHEN** every installer-provisioned agent name already exists in the selected opencode configuration
- **THEN** installation SHALL make no configuration write and the selected file SHALL remain byte-for-byte unchanged

### Requirement: Missing opencode agents are bootstrapped with repository defaults
For each installer-provisioned opencode agent name that is absent from a parseable object-valued `agent` map, the installer SHALL add the repository default definition. It SHALL add only missing names and SHALL retain the existing precedence between `opencode.json` and `opencode.jsonc` and the existing fallback behavior for malformed configuration.

#### Scenario: Missing managed agents receive defaults
- **WHEN** a parseable opencode configuration is missing one or more expected managed agent names
- **THEN** installation SHALL add each missing name with its repository default definition

#### Scenario: Mixed customized and missing agents are merged
- **WHEN** the configuration contains a customized existing agent and omits another installer-provisioned agent
- **THEN** installation SHALL preserve the customized definition and add only the omitted agent with its repository default

#### Scenario: Malformed configuration remains protected
- **WHEN** the selected opencode configuration cannot be parsed or does not contain an object-valued root or `agent` map required for merging
- **THEN** installation SHALL leave the file unchanged and use the existing manual-guidance fallback instead of rewriting it

### Requirement: Doctor validates projected opencode worker agent files
Doctor SHALL validate each manifest-projected opencode worker agent file against its bundled source: a missing file SHALL be reported as an error with re-install remediation, an incompatible file SHALL be reported as an error with rename-or-remove remediation, and an exact-compatible file SHALL be reported as valid. Doctor SHALL NOT validate worker presence in the opencode configuration agent map.

#### Scenario: Compatible projected worker files are accepted
- **WHEN** every projected opencode worker agent file exists with content matching its bundled source
- **THEN** doctor SHALL report those agent records with `ok` severity and SHALL not report them as incompatible

#### Scenario: Missing worker agent file is reported
- **WHEN** a projected opencode worker agent file is absent
- **THEN** doctor SHALL report that agent as an error identifying it as missing

#### Scenario: Incompatible worker agent file is reported
- **WHEN** a projected opencode worker agent file exists but differs from its bundled source
- **THEN** doctor SHALL report that agent as an error identifying it as incompatible, with rename-or-remove remediation

### Requirement: Regression tests protect agent ownership semantics
The automated test suite SHALL cover installation and doctor behavior for customized existing agents, missing installer-provisioned agents, preservation of existing definitions, and rejection of malformed configuration. The tests SHALL verify that ordinary installer-managed file replacement behavior is unaffected.

#### Scenario: Installer regression coverage distinguishes existing from missing names
- **WHEN** the installation regression suite runs cases with customized existing agents and omitted agents
- **THEN** it SHALL verify that customized definitions are unchanged, missing definitions receive defaults, and no incompatible collision is raised

#### Scenario: Doctor regression coverage distinguishes present from missing names
- **WHEN** the doctor regression suite runs against customized and incomplete opencode configurations
- **THEN** it SHALL verify that present customized names are `ok` and absent names remain errors

### Requirement: Opencode collision-policy documentation matches ownership semantics
The accepted opencode collision-policy statements in `docs/adr/0077-harness-specific-worker-bindings.md` and `docs/adr/0088-implementation-harness-projection-boundaries.md` SHALL describe the seven projected opencode worker agent files, the owned-copy lifecycle (create when absent, reuse exact-compatible, block incompatible with rename-or-remove remediation), and guarded uninstall; SHALL describe the configuration merge as covering only the helper agents (`explore`, `executor`, `budget`) plus the external-directory permission; and SHALL avoid stating that customized opencode worker definitions are preserved by name in the configuration. Their Claude worker and ordinary managed-file collision statements SHALL remain unchanged.

#### Scenario: Affected ADRs describe current opencode ownership
- **WHEN** the affected ADRs are read after this change is applied
- **THEN** their opencode sections SHALL refer to the projected worker agent files and SHALL state file-based exact-compatibility collision blocking and guarded-uninstall preservation

#### Scenario: Non-opencode safety policy remains documented
- **WHEN** the affected ADRs describe Claude worker files or ordinary managed destinations
- **THEN** they SHALL continue to document collision protection, no-overwrite behavior, and guarded ownership handling for those surfaces

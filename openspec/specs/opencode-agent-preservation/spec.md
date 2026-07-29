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

### Requirement: Doctor validates managed opencode agents by name presence
When the selected opencode configuration parses successfully and its `agent` map is an object, doctor SHALL report an expected managed agent as valid when the map contains that agent name, without comparing the definition's model, variant, or other fields. Doctor SHALL continue to report missing expected names and malformed configurations as errors.

#### Scenario: Customized managed agents are accepted
- **WHEN** every expected managed agent name exists in a parseable `agent` map but one or more definitions use customized models, variants, or fields
- **THEN** doctor SHALL report those agent records with `ok` severity and SHALL not report them as incompatible

#### Scenario: Missing managed agent is reported
- **WHEN** an expected managed agent name is absent from an otherwise parseable `agent` map
- **THEN** doctor SHALL report that agent as an error identifying it as missing

#### Scenario: Malformed configuration remains an error
- **WHEN** the opencode configuration is absent, unparsable, or has a malformed root or `agent` map
- **THEN** doctor SHALL continue to report the affected expected agent records as errors

### Requirement: Regression tests protect agent ownership semantics
The automated test suite SHALL cover installation and doctor behavior for customized existing agents, missing installer-provisioned agents, preservation of existing definitions, and rejection of malformed configuration. The tests SHALL verify that ordinary installer-managed file replacement behavior is unaffected.

#### Scenario: Installer regression coverage distinguishes existing from missing names
- **WHEN** the installation regression suite runs cases with customized existing agents and omitted agents
- **THEN** it SHALL verify that customized definitions are unchanged, missing definitions receive defaults, and no incompatible collision is raised

#### Scenario: Doctor regression coverage distinguishes present from missing names
- **WHEN** the doctor regression suite runs against customized and incomplete opencode configurations
- **THEN** it SHALL verify that present customized names are `ok` and absent names remain errors

### Requirement: Opencode collision-policy documentation matches ownership semantics
The accepted opencode collision-policy statements in `docs/adr/0077-harness-specific-worker-bindings.md` and `docs/adr/0088-implementation-harness-projection-boundaries.md` SHALL describe the current numbered worker entries, preserve existing entries by name, add repository defaults only when names are absent, and avoid stating that customized or otherwise different existing opencode definitions block installation or doctor. Their Claude worker and ordinary managed-file collision statements SHALL remain unchanged.

#### Scenario: Affected ADRs describe current opencode ownership
- **WHEN** the affected ADRs are read after this change is applied
- **THEN** their opencode sections SHALL refer to the current numbered worker projection and SHALL state name-based preservation rather than exact-compatibility collision blocking

#### Scenario: Non-opencode safety policy remains documented
- **WHEN** the affected ADRs describe Claude worker files or ordinary managed destinations
- **THEN** they SHALL continue to document collision protection, no-overwrite behavior, and guarded ownership handling for those surfaces

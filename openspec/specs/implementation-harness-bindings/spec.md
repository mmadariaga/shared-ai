# Implementation Harness Bindings Specification

## Purpose

Define the harness-specific binding contracts for the implementation coordinator and worker across Claude Code and opencode.

## Requirements

The routed implementation coordinator lives at `sai/commands/implement/coordinator.md`; its worker and step library own technical planning.

### Requirement: Claude coordinator-worker binding

Claude Code SHALL use the sai-3 wrapper's coordinator model/effort and the installed category agents' runtime tunables seeded from their worker-matrix entries. Required category bindings SHALL start zero-task workers in one background Agent batch without per-spawn model selection, capture handles, validate ready returns, and disclose complete tasks through SendMessage. Answers and corrections SHALL continue the same worker. Each category agent SHALL use the existing tunable-seed lifecycle: create when absent, reuse exact-compatible definitions, overwrite divergent managed bodies/non-tunable frontmatter with a destination notice while preserving model/effort, and create no ownership sidecar. Guarded uninstall SHALL remove body-and-non-tunable-compatible files and preserve divergent definitions.

#### Scenario: Claude implementation invocation

- **WHEN** sai-3 runs under Claude Code
- **THEN** required category workers use installed agent tunables, return ready before complete-task disclosure, and receive answers through their captured SendMessage handles.

#### Scenario: Claude agent-name collision is overwritten with notice

- **WHEN** a category agent destination has divergent body or non-tunable frontmatter
- **THEN** installation overwrites managed content, preserves model/effort at the existing structural anchor, emits a destination notice, and retains body-comparison doctor checks without rename-or-remove blocking.

#### Scenario: Pre-existing compatible Claude agent is reused

- **WHEN** a category agent already has compatible managed content
- **THEN** installation reuses it without rewriting and uninstall applies the body-comparison guard rather than ownership-sidecar provenance.

#### Scenario: SAI-created Claude agent uninstall

- **WHEN** the category agent's body and non-tunable frontmatter match the source
- **THEN** guarded uninstall removes it without consulting a sidecar and preserves it instead when managed content diverges.

### Requirement: Opencode coordinator-worker binding

Opencode SHALL use its sai-3 wrapper's coordinator configuration and required category task workers, not a separate managed coordinator profile. It SHALL dispatch concurrent zero-task calls without a background parameter, capture task handles, validate ready returns, and continue each same worker with its complete assignment. Each category agent SHALL use tunable-seed installation under the opencode agents directory: create absent files with matrix model/optional variant, reuse compatible files, and overwrite divergent managed content with a destination notice while preserving model/variant. Runtime mode, permissions, and tunables SHALL come from the effective agent definition. Doctor and uninstall SHALL use body-and-non-tunable comparison, not sidecars or config-map agent entries.

#### Scenario: Opencode implementation invocation

- **WHEN** sai-3 runs under opencode
- **THEN** the coordinator uses its wrapper configuration and each required category worker uses its effective agent definition and captured task continuation.

#### Scenario: Existing customized opencode implementation agent file

- **WHEN** a category agent has divergent managed content
- **THEN** installation overwrites managed body/non-tunable fields, preserves model/variant at the existing structural anchor, emits a destination notice, and reports no config-map collision.

#### Scenario: Missing opencode implementation agent file

- **WHEN** a required category agent is absent during installation
- **THEN** installation creates its managed definition with matrix seed tunables and no ownership sidecar.

#### Scenario: Customized worker runtime is honored

- **WHEN** a category worker has an effective customized agent definition
- **THEN** dispatch honors that worker's configuration without dynamic model selection or requiring the shipped model seed.

#### Scenario: Opencode uninstall respects the body-comparison guard

- **WHEN** shared-AI uninstalls a category agent
- **THEN** it removes compatible managed content, preserves divergent definitions, leaves opencode configuration untouched, and consults no ownership sidecar.

### Requirement: Routed worker binding boundary

The implementation route SHALL use the technical coordinator, shared step library, common category-worker contract, and five neutral installed category bindings for both harnesses. It SHALL not require the retired invocation card, single implementation binding, forwarding skill, or intermediate inline loader.

#### Scenario: Retired compatibility path is excluded

- **WHEN** supported implementation projections are inspected
- **THEN** only active coordinator, category-worker, library, and harness-binding surfaces are required, with no retired compatibility or inline loader dependency.

#### Scenario: Retired implementation invocation is excluded

- **WHEN** supported implementation projections are inspected
- **THEN** the route requires no sai/commands/implement/invocation.md.

### Requirement: Managed implementation worker projections

The shared manifest SHALL materialize five category bindings and five managed category agents per harness from one common worker contract and per-harness templates. The bootstrap SHALL fetch the neutral installed bindings directly. Install, doctor, and uninstall SHALL share deterministic inventories, collision checks, tunable preservation, and body-comparison rules. Unrelated files and opencode configuration SHALL remain unchanged; sidecars and rename-or-remove remediation SHALL remain retired.

#### Scenario: Claude Code projection is installed

- **WHEN** the manifest expands Claude Code implementation surfaces
- **THEN** it includes the shared sources, five Claude category bindings and tunable-seed agents, and no opencode binding subtree.

#### Scenario: Exact-compatible Claude agent already exists

- **WHEN** a Claude category agent's body/non-tunable fields match source with or without tuning differences
- **THEN** installation reuses it unchanged and uninstall uses managed-content identity rather than pre-existing-file provenance.

#### Scenario: Opencode projection is installed

- **WHEN** the manifest expands opencode implementation surfaces
- **THEN** it includes the shared sources, five opencode category bindings and tunable-seed agents, excluding Claude bindings and agent projections.

#### Scenario: Opencode worker surface merges into existing destinations

- **WHEN** installation creates or reuses category agents in the opencode global agents directory
- **THEN** unrelated files/configuration remain intact and uninstall retains the configuration-merge exclusion.

#### Scenario: Existing destination is body-divergent

- **WHEN** a managed category agent differs in body or non-tunable frontmatter
- **THEN** installation restores managed content while preserving tunables and issuing a notice, and guarded uninstall preserves divergent definitions.

### Requirement: OpenCode SAI external-directory permission is merged safely

The OpenCode installation projection SHALL configure `permission.external_directory` with a narrow allow rule for `~/.config/opencode/sai/**` in fresh and existing OpenCode configuration files. OpenCode SHALL evaluate overlapping permission rules in declaration order with the last matching rule winning, so the merge SHALL preserve the order of existing rules and append the generated SAI allow rule after preserved rules when no effective user restriction matches the SAI path. If the effective existing rule for the SAI path is `ask` or `deny`, installation SHALL preserve that explicit user restriction, SHALL NOT silently override it, and SHALL emit a non-fatal stdout notice containing the canonical SAI path, the preserved action, and the reason automatic access remains blocked. Valid scalar actions `allow`, `ask`, and `deny` at either top-level `permission` or `permission.external_directory` SHALL be treated as valid user configuration and preserved at their original location; a scalar `ask` or `deny` SHALL follow the explicit-restriction behavior, while a scalar `allow` SHALL be reported as an already-broad user permission and SHALL NOT be narrowed or overwritten. Invalid permission shapes or actions SHALL be rejected without a partial write and SHALL emit an actionable stdout diagnostic; the installer SHALL retain its existing exit status unless another fatal failure occurs. The merge SHALL preserve existing user settings, comments, formatting, unrelated permission rules, agents, plugins, MCP entries, and other configuration. When both `opencode.json` and `opencode.jsonc` exist, installation SHALL use `opencode.json` as the target according to the established precedence. The merge SHALL be idempotent and SHALL NOT broaden the permission to all external directories.

#### Scenario: Fresh OpenCode configuration receives the permission
- **WHEN** installation creates a fresh OpenCode configuration from the repository default
- **THEN** the resulting configuration SHALL contain an allow rule under `permission.external_directory` for `~/.config/opencode/sai/**`
- **AND** it SHALL retain the existing SAI read permissions and managed worker configuration

#### Scenario: Existing JSONC configuration is preserved while adding the permission
- **WHEN** installation finds an existing `opencode.jsonc` without the SAI external-directory rule
- **THEN** it SHALL add only the missing `permission.external_directory` rule using the existing JSONC surgical merge mechanism
- **AND** it SHALL preserve comments, formatting, unrelated permissions, and user-defined configuration

#### Scenario: Existing external-directory rules are retained
- **WHEN** an existing configuration already contains `permission.external_directory` rules, including user-defined rules
- **THEN** installation SHALL preserve those rules
- **AND** it SHALL add the SAI rule only when the exact narrow rule is absent and no effective `ask` or `deny` rule matches the SAI path
- **AND** it SHALL not replace the user's rule set with a broader or repository-default-only set

#### Scenario: Valid scalar permission action is preserved
- **WHEN** either top-level `permission` or `permission.external_directory` is the valid scalar action `allow`, `ask`, or `deny`
- **THEN** installation SHALL preserve the scalar action at its original location without replacing it with an object or deleting it
- **AND** `ask` and `deny` SHALL emit the explicit-restriction stdout notice
- **AND** `allow` SHALL emit a stdout notice that existing broad user permission was preserved

#### Scenario: Overlapping rules produce a deterministic SAI outcome
- **WHEN** existing external-directory rules overlap the SAI path
- **THEN** the merge SHALL preserve their declaration order and SHALL apply the last-match-wins rule used by OpenCode
- **AND** when no effective `ask` or `deny` rule matches the SAI path, the generated narrow allow rule SHALL be placed after the preserved rules so the SAI path is effectively allowed

#### Scenario: Explicit user restriction is preserved
- **WHEN** the effective existing rule for `~/.config/opencode/sai/**` is `ask` or `deny`
- **THEN** installation SHALL leave that rule and its ordering intact
- **AND** it SHALL emit a stdout notice containing `~/.config/opencode/sai/**`, the preserved action, and that the user's explicit restriction prevents automatic SAI access
- **AND** it SHALL not claim that the installation removed all external-directory prompts

#### Scenario: Both OpenCode configuration files exist
- **WHEN** both `opencode.json` and `opencode.jsonc` exist
- **THEN** installation SHALL merge the SAI rule into `opencode.json`
- **AND** it SHALL leave `opencode.jsonc` unchanged

#### Scenario: Repeated installation is idempotent
- **WHEN** installation runs again after the SAI external-directory rule has been added
- **THEN** it SHALL not add a duplicate rule or produce avoidable configuration churn
- **AND** the effective permission configuration SHALL remain unchanged

#### Scenario: The trust scope remains narrow
- **WHEN** the generated or merged configuration is inspected
- **THEN** the SAI external-directory rule SHALL target only `~/.config/opencode/sai/**`
- **AND** the installation SHALL not add an allow rule for all external directories

#### Scenario: Installation paths are covered by tests
- **WHEN** the OpenCode installer test suite runs
- **THEN** it SHALL cover fresh, JSON-only, JSONC-only, both-file, existing-rule, missing-rule, overlapping-rule, explicit-ask-or-deny, malformed-root, malformed-permission-shape, and repeated-installation paths
- **AND** the assertions SHALL verify preservation of user content and the JSON-over-JSONC precedence

#### Scenario: Installer guidance is observable
- **WHEN** the installer test suite exercises an explicit `ask` or `deny` restriction, a scalar action, or a malformed permission shape
- **THEN** it SHALL capture stdout and assert the documented SAI permission notice contains the canonical path, the preserved or invalid action/shape, and the resulting status
- **AND** it SHALL assert that these non-fatal merge conditions retain the existing installer exit status and leave the original configuration bytes unchanged when no merge is safe

#### Scenario: Malformed permission shapes fail safely
- **WHEN** the existing configuration has an array `permission` value, a scalar `permission` value other than `allow`, `ask`, or `deny`, an array or otherwise invalid `permission.external_directory` value, or a rule entry that is not a valid permission action
- **THEN** installation SHALL reject the configuration with an actionable stdout diagnostic identifying the invalid shape or action and the expected `allow`, `ask`, `deny`, or rule-object form
- **AND** it SHALL not partially write a configuration or silently replace the malformed user value

#### Scenario: Equivalent SAI path spellings are canonicalized
- **WHEN** an existing permission rule represents the SAI path using a tilde path, an absolute path under the current user's home, forward slashes, or backslashes
- **THEN** installation SHALL canonicalize the spelling by expanding the home directory, normalizing separators and dot segments, and applying the host's case-sensitivity rules before comparing it with `~/.config/opencode/sai/**`
- **AND** it SHALL not add a duplicate narrow rule when an equivalent existing rule already determines the effective action
- **AND** it SHALL preserve the original user spelling and formatting when no merge is required

### Requirement: OpenCode installation documentation explains external-directory access

The OpenCode installation documentation SHALL explain that SAI automatically configures `permission.external_directory` for `~/.config/opencode/sai/**`, why the path is narrow, how `opencode.json` precedence works when both configuration files exist, and that existing user settings are merged rather than overwritten.

#### Scenario: User reads the OpenCode installation guide
- **WHEN** a user follows the documented OpenCode installation path
- **THEN** the guide SHALL describe the automatic SAI external-directory permission and its narrow scope
- **AND** it SHALL state that the configuration merge preserves user settings and comments
- **AND** its `Post-install` section SHALL instruct the user to restart or reload OpenCode, invoke an SAI command that reads the global prompt directory, and confirm that no external-directory prompt appears
- **AND** it SHALL explain that an explicit existing `ask` or `deny` rule can intentionally preserve a prompt or block access and identify the stdout notice as the diagnostic

#### Scenario: User has both JSON and JSONC configurations
- **WHEN** the installation guide describes configuration selection
- **THEN** it SHALL state that `opencode.json` takes precedence as the merge target when both files are present

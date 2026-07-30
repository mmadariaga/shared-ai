# Implementation Harness Bindings Specification

## Purpose

Define the harness-specific binding contracts for the implementation coordinator and worker across Claude Code, opencode, and GitHub Copilot.

## Requirements

The routed implementation coordinator and invocation bodies are grouped at `sai/commands/implement/coordinator.md` and `sai/commands/implement/invocation.md`; the Copilot Inline Coordinator Adapter remains `sai/orchestration/inline-invocation.md`.

### Requirement: Claude coordinator-worker binding
The Claude Code wrapper SHALL run the implementation coordinator on `opus` and the `sai-3-implementation-worker` custom agent on `claude-opus-4-8`, with low effort for the coordinator and medium effort for the worker. The binding SHALL start the custom worker in the background, capture the returned agent ID as coordinator-owned dispatch metadata, forward user answers with `SendMessage(to: agent_id, message: answer)`, and wait asynchronously for the same background worker's next structured payload. Agent continuation parameters SHALL NOT be used. When the agent destination is absent, the installer SHALL create the canonical SAI-namespaced agent and an adjacent `.sai-3-implementation-worker.owner.json` sidecar recording the managed hash. When an exact-compatible agent already exists without that sidecar, the installer SHALL reuse it without adopting ownership or rewriting it. An incompatible existing file SHALL NOT be overwritten, SHALL block activation with rename-or-remove remediation, and SHALL be reported by doctor and version-skew checks. Guarded uninstall SHALL remove the agent only when the ownership sidecar exists and the current agent hash matches the sidecar; a pre-existing compatible or user-modified agent SHALL be preserved. This change SHALL provide no implicit adoption path.

#### Scenario: Claude implementation invocation
- **WHEN** `/sai-3-implement` runs under Claude Code
- **THEN** the coordinator SHALL use `opus` with low effort, the worker SHALL use `claude-opus-4-8` with medium effort, the binding SHALL attach the returned agent ID to `needs_input` as coordinator-owned continuation metadata, and the coordinator SHALL use `SendMessage` and await the same background worker's next structured payload

#### Scenario: Claude agent-name collision
- **WHEN** `~/.claude/agents/sai-3-implementation-worker.md` already exists with content that does not exactly match the managed definition
- **THEN** installation and activation SHALL stop without overwriting the file, doctor SHALL report the incompatible collision, and remediation SHALL instruct the user to rename or remove the conflicting definition before retrying

#### Scenario: Pre-existing compatible Claude agent
- **WHEN** the namespaced Claude agent already exists with the exact managed content but has no SAI ownership sidecar
- **THEN** installation SHALL reuse it without creating ownership metadata and uninstall SHALL preserve it as user-owned

#### Scenario: SAI-created Claude agent uninstall
- **WHEN** installation created the Claude agent and ownership sidecar and the current agent hash still matches the recorded managed hash
- **THEN** guarded uninstall SHALL remove both the agent and sidecar; when the hash differs, uninstall SHALL preserve the agent and relinquish ownership without deleting user-modified content

### Requirement: Opencode coordinator-worker binding
The opencode `/sai-3-implement` wrapper SHALL declare the logical coordinator runtime as GLM 5.2 with high reasoning in its own frontmatter and SHALL dispatch only the `sai-3-implementation-worker` subagent. The repository default for a missing `sai-3-implementation-worker` entry SHALL use Kimi K2.6, whose fixed reasoning is intrinsic model behavior. The wrapper SHALL not select or install a separate coordinator agent profile. The binding SHALL capture the returned task ID as coordinator-owned dispatch metadata and continue the same explicit task worker by task ID when possible. The installer SHALL add the `sai-3-implementation-worker` config entry only when absent and SHALL preserve an existing entry unchanged regardless of its model, variant, mode, permission, or other fields. Existing names SHALL be treated as user-owned, so definition differences SHALL NOT block activation or produce an incompatible-collision result. Doctor SHALL validate a present entry by name when the configuration parses and its agent map is an object, while missing names and malformed configurations SHALL remain errors. When an existing user-owned worker entry is selected at runtime, its configured model, variant, mode, and permissions SHALL govern that worker invocation; the repository Kimi default SHALL apply only to an entry added because the name was absent. Consistent with the existing config-merge exclusion, uninstall SHALL NOT remove or revert the opencode config entry, regardless of whether installation added or reused it.

#### Scenario: Opencode implementation invocation
- **WHEN** `/sai-3-implement` runs under opencode
- **THEN** the coordinator SHALL use the wrapper-declared GLM 5.2 high-reasoning binding, the worker SHALL use its configured Kimi K2.6 binding, and the binding SHALL attach the returned task ID to `needs_input` as coordinator-owned continuation metadata

#### Scenario: Existing customized opencode implementation entry
- **WHEN** `sai-3-implementation-worker` already exists with a customized model, variant, mode, permission, or other fields
- **THEN** installation SHALL preserve the entry unchanged, SHALL not report an incompatible collision, and SHALL allow activation to continue

#### Scenario: Missing opencode implementation entry
- **WHEN** `sai-3-implementation-worker` is absent
- **THEN** installation SHALL add that entry with the canonical Kimi K2.6 managed shape

#### Scenario: Customized worker runtime is honored
- **WHEN** `/sai-3-implement` dispatches an existing user-owned `sai-3-implementation-worker` entry with a customized model or variant
- **THEN** the invocation SHALL use that existing worker configuration without requiring the repository Kimi default

#### Scenario: Opencode uninstall preserves merged entries
- **WHEN** shared-AI is uninstalled after the managed opencode worker entry was added or reused
- **THEN** uninstall SHALL leave the config entry intact under the existing config-merge exclusion

### Requirement: Copilot compatibility boundary
The Copilot implementation command SHALL preserve its existing inline execution behavior by invoking the Copilot Inline Coordinator Adapter directly. Documentation SHALL identify `sai/orchestration/inline-invocation.md` as that boundary, SHALL NOT describe either removed inline command loader as an entrypoint, and SHALL state that the portable coordinator-worker contract is not implemented for Copilot in this slice without stating that Copilot cannot use subagents.

#### Scenario: Copilot implementation invocation
- **WHEN** `/sai-3-implement` runs under GitHub Copilot
- **THEN** it SHALL execute through the Copilot Inline Coordinator Adapter with its current observable behavior
- **AND** it SHALL expose the documented compatibility limitation without an intermediate inline command loader

### Requirement: Managed implementation worker projections
The single installation manifest SHALL project the canonical shared coordinator and worker-lifecycle contracts, the implementation worker contract, and only the active routed harness's implementation binding to Claude Code and opencode. Their runtime skills and Claude agent surface SHALL remain thin forwarders to those canonical sources. The Copilot projection SHALL retain `sai/orchestration/inline-invocation.md` and the caller-neutral compatibility assets required by its inline path, SHALL exclude both obsolete inline command loaders, and SHALL exclude routed orchestration bindings and routed implementation worker-agent surfaces. Installer, doctor, and uninstall SHALL derive these projections from the same manifest while preserving deterministic collision detection for ordinary managed files and Claude worker-agent definitions, presence-based opencode merged-config preservation, managed-content drift checks, ownership sidecars, compatible-unowned reuse, and user-modified-file retention. Exact-compatible pre-existing Claude worker agents SHALL be reused without rewriting or adopting ownership, and all unrelated entries in an existing opencode JSONC configuration SHALL remain unchanged.

#### Scenario: Claude Code projection is installed
- **WHEN** the manifest expands the Claude Code implementation surfaces
- **THEN** it SHALL include the shared lifecycle sources, canonical implementation worker, Claude implementation binding, forwarding skill, and managed worker agent
- **AND** it SHALL exclude the opencode binding subtree
- **AND** it SHALL exclude both obsolete inline command loaders

#### Scenario: Exact-compatible Claude agent already exists
- **WHEN** the canonical Claude implementation worker agent already exists with exact-compatible content and no SAI ownership sidecar
- **THEN** installation SHALL reuse it without rewriting it or creating ownership metadata
- **AND** guarded uninstall SHALL preserve it as user-owned
- **AND** the agent's unrelated user content SHALL remain unchanged

#### Scenario: Opencode projection is installed
- **WHEN** the manifest expands the opencode implementation surfaces
- **THEN** it SHALL include the shared lifecycle sources, canonical implementation worker, opencode implementation binding, forwarding skill, and the namespaced `sai-3-implementation-worker` configuration entry
- **AND** it SHALL exclude the Claude binding subtree and Claude worker-agent projection
- **AND** it SHALL exclude both obsolete inline command loaders

#### Scenario: Opencode entries merge into existing JSONC
- **WHEN** installation adds or reuses the namespaced `sai-3-implementation-worker` entry in an existing opencode JSONC configuration
- **THEN** it SHALL preserve comments, formatting, and every unrelated model, agent, permission, plugin, and MCP entry
- **AND** uninstall SHALL leave the merged SAI entries and all unrelated configuration intact under the existing config-merge exclusion
- **AND** no unrelated JSONC entry SHALL be rewritten, removed, or adopted by the SAI projection

#### Scenario: Copilot projection remains inline
- **WHEN** the manifest expands the Copilot implementation surfaces
- **THEN** it SHALL include `orchestration/inline-invocation.md` and its required compatibility sources
- **AND** it SHALL exclude `commands/sai-2-design-inline.md`, `commands/sai-3-implement-inline.md`, the shared routed coordinator, routed implementation bindings, and routed planning-worker runtime surfaces

#### Scenario: Existing destination is incompatible
- **WHEN** installation or activation encounters an incompatible managed file, Claude worker-agent definition, opencode namespaced config entry, or destination collision
- **THEN** it SHALL stop without overwriting the existing destination and SHALL preserve the established doctor remediation and guarded-uninstall ownership rules

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

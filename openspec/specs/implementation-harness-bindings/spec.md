# Implementation Harness Bindings Specification

## Purpose

Define the harness-specific binding contracts for the implementation coordinator and worker across Claude Code and opencode.

## Requirements

The routed implementation coordinator and invocation bodies are grouped at `sai/commands/implement/coordinator.md` and `sai/commands/implement/invocation.md`.

### Requirement: Claude coordinator-worker binding
The Claude Code wrapper SHALL run the implementation coordinator on `opus` and the `sai-3-implementation-worker` custom agent on `claude-opus-4-8`, with low effort for the coordinator and medium effort for the worker. The binding SHALL start the custom worker in the background, capture the returned agent ID as coordinator-owned dispatch metadata, forward user answers with `SendMessage(to: agent_id, message: answer)`, and wait asynchronously for the same background worker's next structured payload. Agent continuation parameters SHALL NOT be used. The installer SHALL handle the `sai-3-implementation-worker.md` agent file under the `tunable-seed` strategy: when the agent destination is absent, the installer creates the canonical SAI-namespaced agent with the shipped `model` and `effort` values from the source; when an exact-compatible agent already exists, the installer reuses it; when the body or non-tunable frontmatter differs from source, the installer overwrites the body and non-tunable frontmatter, preserves the destination's `model` and `effort` values placed per the structural anchor in `agent-tunable-ownership`, and emits a console notice naming the destination path. The installer SHALL NOT create a `.<basename>.owner.json` sidecar and SHALL NOT block installation on a body divergence. The `rename-or-remove` remediation is retired. Guarded uninstall SHALL remove the agent file only when its body and non-tunable frontmatter match the source; a body-divergent file SHALL be preserved as a project-local override. This change SHALL provide no implicit adoption path.

#### Scenario: Claude implementation invocation
- **WHEN** `/sai-3-implement` runs under Claude Code
- **THEN** the coordinator SHALL use `opus` with low effort, the worker SHALL use `claude-opus-4-8` with medium effort, the binding SHALL attach the returned agent ID to `needs_input` as coordinator-owned continuation metadata, and the coordinator SHALL use `SendMessage` and await the same background worker's next structured payload

#### Scenario: Claude agent-name collision is overwritten with notice
- **WHEN** `~/.claude/agents/sai-3-implementation-worker.md` already exists with body or non-tunable frontmatter that does not exactly match the managed definition
- **THEN** installation overwrites the body and non-tunable frontmatter, preserves the destination's `model` and `effort` values placed per the structural anchor in `agent-tunable-ownership`, and emits a console notice naming the destination path
- **AND** doctor SHALL report the divergence as an error referencing the body comparison
- **AND** installation does NOT block with rename-or-remove remediation

#### Scenario: Pre-existing compatible Claude agent is reused
- **WHEN** the namespaced Claude agent already exists with the exact managed content
- **THEN** installation SHALL reuse it without writing it again
- **AND** uninstall SHALL preserve it as user-owned

#### Scenario: SAI-created Claude agent uninstall
- **WHEN** the current agent's body and non-tunable frontmatter match the source
- **THEN** guarded uninstall SHALL remove the agent file
- **AND** SHALL NOT consult any sidecar file; when the body or non-tunable frontmatter differs, uninstall SHALL preserve the agent file

### Requirement: Opencode coordinator-worker binding
The opencode `/sai-3-implement` wrapper SHALL declare the logical coordinator runtime as GLM 5.2 with high reasoning in its own frontmatter and SHALL dispatch only the `sai-3-implementation-worker` subagent. The repository default for a missing worker SHALL be the projected `sai-3-implementation-worker.md` agent file using Kimi K2.6, whose fixed reasoning is intrinsic model behavior. The wrapper SHALL not select or install a separate coordinator agent profile. The binding SHALL capture the returned task ID as coordinator-owned dispatch metadata and continue the same explicit task worker by task ID when possible. The installer SHALL project the `sai-3-implementation-worker.md` agent file to `~/.config/opencode/agents/` under the `tunable-seed` lifecycle: create when absent with the shipped model and variant (when present) from the source; on subsequent installs, overwrite the body and non-tunable frontmatter with the source bytes while preserving the destination's `model` and `variant` values placed per the structural anchor in `agent-tunable-ownership`. The installer SHALL NOT create a `.<basename>.owner.json` sidecar and SHALL NOT block installation on a body divergence. Existing names SHALL be treated as user-owned at the file level, so a user-edited file SHALL have its tunable values preserved across installs. Doctor SHALL validate the projected agent file against its bundled source by comparing only the body and non-tunable frontmatter, reporting a missing or body-divergent file as an error and a body-and-non-tunable-frontmatter-compatible file as valid. When an existing user-edited worker agent file is selected at runtime, its configured model, variant, mode, and permissions SHALL govern that worker invocation because the installer preserves the destination's tunable values on overwrite; the repository Kimi default SHALL apply only to a file created because it was absent. Guarded uninstall SHALL remove the projected agent file only when its body and non-tunable frontmatter match the source, SHALL preserve a body-divergent file as a project-local override, and SHALL leave the opencode configuration files untouched under the existing config-merge exclusion.

#### Scenario: Opencode implementation invocation
- **WHEN** `/sai-3-implement` runs under opencode
- **THEN** the coordinator SHALL use the wrapper-declared GLM 5.2 high-reasoning binding, the worker SHALL use the projected `sai-3-implementation-worker.md` agent's configured Kimi K2.6 binding, and the binding SHALL attach the returned task ID to `needs_input` as coordinator-owned continuation metadata

#### Scenario: Existing customized opencode implementation agent file
- **WHEN** a `sai-3-implementation-worker.md` agent file already exists with a body or non-tunable frontmatter that differs from source
- **THEN** installation overwrites the body and non-tunable frontmatter, preserves the destination's `model` and `variant` values placed per the structural anchor in `agent-tunable-ownership`, and emits a console notice naming the destination path
- **AND** installation does not report the file as a config-map collision

#### Scenario: Missing opencode implementation agent file
- **WHEN** `sai-3-implementation-worker.md` is absent
- **THEN** installation SHALL create that file with the canonical Kimi K2.6 managed shape from the source
- **AND** SHALL NOT create a `.<basename>.owner.json` sidecar

#### Scenario: Customized worker runtime is honored
- **WHEN** `/sai-3-implement` dispatches an existing user-owned `sai-3-implementation-worker.md` agent file with a customized model or variant
- **THEN** the invocation SHALL use that existing worker configuration without requiring the repository Kimi default

#### Scenario: Opencode uninstall respects the body-comparison guard
- **WHEN** shared-AI is uninstalled after the opencode worker agent file was installed
- **THEN** uninstall SHALL remove the agent file only when its body and non-tunable frontmatter match the source
- **AND** SHALL preserve a body-divergent file as a project-local override
- **AND** SHALL leave the opencode configuration files untouched
- **AND** SHALL NOT consult any sidecar file

### Requirement: Routed worker binding boundary
The routed implementation command contract SHALL define the coordinator-worker behavior for Claude Code and opencode without requiring `sai/commands/implement/invocation.md` or another retired compatibility projection. The active technical instruction path SHALL be the implementation worker and its coordinator-selected step library.

The routed implementation command contract SHALL define the coordinator-worker behavior for Claude Code and opencode. It SHALL not require a retired compatibility surface or compatibility projection.

#### Scenario: Retired compatibility path is excluded
- **WHEN** the supported implementation projections are inspected
- **THEN** they SHALL contain only the Claude Code and opencode routed coordinator and worker surfaces
- **AND** no active projection SHALL require a retired compatibility surface or an intermediate inline command loader

#### Scenario: Retired implementation invocation is excluded

- **WHEN** supported implementation projections are inspected
- **THEN** they contain the active routed coordinator, worker, and harness binding surfaces without requiring `sai/commands/implement/invocation.md`.

### Requirement: Managed implementation worker projections
The single installation manifest SHALL project the canonical shared coordinator and worker-lifecycle contracts, the implementation worker contract, and only the active routed harness's implementation binding to Claude Code and opencode. Routed wrappers SHALL fetch that neutral installed binding destination directly; no forwarding skill SHALL be projected. The Claude agent surface SHALL remain a thin forwarder to the canonical sources, and the opencode worker surface SHALL be the manifest-projected `sai-3-implementation-worker.md` agent file. Installer, doctor, and uninstall SHALL derive these projections from the same manifest while preserving deterministic collision detection for ordinary managed files and the body-and-non-tunable identity rule for Claude and opencode worker-agent definitions. Doctor SHALL compare only the body and non-tunable frontmatter; uninstall SHALL use the same body comparison to decide keep vs delete. The `rename-or-remove` wording is retired; a body-divergent worker agent is overwritten with a console notice by the installer and preserved as a project-local override by uninstall. The `.<basename>.owner.json` sidecar is no longer written, read, or compared. Tunable lines on existing worker files are preserved on every install. Exact-compatible pre-existing worker agent files SHALL be reused without rewriting, and all unrelated entries in an existing opencode JSONC configuration SHALL remain unchanged.

#### Scenario: Claude Code projection is installed
- **WHEN** the manifest expands the Claude Code implementation surfaces
- **THEN** it SHALL include the shared lifecycle sources, canonical implementation worker, Claude implementation binding, and managed worker agent under the `tunable-seed` strategy
- **AND** it SHALL exclude the opencode binding subtree

#### Scenario: Exact-compatible Claude agent already exists
- **WHEN** the canonical Claude implementation worker agent already exists with body and non-tunable frontmatter matching source, with or without tunable differences
- **THEN** installation SHALL reuse it without rewriting it
- **AND** guarded uninstall SHALL preserve it as user-owned

#### Scenario: Opencode projection is installed
- **WHEN** the manifest expands the opencode implementation surfaces
- **THEN** it SHALL include the shared lifecycle sources, canonical implementation worker, opencode implementation binding, and the namespaced `sai-3-implementation-worker.md` agent file under the `tunable-seed` strategy
- **AND** it SHALL exclude the Claude binding subtree and Claude worker-agent projection

#### Scenario: Opencode worker surface merges into existing destinations
- **WHEN** installation creates or reuses the namespaced `sai-3-implementation-worker.md` agent file in the opencode global agents directory
- **THEN** it SHALL preserve every unrelated file and opencode configuration entry
- **AND** uninstall SHALL apply the body-comparison guard and SHALL leave the opencode configuration intact under the existing config-merge exclusion

#### Scenario: Existing destination is body-divergent
- **WHEN** installation or activation encounters a body-or-non-tunable-frontmatter divergence on a managed worker file
- **THEN** installation overwrites the body and non-tunable frontmatter, preserves the destination's tunable lines, and emits a console notice
- **AND** uninstall preserves the body-divergent file as a project-local override

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

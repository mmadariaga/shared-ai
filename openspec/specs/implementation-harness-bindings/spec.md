# Implementation Harness Bindings Specification

## Purpose

Define the harness-specific binding contracts for the implementation coordinator and worker across Claude Code, opencode, and GitHub Copilot.

## Requirements

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
The opencode wrapper SHALL run the `sai-implementation-coordinator` primary agent on GLM 5.2 with high reasoning and SHALL run the `sai-implementation-planning-worker` subagent on Kimi K2.6 whose fixed reasoning is intrinsic model behavior. The wrapper SHALL select the configured primary coordinator without a command-level model override. The coordinator agent SHALL explicitly deny all task targets except `sai-implementation-planning-worker` and SHALL explicitly allow the native `question` tool, so its required capabilities do not depend on inherited top-level permissions. Before wrapper activation, the effective configuration SHALL be live-probed with top-level task and question denial; if the per-agent task dispatch or question permission is unavailable, activation SHALL stop. The binding SHALL capture the returned task ID as coordinator-owned dispatch metadata and continue the same explicit task worker by task ID when possible. The installer SHALL add each SAI-namespaced config entry only when absent or exactly compatible with the canonical managed shape; an incompatible existing entry SHALL NOT be overwritten, SHALL block activation with rename-or-remove remediation, and SHALL be reported by doctor and version-skew checks. Consistent with the existing config-merge exclusion, uninstall SHALL NOT remove or revert either opencode config entry, regardless of whether installation added or reused it.

#### Scenario: Opencode implementation invocation
- **WHEN** `/sai-3-implement` runs under opencode
- **THEN** the coordinator and worker SHALL use their specified model and reasoning bindings, the wrapper SHALL not override the coordinator model, the effective coordinator permissions SHALL allow only task dispatch to `sai-implementation-planning-worker` plus native questions even when top-level permissions deny them, and the binding SHALL attach the returned task ID to `needs_input` as coordinator-owned continuation metadata

#### Scenario: Opencode agent-name collision
- **WHEN** `sai-implementation-coordinator` or `sai-implementation-planning-worker` already exists with a shape that is not exactly compatible with the managed model, variant, mode, and permission fields
- **THEN** installation and activation SHALL stop without overwriting the entry, doctor SHALL report the incompatible collision, and remediation SHALL instruct the user to rename or remove the conflicting definition before retrying

#### Scenario: Opencode uninstall preserves merged entries
- **WHEN** shared-AI is uninstalled after either namespaced opencode entry was added or reused
- **THEN** uninstall SHALL leave both config entries intact under the existing config-merge exclusion

### Requirement: Copilot compatibility boundary
The Copilot implementation command SHALL preserve its existing inline execution path and documentation SHALL state that the portable coordinator-worker contract is not implemented for Copilot in this slice without stating that Copilot cannot use subagents.

#### Scenario: Copilot implementation invocation
- **WHEN** `/sai-3-implement` runs under GitHub Copilot
- **THEN** it SHALL continue inline execution with its current observable behavior and SHALL expose the documented compatibility limitation

### Requirement: Managed implementation worker projections
The single installation manifest SHALL project the canonical shared coordinator and worker-lifecycle contracts, the implementation worker contract, and only the active routed harness's implementation binding to Claude Code and opencode. Their runtime skills and Claude agent surface SHALL remain thin forwarders to those canonical sources. The Copilot projection SHALL retain the caller-neutral compatibility assets required by its inline path but SHALL exclude routed orchestration bindings and routed implementation worker-agent surfaces. Installer, doctor, and uninstall SHALL derive these projections from the same manifest while preserving deterministic collision detection, managed-content drift checks, ownership sidecars, compatible-unowned reuse, user-modified-file retention, and opencode merged-config preservation. Exact-compatible pre-existing Claude worker agents SHALL be reused without rewriting or adopting ownership, and all unrelated entries in an existing opencode JSONC configuration SHALL remain unchanged.

#### Scenario: Claude Code projection is installed
- **WHEN** the manifest expands the Claude Code implementation surfaces
- **THEN** it SHALL include the shared lifecycle sources, canonical implementation worker, Claude implementation binding, forwarding skill, and managed worker agent
- **AND** it SHALL exclude the opencode binding subtree

#### Scenario: Exact-compatible Claude agent already exists
- **WHEN** the canonical Claude implementation worker agent already exists with exact-compatible content and no SAI ownership sidecar
- **THEN** installation SHALL reuse it without rewriting it or creating ownership metadata
- **AND** guarded uninstall SHALL preserve it as user-owned
- **AND** the agent's unrelated user content SHALL remain unchanged

#### Scenario: Opencode projection is installed
- **WHEN** the manifest expands the opencode implementation surfaces
- **THEN** it SHALL include the shared lifecycle sources, canonical implementation worker, opencode implementation binding, forwarding skill, and namespaced coordinator and worker configuration entries
- **AND** it SHALL exclude the Claude binding subtree and Claude worker-agent projection

#### Scenario: Opencode entries merge into existing JSONC
- **WHEN** installation adds or reuses exact-compatible SAI-namespaced implementation entries in an existing opencode JSONC configuration
- **THEN** it SHALL preserve comments, formatting, and every unrelated model, agent, permission, plugin, and MCP entry
- **AND** uninstall SHALL leave the merged SAI entries and all unrelated configuration intact under the existing config-merge exclusion
- **AND** no unrelated JSONC entry SHALL be rewritten, removed, or adopted by the SAI projection

#### Scenario: Copilot projection remains inline
- **WHEN** the manifest expands the Copilot implementation surfaces
- **THEN** it SHALL include the inline command and its required compatibility sources
- **AND** it SHALL exclude the shared routed coordinator, routed implementation bindings, and routed planning-worker runtime surfaces

#### Scenario: Existing destination is incompatible
- **WHEN** installation or activation encounters an incompatible managed file, Claude worker-agent definition, opencode namespaced config entry, or destination collision
- **THEN** it SHALL stop without overwriting the existing destination and SHALL preserve the established doctor remediation and guarded-uninstall ownership rules

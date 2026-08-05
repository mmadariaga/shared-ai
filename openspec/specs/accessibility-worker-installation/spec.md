# accessibility-worker-installation Specification

## Purpose
TBD

## Requirements

### Requirement: The managed worker registry and manifest project accessibility routing deterministically

The installer SHALL register one managed worker identity for `sai-8-accessibility-worker` in the single managed-worker registry and SHALL add explicit manifest projections for the canonical accessibility worker contract, Claude Code and opencode bindings, forwarding skills, and the managed Claude agent. Registry-derived runtime metadata, ownership records, destination paths, and projection inventories SHALL be deterministic and collision-safe.

#### Scenario: Accessibility worker is installed
- **WHEN** the installer expands the manifest for a fresh installation
- **THEN** it creates every declared Claude Code and opencode accessibility worker surface
- **AND** the generated ownership and runtime metadata identify only the registered accessibility worker

#### Scenario: Destination collision is detected
- **WHEN** a projected accessibility worker destination conflicts with an unrelated managed asset
- **THEN** installation fails with the existing collision protection
- **AND** it does not silently replace the unrelated asset

### Requirement: Routed accessibility wrappers and bindings preserve harness parity

The Claude Code and opencode `/sai-8-accessibility` wrappers SHALL route to their terminal-only coordinator and matching worker binding while preserving their harness-specific model and argument passthrough behavior. The Claude projection SHALL include the managed worker identity and owner sidecar; the opencode projection SHALL include its task-dispatch metadata and forwarding skill. GitHub Copilot SHALL retain its existing inline prompt and caller body `sai/commands/sai-8-accessibility.md`, and SHALL receive no routed accessibility worker, binding, forwarding skill, or managed-agent projection.

#### Scenario: Claude Code projection is installed
- **WHEN** the Claude Code projection is generated
- **THEN** the wrapper, coordinator, Claude binding, forwarding skill, managed agent, and ownership metadata resolve to the accessibility worker
- **AND** the full invocation arguments remain available to worker-owned parsing

#### Scenario: opencode projection is installed
- **WHEN** the opencode projection is generated
- **THEN** the wrapper, coordinator, opencode binding, forwarding skill, and task metadata resolve to the accessibility worker
- **AND** its continuation uses the opencode task reference

#### Scenario: Copilot projection is generated
- **WHEN** the Copilot projection is generated
- **THEN** the existing inline accessibility prompt remains available
- **AND** the existing inline caller body `sai/commands/sai-8-accessibility.md` remains available
- **AND** no routed accessibility worker asset is projected

### Requirement: Installation, doctor, and uninstall inventories remain in parity

The installer, doctor, and uninstall flows SHALL consume the same manifest-derived accessibility worker inventory. Tests SHALL verify the registry entry, unique ownership, Claude/opencode projection parity, wrapper and binding presence, deterministic destinations, preservation of unrelated agents, and explicit Copilot routed-asset exclusion.

#### Scenario: Doctor checks the accessibility worker
- **WHEN** doctor evaluates an installed projection set
- **THEN** it reports missing or drifted accessibility worker assets from the same deterministic inventory used by install
- **AND** it preserves unrelated managed and user-owned agents

#### Scenario: Uninstall enumerates the accessibility worker
- **WHEN** uninstall enumerates installed shared-AI assets
- **THEN** it includes exactly the accessibility worker assets declared by the manifest
- **AND** its inventory matches install and does not include Copilot routed assets

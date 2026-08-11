# accessibility-worker-installation Specification

## Purpose
TBD

## Requirements

### Requirement: The managed worker registry and manifest project accessibility routing deterministically

The installer SHALL register one managed worker identity for `sai-8-accessibility-worker` in the single managed-worker registry and SHALL add explicit manifest projections for the canonical accessibility worker contract, Claude Code and opencode bindings, and the managed Claude agent. It SHALL NOT project a forwarding skill for either routed harness. Registry-derived runtime metadata, ownership records, destination paths, and projection inventories SHALL be deterministic and collision-safe.

#### Scenario: Accessibility worker is installed
- **WHEN** the installer expands the manifest for a fresh installation
- **THEN** it creates every declared Claude Code and opencode accessibility worker surface except the retired forwarding skills
- **AND** the generated ownership and runtime metadata identify only the registered accessibility worker

#### Scenario: Destination collision is detected
- **WHEN** a projected accessibility worker destination conflicts with an unrelated managed asset
- **THEN** installation fails with the existing collision protection
- **AND** it does not silently replace the unrelated asset

### Requirement: Routed accessibility wrappers and bindings preserve harness parity

The Claude Code and opencode `/sai-8-accessibility` wrappers SHALL route to their terminal-only coordinator and fetch the matching neutral worker-binding destination directly while preserving their harness-specific model and argument passthrough behavior. The Claude projection SHALL include the managed worker identity and the new `tunable-seed` handling (no `.<basename>.owner.json` sidecar; the destination's `model` and `effort` values are preserved on overwrite, placed per the structural anchor in `agent-tunable-ownership`). The opencode projection SHALL include its task-dispatch metadata. The active installation projections SHALL contain only Claude Code and opencode worker assets and SHALL not include a compatibility worker, binding, forwarding skill, or managed-agent projection.

#### Scenario: Claude Code projection is installed
- **WHEN** the Claude Code projection is generated
- **THEN** the wrapper, coordinator, Claude binding, and managed agent resolve to the accessibility worker
- **AND** the `tunable-seed` installer handles the agent file with the destination's `model` and `effort` values preserved on overwrite, placed per the structural anchor in `agent-tunable-ownership`
- **AND** the full invocation arguments remain available to worker-owned parsing

#### Scenario: opencode projection is installed
- **WHEN** the opencode projection is generated
- **THEN** the wrapper, coordinator, opencode binding, and task metadata resolve to the accessibility worker
- **AND** its continuation uses the opencode task reference

#### Scenario: Compatibility projection is excluded
- **WHEN** the active projection is generated
- **THEN** it retains only the supported Claude Code and opencode accessibility surfaces
- **AND** no compatibility worker, binding, forwarding skill, or managed-agent projection is created

### Requirement: Installation, doctor, and uninstall inventories remain in parity

The installer, doctor, and uninstall flows SHALL consume the same manifest-derived accessibility worker inventory. Tests SHALL verify the registry entry, unique ownership, Claude/opencode projection parity, wrapper and binding presence, deterministic destinations, preservation of unrelated agents, and explicit compatibility routed-asset exclusion.

#### Scenario: Doctor checks the accessibility worker
- **WHEN** doctor evaluates an installed projection set
- **THEN** it reports missing or drifted accessibility worker assets from the same deterministic inventory used by install
- **AND** it preserves unrelated managed and user-owned agents

#### Scenario: Uninstall enumerates the accessibility worker
- **WHEN** uninstall enumerates installed shared-AI assets
- **THEN** it includes exactly the accessibility worker assets declared by the manifest
- **AND** its inventory matches install and does not include unsupported compatibility routed assets

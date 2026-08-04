# security-worker-installation Specification

## Purpose
TBD - created by syncing change sai-6-security-coordinator-worker-split. Update Purpose after archive.
## Requirements

### Requirement: Installer registers and projects every routed security surface

The managed-worker registry SHALL define the numbered security worker, its Claude managed-agent identity and owner metadata, and its opencode worker identity. The installation manifest SHALL deterministically project the security coordinator and invocation core, numbered worker contract, Claude and opencode bindings, Claude managed agent, and both harness forwarding skills to their established destinations.

#### Scenario: Fresh installation runs
- **WHEN** the installer expands the manifest for Claude Code and opencode
- **THEN** every routed security surface is projected to its expected destination
- **AND** repeated installation produces the same projection and ownership metadata

### Requirement: Claude security-worker ownership is collision-safe

Installer flow SHALL define the numbered Claude security-worker agent and owner constants, resolve an owner sidecar for its `owned-copy` projection, reuse exact-compatible user-owned definitions without claiming ownership, block incompatible collisions without overwriting user content, and preserve edited managed agents during guarded uninstall. An owned security worker without a matching owner entry SHALL fail closed rather than defaulting to another worker.

#### Scenario: Claude security worker collides
- **WHEN** an existing user-owned security-worker definition is incompatible with the managed definition
- **THEN** installation stops with the established collision remediation
- **AND** it does not overwrite the definition or partially claim ownership

#### Scenario: Claude security worker is removed
- **WHEN** guarded uninstall evaluates the managed security worker
- **THEN** it removes only the managed definition and matching owner sidecar when ownership is proven
- **AND** it preserves a compatible user-owned definition or an edited managed definition according to the established policy

### Requirement: Routed wrappers preserve three-harness entrypoint parity

Claude Code and opencode security wrappers SHALL be thin routed wrappers that load the shared security coordinator and only their matching worker binding while preserving their harness-specific model and argument behavior. The Copilot security prompt SHALL remain inline and SHALL receive no routed binding, managed agent, or routed manifest projection. Structural verification SHALL assert this intentional exclusion and all required Claude/opencode surfaces.

#### Scenario: Routed wrappers are inspected
- **WHEN** the Claude Code or opencode `/sai-6-security` wrapper is loaded
- **THEN** it fetches the coordinator and matching binding only
- **AND** it preserves the complete argument value for worker-owned parsing

#### Scenario: Parity verification finds a missing surface
- **WHEN** a required worker, binding, wrapper, skill, agent, registry entry, or manifest projection is missing or mismatched
- **THEN** installation or structural verification fails with the missing surface identified
- **AND** it does not silently fall back to an incomplete routed security worker

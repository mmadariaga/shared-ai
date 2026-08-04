# Managed Worker Registry Specification

## Purpose

Define a canonical managed-worker registry that preserves installer compatibility across Claude workers, opencode registrations, projections, and downstream consumers.

## Requirements

### Requirement: Canonical managed-worker registry
The installer SHALL define one declarative managed-worker registry keyed by worker name for every currently managed phase worker. Each registry entry MUST carry the worker's Claude agent filename and owner sidecar. An entry MUST carry opencode model, variant, and permission.task metadata only when that worker has an existing managed opencode registration; a worker without such a registration MUST not gain one through this refactor.

#### Scenario: All current workers have complete registry entries
- **WHEN** the installer loads the managed-worker registry
- **THEN** the four existing managed phase workers are present exactly once, three entries contain the existing opencode registration metadata, and the Claude-only `sai-1-spec-proposal-worker` entry contains no opencode registration metadata

#### Scenario: A future managed worker uses the supported registry shape
- **WHEN** a future managed phase worker is added to the registry
- **THEN** the Claude constants, owner dispatch, and applicable opencode registration are derived from that record, while any independently authored manifest projections remain an explicit additional update subject to the selected parity validation route

### Requirement: Derived Claude worker compatibility surface
The installer MUST derive the existing per-worker Claude agent and owner constants, the `OWNER_BY_CLAUDE_AGENT` dispatch map, and their existing exports from the canonical registry. The derived values MUST retain the current worker names, agent filenames, owner sidecars, map keys, and map values.

#### Scenario: Existing consumers observe the same Claude values
- **WHEN** installer code or tests import the existing exported Claude worker constants or owner map
- **THEN** the names and values are identical to those exposed before the refactor

### Requirement: Fail-closed owner dispatch
Owned-copy projection dispatch MUST resolve ownership through the registry-derived owner map and MUST throw when an owned-copy agent has no registry entry. The installer MUST NOT default an unknown agent to any owner or silently install it without an owner.

#### Scenario: Unknown owned-copy agent is rejected
- **WHEN** an `owned-copy` projection names a Claude agent that is absent from the managed-worker registry
- **THEN** installation fails with the existing fail-closed behavior before an owner sidecar is selected or written

#### Scenario: Known owned-copy agent keeps its owner
- **WHEN** an `owned-copy` projection names a currently managed Claude agent
- **THEN** the registry-derived dispatch selects the same owner sidecar as the current implementation

### Requirement: Derived opencode managed-agent registration
The installer MUST derive `OPENCODE_MANAGED_AGENTS` from the canonical registry while preserving exactly these existing three worker keys and this insertion order: `sai-3-implementation-worker`, `sai-2-design-worker`, `sai-5-review-worker`. Each managed agent's model, variant, permission.task shape, registration identity, and registration behavior MUST remain unchanged. The derived registrations MUST continue to merge with opencode configuration without overwriting unrelated user configuration or existing managed-agent customizations.

#### Scenario: Fresh opencode registration preserves worker-specific shapes and order
- **WHEN** a fresh install creates or updates the opencode managed-agent registration
- **THEN** the same three registered workers receive the same model, variant, permission.task structure, and registration content in the insertion order `sai-3-implementation-worker`, `sai-2-design-worker`, `sai-5-review-worker`, including the existing distinct permission shapes, and `sai-1-spec-proposal-worker` is not registered

#### Scenario: Existing opencode configuration remains preservation-first
- **WHEN** opencode configuration already contains user content or compatible managed-agent content
- **THEN** the registry-derived registration follows the existing merge and preservation behavior and does not overwrite unrelated or incompatible user-owned content

### Requirement: Manifest projection parity and fresh-install preservation
The registry relationship with `sai/install-manifest.json` MUST be explicit in the design as either registry-derived projection emission or deterministic parity validation of the checked-in projections. In either case, every current managed-worker projection MUST remain covered exactly once, and the refactor MUST preserve manifest expansion, projection ordering, harness isolation, collision handling, and fresh-install file, sidecar, and opencode configuration bytes.

#### Scenario: Existing managed projections remain complete
- **WHEN** installer, doctor, or uninstall expands the install manifest
- **THEN** the four current managed workers have the same binding, forwarding, and Claude owned-copy projection inventory and no registry-backed projection is duplicated or omitted

#### Scenario: Fresh installs are byte-preserving
- **WHEN** the Claude and opencode installers run against a fresh destination
- **THEN** the resulting file inventories and file bytes, Claude owner sidecars, and opencode configuration bytes are identical to the pre-refactor behavior

#### Scenario: Projection safety remains unchanged
- **WHEN** a projection has a missing source, destination collision, incompatible existing content, or unsupported ownership mapping
- **THEN** the same validation failure occurs and no user-owned or incompatible content is silently overwritten

### Requirement: Downstream worker-consumer compatibility
The registry refactor MUST preserve the values observed through the existing exported Claude worker constants, `OPENCODE_MANAGED_AGENTS`, and `LEGACY_CLAUDE_WORKERS` surfaces by doctor, migration, and guarded-uninstall code. Folding `LEGACY_CLAUDE_WORKERS` into the canonical registry is out of scope for this change.

#### Scenario: Doctor enumeration observes the same managed workers
- **WHEN** doctor enumerates Claude worker agents and opencode managed agents through the existing exports
- **THEN** it observes the same Claude agent names, the same three opencode managed-agent keys, and the same values as before the refactor

#### Scenario: Guarded migration and uninstall retain their existing conditions
- **WHEN** migration or guarded uninstall evaluates the existing Claude agent-name prefix guards and legacy worker table
- **THEN** it selects and removes the same worker files and sidecars as before the refactor

### Requirement: Behavior-preservation regression coverage
The installer test harness MUST verify registry completeness and the derived Claude, owner-dispatch, opencode key-set and insertion-order, manifest, and fresh-install compatibility contracts without requiring semantic changes to the existing behavior assertions.

#### Scenario: Existing installer suites remain green
- **WHEN** the install-manifest, Claude-install, and opencode-install test suites run after the refactor
- **THEN** their existing behavior-preservation assertions pass and additional coverage detects missing registry entries, owner drift, opencode shape or insertion-order drift, or projection drift

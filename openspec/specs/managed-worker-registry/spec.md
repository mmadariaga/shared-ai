# Managed Worker Registry Specification

## Purpose

Define a canonical managed-worker registry that preserves installer compatibility across Claude workers, opencode registrations, projections, and downstream consumers.

## Requirements

### Requirement: Proxy skill identities are absent without changing managed workers

The managed-worker registry and manifest projection inventory SHALL distinguish the 14 retired worker-binding proxy skill files from the surviving Managed Workers. Removing the proxy skill projections SHALL NOT remove, rename, or alter any existing Claude agent record, owner sidecar, opencode managed-agent registration, binding declaration, or registration default.

#### Scenario: Registry retains the surviving worker identity

- **WHEN** installer, doctor, or uninstall derives the managed-worker inventory after proxy retirement
- **THEN** each existing routed worker remains present with its current identity, registration settings, and binding
- **AND** no proxy skill projection is treated as a separate Managed Worker identity

#### Scenario: Identity collision disappears through projection removal

- **WHEN** an opencode installation enumerates skills and managed worker agents
- **THEN** the retired `sai-*-worker` proxy skill files are absent from the skill namespace
- **AND** the corresponding `sai-*-worker` managed-agent registrations remain available exactly as before
- **AND** the installer does not rename or re-register the agent to avoid the collision

#### Scenario: Existing registry safety contracts remain in force

- **WHEN** a destination collision, incompatible existing content, missing source, or unsupported ownership mapping is encountered during installation, doctor, or uninstall
- **THEN** the existing fail-safe behavior remains in force
- **AND** the proxy retirement does not silently overwrite or delete unrelated user-owned content

### Requirement: Canonical managed-worker registry
The installer SHALL preserve one declarative managed-worker registry keyed by worker name for the existing Claude agent filename and owner-sidecar metadata. Opencode managed-agent membership SHALL instead be derived from opencode binding declarations, and every derived worker MUST have exactly one explicit repository registration-default record containing its model, `mode: "subagent"`, task permissions, and optional variant. The Claude registry MUST NOT retain opencode-only registration settings after those defaults are separated.

#### Scenario: All current workers have complete registration data
- **WHEN** the installer loads the managed-worker registry, opencode bindings, and opencode registration defaults
- **THEN** the existing Claude worker records remain present exactly once without opencode-only settings, and every binding-dispatched opencode worker, including `sai-1-spec-proposal-worker`, has explicit dispatchable opencode registration defaults

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
The installer MUST derive `OPENCODE_MANAGED_AGENTS` membership from the opencode binding declarations and join each derived name with its explicit repository registration defaults. Existing workers MUST retain their model, `mode: "subagent"`, variant when present, `permission.task` shape, registration identity, and deterministic ordering.

#### Scenario: Fresh opencode registration includes every binding-dispatched worker
- **WHEN** a fresh install creates or updates the opencode managed-agent registration
- **THEN** all binding-dispatched workers receive registration entries, including `sai-1-spec-proposal-worker`, and existing workers retain their explicit worker-specific settings

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
The registry refactor MUST preserve the values observed through the existing exported Claude worker constants and `LEGACY_CLAUDE_WORKERS` surfaces. `OPENCODE_MANAGED_AGENTS` MUST remain an export-compatible, lazily resolved view of the complete binding-derived opencode census joined with its explicit registration defaults, including `sai-1-spec-proposal-worker`.

#### Scenario: Doctor enumeration observes every managed opencode worker
- **WHEN** doctor enumerates Claude worker agents and opencode managed agents through the existing exports
- **THEN** it observes the same Claude agent names and all binding-dispatched opencode managed-agent keys, including `sai-1-spec-proposal-worker`

### Requirement: Behavior-preservation regression coverage
The installer test harness MUST verify registry completeness and the derived Claude, owner-dispatch, opencode key-set and insertion-order, manifest, and fresh-install compatibility contracts without requiring semantic changes to the existing behavior assertions.

#### Scenario: Existing installer suites remain green
- **WHEN** the install-manifest, Claude-install, and opencode-install test suites run after the refactor
- **THEN** their existing behavior-preservation assertions pass and additional coverage detects missing registry entries, owner drift, opencode shape or insertion-order drift, or projection drift

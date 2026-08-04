# review-worker-installation Specification

## Purpose
TBD - created by archiving change sai-5-review-coordinator-worker-split. Update Purpose after archive.
## Requirements
### Requirement: Installer projects every routed review surface

The installation manifest SHALL project the review coordinator/invocation assets, numbered review worker contract, Claude and opencode bindings, Claude managed worker agent, and both harness forwarding skills to their established destinations. Projection order and ownership metadata SHALL remain deterministic.

#### Scenario: Fresh installation runs
- **WHEN** the installer expands the manifest for Claude Code and opencode
- **THEN** every routed review surface is projected to its expected destination
- **AND** the resulting projection is deterministic across repeated runs

### Requirement: Claude worker ownership is collision-safe

Installer flow SHALL define the numbered Claude review-worker agent and owner constants, select that worker in the existing ownership logic, reuse exact-compatible user-owned definitions without claiming ownership, block incompatible collisions without overwriting user content, and preserve edited managed agents during guarded uninstall.

The owner dispatch SHALL resolve an owner sidecar for every `owned-copy` projection the manifest declares — not the review worker alone — and SHALL fail closed on any `owned-copy` agent it does not name rather than defaulting to another worker's owner. Adding an owned worker without a matching owner entry SHALL stop installation rather than mis-own it.

#### Scenario: Every owned worker resolves to its own owner
- **WHEN** installation expands the `owned-copy` projections
- **THEN** each declared owned worker — including the spec, design, implementation, and review workers — resolves to its own owner sidecar rather than another worker's
- **AND** an `owned-copy` agent the dispatch does not name fails installation closed instead of receiving a defaulted owner

#### Scenario: Compatible Claude worker already exists
- **WHEN** an exact-compatible user-owned `sai-5-review-worker` agent exists
- **THEN** installation reuses it without creating an ownership sidecar
- **AND** guarded uninstall preserves it

#### Scenario: Incompatible Claude worker collides
- **WHEN** a user-owned review-worker definition exists with incompatible content
- **THEN** installation stops with the established collision remediation
- **AND** it does not overwrite the definition or partially claim ownership

### Requirement: opencode worker registration is preserved and configurable

The installer SHALL register the numbered opencode review worker using the established namespaced agent policy, including permission to dispatch the read-only `explore` branch and write-capable `budget` branch as required by the binding. An existing user-owned entry SHALL be preserved according to the established opencode agent-preservation policy.

#### Scenario: opencode review worker is absent
- **WHEN** installation finds no `sai-5-review-worker` entry
- **THEN** it adds the canonical managed definition with both nested branch permissions
- **AND** the wrapper dispatch target resolves to that name

#### Scenario: opencode review worker is customized
- **WHEN** an existing `sai-5-review-worker` entry is valid but customized
- **THEN** installation preserves the entry unchanged
- **AND** dispatch uses the existing entry's configured runtime and permissions

### Requirement: Routed wrappers load the coordinator and matching binding

The Claude Code and opencode `/sai-5-review` wrappers SHALL be rewritten as thin routed wrappers that load the shared review coordinator and only their matching review-worker binding, while preserving each harness's model, argument, and prerequisite behavior. The Copilot review prompt SHALL remain pointed at the inline review instruction.

#### Scenario: Claude wrapper is inspected
- **WHEN** the Claude Code review wrapper is loaded
- **THEN** it fetches the review coordinator and Claude review-worker binding
- **AND** it does not fetch the opencode binding or Copilot inline adapter

#### Scenario: opencode wrapper is inspected
- **WHEN** the opencode review wrapper is loaded
- **THEN** it fetches the review coordinator and opencode review-worker binding
- **AND** it places the complete substituted argument string after its change-name label into `wrapper_echo_value`, preserving the optional parent branch for worker-owned parsing

### Requirement: Installer cleanup does not remove unrelated user workers

Any legacy-cleanup entry added for the numbered review worker SHALL identify a concrete prior review-worker destination and replacement ownership pair. The installer SHALL not broaden legacy cleanup to unrelated agents or remove unowned user content.

#### Scenario: No prior review identity exists
- **WHEN** installation runs in an environment with no concrete legacy review-worker destination
- **THEN** no speculative cleanup is performed
- **AND** unrelated Claude agents and owner sidecars remain untouched

### Requirement: Installation verification covers routed review parity

Installer and structural verification SHALL cover the Claude/opencode review wrappers, worker identity, manifest projections, ownership and collision behavior, both nested delegation permissions, changed-file lifecycle fields, and Copilot exclusion. A failed required projection or permission check SHALL block activation rather than weakening the worker contract.

#### Scenario: Required review surface is missing
- **WHEN** a manifest or structural check cannot find a required routed review surface
- **THEN** activation fails with the missing surface identified
- **AND** the installer does not silently fall back to an incomplete routed worker


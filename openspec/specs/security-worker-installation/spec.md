# security-worker-installation Specification

## Purpose
TBD - created by syncing change sai-6-security-coordinator-worker-split. Update Purpose after archive.
## Requirements

### Requirement: Installer registers and projects every routed security surface

The managed-worker registry SHALL define the numbered security worker, its Claude managed-agent identity and owner metadata, and its opencode worker identity. The installation manifest SHALL deterministically project the security coordinator and invocation core, numbered worker contract, Claude and opencode bindings, and Claude managed agent to their established destinations. It SHALL NOT project either harness's retired forwarding skill.

#### Scenario: Fresh installation runs
- **WHEN** the installer expands the manifest for Claude Code and opencode
- **THEN** every active routed security surface is projected to its expected destination
- **AND** neither retired forwarding skill is projected
- **AND** repeated installation produces the same projection and ownership metadata

### Requirement: Claude security-worker ownership is collision-safe
Installer flow SHALL define the numbered Claude security-worker agent filename constant. The installer SHALL handle each `tunable-seed` projection by writing the agent file when absent, and on subsequent installs by overwriting the body and non-tunable frontmatter with the source bytes while preserving the destination's `model` and `effort` values placed per the structural anchor in `agent-tunable-ownership`. When the body or non-tunable frontmatter differs from source, the installer SHALL emit a console notice naming the destination path and continue; the installer SHALL NOT block installation on a body divergence. The `rename-or-remove` remediation and the `.<basename>.owner.json` sidecar are retired.

#### Scenario: Body-divergent security worker is overwritten with notice
- **WHEN** an existing user-owned security-worker definition has body or non-tunable frontmatter that differs from the managed definition
- **THEN** installation overwrites the body and non-tunable frontmatter, preserves the destination's `model` and `effort` values placed per the structural anchor in `agent-tunable-ownership`, and emits a console notice naming the destination path
- **AND** installation does not block and does not partially claim ownership

#### Scenario: Tuned security worker is preserved on uninstall
- **WHEN** guarded uninstall evaluates the managed security worker
- **THEN** uninstall removes the agent file only when its body and non-tunable frontmatter match the source
- **AND** uninstall preserves a body-divergent file as a project-local override
- **AND** uninstall does not consult any sidecar file

### Requirement: Routed wrappers preserve three-harness entrypoint parity

Claude Code and opencode security wrappers SHALL be thin routed wrappers that load the shared security coordinator and fetch the matching neutral worker-binding destination directly while preserving their harness-specific model and argument behavior. The Copilot security prompt SHALL remain inline and SHALL receive no routed binding, managed agent, or routed manifest projection. Structural verification SHALL assert this intentional exclusion and all required Claude/opencode surfaces.

#### Scenario: Routed wrappers are inspected
- **WHEN** the Claude Code or opencode `/sai-6-security` wrapper is loaded
- **THEN** it fetches the coordinator and matching binding only
- **AND** it preserves the complete argument value for worker-owned parsing

#### Scenario: Parity verification finds a missing surface
- **WHEN** a required worker, binding, wrapper, skill, agent, registry entry, or manifest projection is missing or mismatched
- **THEN** installation or structural verification fails with the missing surface identified
- **AND** it does not silently fall back to an incomplete routed security worker

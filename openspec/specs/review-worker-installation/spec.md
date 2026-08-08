# review-worker-installation Specification

## Purpose
TBD - created by archiving change sai-5-review-coordinator-worker-split. Update Purpose after archive.
## Requirements
### Requirement: Installer projects every routed review surface

The installation manifest SHALL project the review coordinator/invocation assets, numbered review worker contract, Claude and opencode bindings, and Claude managed worker agent to their established destinations. It SHALL NOT project either harness's retired forwarding skill. Projection order and ownership metadata SHALL remain deterministic.

#### Scenario: Fresh installation runs
- **WHEN** the installer expands the manifest for Claude Code and opencode
- **THEN** every active routed review surface is projected to its expected destination
- **AND** neither retired forwarding skill is projected
- **AND** the resulting projection is deterministic across repeated runs

### Requirement: Claude worker ownership is collision-safe
Installer flow SHALL define the numbered Claude review-worker agent filename constant. The installer SHALL handle each `tunable-seed` projection by writing the agent file when absent, and on subsequent installs by overwriting the body and non-tunable frontmatter with the source bytes while preserving the destination's `model` and `effort` values placed per the structural anchor in `agent-tunable-ownership`. When the body or non-tunable frontmatter differs from source, the installer SHALL emit a console notice naming the destination path and continue; the installer SHALL NOT block installation on a body divergence and SHALL NOT block installation on an unknown agent. The `OWNER_BY_CLAUDE_AGENT` dispatch map and the `rename-or-remove` remediation are retired; the `.<basename>.owner.json` sidecar is no longer written.

#### Scenario: Tuned review worker preserves its tunables on update
- **WHEN** an exact-compatible user-owned `sai-5-review-worker` agent exists, possibly with a customized `model` or `effort`
- **THEN** installation preserves the agent file as-is (no body or non-tunable frontmatter change to overwrite)
- **AND** guarded uninstall preserves it as user-owned

#### Scenario: Body-divergent review worker is overwritten with notice
- **WHEN** a user-owned review-worker definition exists with body or non-tunable frontmatter that differs from the managed definition
- **THEN** installation overwrites the body and non-tunable frontmatter, preserves the destination's `model` and `effort` values placed per the structural anchor in `agent-tunable-ownership`, and emits a console notice naming the destination path
- **AND** installation does not block and does not partially claim ownership

#### Scenario: Missing review worker is created with shipped tunables
- **WHEN** the namespaced Claude review worker agent is absent
- **THEN** installation creates the agent file with the shipped model and effort values from the source
- **AND** installation does not create a `.<basename>.owner.json` sidecar

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

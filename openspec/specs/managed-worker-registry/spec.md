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
The installer SHALL preserve one declarative managed-worker registry keyed by worker name for the existing Claude agent filename and owner-sidecar metadata. The Claude registry MUST NOT retain opencode-only registration settings. Opencode worker registration SHALL be declared by the install manifest as owned markdown agent files under `agents/opencode/`, each carrying mode, model, optional variant, `permission.task`, and the canonical worker-contract fetch in the body; opencode membership SHALL NOT be derived from binding declarations joined with registration defaults.

#### Scenario: All current workers have complete registration data
- **WHEN** the installer loads the managed-worker registry and the opencode agent projections
- **THEN** the existing Claude worker records remain present exactly once without opencode-only settings, and every opencode worker (`sai-1-spec-proposal-worker`, `sai-2-design-worker`, `sai-3-implementation-worker`, `sai-5-review-worker`, `sai-6-security-worker`, `sai-7-performance-worker`, `sai-8-accessibility-worker`) has exactly one manifest row projecting its markdown agent file with frontmatter mode, model, variant, and `permission.task`

### Requirement: Derived Claude worker compatibility surface
The installer MUST derive the existing per-worker Claude agent and owner constants, the `OWNER_BY_CLAUDE_AGENT` dispatch map, and their existing exports from the canonical registry. The derived values MUST retain the current worker names, agent filenames, owner sidecars, map keys, and map values.

#### Scenario: Existing consumers observe the same Claude values
- **WHEN** installer code or tests import the existing exported Claude worker constants or owner map
- **THEN** the names and values are identical to those exposed before the refactor

### Requirement: Fail-closed owner dispatch
Owned-copy projection dispatch MUST resolve ownership through the registry-derived owner map and MUST throw when an owned-copy agent has no registry entry, for both the Claude and opencode harnesses. The installer MUST NOT default an unknown agent to any owner or silently install it without an owner. The registry-derived owner map is keyed by agent filename, so owned-copy projections under both harnesses SHALL use identical agent filenames for the same worker; a harness-specific filename would lose its owner dispatch.

#### Scenario: Unknown owned-copy agent is rejected
- **WHEN** an `owned-copy` projection names an agent that is absent from the managed-worker registry
- **THEN** installation fails with the existing fail-closed behavior before an owner sidecar is selected or written

#### Scenario: Known owned-copy agent keeps its owner
- **WHEN** an `owned-copy` projection names a currently managed agent under either harness
- **THEN** the registry-derived dispatch selects the same owner sidecar as the current implementation

### Requirement: Manifest projection parity and fresh-install preservation
The registry relationship with `sai/install-manifest.json` SHALL remain deterministic: every current managed-worker projection MUST remain covered exactly once, and the opencode agent rows SHALL mirror the Claude rows' destination shape (`agents` destination class, `owned-copy` strategy, `owned` ownership). The change MUST preserve manifest expansion, projection ordering, harness isolation, collision handling, and fresh-install file, sidecar, and opencode configuration bytes, the sole configuration-byte change being the removal of the seven `agent.sai-*-worker` keys from the canonical sample `configs/opencode.jsonc`.

#### Scenario: Existing managed projections remain complete
- **WHEN** installer, doctor, or uninstall expands the install manifest
- **THEN** the seven Claude owned-copy projections and the seven opencode owned-copy projections are each present exactly once with no duplicate or omitted projection

#### Scenario: Fresh installs are byte-preserving
- **WHEN** the Claude and opencode installers run against a fresh destination
- **THEN** the resulting file inventories and file bytes, ownership sidecars, and opencode configuration bytes are identical to the pre-change behavior, plus the seven new opencode agent files and their sidecars, and minus the seven `agent.sai-*-worker` keys removed from the sample configuration

#### Scenario: Projection safety remains unchanged
- **WHEN** a projection has a missing source, destination collision, incompatible existing content, or unsupported ownership mapping
- **THEN** the same validation failure occurs and no user-owned or incompatible content is silently overwritten

### Requirement: Downstream worker-consumer compatibility
The registry change MUST preserve the values observed through the existing exported Claude worker constants and `LEGACY_CLAUDE_WORKERS` surfaces. The `OPENCODE_MANAGED_AGENTS` export and `getOpencodeManagedAgents` SHALL be removed; doctor and uninstall SHALL enumerate the manifest-projected opencode agent files instead of a derived census or the configuration agent map.

#### Scenario: Doctor enumeration observes every projected opencode worker
- **WHEN** doctor enumerates Claude worker agents and opencode worker agent files
- **THEN** it observes the same Claude agent names and all seven manifest-projected opencode agent files

### Requirement: Behavior-preservation regression coverage
The installer test harness MUST verify registry completeness, the derived Claude and owner-dispatch surfaces, the opencode manifest row set and projection order, and fresh-install compatibility contracts, including the scoped sample-config byte change (the seven worker keys removed, everything else byte-identical). Opencode census and registration-default assertions SHALL be replaced by assertions over the projected agent files.

#### Scenario: Existing installer suites remain green
- **WHEN** the install-manifest, Claude-install, and opencode-install test suites run after the change
- **THEN** their existing behavior-preservation assertions pass and additional coverage detects missing manifest rows, owner drift, projection drift, or opencode agent-file content drift

### Requirement: Opencode workers are projected as owned markdown agent files
The install manifest SHALL declare one `owned-copy` projection per opencode worker agent, mirroring the Claude agent rows: source `agents/opencode/<worker>.md`, destination class `agents`, harness `opencode`, ownership `owned`. Each projected file SHALL carry the worker's mode, model, optional variant, and `permission.task` in YAML frontmatter and the canonical worker-contract fetch in its body, and SHALL NOT rely on the opencode configuration agent map for registration. Existing workers MUST retain their model, `mode: "subagent"`, variant when present, `permission.task` shape, and registration identity.

#### Scenario: Fresh opencode installation projects every worker file
- **WHEN** a fresh opencode installation expands the manifest
- **THEN** all seven worker agent files are created under `~/.config/opencode/agents/` with their canonical frontmatter and body, each accompanied by its ownership sidecar

#### Scenario: A projected worker file already exists
- **WHEN** a worker agent file already exists at the projected destination
- **THEN** installation reuses it when its content is exact-compatible, blocks with rename-or-remove remediation when it is incompatible, and never overwrites or repairs user content

### Requirement: Owned-copy projection installs the manifest source path
Owned-copy projection SHALL install the bytes of the manifest row's declared `source` file into the harness's `agents/` destination and SHALL NOT re-derive the source from another harness's directory by destination basename. The owned-copy installer SHALL be harness-neutral in function naming, source resolution, and error messaging.

#### Scenario: Opencode owned-copy rows project opencode sources
- **WHEN** the manifest expands an opencode owned-copy row whose source is `agents/opencode/sai-2-design-worker.md`
- **THEN** the file installed at `~/.config/opencode/agents/sai-2-design-worker.md` SHALL be byte-identical to `agents/opencode/sai-2-design-worker.md`
- **AND** it SHALL NOT contain Claude frontmatter (no `model: claude-opus-4-8`, no `effort` key, no `tools` field)
- **AND** it SHALL carry the opencode frontmatter (`mode`, `model`, `variant`, `permission.task`) and the canonical contract fetch in the body

#### Scenario: Claude owned-copy rows remain byte-preserving
- **WHEN** the manifest expands a Claude owned-copy row whose source is `agents/claude/sai-2-design-worker.md`
- **THEN** the file installed at `~/.claude/agents/sai-2-design-worker.md` SHALL remain byte-identical to the pre-change behavior, and the owner sidecar SHALL record the same managed hash

### Requirement: The canonical opencode configuration sample defines no managed worker
The canonical sample `configs/opencode.jsonc` SHALL NOT define any of the seven managed opencode worker agent keys; the seven `agent.sai-*-worker` keys are removed from it, while `subagent_depth`, `permission`, and the three helper-agent keys (`explore`, `executor`, `budget`) remain unchanged. The fresh-install configuration therefore carries no worker registration; workers register only through the projected markdown agent files.

#### Scenario: The sample config contains no worker keys
- **WHEN** `configs/opencode.jsonc` is read after the change
- **THEN** none of `sai-1-spec-proposal-worker`, `sai-2-design-worker`, `sai-3-implementation-worker`, `sai-5-review-worker`, `sai-6-security-worker`, `sai-7-performance-worker`, or `sai-8-accessibility-worker` appears under `agent`
- **AND** `subagent_depth`, `permission`, and the `agent.explore`, `agent.executor`, and `agent.budget` definitions remain present

#### Scenario: Fresh-install merge does not re-add worker keys
- **WHEN** the installer copies `configs/opencode.jsonc` to a fresh destination and applies the configuration merge
- **THEN** the resulting configuration contains no `agent.sai-*-worker` key
- **AND** the merged configuration retains `permission.external_directory["~/.config/opencode/sai/**"]` and the three helper-agent keys

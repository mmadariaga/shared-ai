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
The installer SHALL preserve one declarative managed-worker registry keyed by worker name for the existing Claude agent filename. The Claude registry MUST NOT retain opencode-only registration settings. The registry MUST also declare, per harness, the user-owned tunable keys for agent file frontmatter: `model` and `effort` for Claude, `model` and `variant` for opencode. The declaration MUST be a single per-harness constant in installer code, not a per-projection annotation; the 14 agent projections MUST NOT carry any tunable-key metadata in the manifest. Opencode worker registration SHALL be declared by the install manifest as markdown agent files under `agents/opencode/`, each carrying mode, model, optional variant, `permission.task`, and the canonical worker-contract fetch in the body; opencode membership SHALL NOT be derived from binding declarations joined with registration defaults.

#### Scenario: All current workers have complete registration data
- **WHEN** the installer loads the managed-worker registry and the opencode agent projections
- **THEN** the existing Claude worker records remain present exactly once without opencode-only settings, and every opencode worker (`sai-1-spec-proposal-worker`, `sai-2-design-worker`, `sai-3-implementation-worker`, `sai-5-review-worker`, `sai-6-security-worker`, `sai-7-performance-worker`, `sai-8-accessibility-worker`) has exactly one manifest row projecting its markdown agent file under the `tunable-seed` strategy with frontmatter mode, model, variant, and `permission.task`

### Requirement: Manifest projection parity and fresh-install preservation
The registry relationship with `sai/install-manifest.json` SHALL remain deterministic: every current managed-worker projection MUST remain covered exactly once, and the opencode agent rows SHALL mirror the Claude rows' destination shape (`agents` destination class, `tunable-seed` strategy, `managed` ownership). The change MUST preserve manifest expansion, projection ordering, harness isolation, collision handling, and fresh-install file bytes; the sole change to the manifest is the strategy token (`owned-copy` → `tunable-seed`) and the ownership token (`owned` → `managed`) on the 14 agent rules. The installer identifies a managed file by its body and non-tunable frontmatter; a destination whose tunable lines differ from the source is still considered managed.

#### Scenario: Existing managed projections remain complete
- **WHEN** installer, doctor, or uninstall expands the install manifest
- **THEN** the seven Claude tunable-seed projections and the seven opencode tunable-seed projections are each present exactly once with no duplicate or omitted projection

#### Scenario: Fresh installs are byte-preserving for unmodified users
- **WHEN** the Claude and opencode installers run against a fresh destination
- **THEN** the resulting file inventories and file bytes are identical to the pre-change behavior for any installation whose agent files were never modified

#### Scenario: Projection safety remains unchanged
- **WHEN** a projection has a missing source, destination collision, or unsupported ownership mapping
- **THEN** the same validation failure occurs and no user-owned or incompatible content is silently overwritten

### Requirement: Downstream worker-consumer compatibility
The registry change MUST preserve the values observed through the existing exported Claude worker agent filename constants. The `OWNER_BY_CLAUDE_AGENT` export, the `CLAUDE_*_WORKER_OWNER` constants, the `LEGACY_CLAUDE_WORKERS` constant, and the `migrateLegacyClaudeWorkers` function SHALL be removed; the legacy Claude migration code path is retired. The `OPENCODE_MANAGED_AGENTS` export and `getOpencodeManagedAgents` remain removed. Doctor and uninstall SHALL enumerate the manifest-projected opencode agent files via the new `tunable-seed` strategy and the body-and-non-tunable identity rule.

#### Scenario: Doctor enumeration observes every projected opencode worker
- **WHEN** doctor enumerates Claude worker agents and opencode worker agent files
- **THEN** it observes the same Claude agent names and all seven manifest-projected opencode agent files
- **AND** its identity check compares only the body and non-tunable frontmatter

### Requirement: Behavior-preservation regression coverage
The installer test harness MUST verify registry completeness, the derived Claude surface, the opencode manifest row set and projection order, and fresh-install compatibility contracts. Opencode census and registration-default assertions SHALL be replaced by assertions over the projected agent files; the owner-sidecar and `readManagedHash` assertions SHALL be removed. The harness MUST cover the new tunable-seed behavior: seed-on-create writes source verbatim, overwrite-managed-on-update preserves user tunables, body divergence produces a console notice without throwing, doctor body-comparison is the only identity check, uninstall uses the same body comparison, uninstall also removes installed `.<basename>.owner.json` sidecars under the same shape guard, and sidecars are deleted on install under the same shape guard.

#### Scenario: Existing installer suites remain green
- **WHEN** the install-manifest, Claude-install, and opencode-install test suites run after the change
- **THEN** their existing behavior-preservation assertions pass and additional coverage detects missing manifest rows, projection drift, opencode agent-file content drift, and tunable-line mis-handling

### Requirement: Opencode workers are projected as managed markdown agent files
The install manifest SHALL declare one `tunable-seed` projection per opencode worker agent, mirroring the Claude agent rows: source `agents/opencode/<worker>.md`, destination class `agents`, harness `opencode`, ownership `managed`. Each projected file SHALL carry the worker's mode, model, optional variant, and `permission.task` in YAML frontmatter and the canonical worker-contract fetch in its body, and SHALL NOT rely on the opencode configuration agent map for registration. Existing workers MUST retain their model, `mode: "subagent"`, variant when present, `permission.task` shape, and registration identity. The installer SHALL overwrite the body and non-tunable frontmatter on update while preserving the destination's `model` and `variant` lines; a destination whose body or non-tunable frontmatter differs from source is overwritten with a console notice.

#### Scenario: Fresh opencode installation projects every worker file
- **WHEN** a fresh opencode installation expands the manifest
- **THEN** all seven worker agent files are created under `~/.config/opencode/agents/` with their canonical frontmatter and body

#### Scenario: A projected worker file already exists with a different body
- **WHEN** a worker agent file already exists at the projected destination and its body or non-tunable frontmatter differs from source
- **THEN** the installer overwrites the body and non-tunable frontmatter with source bytes, preserves the destination's tunable values placed per the structural anchor in `agent-tunable-ownership`, and emits a console notice naming the destination path
- **AND** the installer does not throw

#### Scenario: A projected worker file exists with body match and tunable changes
- **WHEN** a worker agent file already exists at the projected destination and its body and non-tunable frontmatter match source, with tunable lines that differ from source
- **THEN** the installer overwrites the body and non-tunable frontmatter with source bytes while leaving the destination's tunable lines untouched

### Requirement: Tunable-seed projection installs the manifest source path
Tunable-seed projection SHALL install the bytes of the manifest row's declared `source` file into the harness's `agents/` destination and SHALL NOT re-derive the source from another harness's directory by destination basename. The tunable-seed installer SHALL be harness-neutral in function naming, source resolution, and error messaging. The installer SHALL extract destination tunable scalar lines for the harness's declared tunable keys, overwrite the body and non-tunable frontmatter with source bytes, and splice the destination's tunable lines back using a structural anchor: when the source frontmatter contains the same key, the value is replaced in place at the matching key's source position; when the source omits the key, the line is appended immediately after the last top-level scalar in the source frontmatter and SHALL NOT be emitted inside a nested block (such as `permission:`). The installer SHALL NOT write a `.<basename>.owner.json` sidecar file.

#### Scenario: Opencode tunable-seed rows project opencode sources
- **WHEN** the manifest expands an opencode tunable-seed row whose source is `agents/opencode/sai-2-design-worker.md`
- **THEN** the file installed at `~/.config/opencode/agents/sai-2-design-worker.md` SHALL be byte-identical to `agents/opencode/sai-2-design-worker.md` when the destination did not exist before the install
- **AND** it SHALL NOT contain Claude frontmatter (no `model: claude-opus-4-8`, no `effort` key, no `tools` field)
- **AND** it SHALL carry the opencode frontmatter (`mode`, `model`, `variant`, `permission.task`) and the canonical contract fetch in the body

#### Scenario: Claude tunable-seed rows remain byte-preserving
- **WHEN** the manifest expands a Claude tunable-seed row whose source is `agents/claude/sai-2-design-worker.md`
- **THEN** the file installed at `~/.claude/agents/sai-2-design-worker.md` SHALL remain byte-identical to the pre-change behavior when the destination did not exist before the install
- **AND** the installer SHALL NOT create a `.<basename>.owner.json` file

### Requirement: The canonical opencode configuration sample defines no agent
The canonical sample `configs/opencode.jsonc` SHALL NOT define any agent key — neither the seven managed opencode worker agent keys nor the three helper-agent keys (`explore`, `executor`, `budget`). It SHALL retain `$schema`, `subagent_depth`, and `permission` (including the `~/.config/opencode/sai/**` external-directory allow rule). The fresh-install configuration therefore carries no agent registration at all; all agents register through the projected markdown agent files — the seven workers and the three generic agents.

#### Scenario: The sample config contains no agent keys
- **WHEN** `configs/opencode.jsonc` is read after the change
- **THEN** none of `sai-1-spec-proposal-worker`, `sai-2-design-worker`, `sai-3-implementation-worker`, `sai-5-review-worker`, `sai-6-security-worker`, `sai-7-performance-worker`, `sai-8-accessibility-worker`, `explore`, `executor`, or `budget` appears under any `agent` key
- **AND** `$schema`, `subagent_depth`, and `permission` remain present

#### Scenario: Fresh-install merge does not add agent keys
- **WHEN** the installer copies `configs/opencode.jsonc` to a fresh destination and applies the configuration merge
- **THEN** the resulting configuration contains no `agent` key
- **AND** the merged configuration retains `permission.external_directory["~/.config/opencode/sai/**"]`

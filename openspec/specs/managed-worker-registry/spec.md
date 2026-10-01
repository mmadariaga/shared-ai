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

The installer SHALL preserve one declarative managed-worker registry keyed by worker name for the existing Claude agent filename. The Claude registry MUST NOT retain opencode-only registration settings. The registry MUST declare the user-owned tunable keys through single per-harness installer constants: model and effort for Claude Code, model and variant for opencode; agent projections MUST NOT carry per-projection tunable-key metadata. The worker matrix SHALL derive native grants from canonical capability assignments rather than independent native inventories. Opencode registration SHALL use manifest-projected Markdown agent files carrying mode, model, optional variant, ordered V2 permissions, fetch bootstrap, profile disclosure, access-check reference, and canonical worker-contract fetch. Membership SHALL NOT be derived from binding declarations joined with registration defaults.

#### Scenario: All current workers have complete registration data
- **WHEN** the installer loads the managed-worker registry and opencode agent projections
- **THEN** every current Claude worker remains present exactly once without opencode-only settings and every current opencode worker has exactly one tunable-seed Markdown agent projection with mode, model, optional variant, and generated V2 permissions

### Requirement: Manifest projection parity and fresh-install preservation

The registry relationship with `sai/install-manifest.json` SHALL remain deterministic: every current managed-worker projection MUST remain covered exactly once, and opencode agent projections SHALL mirror Claude projections' agents destination class, tunable-seed strategy, and managed ownership. Manifest expansion, projection ordering, harness isolation, and collision handling SHALL remain preserved. Fresh installation SHALL write compiled harness-native content, including profile-derived grants, rather than require obsolete pre-capability file bytes. A managed file SHALL be identified by its body and non-tunable frontmatter; differing tunable values SHALL NOT change that identity.

#### Scenario: Existing managed projections remain complete
- **WHEN** installer, doctor, or uninstall expands the install manifest
- **THEN** every current Claude and opencode worker projection is present exactly once without duplicates or omissions

#### Scenario: Fresh installs are byte-preserving for unmodified users
- **WHEN** Claude Code and opencode installers run against fresh destinations
- **THEN** installed agents match their compiled source bytes including projected grants and unchanged shipped tunable seeds

#### Scenario: Projection safety remains unchanged
- **WHEN** a projection has a missing source, destination collision, or unsupported ownership mapping
- **THEN** the same validation failure occurs and no user-owned or incompatible content is silently overwritten

### Requirement: Downstream worker-consumer compatibility

The registry change MUST preserve the values observed through existing exported Claude worker agent filename constants. OWNER_BY_CLAUDE_AGENT, CLAUDE_*_WORKER_OWNER, LEGACY_CLAUDE_WORKERS, and migrateLegacyClaudeWorkers SHALL remain removed, and the legacy Claude migration code path SHALL remain retired. OPENCODE_MANAGED_AGENTS and getOpencodeManagedAgents SHALL remain removed. Doctor and uninstall SHALL enumerate current manifest-projected opencode agent files through tunable-seed projections and compare compiled content using the body-and-non-tunable identity rule.

#### Scenario: Doctor enumeration observes every projected opencode worker
- **WHEN** doctor enumerates Claude worker agents and opencode worker agent files
- **THEN** it observes the preserved Claude identities and every current manifest-projected opencode worker
- **AND** its identity check compares only body and non-tunable frontmatter

### Requirement: Behavior-preservation regression coverage

The installer test harness MUST verify registry completeness, the derived Claude surface, opencode projection membership and ordering, and fresh-install compiled content. Opencode census and registration-default assertions SHALL remain replaced by projected-agent assertions; owner-sidecar and readManagedHash identity assertions SHALL remain removed. Coverage MUST include compiled-source seeding on create, managed updates preserving user tunables, quiet reuse of compatible content, body divergence producing a console notice without throwing, doctor and uninstall using body-and-non-tunable comparison, and sidecar deletion on install and uninstall under the existing shape guard. Profile translation coverage SHALL detect missing grants and unresolved projection tokens.

#### Scenario: Existing installer suites remain green
- **WHEN** install-manifest, Claude-install, and opencode-install suites run
- **THEN** preservation assertions pass and coverage detects missing projections, compiled-content drift, native grant errors, and tunable mis-handling

### Requirement: Opencode workers are projected as managed markdown agent files

The manifest SHALL declare one tunable-seed projection per current opencode worker, mirroring Claude destination class agents and managed ownership. Generated worker sources SHALL come from the opencode worker template and worker matrix with canonical capability assignments. Each projected file SHALL carry mode, model, optional variant, and ordered V2 permissions, followed by the harness fetch bootstrap, profile disclosure, access-check reference, and canonical worker-contract Fetch. Registration SHALL NOT rely on the configuration agent map. Existing workers MUST retain registration identity, subagent mode, and shipped model and variant seeds. Managed updates SHALL replace divergent body and non-tunable frontmatter with compiled source content while preserving destination model and variant blocks; compatible content SHALL remain untouched.

#### Scenario: Fresh opencode installation projects every worker file
- **WHEN** a fresh opencode installation expands the manifest
- **THEN** all current worker agent files are created under `~/.config/opencode/agents/` with canonical generated frontmatter and body

#### Scenario: projected worker bodies bootstrap fetch resolution
- **WHEN** installer and worker-matrix tests inspect generated managed worker agents
- **THEN** each supported-harness worker contains its expected first body bootstrap before the canonical contract Fetch

#### Scenario: A projected worker file already exists with a different body
- **WHEN** a projected worker destination has body or non-tunable frontmatter differing from compiled source
- **THEN** installation replaces managed content, preserves destination tunable blocks at a top-level structural anchor, and emits a notice naming the destination
- **AND** installation does not throw

#### Scenario: A projected worker file exists with body match and tunable changes
- **WHEN** destination body and non-tunable frontmatter match compiled source but tunables differ
- **THEN** installation reuses the file untouched without an overwrite notice

### Requirement: Tunable-seed projection installs the manifest source path

Tunable-seed projection SHALL install its declared harness-specific source content, including compiled sourceText when supplied, into the harness agents destination. It SHALL NOT re-derive source from another harness directory by basename. Installer naming, source resolution, and errors SHALL remain harness-neutral. Destination tunable text SHALL be extracted using the harness-declared keys, including structured model blocks. Managed updates SHALL replace non-tunable content and reinsert destination tunables at a top-level anchor in harness key order; destination-only tunables SHALL survive, absent optional tunables SHALL stay absent, and tunables SHALL NOT be emitted inside nested permission blocks. The installer SHALL NOT write an ownership sidecar.

#### Scenario: Opencode tunable-seed rows project opencode sources
- **WHEN** the manifest expands the opencode Design worker projection from its harness template and matrix
- **THEN** a fresh `~/.config/opencode/agents/sai-2-design-worker.md` matches its compiled opencode source
- **AND** it contains no Claude model identifier, effort key, or tools field
- **AND** it carries mode, model, optional variant, V2 permissions, and the canonical contract Fetch

#### Scenario: Claude tunable-seed rows remain byte-preserving
- **WHEN** the manifest expands the Claude Design worker projection from its harness template and matrix
- **THEN** a fresh `~/.claude/agents/sai-2-design-worker.md` matches its compiled Claude source with projected tools and preserved shipped tunable seeds
- **AND** installation creates no ownership sidecar

### Requirement: The canonical opencode configuration sample defines no agent
The canonical sample `configs/opencode.jsonc` SHALL NOT define any agent key — neither the seven managed opencode worker agent keys nor the three helper-agent keys (`explore`, `executor`, `budget`). It SHALL retain `$schema`, `experimental.subagent_depth`, and `permission` (including the `~/.config/opencode/sai/**` external-directory allow rule). The fresh-install configuration therefore carries no agent registration at all; all agents register through the projected markdown agent files — the seven workers and the three generic agents.

#### Scenario: The sample config contains no agent keys
- **WHEN** `configs/opencode.jsonc` is read after the change
- **THEN** none of `sai-1-spec-proposal-worker`, `sai-2-design-worker`, `sai-3-implementation-worker`, `sai-5-review-worker`, `sai-6-security-worker`, `sai-7-performance-worker`, `sai-8-accessibility-worker`, `explore`, `executor`, or `budget` appears under any `agent` key
- **AND** `$schema`, `experimental.subagent_depth`, and `permission` remain present

#### Scenario: Fresh-install merge does not add agent keys
- **WHEN** the installer copies `configs/opencode.jsonc` to a fresh destination and applies the configuration merge
- **THEN** the resulting configuration contains no `agent` key
- **AND** the merged configuration retains `permission.external_directory["~/.config/opencode/sai/**"]`

### Requirement: Delegating managed workers grant subagent dispatch on both harnesses

Every worker-matrix entry whose contract, transitive SAI Fetch closure, or sibling steps load a budget delegation skill SHALL receive Agent in its derived Claude tools and opencode V2 subagent grants for the targets its contract requires. A prose mention without a Fetch SHALL NOT classify a worker as delegating. Skill loading alone SHALL NOT require every Generic Agent target: Backfill and audit/spec workers require explore, while Design and Implement additionally require budget. The regression guard SHALL remain one-directional and SHALL NOT independently forbid Agent on non-delegating entries or require executor. It MUST inspect repository sources rather than installed copies, evaluate each entry using its workerContract, and fail for an empty delegating set or one omitting Backfill.

#### Scenario: Backfill worker can dispatch its budget-explorer conflict scan
- **WHEN** Backfill is materialized from its entry whose worker card loads the budget skill
- **THEN** its derived Claude tools include Agent, Edit, and Write and its opencode permissions grant the explore subagent target required for conflict scanning

#### Scenario: A delegating worker without dispatch capability fails the guard test
- **WHEN** a worker's loaded instructions require budget delegation but its derived grants omit Agent or its required opencode target
- **THEN** `test/worker-delegation-tools.test.js` fails naming the worker and delegation source

#### Scenario: Non-delegating workers holding Agent are not flagged
- **WHEN** an inspected entry has Agent access but its loaded instructions contain no budget delegation Fetch
- **THEN** the delegation guard passes without requiring or forbidding dispatch capability for that entry

#### Scenario: Contract-specific target grants do not become blanket delegation
- **WHEN** current RED, GREEN, direct implementation, and review-fix profiles are translated
- **THEN** they receive no delegation grant, while Design and Implement receive their additional budget target

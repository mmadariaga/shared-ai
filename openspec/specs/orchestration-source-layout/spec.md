# orchestration-source-layout Specification

## Purpose
TBD - created by archiving change extract-sai-orchestration-core. Update Purpose after archive.
## Requirements
### Requirement: Active references exclude retired inline loaders
Active runtime sources, fixtures, tests, specifications, and maintained documentation SHALL reference `sai/commands/{design,implement}/{coordinator,invocation}.md` or the Copilot Inline Coordinator Adapter and SHALL NOT treat the five retired paths (`sai/commands/sai-2-design.md`, `sai/commands/sai-3-implement.md`, `sai/compat/sai-2-design-core.md`, `sai/compat/sai-3-implementation-core.md`, and `sai/compat/implement-invocation.md`) or the former ADR template source `sai/compat/_templates/adr-index.md` as available sources. Archived OpenSpec changes and ADRs MAY retain their original historical references.

#### Scenario: Active reference inventory is checked
- **WHEN** maintained repository references to design and implementation entrypoints are audited
- **THEN** active sources, fixtures, tests, specifications, and documentation SHALL contain no dependency on either removed loader path
- **AND** historical references under archived changes and ADRs SHALL not require rewriting

### Requirement: Retired managed loader cleanup is ownership-safe
Install/update and uninstall SHALL remove an existing destination for `commands/sai-2-design-inline.md` or `commands/sai-3-implement-inline.md` only when its content matches a recorded historical managed hash for that destination. A modified copy, an unrecognized copy, or a copy without matching managed ownership evidence SHALL remain untouched and doctor SHALL report it as an unexpected retired loader requiring manual cleanup.

`sai/install-manifest.json` SHALL own this evidence in a top-level `retirements` array alongside `projections`. Each retired loader SHALL have exactly one record containing a stable `id`, a `destination` with class `sai` and its former `commands/<filename>` path, the harness allowlist `claude`, `opencode`, and `copilot`, and a non-empty `managedHashes` array of lowercase SHA-256 digests. `managedHashes` SHALL include every known repository-published byte variant of that loader that the recursive managed `sai-commands` projection could have installed. The shared manifest expansion module SHALL validate these records and expose the applicable per-harness retirement inventory to install, doctor, and uninstall; those consumers SHALL NOT define their own loader paths or hash tables.

#### Scenario: Install or update finds an exact historical managed copy
- **WHEN** install or update finds a retired loader destination whose content matches a recorded historical managed hash
- **THEN** it SHALL remove that destination and SHALL NOT recreate it

#### Scenario: Uninstall finds an exact historical managed copy
- **WHEN** uninstall runs without a prior cleanup update and finds a retired loader destination whose content matches a recorded historical managed hash
- **THEN** it SHALL remove that destination under the same ownership safeguard

#### Scenario: Retired copy is modified or unrecognized
- **WHEN** install, update, doctor, or uninstall finds a retired loader destination without a matching recorded historical managed hash
- **THEN** install, update, and uninstall SHALL preserve the file
- **AND** doctor SHALL report the unexpected retired loader and identify manual cleanup as remediation

#### Scenario: Fresh installation has no retired copy
- **WHEN** a fresh installation expands the managed projections
- **THEN** it SHALL neither create a retired loader nor require a retirement cleanup action

#### Scenario: Retirement registry is expanded for a harness
- **WHEN** the shared manifest module expands `sai/install-manifest.json` for Claude Code, opencode, or Copilot
- **THEN** it SHALL return both retired loader destinations with their registered managed SHA-256 hashes for that harness
- **AND** install, doctor, and uninstall SHALL consume that returned retirement inventory without a separate hard-coded mapping

#### Scenario: Retirement record is malformed
- **WHEN** a retirement record omits its destination, supported-harness allowlist, or non-empty lowercase SHA-256 `managedHashes` array
- **THEN** manifest validation SHALL fail before install, doctor, or uninstall mutates a destination

### Requirement: Canonical orchestration source layout
Shared coordinator and worker-lifecycle contracts SHALL live under `sai/orchestration/`. Canonical phase worker contracts SHALL live under `sai/orchestration/workers/`, and canonical harness-specific routed-worker bindings SHALL live under `sai/orchestration/workers/bindings/`.

#### Scenario: Maintainer locates an orchestration contract
- **WHEN** a maintainer needs to change shared lifecycle mechanics, a phase worker contract, or a routed harness binding
- **THEN** the corresponding canonical source SHALL be discoverable in the prescribed `sai/orchestration/` location
- **AND** no runtime surface SHALL contain a divergent canonical copy

### Requirement: Instruction and policy separation
`sai/instructions/` SHALL contain task-only phase instructions, and reusable behavioral policy SHALL live under `sai/policies/`. A file relocated across this boundary SHALL retain its existing effective content and fetch order unless a normative requirement explicitly changes it.

#### Scenario: Existing caller moves to a classified source
- **WHEN** a caller is updated from a mixed instruction location to `sai/instructions/` or `sai/policies/`
- **THEN** the selected location SHALL reflect whether the source defines a phase task or reusable policy
- **AND** the caller SHALL observe the same instructions in the same effective order

### Requirement: Complete migration inventory
The extraction SHALL apply the following exhaustive classification to the current `sai/instructions/` tree:

- Task instructions remaining under `sai/instructions/`: `accessibility.md`, `archive.md`, `apply.md`, `backfill.md`, `commit.md`, `design.md`, `explore.md`, `implement.md`, `performance.md`, `pr.md`, `review.md`, `security.md`, and `spec.propose.md`.
- Reusable policies moving to `sai/policies/`: `artifact-feedback-gate.md`, `change-picker.md`, `commit-rules.md`, `glossary-format.md`, `prereqs.md`, `remember.md`, `sai-learnings-format.md`, and `status-picker.md`.
- Worker contracts moving to `sai/orchestration/workers/`: `design-worker.md` and `implement-worker.md`.
- Shared instruction templates under `sai/instructions/_templates/`: `adr-index.md` and the existing phase output templates, recursively projected to Claude Code, opencode, and GitHub Copilot.
- Compatibility-only assets retained under `sai/compat/`: the former design and implementation loaders are retired without shims, the former dedicated ADR template projection is absent, and no active caller or projection expects the former ADR template source.

The design artifact SHALL map every listed source to its final canonical path and every caller that must change. No unlisted file in the current `sai/instructions/` tree SHALL move as part of this change.

#### Scenario: Migration plan is generated
- **WHEN** the design phase defines file moves and fetch updates
- **THEN** it SHALL cover every file in the exhaustive classification exactly once
- **AND** it SHALL update every caller atomically to its corresponding final canonical path
- **AND** it SHALL classify `adr-index.md` exactly once under `sai/instructions/_templates/`, update every runtime and installation caller to that canonical path, remove the dedicated compatibility projection, and leave archived change records unchanged
- **AND** it SHALL leave all unlisted instruction files in place

### Requirement: Thin harness runtime surfaces
Harness runtime files under `skills/` and `agents/` SHALL remain valid thin forwarding entry points and SHALL NOT duplicate canonical coordinator, lifecycle, worker, or binding contract prose. `agents/claude/` SHALL remain the Claude worker-agent runtime surface, and Claude and opencode bindings SHALL preserve their respective dispatch and continuation mechanisms.

#### Scenario: Installed routed binding executes
- **WHEN** a Claude Code or opencode routed planning command dispatches its worker after installation
- **THEN** the harness runtime surface SHALL resolve the canonical binding for that harness
- **AND** Claude Code SHALL retain agent-ID continuation while opencode SHALL retain task-ID continuation

#### Scenario: Claude agent resolves its worker contract
- **WHEN** an installed Claude planning agent starts
- **THEN** its forwarding manifest SHALL fetch the corresponding installed canonical contract under `sai/orchestration/workers/`

#### Scenario: Routed skill resolves its harness binding
- **WHEN** an installed Claude Code or opencode routed-worker skill is loaded
- **THEN** its forwarding manifest SHALL fetch the corresponding installed canonical binding under `sai/orchestration/workers/bindings/<harness>/`

### Requirement: Copilot inline adapter remains inline
GitHub Copilot SHALL continue to execute design and implementation planning through `sai/orchestration/inline-invocation.md` and SHALL NOT be required to consume a routed-worker binding. The adapter SHALL be invoked directly by the Copilot prompts without an intermediate command loader.

#### Scenario: Copilot invokes a planning phase
- **WHEN** GitHub Copilot runs design or implementation planning
- **THEN** it SHALL follow the direct inline adapter path
- **AND** source-layout changes SHALL NOT introduce routed worker lifecycle state or an obsolete inline command loader into that path

### Requirement: Dedicated compatibility source
Compatibility loaders and compatibility-only path-sensitive assets SHALL live under `sai/compat/`, not `sai/instructions/`, `sai/policies/`, or `sai/orchestration/`. Shared instruction templates, including `adr-index.md`, SHALL live under `sai/instructions/_templates/`. The extraction SHALL update all repository callers in the same change and SHALL NOT leave forwarding shims at former source paths.

#### Scenario: Compatibility source moves
- **WHEN** a compatibility loader or asset moves from `sai/instructions/` to `sai/compat/`
- **THEN** every caller SHALL move to the new path in the same change
- **AND** the former instruction path SHALL NOT remain as a shim

#### Scenario: Shared ADR template has no compatibility duplicate

- **WHEN** the ADR index template is relocated from `sai/compat/_templates/adr-index.md`
- **THEN** every caller SHALL use `sai/instructions/_templates/adr-index.md`, the former compatibility source SHALL be absent, and no compatibility copy or shim SHALL remain

### Requirement: Managed source-to-runtime projection
The installer SHALL project canonical sources using per-harness allowlists in `sai/install-manifest.json` and the existing copy-based installation model. All harnesses SHALL receive their required `sai/instructions/`, `sai/policies/`, and `sai/compat/` sources. Claude Code and opencode SHALL receive the shared routed coordinator, lifecycle, and phase-worker contracts plus only their own subtree under `sai/orchestration/workers/bindings/<harness>/`. GitHub Copilot SHALL receive `sai/orchestration/inline-invocation.md` and only the other sources required by its direct inline adapter path. No harness SHALL receive `sai/commands/sai-2-design-inline.md` or `sai/commands/sai-3-implement-inline.md`, and GitHub Copilot SHALL receive no routed planning-worker binding, routed planning-agent projection, or Claude/opencode binding subtree.

The repository copies under `sai/orchestration/`, `sai/instructions/`, `sai/policies/`, and `sai/compat/` SHALL be the editable authorities. Installed copies are managed runtime projections, and forwarding manifests under `skills/` and `agents/` own only runtime resolution metadata. Doctor SHALL compare every allowlisted projection and forwarding manifest with its bundled source and report missing, unexpected, or drifted files. Uninstall SHALL consume the same allowlists and SHALL retain locally modified managed files under the existing hash-based safeguards.

#### Scenario: Installer projects canonical orchestration sources
- **WHEN** a supported harness is installed or updated
- **THEN** its managed SAI root SHALL receive exactly the canonical sources allowed for that harness
- **AND** only the runtime forwarding surfaces allowed for that harness SHALL be projected to skill, agent, command, or prompt locations
- **AND** neither obsolete inline command loader SHALL be created

#### Scenario: Copilot projection excludes routed bindings
- **WHEN** the Copilot projection allowlist is evaluated
- **THEN** it SHALL exclude the Claude and opencode binding subtrees and all routed planning-worker runtime surfaces
- **AND** it SHALL include the Copilot Inline Coordinator Adapter
- **AND** it SHALL exclude both obsolete inline command loaders

#### Scenario: Routed harness projection excludes foreign bindings
- **WHEN** the Claude Code or opencode projection allowlist is evaluated
- **THEN** it SHALL include only that harness's routed binding subtree
- **AND** it SHALL exclude the other routed harness's binding subtree, the Copilot Inline Coordinator Adapter, and both obsolete inline command loaders

#### Scenario: Doctor detects projection drift
- **WHEN** an installed canonical source or forwarding manifest differs from its bundled source, is missing, or is unexpected
- **THEN** doctor SHALL report that projection drift against the source-to-runtime mapping

#### Scenario: Uninstall encounters a locally modified projection
- **WHEN** uninstall enumerates a managed projection whose content no longer matches its managed hash
- **THEN** it SHALL retain that file under the existing modified-file safeguard

### Requirement: Single structured installation manifest
`sai/install-manifest.json` SHALL be the single structured source of truth for active managed source-to-runtime projections and retired managed-destination cleanup records. Each active entry SHALL identify its repository source, destination class or relative destination, harness allowlist, and ownership or drift policy; each top-level `retirements` record SHALL identify its destination, harness allowlist, and accepted historical managed SHA-256 hashes. The shared manifest expansion module, installer, doctor, and uninstall SHALL consume this manifest rather than maintain separate hard-coded active or retired projection inventories. Removing a source covered by a recursive projection SHALL remove it from fresh expanded inventories for every harness without adding a replacement projection or compatibility shim.

#### Scenario: Managed projection is added or moved
- **WHEN** a managed canonical source or runtime forwarding surface is added, moved, or removed
- **THEN** its projection SHALL be changed once in `sai/install-manifest.json`
- **AND** installer, doctor, and uninstall SHALL derive their behavior from that same entry

#### Scenario: Retired command loader is absent from expansion
- **WHEN** the recursive `sai-commands` projection is expanded after either obsolete inline loader source is removed
- **THEN** the retired destination SHALL be absent from fresh install and doctor-required active inventories
- **AND** it MAY remain in the top-level `retirements` cleanup inventory only with destination, harness, and historical managed SHA-256 evidence
- **AND** no harness-specific compatibility projection SHALL recreate it

#### Scenario: Manifest and filesystem disagree
- **WHEN** doctor finds a managed destination missing, extra, or different from the source selected by the manifest
- **THEN** it SHALL report the disagreement against the corresponding manifest entry

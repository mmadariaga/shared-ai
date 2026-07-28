# orchestration-source-layout Specification

## Purpose
TBD - created by archiving change extract-sai-orchestration-core. Update Purpose after archive.
## Requirements
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
- Compatibility loaders and assets moving to `sai/compat/`: `design-invocation-core.md`, `implement-invocation-core.md`, `implement-invocation.md`, and `_templates/adr-index.md`.

The design artifact SHALL map every listed source to its final canonical path and every caller that must change. No unlisted file in the current `sai/instructions/` tree SHALL move as part of this change.

#### Scenario: Migration plan is generated
- **WHEN** the design phase defines file moves and fetch updates
- **THEN** it SHALL cover every file in the exhaustive classification exactly once
- **AND** it SHALL update every compatibility consumer atomically to the corresponding `sai/compat/` path
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
GitHub Copilot SHALL continue to execute design and implementation planning through the existing inline adapter and SHALL NOT be required to consume a routed-worker binding merely because canonical routed bindings moved under `workers/bindings/`.

#### Scenario: Copilot invokes a planning phase
- **WHEN** GitHub Copilot runs design or implementation planning
- **THEN** it SHALL follow the existing inline command path
- **AND** the shared-source extraction SHALL NOT introduce routed worker lifecycle state into that path

### Requirement: Dedicated compatibility source
Compatibility loaders and path-sensitive compatibility assets SHALL live under `sai/compat/`, not `sai/instructions/`, `sai/policies/`, or `sai/orchestration/`. The extraction SHALL update all repository callers in the same change and SHALL NOT leave forwarding shims at the former `sai/instructions/` paths.

#### Scenario: Compatibility source moves
- **WHEN** a compatibility loader or asset moves from `sai/instructions/` to `sai/compat/`
- **THEN** every caller SHALL move to the new path in the same change
- **AND** the former instruction path SHALL NOT remain as a shim

### Requirement: Managed source-to-runtime projection
The installer SHALL project canonical sources using per-harness allowlists in `sai/install-manifest.json` and the existing copy-based installation model. All harnesses SHALL receive their required `sai/instructions/`, `sai/policies/`, and `sai/compat/` sources. Claude Code and opencode SHALL receive the shared routed coordinator, lifecycle, and phase-worker contracts plus only their own subtree under `sai/orchestration/workers/bindings/<harness>/`. GitHub Copilot SHALL receive only the sources required by its inline command paths and SHALL receive no routed planning-worker binding, routed planning-agent projection, or Claude/opencode binding subtree.

The repository copies under `sai/orchestration/`, `sai/instructions/`, `sai/policies/`, and `sai/compat/` SHALL be the editable authorities. Installed copies are managed runtime projections, and forwarding manifests under `skills/` and `agents/` own only runtime resolution metadata. Doctor SHALL compare every allowlisted projection and forwarding manifest with its bundled source and report missing, unexpected, or drifted files. Uninstall SHALL consume the same allowlists and SHALL retain locally modified managed files under the existing hash-based safeguards.

#### Scenario: Installer projects canonical orchestration sources
- **WHEN** a supported harness is installed or updated
- **THEN** its managed SAI root SHALL receive exactly the canonical sources allowed for that harness
- **AND** only the runtime forwarding surfaces allowed for that harness SHALL be projected to skill, agent, command, or prompt locations

#### Scenario: Copilot projection excludes routed bindings
- **WHEN** the Copilot projection allowlist is evaluated
- **THEN** it SHALL exclude the Claude and opencode binding subtrees and all routed planning-worker runtime surfaces

#### Scenario: Routed harness projection excludes foreign bindings
- **WHEN** the Claude Code or opencode projection allowlist is evaluated
- **THEN** it SHALL include only that harness's routed binding subtree
- **AND** it SHALL exclude the other routed harness's binding subtree

#### Scenario: Doctor detects projection drift
- **WHEN** an installed canonical source or forwarding manifest differs from its bundled source, is missing, or is unexpected
- **THEN** doctor SHALL report that projection drift against the source-to-runtime mapping

#### Scenario: Uninstall encounters a locally modified projection
- **WHEN** uninstall enumerates a managed projection whose content no longer matches its managed hash
- **THEN** it SHALL retain that file under the existing modified-file safeguard

### Requirement: Single structured installation manifest
`sai/install-manifest.json` SHALL be the single structured source of truth for managed source-to-runtime projections. Each entry SHALL identify its repository source, destination class or relative destination, harness allowlist, and ownership or drift policy. Installer, doctor, and uninstall SHALL consume this manifest rather than maintain separate hard-coded projection inventories.

#### Scenario: Managed projection is added or moved
- **WHEN** a managed canonical source or runtime forwarding surface is added, moved, or removed
- **THEN** its projection SHALL be changed once in `sai/install-manifest.json`
- **AND** installer, doctor, and uninstall SHALL derive their behavior from that same entry

#### Scenario: Manifest and filesystem disagree
- **WHEN** doctor finds a managed destination missing, extra, or different from the source selected by the manifest
- **THEN** it SHALL report the disagreement against the corresponding manifest entry


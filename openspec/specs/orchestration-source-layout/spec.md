# orchestration-source-layout Specification

## Purpose
TBD - created by archiving change extract-sai-orchestration-core. Update Purpose after archive.
## Requirements
### Requirement: Active references exclude retired inline loaders
Active runtime sources, fixtures, tests, specifications, and maintained documentation SHALL reference `sai/commands/{design,implement}/{coordinator,invocation}.md` and SHALL NOT treat the five retired paths (`sai/commands/sai-2-design.md`, `sai/commands/sai-3-implement.md`, `sai/compat/sai-2-design-core.md`, `sai/compat/sai-3-implementation-core.md`, and `sai/compat/implement-invocation.md`) or the former ADR template source `sai/compat/_templates/adr-index.md` as available sources. Archived OpenSpec changes and ADRs MAY retain their original historical references.

#### Scenario: Active reference inventory is checked
- **WHEN** maintained repository references to design and implementation entrypoints are audited
- **THEN** active sources, fixtures, tests, specifications, and documentation SHALL contain no dependency on either removed loader path
- **AND** historical references under archived changes and ADRs SHALL not require rewriting

### Requirement: Retired managed loader cleanup is ownership-safe
Install/update and uninstall SHALL remove an existing destination for `commands/sai-2-design-inline.md` or `commands/sai-3-implement-inline.md` only when its content matches a recorded historical managed hash for that destination. A modified copy, an unrecognized copy, or a copy without matching managed ownership evidence SHALL remain untouched and doctor SHALL report it as an unexpected retired loader requiring manual cleanup.

`sai/install-manifest.json` SHALL own this evidence in a top-level `retirements` array alongside `projections`. Each retired loader SHALL have exactly one record containing a stable `id`, a `destination` with class `sai` and its former `commands/<filename>` path, the harness allowlist `claude` and `opencode`, and a non-empty `managedHashes` array of lowercase SHA-256 digests. `managedHashes` SHALL include every known repository-published byte variant of that loader that the recursive managed `sai-commands` projection could have installed. The shared manifest expansion module SHALL validate these records and expose the applicable per-harness retirement inventory to install, doctor, and uninstall; those consumers SHALL NOT define their own loader paths or hash tables.

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

#### Scenario: Retirement registry is expanded for a supported harness
- **WHEN** the shared manifest module expands `sai/install-manifest.json` for Claude Code or opencode
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
Task-only command instructions SHALL live under `sai/commands/{name}/instructions.md`, and reusable behavioral policy SHALL remain under `sai/policies/`. A command instruction relocated from `sai/instructions/` SHALL retain its existing effective content and fetch order unless this change's folded-path requirements explicitly update the path.

#### Scenario: command instruction moves to its classified source
- **WHEN** a caller is updated from a former `sai/instructions/{name}.md` path
- **THEN** it resolves `sai/commands/{name}/instructions.md` and observes the same instruction content in the same effective order

### Requirement: Complete migration inventory
The maintained source-layout inventory SHALL classify every current file in `sai/instructions/` exactly once into its final canonical path: the primary command instructions SHALL use `sai/commands/{name}/instructions.md`; the archive secondary instruction SHALL use `sai/commands/archive/archive-commit-gate.instructions.md`; command-owned templates SHALL use neighboring `.template.md` files; `change-overview.md` SHALL use `sai/change-overview.md`; and `adr-index.md` and `ddr-index.md` SHALL use `sai/adr-index.template.md` and `sai/ddr-index.template.md`. No unlisted file shall move by implication, and archived records MAY retain historical paths.

#### Scenario: migration plan covers every moved source

- **WHEN** the design phase defines the folded file moves and caller updates
- **THEN** it covers every former command instruction and template exactly once, both root exceptions exactly once, and every active caller atomically

#### Scenario: archive multi-instruction inventory is collision-free

- **WHEN** the complete migration inventory is read
- **THEN** it lists `sai/instructions/archive.md` → `sai/commands/archive/instructions.md` and `sai/instructions/archive-commit-gate.md` → `sai/commands/archive/archive-commit-gate.instructions.md` as two distinct moves, with both archive fetch callers updated to the matching destinations

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

### Requirement: Inline adapter source is retired
The repository SHALL no longer define an active GitHub Copilot inline adapter source or projection. `sai/orchestration/inline-invocation.md` SHALL be absent, and no active source, prompt, skill, agent, or manifest entry SHALL require it.

#### Scenario: Inline adapter source is retired
- **WHEN** maintained sources and active projections are audited
- **THEN** `sai/orchestration/inline-invocation.md` is absent
- **AND** no active caller or projection references that path

#### Scenario: No replacement compatibility path is installed
- **WHEN** the manifest is expanded for Claude Code or opencode
- **THEN** neither harness receives a Copilot prompt, skill, agent, or inline adapter projection
- **AND** no replacement inline compatibility projection is created

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
The installer SHALL project the folded command-local and root canonical source surfaces for Claude Code and opencode as described by `sai/install-manifest.json`. Doctor and uninstall SHALL consume the same folded inventory, and no active projection SHALL create the removed `sai/instructions/` tree or a compatibility duplicate.

#### Scenario: fresh projection contains only folded paths

- **WHEN** a supported harness projection is expanded after the fold
- **THEN** its managed `sai/` root contains the folded command instructions/templates and root exceptions, with no active old instruction destination

### Requirement: Single structured installation manifest
`sai/install-manifest.json` SHALL remain the single structured source of truth for the folded active source-to-runtime projections and any retirement records. Adding, moving, or removing a folded source SHALL be represented once in the manifest and consumed consistently by installer, doctor, and uninstall.

#### Scenario: manifest drives folded inventory

- **WHEN** install, doctor, or uninstall enumerates active SAI files
- **THEN** it derives the same folded source/destination inventory from the manifest without a separate hard-coded `sai/instructions/` mapping

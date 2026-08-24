## MODIFIED Requirements

### Requirement: Active references exclude retired inline loaders
Active sources, fixtures, tests, specifications, and maintained documentation SHALL reference the live routed design coordinator, worker, and step surfaces, plus the live routed implementation surfaces where applicable. They SHALL NOT treat the deleted monolithic design instruction `sai/commands/design/instructions.md` or deleted design invocation source `sai/commands/design/invocation.md` as available authorities, nor the five retired paths (`sai/commands/sai-2-design.md`, `sai/commands/sai-3-implement.md`, `sai/compat/sai-2-design-core.md`, `sai/compat/sai-3-implementation-core.md`, and `sai/compat/implement-invocation.md`) or the former ADR template source `sai/compat/_templates/adr-index.md`. Archived OpenSpec changes and ADRs MAY retain their original historical references.

#### Scenario: Active reference inventory is checked
- **WHEN** maintained repository references to design and implementation entrypoints are audited
- **THEN** active sources, fixtures, tests, specifications, and documentation SHALL point to live routed coordinator, worker, and step-owned sources and SHALL contain no dependency on the deleted monolithic design instruction or invocation source
- **AND** historical references under archived changes and ADRs SHALL not require rewriting

#### Scenario: retired-design-sources-are-excluded
- **WHEN** maintained design references are audited
- **THEN** active references point to routed step-owned sources and do not depend on the deleted design instruction or invocation files.

### Requirement: Retired managed loader cleanup is ownership-safe
Install/update and uninstall SHALL remove an existing destination for `commands/sai-2-design-inline.md`, `commands/sai-3-implement-inline.md`, `commands/design/invocation.md`, or `commands/design/instructions.md` only when its content matches a recorded historical managed hash for that destination. A modified copy, an unrecognized copy, or a copy without matching managed ownership evidence SHALL remain untouched and doctor SHALL report it as an unexpected retired loader requiring manual cleanup.

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
- **THEN** it SHALL return every registered retired loader and deleted design-source destination with its registered managed SHA-256 hashes for that harness
- **AND** install, doctor, and uninstall SHALL consume that returned retirement inventory without a separate hard-coded mapping

#### Scenario: Retirement record is malformed
- **WHEN** a retirement record omits its destination, supported-harness allowlist, or non-empty lowercase SHA-256 `managedHashes` array
- **THEN** manifest validation SHALL fail before install, doctor, or uninstall mutates a destination

#### Scenario: design-retirement-is-hash-gated
- **WHEN** a supported harness contains a retired design destination
- **THEN** lifecycle tooling removes it only when its content matches a registered managed hash.


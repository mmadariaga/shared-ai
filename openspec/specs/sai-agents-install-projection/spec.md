# sai-agents-install-projection Specification

## Purpose
TBD

## Requirements

### Requirement: Root-class manifest projection
`sai/install-manifest.json` contains a projection with id `sai-agents-index` that installs the orientation index at the harness root. The projection targets the `root` destination class with path `SAI_AGENTS.md`, covers both harnesses, and declares `strategy: copy`, `recursive: false`, `ownership: managed`, and `drift: content`.

#### Scenario: Install writes the file to the harness root
- **WHEN** the installer expands the manifest for either supported harness
- **THEN** the file `SAI_AGENTS.md` is written to that harness root, with content identical to the canonical `sai/SAI_AGENTS.md`

#### Scenario: Reinstall overwrites the file
- **WHEN** the installer runs again over an existing installed `SAI_AGENTS.md`
- **THEN** the installed file is overwritten with the canonical content, like every other managed projection

### Requirement: Destination-class resolution
The installer's destination-class resolution resolves the `root` class to the harness root at every site that maps destination classes to base directories — the install flow and its mirrored literals in the uninstall flow and doctor. A projection whose destination class has no resolution is a runtime expansion error, so every map site gains the class. No other installer behavior changes.

#### Scenario: Expansion of the root class succeeds
- **WHEN** install, doctor, or uninstall expands the `sai-agents-index` projection on a supported harness
- **THEN** the `root` class resolves to the harness root and expansion completes without a "No destination root" error

#### Scenario: Config keeps meaning configuration
- **WHEN** the destination-class map is read
- **THEN** the existing `config` class still resolves to the harness root and remains distinct from the new `root` class, so `config` keeps meaning configuration

### Requirement: Doctor missing-file detection
The installed `SAI_AGENTS.md` is covered by doctor's missing-file check. When the file is absent from a harness root on an installed harness, doctor reports it as a missing allowlisted file with the same severity and remediation as other managed projections. The unexpected-file sweep remains scoped to the existing `commands/`, `sai/`, `skills/`, and `agents/` directories and does not gain the harness root.

#### Scenario: Missing file reported by doctor
- **WHEN** the installed file is removed from a harness root and doctor runs
- **THEN** doctor reports the missing `SAI_AGENTS.md` with the standard missing-file severity and the standard "re-run the installer" remediation

#### Scenario: No false positives from the harness root
- **WHEN** doctor runs on a harness whose root contains the installed file plus unrelated root-level files
- **THEN** the unexpected-file sweep reports no findings for those root-level files, because the harness root is never a sweep root

### Requirement: Uninstall cleanup
Uninstall removes the installed `SAI_AGENTS.md` from the harness root as part of its manifest-driven cleanup, like every other managed projection. No special case is added for the file.

#### Scenario: Uninstall deletes the installed file
- **WHEN** uninstall runs for a harness that has the file installed
- **THEN** the installed `SAI_AGENTS.md` is removed from that harness root and reported in the uninstall output

### Requirement: Managed ownership with drift detection
The installed `SAI_AGENTS.md` is owned by the installer with content drift detection. A local edit to the installed file is reported as drift by doctor and overwritten on the next install, consistent with every other projection in the manifest.

#### Scenario: Local edit reported as drift
- **WHEN** an agent edits the installed `SAI_AGENTS.md` and doctor runs
- **THEN** doctor reports the content drift, and the next install overwrites the edit with the canonical content

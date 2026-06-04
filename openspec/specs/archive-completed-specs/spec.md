# archive-completed-specs Specification

## Purpose
TBD - created by archiving change retire-stale-specs. Update Purpose after archive.
## Requirements
### Requirement: archive-rename-instructions-files

The spec at `openspec/specs/rename-instructions-files/` SHALL be moved to an archive location (e.g., `openspec/specs/_archived/rename-instructions-files/`) because its described work — renaming `plan.md→implement.md` and `implement.md→apply.md` in `sai/instructions/` — is already reflected in the current file layout (no `plan.md` exists; `implement.md` and `apply.md` are both present).

#### Scenario: spec is archived

- **WHEN** the implementation runs for this change
- **THEN** `openspec/specs/rename-instructions-files/` no longer appears in the active spec tree
- **THEN** its contents are preserved at `openspec/specs/_archived/rename-instructions-files/`

### Requirement: archive-opencode-qwen-version

The spec at `openspec/specs/opencode-qwen-version/` SHALL be archived because the upgrade it describes (opencode wrappers → qwen3.7-plus) was completed in commit `5b95d17`.

#### Scenario: spec is archived

- **WHEN** the implementation runs
- **THEN** `openspec/specs/opencode-qwen-version/` no longer appears in the active spec tree
- **THEN** its contents are preserved at `openspec/specs/_archived/opencode-qwen-version/`

### Requirement: archive-opencode-model-resolution

The spec at `openspec/specs/opencode-model-resolution/` SHALL be archived because the qwen3.6-plus migration it was gating against is complete; the spec's normative assertion is now trivially satisfied.

#### Scenario: spec is archived

- **WHEN** the implementation runs
- **THEN** `openspec/specs/opencode-model-resolution/` no longer appears in the active spec tree
- **THEN** its contents are preserved at `openspec/specs/_archived/opencode-model-resolution/`

### Requirement: archive-sai-1-override-merge

The spec at `openspec/specs/sai-1-override-merge/` SHALL be archived because the scope restriction override it proposed has already been added to `sai/instructions/spec.propose.md` (the `## Scope Override (sai-1 step)` section).

#### Scenario: spec is archived

- **WHEN** the implementation runs
- **THEN** `openspec/specs/sai-1-override-merge/` no longer appears in the active spec tree
- **THEN** its contents are preserved at `openspec/specs/_archived/sai-1-override-merge/`

### Requirement: archive-directory-exists

An `openspec/specs/_archived/` directory SHALL exist after the implementation; it serves as the canonical landing zone for retired specs.

#### Scenario: archive dir is created on first archive

- **WHEN** the first spec is archived and `openspec/specs/_archived/` does not yet exist
- **THEN** the directory is created before the spec is moved into it


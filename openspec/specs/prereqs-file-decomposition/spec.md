# prereqs-file-decomposition Specification

## Purpose
TBD - created by archiving change split-prereqs-check-and-paths. Update Purpose after archive.

## Requirements

### Requirement: Decomposed check and path artifacts

The `sai/policies/prereqs.md` file SHALL be decomposed into two standalone artifacts under `sai/policies/`:

- `sai/policies/prereqs-check.md` — the executable-check artifact
- `sai/policies/prereqs-paths.md` — the declarative path-reference artifact

Each artifact SHALL be independently fetchable via `Fetch @sai/policies/<artifact>.md` and SHALL install to both harness projections through the existing `sai-policies` manifest rule without any projection change.

#### Scenario: two independent artifacts exist

- **WHEN** `sai/policies/` is inspected after the change
- **THEN** `prereqs-check.md` and `prereqs-paths.md` exist as separate files, and each is fetchable at its own `@sai/policies/` path

#### Scenario: both artifacts project for both harnesses

- **WHEN** the install manifest expands the `sai-policies` projection for the claude and opencode harnesses
- **THEN** both `prereqs-check.md` and `prereqs-paths.md` are included in both projections

### Requirement: Executable check artifact content

The `sai/policies/prereqs-check.md` artifact SHALL contain the three OpenSpec prerequisite checks from the current policy — the `openspec` binary availability check, the `openspec/` directory existence check, and the `openspec/config.yaml` `schema: sai-workflow` check — with their current wording, numbering (1, 2, 3), verification command `openspec --version`, and exact STOP-and-print messages:

    openspec CLI not found. Install it first: https://github.com/Fission-AI/OpenSpec
    OpenSpec not initialized in this project. Run: openspec init
    openspec/config.yaml does not declare `schema: sai-workflow`. The sai commands require this schema. Add `schema: sai-workflow` to the top of openspec/config.yaml.

No check text, stop message, or numbering SHALL change.

#### Scenario: check artifact carries all three checks

- **WHEN** `sai/policies/prereqs-check.md` is read
- **THEN** it contains three numbered checks and the exact stop messages for the missing binary, missing `openspec/` directory, and missing schema line

#### Scenario: verification command preserved

- **WHEN** `sai/policies/prereqs-check.md` is read
- **THEN** it contains the text `openspec --version` as the verification command for the openspec binary check

### Requirement: Path reference artifact content

The `sai/policies/prereqs-paths.md` artifact SHALL contain the declarative OpenSpec path resolution reference from the current policy — the direct-paths rule ("Use direct paths to locate them — no recursive globbing"), the full path table from `openspec/config.yaml` through `openspec/changes/archive/YYYY-MM-DD-{change-name}/`, and the rule "Do not create or modify any files if any prerequisite check fails."

No listed path or rule wording SHALL change.

#### Scenario: path table fully present

- **WHEN** `sai/policies/prereqs-paths.md` is read
- **THEN** it lists every path from the current table (`openspec/config.yaml`, `openspec/specs/{name}/spec.md`, `openspec/schemas/sai-workflow/schema.yaml`, the change artifacts under `openspec/changes/{change-name}/`, and the archive directory pattern)

#### Scenario: no-write-on-failure rule present

- **WHEN** `sai/policies/prereqs-paths.md` is read
- **THEN** it contains the sentence "Do not create or modify any files if any prerequisite check fails."

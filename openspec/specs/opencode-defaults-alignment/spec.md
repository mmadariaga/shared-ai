# opencode-defaults-alignment Specification

## Purpose
TBD - created by archiving change update-opencode-defaults-to-go-zen. Update Purpose after archive.

## Requirements

### Requirement: Generic opencode agents declare the free model with xhigh variant
Each file in `agents/opencode/` SHALL declare `model: opencode/muse-spark-1.3-contributor-free#xhigh` in single-line form alongside its preserved description, mode, and permissions.

#### Scenario: Generic agent frontmatter uses free xhigh
- **WHEN** the three generic agent files are read after the change
- **THEN** each declares the free model with xhigh variant and retains its mode

### Requirement: Opencode command wrappers declare the contributor model with xhigh variant
Each file in `commands/opencode/` SHALL declare `model: opencode-go/muse-spark-1.3-contributor#xhigh` in single-line form with no separate variant line and no stale free or high value.

#### Scenario: Wrapper frontmatter matches the preset
- **WHEN** the opencode command wrappers are read after the change
- **THEN** each declares the contributor model with xhigh variant

### Requirement: Worker-matrix opencodeAgent entries match the Go+Zen preset
The worker-matrix in `sai/install-manifest.json` SHALL declare matching opencodeAgent defaults with single-line variant suffixes: `opencode-go/deepseek-v4.1-flash#max` for spec, design, implementation, backfill, merge, red, green, direct-build, review-fix, performance, and accessibility workers, and `opencode-go/muse-spark-1.3-contributor#xhigh` for the commit worker, preserving descriptions and permission blocks.

#### Scenario: Manifest entries mirror the preset
- **WHEN** the install manifest opencodeAgent entries are read after the change
- **THEN** the listed workers declare the preset model and variant with no stale value

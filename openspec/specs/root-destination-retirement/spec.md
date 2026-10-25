# root-destination-retirement Specification

## Purpose
TBD: define managed retirement of former root destinations.

## Requirements

### Requirement: Former root destinations SHALL be retired by managed-content hash

The manifest MUST retain retirements for sai/change-overview.md, sai/adr-index.template.md, and sai/ddr-index.template.md for both supported harnesses. Installation and project refresh SHALL delete exact retired regular files or file symlinks regardless of content without migration. Historical hashes SHALL remain doctor-recognition and guarded-uninstall metadata, not an installation deletion gate. Doctor SHALL stay read-only; uninstall SHALL retain unrecognized customized copies. Retirement SHALL skip directories and linked parents and never delete recursively or touch file-symlink targets.

#### Scenario: Remove an unchanged former root copy
- **WHEN** installation, doctor, or uninstall evaluates an unchanged former root destination
- **THEN** installation deletes the exact retired file, doctor reports without mutation, and guarded uninstall can remove its recognized copy while the command-owned replacement remains active

#### Scenario: Preserve a changed or unknown former root copy
- **WHEN** a former root destination is modified or unrecognized
- **THEN** installation deletes the exact retired file without hash gating, doctor remains read-only, and guarded uninstall retains unrecognized content

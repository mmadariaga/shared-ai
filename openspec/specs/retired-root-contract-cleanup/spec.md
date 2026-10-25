# retired-root-contract-cleanup Specification

## Purpose

Defines ownership-aware retirement behavior for former root-level shared protocol destinations after the protocols move under `sai/orchestration/`.

## Requirements

### Requirement: Former root destinations have managed retirement records

The install manifest SHALL register the former `command-runner.md` and `worker-core.md` root destinations as retired managed files for both Claude Code and opencode, including every supported historical managed hash for each destination.

#### Scenario: Managed retired copy is evaluated

- **WHEN** install, doctor, or uninstall evaluates a former root destination whose bytes match a recorded harness hash
- **THEN** it recognizes the file as a retired managed copy and applies the retirement behavior for that harness

### Requirement: Modified retired copies are preserved

Installation and project refresh SHALL delete an exact declared retired former root regular file or file symlink even when it matches no historical hash. Doctor SHALL report without mutation and recommend installer removal without migration. Guarded uninstall SHALL continue preserving unrecognized customized copies. Installation SHALL skip directories and paths through linked directories.

#### Scenario: Retired copy has local modifications
- **WHEN** a former root destination is modified or unrecognized
- **THEN** installation deletes the exact retired file, doctor reports it without deletion, and guarded uninstall preserves unrecognized content

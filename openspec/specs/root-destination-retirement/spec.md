# root-destination-retirement Specification

## Purpose
TBD: define managed retirement of former root destinations.

## Requirements

### Requirement: Former root destinations SHALL be retired by managed-content hash

The manifest MUST register the former installed destinations `sai/change-overview.md`, `sai/adr-index.template.md`, and `sai/ddr-index.template.md` as hash-gated retirements for both supported harnesses.

#### Scenario: Remove an unchanged former root copy

- **WHEN** an old root destination matches one of its registered managed hashes during install, doctor, or uninstall processing
- **THEN** the retirement flow SHALL remove that managed copy and leave the command-owned destination as the active replacement

#### Scenario: Preserve a changed or unknown former root copy

- **WHEN** an old root destination is modified or does not match a registered managed hash
- **THEN** the retirement flow SHALL preserve the copy and report it for manual cleanup rather than deleting it

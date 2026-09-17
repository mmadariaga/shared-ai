# example-config-reference Specification

## Purpose
TBD - created by archiving change install-feedback-cleanup. Update Purpose after archive.

## Requirements

### Requirement: Reference example cited on fresh create

When no Opencode config exists and the installer creates one from the bundled example, it SHALL record a Created notice naming the created path and citing `configs/opencode.jsonc` as the reference example, emitted through the notices collection for the final block.

#### Scenario: Fresh config cites the example

- **WHEN** the installer creates a new Opencode config from the bundled example
- **THEN** the Created notice names the target path and cites `configs/opencode.jsonc` as the reference example

### Requirement: Reference example cited on manual verification

When the existing Opencode config cannot be merged and the installer falls back to manual verification, the verify message SHALL cite `configs/opencode.jsonc` as the reference example alongside the permission snippet, and the message SHALL be emitted through the notices collection when active while the file itself is left unchanged.

#### Scenario: Unparseable config keeps the manual path with example citation

- **WHEN** the existing Opencode config cannot be parsed and merged automatically
- **THEN** the installer leaves the file unchanged and the verify message cites `configs/opencode.jsonc` as the reference example

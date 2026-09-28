# preset-install Specification

## Purpose
TBD - created by archiving change opencode-preset-examples. Update Purpose after archive.

## Requirements

### Requirement: Installer seeds opencode example presets copy-if-absent
The installer SHALL project sai/presets/opencode/*.json into the opencode sai presets library copy-if-absent with the harness segment stripped.
#### Scenario: Fresh install seeds missing examples
- **WHEN** the destination preset file is absent during opencode install
- **THEN** the installer copies the source JSON once without merge or content validation

### Requirement: Installer preserves existing destination presets
The installer SHALL leave an existing destination preset file intact with no overwrite or merge.
#### Scenario: Reinstall with customized preset
- **WHEN** the destination preset already exists, including corrupt JSON
- **THEN** the installer performs no copy, no merge, and no validation of that destination

### Requirement: Opencode preset install stays harness-isolated
Opencode preset projection SHALL never read or write the Claude preset library.
#### Scenario: Opencode install runs alongside Claude library
- **WHEN** the opencode-preset-examples projection executes
- **THEN** only the opencode sai presets destination is affected and the Claude library path is untouched

### Requirement: Manifest validation accepts the copy-if-absent strategy
The install manifest validation SHALL accept copy-if-absent as a known projection strategy.
#### Scenario: Manifest declares preset projection
- **WHEN** sai/install-manifest.json declares strategy copy-if-absent for the preset projection
- **THEN** validation passes and the copy-if-absent dispatch branch handles the projection

### Requirement: Doctor reports missing example presets as warnings
Doctor SHALL report absent copy-if-absent example presets as non-fatal warnings while keeping other missing files fatal.
#### Scenario: Example preset deleted after install
- **WHEN** an expected example preset file is absent and its strategy is copy-if-absent
- **THEN** doctor emits a warn presets record and does not fail the files census

### Requirement: Uninstall preserves customized example presets
Uninstall SHALL preserve a customized example preset via the override guard and remove only pristine hash-matching files.
#### Scenario: Uninstall with customized preset
- **WHEN** the destination example preset differs from the installed source
- **THEN** uninstall keeps the customized file and removes only unmodified copies

### Requirement: Installer seeds Claude example preset copy-if-absent
The installer SHALL project sai/presets/claude/*.json into the Claude sai presets library copy-if-absent with the harness segment stripped.
#### Scenario: Fresh Claude install seeds missing example
- **WHEN** the destination preset file is absent during Claude install
- **THEN** the installer copies the source JSON once without merge or content validation

### Requirement: Installer preserves existing Claude destination preset
The installer SHALL leave an existing Claude destination preset file intact with no overwrite or merge.
#### Scenario: Reinstall with customized Claude preset
- **WHEN** the Claude destination preset already exists, including corrupt JSON
- **THEN** the installer performs no copy, no merge, and no validation of that destination

### Requirement: Claude preset install stays harness-isolated
Claude preset projection SHALL never read or write the opencode preset library.
#### Scenario: Claude install runs alongside opencode library
- **WHEN** the claude-preset-examples projection executes
- **THEN** only the Claude sai presets destination is affected and the opencode library path is untouched

### Requirement: Doctor reports missing Claude example preset as warning
Doctor SHALL report an absent Claude copy-if-absent example preset as a non-fatal warning while keeping other missing files fatal.
#### Scenario: Claude example preset deleted after install
- **WHEN** the expected OPUS.json file is absent and its strategy is copy-if-absent
- **THEN** doctor emits a warn presets record and does not fail the files census

### Requirement: Uninstall preserves customized Claude example preset
Uninstall SHALL preserve a customized Claude example preset via the override guard and remove only pristine hash-matching files.
#### Scenario: Uninstall with customized Claude preset
- **WHEN** the destination OPUS.json differs from the installed source
- **THEN** uninstall keeps the customized file and removes only unmodified copies

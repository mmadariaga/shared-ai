# preset-install Specification

## Purpose
TBD - created by archiving change opencode-preset-examples. Update Purpose after archive.

## Requirements

### Requirement: Installer preserves existing destination presets

OpenCode preset installation SHALL preserve existing files that are not destinations of distributed SAI default projections. Outside the targeted audit-role key migration, it SHALL NOT delete or migrate old unprefixed preset files, overwrite personal presets, or overwrite arbitrary files solely because their filenames start with `[sai-default]-`. The targeted migration SHALL update recognized retired audit command and worker keys while preserving unrelated entries and any explicit new destination key.

#### Scenario: Reinstall with customized preset

- **WHEN** the OpenCode preset library contains legacy unprefixed files, personal presets, or reserved-prefix files not distributed by SAI
- **THEN** installation SHALL preserve those files and their unrelated entries, applying only targeted retired audit-role key migration while refreshing the distributed defaults

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

### Requirement: Uninstall preserves customized example presets
Uninstall SHALL preserve a customized example preset via the override guard and remove only pristine hash-matching files.
#### Scenario: Uninstall with customized preset
- **WHEN** the destination example preset differs from the installed source
- **THEN** uninstall keeps the customized file and removes only unmodified copies

### Requirement: Installer preserves existing Claude destination preset

Claude Code preset installation SHALL preserve existing files that are not destinations of distributed SAI default projections. Outside the targeted audit-role key migration, it SHALL NOT delete or migrate old unprefixed preset files, overwrite personal presets, or overwrite arbitrary files solely because their filenames start with `[sai-default]-`. The targeted migration SHALL update recognized retired audit command and worker keys while preserving unrelated entries and any explicit new destination key.

#### Scenario: Reinstall with customized Claude preset

- **WHEN** the Claude Code preset library contains an old unprefixed OPUS.json, personal presets, or reserved-prefix files not distributed by SAI
- **THEN** installation SHALL preserve those files and their unrelated entries, applying only targeted retired audit-role key migration while refreshing `[sai-default]-OPUS.json`

### Requirement: Claude preset install stays harness-isolated
Claude preset projection SHALL never read or write the opencode preset library.
#### Scenario: Claude install runs alongside opencode library
- **WHEN** the claude-preset-examples projection executes
- **THEN** only the Claude sai presets destination is affected and the opencode library path is untouched

### Requirement: Uninstall preserves customized Claude example preset
Uninstall SHALL preserve a customized Claude example preset via the override guard and remove only pristine hash-matching files.
#### Scenario: Uninstall with customized Claude preset
- **WHEN** the destination OPUS.json differs from the installed source
- **THEN** uninstall keeps the customized file and removes only unmodified copies

### Requirement: Installer refreshes distributed SAI default presets

Every installation SHALL copy each distributed preset into the selected harness's `sai/presets` library, replacing an existing destination with the distributed version. Distributed filenames SHALL prepend the exact literal `[sai-default]-` to the previous filename. Installation SHALL NOT apply these presets to projects or change project model selections.

#### Scenario: OpenCode installation refreshes all distributed defaults

- **WHEN** OpenCode installation runs with absent or edited distributed default files
- **THEN** it SHALL install the distributed contents of `[sai-default]-Go.json`, `[sai-default]-oAI-LUNA.json`, and `[sai-default]-oAI-SOL.json` without applying them to projects

#### Scenario: Claude Code installation refreshes its distributed default

- **WHEN** Claude Code installation runs with an absent or edited distributed default file
- **THEN** it SHALL install the distributed contents of `[sai-default]-OPUS.json` without applying it to projects

#### Scenario: Reinstallation replaces direct edits again

- **WHEN** a user edits a distributed default after installation and runs installation again
- **THEN** the installer SHALL replace that file with the distributed version while leaving project model selections unchanged

### Requirement: Doctor reports missing SAI default presets as errors

Doctor SHALL treat missing distributed default preset files projected with the `copy` strategy as fatal missing-file errors for both harnesses, rather than warning-only missing examples.

#### Scenario: Distributed default is absent

- **WHEN** doctor checks a Claude Code or OpenCode installation with a missing distributed default preset
- **THEN** its file census SHALL report a fatal missing-file error for that expected preset

### Requirement: Preset keys migrate by audit role

Preset migration SHALL map command and worker entries for security 6 to 5, performance 7 to 6, and accessibility 8 to 7. It SHALL transfer an old entry only when the new key is absent, retain an explicit new key, remove the retired key, and preserve unrelated entries. Installation SHALL migrate JSON presets in the selected harness library before retired-file cleanup; model customization SHALL also migrate loaded preset keys. Distributed defaults SHALL continue to refresh from their shipped contents.

#### Scenario: A legacy preset has role-specific models
- **WHEN** a preset contains retired security, performance, and accessibility command or worker entries and no corresponding new keys
- **THEN** their values appear under their own renamed audit keys, without assigning security's model to performance

#### Scenario: Destination key already exists
- **WHEN** a preset has both a retired audit key and its new key
- **THEN** migration retains the new key's value and removes only the retired key

#### Scenario: Preset cannot be migrated
- **WHEN** installation cannot parse or migrate a preset JSON file
- **THEN** it reports that file as pending resolution and continues without inventing replacement settings

# preset-install Specification

## Purpose
TBD - created by archiving change opencode-preset-examples. Update Purpose after archive.

## Requirements

### Requirement: Installer preserves existing destination presets

OpenCode preset installation SHALL preserve existing files that are not destinations of distributed SAI default projections. It SHALL NOT delete or migrate old unprefixed preset files, overwrite personal presets, or overwrite arbitrary files solely because their filenames start with `[sai-default]-`.

#### Scenario: Reinstall with customized preset

- **WHEN** the OpenCode preset library contains legacy unprefixed files, personal presets, or reserved-prefix files not distributed by SAI
- **THEN** installation SHALL leave those files byte-for-byte unchanged while refreshing the distributed defaults

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

Claude Code preset installation SHALL preserve existing files that are not destinations of distributed SAI default projections. It SHALL NOT delete or migrate old unprefixed preset files, overwrite personal presets, or overwrite arbitrary files solely because their filenames start with `[sai-default]-`.

#### Scenario: Reinstall with customized Claude preset

- **WHEN** the Claude Code preset library contains an old unprefixed OPUS.json, personal presets, or reserved-prefix files not distributed by SAI
- **THEN** installation SHALL leave those files byte-for-byte unchanged while refreshing `[sai-default]-OPUS.json`

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
- **THEN** it SHALL install the distributed contents of `[sai-default]-Go.json`, `[sai-default]-Go+Zen.json`, `[sai-default]-oAI-LUNA+Zen.json`, and `[sai-default]-oAI-SOL+Zen.json` without applying them to projects

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

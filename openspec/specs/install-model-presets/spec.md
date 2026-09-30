# install-model-presets Specification

## Purpose
TBD - created by archiving change install-model-presets. Update Purpose after archive.

## Requirements

### Requirement: Preset save captures project model map

The save-preset flow SHALL snapshot the full effective project-local model map in ALL scope at save time and persist it as a named JSON file under the selected harness preset library only when the resolved destination does not use the reserved default prefix. For an accepted personal name, it SHALL render a read-only ALL-table preview with a final Yes/No confirmation and SHALL require a second Yes/No overwrite confirmation when the name exists, preserving the original file on decline.

#### Scenario: Save with preview and confirmations

- **WHEN** a user provides an accepted personal name and confirms save, answering Yes to overwrite when the name exists
- **THEN** the flow SHALL write the complete effective ALL map to the harness preset library with no other file mutated

### Requirement: Preset load restores project model map

The load-preset flow SHALL offer the saved preset names for the selected harness with an empty-state message when none exist, SHALL preview the resulting ALL table, SHALL require a final Yes/No apply confirmation, and SHALL apply chosen entries to project-local overrides only without touching global model config.

#### Scenario: Load with preview and project-only apply

- **WHEN** a user selects a saved preset and confirms apply
- **THEN** the flow SHALL create project-local overrides from known preset entries while leaving globals and unselected targets untouched

### Requirement: Preset name containment and library isolation

Preset names SHALL resolve inside the selected harness's `sai/presets` library, with directory escape rejected without write. Personal saves SHALL additionally reject reserved-prefix resolved basenames case-insensitively. Other filenames SHALL retain filesystem acceptance. OpenCode presets SHALL remain invisible to Claude Code and vice versa, and load and save SHALL never write globals except the saved preset library file itself. Loading distributed defaults and legacy unprefixed presets SHALL remain supported.

#### Scenario: Separator name stays contained and harnesses stay isolated

- **WHEN** a non-reserved name with separators resolves inside the preset library for one harness
- **THEN** the flow SHALL contain the path in that library and keep the other harness library unaffected

#### Scenario: Default and legacy presets remain loadable

- **WHEN** a user selects a distributed reserved-prefix preset or a legacy unprefixed preset in either harness's Load preset flow
- **THEN** the flow SHALL offer its normal preview and application confirmation rather than reject the name because of the save-only reservation

### Requirement: Preset corrupt handling and key drift

Corrupt or invalid preset JSON SHALL report a visible error and SHALL apply nothing partial. Unknown preset keys SHALL be ignored and missing keys SHALL preserve current project values, with the preview falling back to effective current settings for missing entries.

#### Scenario: Corrupt preset blocks and drift preserves current values

- **WHEN** a preset carries invalid JSON or unknown and missing keys
- **THEN** the flow SHALL block with an error and no partial writes for corrupt content while ignoring unknown keys and preserving current values for missing keys

### Requirement: Preset overwrite and cancel safety

An accepted personal preset name that already exists SHALL trigger a second explicit overwrite Yes/No without a diff table, with No preserving the original file. Reserved-prefix destinations SHALL be rejected before this confirmation. Cancel at any confirmation SHALL leave files and project untouched with no partial writes.

#### Scenario: Overwrite decline preserves and cancel mutates nothing

- **WHEN** a user declines overwrite of an accepted personal preset or cancels at a confirmation
- **THEN** the flow SHALL preserve the original preset and mutate no file or project state

### Requirement: Personal preset saving rejects the reserved default prefix

The personal-preset save flow SHALL reject a destination whose basename, after path resolution, starts with the literal `[sai-default]-`, matched case-insensitively. Rejection SHALL occur before save preview, overwrite confirmation, or persistence. It SHALL explain that the prefix is reserved for SAI defaults replaced on installation, request another name, and retain the selected harness. These rules SHALL apply equally to Claude Code and OpenCode.

#### Scenario: Reserved name has no existing file

- **WHEN** a user enters `[SAI-DEFAULT]-new` as a personal preset name and no destination file exists
- **THEN** the save flow SHALL explain the reservation and repeat name entry without creating the file or changing the selected harness

#### Scenario: Reserved name targets an existing default

- **WHEN** a user enters a reserved-prefix name for an existing preset
- **THEN** the save flow SHALL reject it before overwrite confirmation and leave the existing file unchanged

#### Scenario: Equivalent path cannot bypass the reservation

- **WHEN** an otherwise accepted relative, absolute, nested, or normalized path resolves inside the preset library to a basename beginning with `[sai-default]-` in any letter case
- **THEN** the save flow SHALL reject that destination and request another name without writing a file

#### Scenario: User retries with a personal name

- **WHEN** a user supplies a non-reserved personal name after a reserved-name rejection
- **THEN** the save flow SHALL continue its normal preview and confirmation process in the previously selected harness

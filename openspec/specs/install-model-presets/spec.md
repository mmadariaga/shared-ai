# install-model-presets Specification

## Purpose
TBD - created by archiving change install-model-presets. Update Purpose after archive.
## Requirements
### Requirement: Preset save captures project model map

The save-preset flow SHALL snapshot the full effective project-local model map in ALL scope at save time and persist it as a named JSON file under the selected harness preset library. It SHALL render a read-only ALL-table preview with a final Yes/No confirmation and SHALL require a second Yes/No overwrite confirmation when the name exists, preserving the original file on decline.

#### Scenario: Save with preview and confirmations

- **WHEN** a user names a preset and confirms save, answering Yes to overwrite when the name exists
- **THEN** the flow SHALL write the complete effective ALL map to the harness preset library with no other file mutated

### Requirement: Preset load restores project model map

The load-preset flow SHALL offer the saved preset names for the selected harness with an empty-state message when none exist, SHALL preview the resulting ALL table, SHALL require a final Yes/No apply confirmation, and SHALL apply chosen entries to project-local overrides only without touching global model config.

#### Scenario: Load with preview and project-only apply

- **WHEN** a user selects a saved preset and confirms apply
- **THEN** the flow SHALL create project-local overrides from known preset entries while leaving globals and unselected targets untouched

### Requirement: Preset name containment and library isolation

Preset names SHALL resolve inside the harness sai/presets library with directory escape rejected without write and with no filename validation beyond filesystem acceptance. OpenCode presets SHALL remain invisible to Claude Code and vice versa, and load and save SHALL never write globals except the preset library file itself.

#### Scenario: Separator name stays contained and harnesses stay isolated

- **WHEN** a name with separators resolves inside the library for one harness
- **THEN** the flow SHALL contain the path in presets and SHALL keep the other harness library unaffected

### Requirement: Preset corrupt handling and key drift

Corrupt or invalid preset JSON SHALL report a visible error and SHALL apply nothing partial. Unknown preset keys SHALL be ignored and missing keys SHALL preserve current project values, with the preview falling back to effective current settings for missing entries.

#### Scenario: Corrupt preset blocks and drift preserves current values

- **WHEN** a preset carries invalid JSON or unknown and missing keys
- **THEN** the flow SHALL block with an error and no partial writes for corrupt content while ignoring unknown keys and preserving current values for missing keys

### Requirement: Preset overwrite and cancel safety

An existing preset name SHALL trigger a second explicit overwrite Yes/No without a diff table, with No preserving the original file. Cancel at any confirmation SHALL leave files and project untouched with no partial writes.

#### Scenario: Overwrite decline preserves and cancel mutates nothing

- **WHEN** a user declines overwrite or cancels at any confirmation
- **THEN** the flow SHALL preserve the original preset and SHALL mutate no file or project state


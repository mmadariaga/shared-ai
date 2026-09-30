# preset-docs Specification

## Purpose
TBD - created by archiving change opencode-preset-examples. Update Purpose after archive.

## Requirements

### Requirement: Example preset table documents the four opencode presets

The README Post Install area SHALL document all four OpenCode SAI default presets with their prefixed filenames, model mixes, and Load preset usage guidance.

#### Scenario: Reader discovers which preset to use

- **WHEN** a user reads the Example presets subsection
- **THEN** the table SHALL name `[sai-default]-Go.json`, `[sai-default]-Go+Zen.json`, `[sai-default]-oAI-LUNA+Zen.json`, and `[sai-default]-oAI-SOL+Zen.json` with their model mixes and provide guidance for loading a preset through Customize models

### Requirement: Example preset table documents the Claude OPUS preset

The README Post Install area SHALL document the Claude Code SAI default `[sai-default]-OPUS.json` alongside the OpenCode defaults with its Claude Code model mix and Load preset usage guidance.

#### Scenario: Reader discovers the Claude preset

- **WHEN** a user reads the Example presets subsection
- **THEN** the table SHALL name `[sai-default]-OPUS.json`, describe its Claude Code model mix, and provide guidance for selecting Claude Code in the Load preset flow

### Requirement: Preset documentation distinguishes managed defaults from personal presets

The README SHALL explain that `[sai-default]-` is the reserved filename prefix for distributed SAI defaults; every installation replaces those distributed files, including direct edits, without applying presets or changing project model selections. It SHALL explain that old unprefixed files, personal presets, and other non-distributed files remain untouched. It SHALL advise users to save changes under a separate personal name and describe case-insensitive reserved-prefix rejection with another-name entry, while confirming that loading defaults and existing presets remains supported.

#### Scenario: Reader learns how to retain preset changes

- **WHEN** a user reads the Example presets guidance
- **THEN** the README SHALL distinguish replaced distributed files from preserved personal files and direct the user to save a separate personal preset instead of using the reserved prefix

# preset-docs Specification

## Purpose
TBD - created by archiving change opencode-preset-examples. Update Purpose after archive.

## Requirements

### Requirement: Example preset table documents the four opencode presets
The README Post Install area SHALL document all four opencode example presets with usage guidance.
#### Scenario: Reader discovers which preset to use
- **WHEN** a user reads the Example presets subsection
- **THEN** the table names GO.json, GO+OC-FREE.json, OAI-LUNA+OC-FREE.json, OAI-SOL+OAI-LUNA+OC-FREE.json with per-preset use-when guidance and a Load preset line treating plus-names as literal

### Requirement: Example preset table documents the Claude OPUS preset
The README Post Install area SHALL document the single Claude example preset OPUS.json with usage guidance alongside the opencode examples, including the copy-if-absent paragraph, the OPUS.json table row, and the Claude Code Load preset line.
#### Scenario: Reader discovers the Claude preset
- **WHEN** a user reads the Example presets subsection
- **THEN** the table names OPUS.json with Claude-only use-when guidance and a Claude Code Load preset line naming OPUS without the .json suffix

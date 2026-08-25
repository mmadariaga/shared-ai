# remove-caveman-from-commands Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: sai command bodies contain no caveman fetch

Every `.md` file under `sai/commands/` SHALL NOT contain the line `Fetch @skills/caveman/SKILL.md`.

#### Scenario: sai-1-spec body read

- **WHEN** `sai/commands/spec/steps/common.md` is read
- **THEN** no line matches `Fetch @skills/caveman/SKILL.md`

#### Scenario: all 13 command bodies checked

- **WHEN** every `.md` file under `sai/commands/` is read
- **THEN** none contain `Fetch @skills/caveman/SKILL.md`

### Requirement: sai command bodies contain no caveman mode activation

Every command file under `sai/commands/` SHALL NOT contain a line activating caveman mode (the line "Caveman lite mode active by default. If `--full-caveman` appears in arguments, use full instead.").

#### Scenario: sai-1-spec body contains no caveman activation line

- **WHEN** `sai/commands/spec/steps/common.md` is read
- **THEN** no line contains "Caveman lite mode active by default"

#### Scenario: all 13 command bodies free of caveman activation

- **WHEN** every `.md` file under `sai/commands/` is read
- **THEN** none contain "Caveman lite mode active by default"

### Requirement: Load behaviors block contains no caveman entry
In each `sai/commands/` file that has a `## Load behaviors (in order)` block, that block SHALL NOT list caveman as one of the behaviors to load.

#### Scenario: sai-2-design load behaviors block
- **WHEN** `sai/commands/design/coordinator.md` is read
- **THEN** the `## Load behaviors (in order)` block contains no reference to caveman

#### Scenario: sai-3-implement load behaviors block
- **WHEN** `sai/commands/implement/coordinator.md` is read
- **THEN** the `## Load behaviors (in order)` block contains no reference to caveman

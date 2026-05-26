## ADDED Requirements

### Requirement: sai command bodies contain no caveman fetch
Each of the 13 files under `sai/commands/` (`sai-1-spec.md` through `sai-pr.md`, including `sai-backfill.md`) SHALL NOT contain the line `Fetch @skills/caveman/SKILL.md`.

#### Scenario: sai-1-spec body read
- **WHEN** `sai/commands/sai-1-spec.md` is read
- **THEN** no line matches `Fetch @skills/caveman/SKILL.md`

#### Scenario: all 13 command bodies checked
- **WHEN** all files matching `sai/commands/sai-*.md` are read
- **THEN** none contain `Fetch @skills/caveman/SKILL.md`

### Requirement: sai command bodies contain no caveman mode activation
Each of the 13 files under `sai/commands/` SHALL NOT contain a line activating caveman mode (the line "Caveman lite mode active by default. If `--full-caveman` appears in arguments, use full instead.").

#### Scenario: sai-1-spec body contains no caveman activation line
- **WHEN** `sai/commands/sai-1-spec.md` is read
- **THEN** no line contains "Caveman lite mode active by default"

#### Scenario: all 13 command bodies free of caveman activation
- **WHEN** all files matching `sai/commands/sai-*.md` are read
- **THEN** none contain "Caveman lite mode active by default"

### Requirement: Load behaviors block contains no caveman entry
In each `sai/commands/sai-*.md` file that has a `## Load behaviors (in order)` block, that block SHALL NOT list caveman as one of the behaviors to load.

#### Scenario: sai-2-design load behaviors block
- **WHEN** `sai/commands/sai-2-design.md` is read
- **THEN** the `## Load behaviors (in order)` block contains no reference to caveman

#### Scenario: sai-3-implement load behaviors block
- **WHEN** `sai/commands/sai-3-implement.md` is read
- **THEN** the `## Load behaviors (in order)` block contains no reference to caveman

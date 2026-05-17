# explorer-opencode Specification

## Purpose
TBD - created by archiving change sai-explorer-harness-context. Update Purpose after archive.
## Requirements
### Requirement: harness-file-location
`~/.claude/instructions/sai/explorer.opencode.md` SHALL exist as a standalone instruction file for the OpenCode harness.

#### Scenario: file exists at path
- **WHEN** an OpenCode harness references the sai instruction layer
- **THEN** `~/.claude/instructions/sai/explorer.opencode.md` is present and resolvable

### Requirement: subagent-type-binding
The file SHALL declare that "cheap research subagent" maps to `explore` (lowercase) as used in the OpenCode harness agent keyword syntax.

#### Scenario: opencode agent keyword
- **WHEN** a sai skill running in OpenCode needs to delegate a research task
- **THEN** the lowercase keyword `explore` is used, not `Explore` (capital E)

### Requirement: model-resolution-via-config
The file SHALL specify that the model for the `explore` agent is resolved via `opencode.jsonc` project configuration, not hardcoded in the instruction file.

#### Scenario: no hardcoded model identifier
- **WHEN** the explorer.opencode.md file is read
- **THEN** it contains no hardcoded model string (e.g. no `haiku`, `sonnet`, or specific model ID); the model is controlled by opencode.jsonc

### Requirement: simplified-caps
The file SHALL declare a simplified per-spawn tool-call cap for `explore` subagents, appropriate for the OpenCode harness, without three-tier task classification.

#### Scenario: cap declared
- **WHEN** explorer.opencode.md is loaded
- **THEN** it defines a per-spawn tool-call cap for explore subagents

### Requirement: no-task-classification
explorer.opencode.md SHALL NOT define lookup / synthesis / audit task classifications. These classifications are defined only in `explorer.claude.md`.

#### Scenario: no classification definitions
- **WHEN** the explorer.opencode.md file is read
- **THEN** it does not contain lookup, synthesis, or audit classification definitions

### Requirement: harness-agnostic-scope
explorer.opencode.md SHALL cover only OpenCode-specific subagent bindings and SHALL NOT duplicate rules from explorer.claude.md (model tiers, task classification, NEVER-omit-model enforcement).

#### Scenario: no duplication between files
- **WHEN** explorer.claude.md and explorer.opencode.md are compared
- **THEN** task classification and model-tier rules appear only in explorer.claude.md


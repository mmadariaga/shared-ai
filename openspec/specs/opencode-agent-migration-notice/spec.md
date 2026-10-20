# opencode-agent-migration-notice Specification

## Purpose
TBD - created by syncing change relocate-generic-opencode-agents. Update Purpose after archive.

## Requirements

### Requirement: Installer detects redundant agent keys in the user's config

When the opencode-config path processes an existing `opencode.json` or `opencode.jsonc` that contains `agent.explore`, `agent.executor`, or `agent.budget`, the installer SHALL NOT edit, remove, or normalize those keys, and SHALL emit a non-fatal stdout notice naming each present key. When the processed config contains none of the three keys, SHALL NOT emit the notice. The notice SHALL be emitted on every install run that detects the keys, and SHALL not require a TTY.

#### Scenario: existing config carries the three agent keys

- **WHEN** the installer processes an existing `opencode.jsonc` that defines `agent.explore`, `agent.executor`, and `agent.budget`
- **THEN** the notice names all three keys
- **AND** the config file is left byte-for-byte unchanged

#### Scenario: config without the agent keys produces no notice

- **WHEN** the installer processes an existing config that defines no `agent` key
- **THEN** no redundant-key notice is printed

### Requirement: Notice states the precedence and the migration path

The installer notice SHALL identify `budget-explorer.md`, `budget-executor.md`, and `budget-subagent.md` as the active generic agent files. It SHALL instruct users to review legacy configuration settings and migrate needed options manually, warn that `agent.explore` can still override OpenCode's built-in explore, and identify the new files' model and optional variant as tuning settings preserved by the tunable-seed lifecycle. The installer SHALL never edit those legacy configuration keys.

#### Scenario: notice explains the file-wins precedence

- **WHEN** the installer detects `agent.explore` with a user-tuned model in an existing config
- **THEN** it identifies the new agent files and manual migration path rather than claiming that a differently named file overrides the legacy entry, warns about the built-in explore override, and explains preserved model and optional variant tuning

#### Scenario: notice does not instruct an automatic config edit

- **WHEN** the installer emits the migration notice
- **THEN** it does not offer, claim, or perform any modification of the user's config file

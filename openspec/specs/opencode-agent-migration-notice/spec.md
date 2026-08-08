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

The notice SHALL state that the projected agent files (`~/.config/opencode/agents/explore.md`, `executor.md`, and `budget.md`) now take precedence for the keys they declare — including `model` — so a tuned model in the config is no longer effective; SHALL state that config-only keys the files do not declare (for example `tools` or `options`) still apply; SHALL point the user to the agent file's `model` frontmatter line as the tuning surface, noting that the `tunable-seed` lifecycle preserves it; and SHALL leave the decision to remove the now-redundant config keys to the user.

#### Scenario: notice explains the file-wins precedence

- **WHEN** the installer detects `agent.explore` with a user-tuned model in an existing config
- **THEN** the notice states that the `explore.md` agent file's `model` line takes precedence over the config's `model` value
- **AND** the notice directs the user to edit the `model` line in `~/.config/opencode/agents/explore.md` to keep their tuning

#### Scenario: notice does not instruct an automatic config edit

- **WHEN** the installer emits the migration notice
- **THEN** it does not offer, claim, or perform any modification of the user's config file

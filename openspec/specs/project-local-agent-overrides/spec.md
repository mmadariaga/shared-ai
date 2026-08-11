# project-local-agent-overrides Specification

## Purpose
Project-local agent files are durable, user-owned overrides created by the post-setup customization menu for the selected harness.

## Requirements

### Requirement: Harness-local destination and installed-source resolution
The customization adapters MUST write Claude Code overrides to `<projectPath>/.claude/agents/<agent>.md` and opencode overrides to `<projectPath>/.opencode/agents/<agent>.md`. For a missing local destination, the adapter MUST use the same-named installed global agent as its source: `~/.claude/agents/<agent>.md` for Claude Code or `~/.config/opencode/agents/<agent>.md` for opencode. The adapter MUST NOT substitute a repository-bundled agent source or write the override into the global agent directory.

#### Scenario: Claude Code resolves project-local and installed-source paths
- **WHEN** a selected Claude Code agent is materialized for a project
- **THEN** the destination SHALL be `<projectPath>/.claude/agents/<agent>.md` and a missing destination SHALL be sourced from `~/.claude/agents/<agent>.md`

#### Scenario: opencode resolves project-local and installed-source paths
- **WHEN** a selected opencode agent is materialized for a project
- **THEN** the destination SHALL be `<projectPath>/.opencode/agents/<agent>.md` and a missing destination SHALL be sourced from `~/.config/opencode/agents/<agent>.md`

### Requirement: Initial materialization clones the installed agent
When a selected agent has no project-local destination, the adapter MUST create the parent harness agent directory when necessary, clone the installed global source into the project-local destination, and apply the selected harness tunables. For Claude Code, `model` is required and `effort` is optional; when effort is absent, the resulting local file MUST have no top-level `effort` line. The adapter MUST perform this materialization even when the selected model equals the model in the global source. The cloned body and non-tunable frontmatter MUST remain the source content.

#### Scenario: First Claude Code materialization writes a local extension point
- **WHEN** a selected Claude Code agent has no local file, its installed global source is available, and the selected settings are `{ model: 'haiku' }`
- **THEN** the adapter SHALL create `.claude/agents/`, write the source agent as `.claude/agents/<agent>.md`, persist `model: haiku`, omit any top-level `effort` line, and preserve the source body and non-tunable frontmatter

#### Scenario: First opencode materialization writes a local extension point
- **WHEN** a selected opencode agent has no local file and its installed global source is available
- **THEN** the adapter SHALL create `.opencode/agents/`, write the source agent as `.opencode/agents/<agent>.md`, and persist the selected `model` and optional `variant`

#### Scenario: Matching source model does not suppress materialization
- **WHEN** a selected agent's chosen model matches the installed global source model and the project-local destination is absent
- **THEN** the adapter SHALL still create the project-local agent file

### Requirement: Existing local content is user-owned
When a selected project-local agent already exists, the adapter MUST preserve its body and every non-tunable frontmatter line exactly, changing only the selected harness tunable lines. If a selected tunable carries a value and is absent, the adapter MUST add its top-level frontmatter line; for Claude Code, an absent selected `effort` means the adapter MUST remove any existing top-level `effort` line. An opencode `variant` remains optional and SHALL be absent when no variant is selected. The adapter MUST NOT replace the existing local file wholesale with the installed source.

#### Scenario: Existing Claude Code customization preserves local prompt content
- **WHEN** an existing Claude Code agent contains project-specific body text or non-tunable frontmatter and the selected settings are `{ model: 'haiku' }`
- **THEN** the adapter SHALL retain those bytes, change the top-level `model` to `haiku`, remove the top-level `effort` line if present, and make no other content change

#### Scenario: Existing opencode customization preserves local permissions
- **WHEN** an existing opencode agent contains project-specific body text or a non-tunable frontmatter block such as `permission`
- **THEN** the adapter SHALL retain that content and SHALL change only the top-level `model` and `variant` values

### Requirement: Harness tunables are mapped independently
The Claude Code adapter MUST persist the selected `model` and optional `effort` tunables for a Claude Code agent. When `effort` is selected, it MUST persist the selected top-level `effort` value; when no effort is selected, it MUST omit the top-level `effort` line. The opencode adapter MUST persist the selected `model` and optional `variant` tunables for an opencode agent. Neither adapter SHALL rewrite a non-tunable frontmatter key, body content, or the other harness's tunable vocabulary.

#### Scenario: Claude Code persists model and effort
- **WHEN** Claude Code settings return `{ model: 'sonnet', effort: 'medium' }`
- **THEN** the local Claude Code agent SHALL contain those selected top-level `model` and `effort` values

#### Scenario: Claude Code omits an unselected effort
- **WHEN** Claude Code settings return `{ model: 'haiku' }` without an effort
- **THEN** the local Claude Code agent SHALL contain `model: haiku` and SHALL contain no top-level `effort` line

#### Scenario: opencode persists model with a selected variant
- **WHEN** opencode settings return a model and a variant
- **THEN** the local opencode agent SHALL contain the selected top-level `model` and `variant` values

#### Scenario: opencode omits an unselected variant
- **WHEN** opencode settings return a model without a variant and the local agent has a top-level `variant` line
- **THEN** the adapter SHALL remove that top-level `variant` line while preserving all non-tunable content

### Requirement: Missing installed sources are soft per-agent failures
When a selected agent has no project-local destination and its installed global source is unavailable, the adapter MUST report that agent as skipped, MUST NOT create its project-local destination, and MUST continue processing other selected agents. An installed source is not required to update an existing project-local agent's tunables. A missing source MUST NOT fail the complete post-setup setup flow.

#### Scenario: One missing source does not block other selected agents
- **WHEN** one selected agent has no installed global source and another selected agent has an available source
- **THEN** the adapter SHALL report and skip the unavailable agent, persist the available agent, and allow setup to complete normally

#### Scenario: Existing local agent updates without its source
- **WHEN** a selected agent's installed global source is unavailable and its project-local destination already exists
- **THEN** the adapter SHALL update the selected tunables in the existing local file while preserving its body and non-tunable frontmatter

### Requirement: Selection and cancellation constrain writes
The customization flow MUST write only selected agents for the selected harness. An empty selection, cancellation, or non-TTY setup run MUST perform no project-local agent writes. Customization MUST NOT modify installed global agents, `opencode.json`, `opencode.jsonc`, or any unrelated project file, and MUST NOT delete an existing project-local agent.

#### Scenario: Narrowed selection writes only selected agents
- **WHEN** the user confirms a subset of the displayed agents
- **THEN** the adapter SHALL materialize or update exactly that subset and SHALL leave every unselected agent unchanged

#### Scenario: Cancellation performs no writes
- **WHEN** the user cancels at any customization surface before completion
- **THEN** the flow SHALL complete normally without creating, modifying, or deleting any project-local agent file

### Requirement: Repeated customization updates the existing override
On a later customization run, the adapter MUST reuse the existing project-local agent file and apply newly selected harness tunables without re-cloning the global body or non-tunable frontmatter. Repeating the same selection and settings MUST be idempotent for the project-local agent content.

#### Scenario: Changed settings update only tunables
- **WHEN** a project-local agent exists from an earlier run and the user selects different harness tunables
- **THEN** the adapter SHALL update those tunable values and SHALL preserve the earlier local body and non-tunable frontmatter

#### Scenario: Repeating settings preserves the local override
- **WHEN** a later run selects the same agent and the same settings
- **THEN** the resulting project-local agent content SHALL remain unchanged

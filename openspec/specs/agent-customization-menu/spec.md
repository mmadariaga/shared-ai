# agent-customization-menu Specification

## Purpose
TTY-only post-setup menu and isolated fake customization adapters for both supported harnesses, establishing a stable interactive path and harness boundary before model discovery and real override operations are implemented.

## Requirements

### Requirement: Post-setup customization menu
The setup flow MUST present a post-setup menu only after all existing setup operations have completed. The menu MUST provide exactly two actions: `Customize models` and `Exit`. The menu MUST be presented as a navigable single-select list: up/down arrows move the `>` cursor and Enter (or space) confirms the highlighted action.

#### Scenario: User exits from the post-setup menu
- **WHEN** setup completes its existing work and the user selects `Exit`
- **THEN** the setup flow MUST finish without selecting a harness or traversing any agent

#### Scenario: User enters model customization
- **WHEN** setup completes its existing work and the user selects `Customize models`
- **THEN** the flow MUST continue to exclusive harness selection

#### Scenario: User navigates the post-setup menu with arrow keys
- **WHEN** the user moves the `>` cursor with the arrow keys and confirms with Enter
- **THEN** the flow MUST act on exactly the highlighted action

### Requirement: TTY-only interaction
The setup flow MUST determine whether interaction is available through its injectable TTY check before presenting the post-setup menu, the navigable harness picker, the agent-selection checklist, the Claude Code combined model/effort frame, or any OpenCode provider, model, or variant screen. When no TTY is available, it MUST skip the menu and all customization adapters without adding menu-specific prompts, checklist renders, or output, and `runPostSetupMenu` MUST return `'skipped'` so `setup.js` completes normally — the configurator MUST NOT hard-exit like the installer.

#### Scenario: Setup runs without a TTY
- **WHEN** the injectable TTY check reports that standard input is not interactive
- **THEN** setup MUST preserve its existing operations, complete without presenting the post-setup menu or any navigable surface, and MUST NOT hard-exit

#### Scenario: Setup runs with a TTY
- **WHEN** the injectable TTY check reports that standard input is interactive
- **THEN** setup MUST present the post-setup menu after the existing operations complete

### Requirement: Exclusive harness selection
After `Customize models` is selected, the flow MUST offer OpenCode and Claude Code as mutually exclusive harness choices in a navigable single-select list. It MUST dispatch customization to exactly one selected harness adapter and MUST NOT process both harnesses in a single selection.

#### Scenario: User selects OpenCode
- **WHEN** the user chooses OpenCode
- **THEN** the flow MUST dispatch only to the OpenCode adapter

#### Scenario: User selects Claude Code
- **WHEN** the user chooses Claude Code
- **THEN** the flow MUST dispatch only to the Claude Code adapter

### Requirement: Isolated harness adapter boundaries
OpenCode and Claude Code MUST be represented by independent adapters. Each adapter MUST expose separate operations for agent enumeration, settings selection, and local override creation, without requiring a shared normalized agent-file format.

#### Scenario: OpenCode adapter is selected
- **WHEN** the OpenCode harness is selected
- **THEN** the flow MUST call the OpenCode adapter's operations and MUST NOT call Claude Code adapter operations

#### Scenario: Claude Code adapter is selected
- **WHEN** the Claude Code harness is selected
- **THEN** the flow MUST call the Claude Code adapter's operations and MUST NOT call OpenCode adapter operations

### Requirement: Complete OpenCode traversal
The OpenCode adapter MUST derive its complete harness-specific agent set from the canonical agents-class projections in `sai/install-manifest.json` and MUST present every resulting OpenCode agent, including the `budget`, `explore`, and `executor` agents, in the agent-selection checklist. It MUST invoke the dependent OpenCode settings selection and local override creation as specified by the Shared settings selection requirement. For the current repository state, that derived set contains exactly 10 agents; this count is a fixture assertion of the current repository state, not a hardcoded enumeration.

#### Scenario: OpenCode customization traverses the selected registry subset
- **WHEN** OpenCode customization is selected and the checklist is confirmed
- **THEN** the adapter MUST process exactly the selected agents from the 10 distinct agents derived from the canonical agents-class projections, with no early stop or representative-agent shortcut

### Requirement: Complete Claude Code traversal
The Claude Code adapter MUST derive its complete harness-specific agent set from the canonical agents-class projections in `sai/install-manifest.json` and MUST present every resulting Claude Code agent in the agent-selection checklist. It MUST invoke fake settings selection and fake local override creation as specified by the Shared settings selection requirement. For the current repository state, that derived set contains exactly 7 agents; this count is a fixture assertion of the current repository state, not a hardcoded enumeration.

#### Scenario: Claude Code customization traverses the selected registry subset
- **WHEN** Claude Code customization is selected and the checklist is confirmed
- **THEN** the adapter MUST process exactly the selected agents from the 7 distinct agents derived from the canonical agents-class projections, with no early stop or representative-agent shortcut

### Requirement: Shared settings selection

After the agent-selection checklist confirms a non-empty subset and before any local override is created, the flow SHALL invoke the selected harness's settings selector exactly once for the whole confirmed subset. The collected settings choices — a model and an effort choice for Claude Code, and a discovered model with an optional variant for OpenCode — SHALL be applied to every selected agent through the per-agent local-override operation. When the checklist confirms an empty subset, the settings selector SHALL NOT be invoked and customization SHALL complete without configuring any agent.

#### Scenario: Settings selector runs exactly once per customization run

- **WHEN** the agent-selection checklist confirms a non-empty subset
- **THEN** the flow SHALL invoke the settings selector exactly once for the whole subset

#### Scenario: Local overrides run exactly once per selected agent

- **WHEN** the settings selector has returned the shared settings choices for the confirmed subset
- **THEN** the local-override operation SHALL run exactly once per selected agent

#### Scenario: Same settings applied to every selected agent

- **WHEN** the settings selector returns its settings choices for a confirmed subset of two or more agents
- **THEN** every selected agent's local override SHALL carry those identical settings choices

#### Scenario: Empty subset skips the settings selector

- **WHEN** the agent-selection checklist confirms an empty subset
- **THEN** the settings selector SHALL NOT be invoked

#### Scenario: Empty subset completes without configuring agents

- **WHEN** the agent-selection checklist confirms an empty subset
- **THEN** customization SHALL complete without configuring any agent

### Requirement: Claude settings selection
For every Claude Code customization run with a non-empty confirmed subset, the Claude Code adapter MUST invoke exactly one navigable single-select frame that presents concrete model and effort choices together. The adapter-owned Claude settings catalog MUST be the authoritative source for both option sets, MUST contain at least one model identifier and one effort value, and MUST contain no placeholder values such as `<model>` or `<effort>`. Each displayed option SHALL encode members of those catalog sets, and the selected result MUST return only catalog members for the whole subset. If the catalog is unavailable or empty, the selector MUST return no settings and MUST allow customization to complete without writing an agent. The selector MUST NOT claim that the end-to-end customization is fake and MUST NOT perform OpenCode provider, model, or variant discovery. The collected values MUST be forwarded to the persistent local-override operation. The OpenCode adapter MUST continue to use its dependent provider-to-model-to-variant selection instead of this combined frame.

#### Scenario: Claude selection returns concrete model and effort
- **WHEN** a non-empty Claude Code subset reaches settings selection and the user confirms a combined option
- **THEN** the selector SHALL return the concrete model identifier and effort value encoded by that option

#### Scenario: Claude selection does not use placeholders
- **WHEN** the Claude Code settings frame is rendered
- **THEN** no selectable option SHALL use `<model>` or `<effort>` placeholder values

#### Scenario: Claude selection is bounded by its settings catalog
- **WHEN** the Claude adapter-owned catalog contains a set of model identifiers and effort values
- **THEN** every displayed and returned Claude setting SHALL be a member of the corresponding catalog set

#### Scenario: Missing Claude settings catalog produces no settings
- **WHEN** the Claude settings catalog is unavailable or contains no model or effort choices
- **THEN** the selector SHALL return no settings and customization SHALL perform no agent write

#### Scenario: OpenCode does not use the Claude frame
- **WHEN** OpenCode customization reaches settings selection
- **THEN** the flow SHALL use the dependent provider, model, and optional variant screens and SHALL not present the Claude combined frame

### Requirement: Persistent local override
For every traversed agent, the selected harness adapter MUST invoke a local-override operation after settings selection, passing the collected settings for that agent — the selected model and effort for Claude Code, and the selected model with optional variant for opencode. The operation MUST materialize the result as the selected agent's project-local file and MUST report the result as persistent only after that file has been written successfully. The operation MUST apply the project-local source, preservation, path, and failure rules defined by the `project-local-agent-overrides` capability.

#### Scenario: Selected Claude Code override is persisted
- **WHEN** Claude Code settings have been selected for a traversed agent
- **THEN** the local-override operation SHALL write the selected agent under `.claude/agents/<agent>.md` with the selected `model` and `effort`, and SHALL report a persistent result only after the write succeeds

#### Scenario: Selected opencode override is persisted
- **WHEN** opencode settings have been selected for a traversed agent
- **THEN** the local-override operation SHALL write the selected agent under `.opencode/agents/<agent>.md` with the selected `model` and optional `variant`, and SHALL report a persistent result only after the write succeeds

#### Scenario: End-to-end customization persists selected agents
- **WHEN** a complete harness traversal finishes with available installed sources
- **THEN** the selected agents SHALL have project-local files containing the chosen tunables rather than only in-memory non-persistent override objects

#### Scenario: Failed persistence does not claim success
- **WHEN** an installed source is unavailable for a traversed agent that has no project-local destination
- **THEN** that agent SHALL be reported as skipped and SHALL not be represented as a successful persistent override, while other agents continue according to the `project-local-agent-overrides` capability

### Requirement: Navigable agent-selection checklist

After harness selection and before per-agent configuration, the flow SHALL present a navigable multi-select checklist listing every agent derived from the canonical agents-class projections in `sai/install-manifest.json` for the chosen harness, with every agent selected by default. Up/down arrows SHALL move the `>` cursor, space SHALL toggle the highlighted agent's selection, and Enter SHALL confirm the selection. The flow SHALL run per-agent configuration exactly for the selected agents; an empty selection SHALL complete customization without configuring any agent.

#### Scenario: Checklist defaults to all agents selected

- **WHEN** the user enters the agent-selection checklist for a harness
- **THEN** every agent of that harness SHALL be pre-selected

#### Scenario: User narrows the customization subset

- **WHEN** the user deselects one or more agents and confirms with Enter
- **THEN** per-agent configuration SHALL run only for the agents remaining selected

#### Scenario: Empty selection completes without configuring agents

- **WHEN** the user deselects every agent and confirms with Enter
- **THEN** customization SHALL complete without configuring any agent

### Requirement: Navigable cancellation aborts customization

When the user presses `q` or Ctrl-C at any navigable surface — the post-setup menu, the harness picker, the agent-selection checklist, the Claude Code combined model/effort frame, or any OpenCode provider, model, or variant screen — the flow SHALL cancel the entire customization run: no agent SHALL be configured, no further navigable surface SHALL be presented, and the flow SHALL complete normally without hard-exiting the process (the configurator's non-exit contract, in contrast to the installer's caller-owned exit policy).

#### Scenario: Cancel from the post-setup menu

- **WHEN** the user presses `q` or Ctrl-C at the post-setup menu
- **THEN** customization SHALL be cancelled with no agent configured and the flow SHALL complete normally

#### Scenario: Cancel from the harness picker

- **WHEN** the user presses `q` or Ctrl-C at the harness picker
- **THEN** customization SHALL be cancelled with no agent configured and the flow SHALL complete normally

#### Scenario: Cancel from the agent-selection checklist

- **WHEN** the user presses `q` or Ctrl-C at the agent-selection checklist
- **THEN** customization SHALL be cancelled with no agent configured and the flow SHALL complete normally

#### Scenario: Cancel during settings selection

- **WHEN** the user presses `q` or Ctrl-C at the Claude Code combined model/effort frame or at any OpenCode provider, model, or variant screen, or the settings selector returns no selection
- **THEN** customization SHALL be cancelled — no agent SHALL be configured — and the flow SHALL complete normally

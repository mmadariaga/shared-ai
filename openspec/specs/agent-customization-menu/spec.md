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

### Requirement: Fake settings selection
For every Claude Code customization run with a non-empty confirmed subset, the Claude Code adapter MUST invoke a placeholder settings selector that collects BOTH a placeholder model choice and a placeholder effort choice through exactly one navigable single-select frame, using `effort` as the Claude Code shared UI concept. Each option in that single frame SHALL encode a model choice together with an effort choice, so that one confirmation resolves both values. The Claude Code adapter MUST expose the selected effort as the placeholder input for its future `effort` mapping. The collected values MUST be forwarded to the fake local-override operation as specified by the Shared settings selection requirement. The Claude Code slice MUST NOT perform model discovery or real settings validation. The OpenCode adapter MUST NOT use this placeholder combined frame: it SHALL collect its settings through the dependent provider-to-model-to-variant selection defined by the `opencode-settings-selection` capability instead.

#### Scenario: Settings selector runs once for an OpenCode customization run
- **WHEN** OpenCode customization is selected and a non-empty subset is confirmed
- **THEN** the adapter MUST collect exactly one model choice and one optional variant choice through the dependent provider, model, and optional variant screens for the whole subset, forward them to the local-override operation for every selected agent, and complete without presenting the placeholder combined model/effort frame

#### Scenario: Settings selector runs once for a Claude Code customization run
- **WHEN** Claude Code customization is selected and a non-empty subset is confirmed
- **THEN** the adapter MUST collect exactly one placeholder model choice and one placeholder effort choice from the fake selector for the whole subset, forward both values to the fake local-override operation for every selected agent, and complete without discovering or validating a model

#### Scenario: Model and effort choices share one navigable frame
- **WHEN** the Claude Code fake settings selector presents the model/effort options for a customization run
- **THEN** the model and effort choices SHALL be collected through exactly one navigable single-select frame with a `>` cursor and Enter/space confirmation, one confirmation resolving both the placeholder model choice and the placeholder effort choice

### Requirement: Non-persistent local override
For every traversed agent, the selected harness adapter MUST invoke a local-override operation after settings selection, passing the collected settings for that agent — the placeholder model and effort choices for Claude Code, and the discovered model with optional variant for OpenCode. The operation MUST be the sole constructor of the final per-agent override shape: for OpenCode it MUST add the `agent` identity and `persistent: false` and MUST include the `variant` key only when the collected settings carry one; the settings selector itself SHALL NOT construct overrides. The operation MUST return a non-persistent result and MUST NOT create, modify, delete, or copy any agent file.

#### Scenario: Fake override runs without filesystem changes
- **WHEN** local override creation is invoked for any traversed agent with its collected settings
- **THEN** the adapter MUST complete without filesystem writes and MUST leave agent bodies and frontmatter unchanged

#### Scenario: End-to-end customization remains explicitly fake
- **WHEN** a complete Claude Code harness traversal finishes
- **THEN** the flow MUST be observable as a completed control path while making no claim that model selection or local override creation is operational

#### Scenario: OpenCode override creation stays in memory
- **WHEN** a complete OpenCode harness traversal finishes
- **THEN** the flow SHALL produce only in-memory non-persistent overrides carrying the discovered model and optional variant, and SHALL make no filesystem changes

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

# agent-customization-menu Specification

## Purpose
TTY-only post-setup menu and isolated fake customization adapters for both supported harnesses, establishing a stable interactive path and harness boundary before model discovery and real override operations are implemented.

## Requirements

### Requirement: Post-setup customization menu
The setup flow MUST present a post-setup menu only after all existing setup operations have completed. The menu MUST provide exactly two actions: `Customize models` and `Exit`.

#### Scenario: User exits from the post-setup menu
- **WHEN** setup completes its existing work and the user selects `Exit`
- **THEN** the setup flow MUST finish without selecting a harness or traversing any agent

#### Scenario: User enters model customization
- **WHEN** setup completes its existing work and the user selects `Customize models`
- **THEN** the flow MUST continue to exclusive harness selection

### Requirement: TTY-only interaction
The setup flow MUST determine whether interaction is available through its injectable TTY check before presenting the post-setup menu. When no TTY is available, it MUST skip the menu and all customization adapters without adding menu-specific prompts or output.

#### Scenario: Setup runs without a TTY
- **WHEN** the injectable TTY check reports that standard input is not interactive
- **THEN** setup MUST preserve its existing operations and complete without presenting the post-setup menu

#### Scenario: Setup runs with a TTY
- **WHEN** the injectable TTY check reports that standard input is interactive
- **THEN** setup MUST present the post-setup menu after the existing operations complete

### Requirement: Exclusive harness selection
After `Customize models` is selected, the flow MUST offer OpenCode and Claude Code as mutually exclusive harness choices. It MUST dispatch customization to exactly one selected harness adapter and MUST NOT process both harnesses in a single selection.

#### Scenario: User selects OpenCode
- **WHEN** the user chooses OpenCode
- **THEN** the flow MUST dispatch only to the OpenCode adapter

#### Scenario: User selects Claude Code
- **WHEN** the user chooses Claude Code
- **THEN** the flow MUST dispatch only to the Claude Code adapter

### Requirement: Isolated harness adapter boundaries
OpenCode and Claude Code MUST be represented by independent adapters. Each adapter MUST expose separate operations for agent enumeration, fake settings selection, and fake local override creation, without requiring a shared normalized agent-file format.

#### Scenario: OpenCode adapter is selected
- **WHEN** the OpenCode harness is selected
- **THEN** the flow MUST call the OpenCode adapter's operations and MUST NOT call Claude Code adapter operations

#### Scenario: Claude Code adapter is selected
- **WHEN** the Claude Code harness is selected
- **THEN** the flow MUST call the Claude Code adapter's operations and MUST NOT call OpenCode adapter operations

### Requirement: Complete OpenCode traversal
The OpenCode adapter MUST derive its complete harness-specific agent set from the canonical agents-class projections in `sai/install-manifest.json` and MUST enumerate and process every resulting OpenCode agent, including the `budget`, `explore`, and `executor` agents. It MUST invoke fake settings selection and fake local override creation once for each enumerated agent. For the current repository state, that derived set contains exactly 10 agents; this count is a fixture assertion of the current repository state, not a hardcoded enumeration.

#### Scenario: OpenCode customization traverses the complete registry
- **WHEN** OpenCode customization is selected
- **THEN** the adapter MUST process the 10 distinct agents derived from the canonical agents-class projections with no early stop or representative-agent shortcut

### Requirement: Complete Claude Code traversal
The Claude Code adapter MUST derive its complete harness-specific agent set from the canonical agents-class projections in `sai/install-manifest.json` and MUST enumerate and process every resulting Claude Code agent. It MUST invoke fake settings selection and fake local override creation once for each enumerated agent. For the current repository state, that derived set contains exactly 7 agents; this count is a fixture assertion of the current repository state, not a hardcoded enumeration.

#### Scenario: Claude Code customization traverses the complete registry
- **WHEN** Claude Code customization is selected
- **THEN** the adapter MUST process the 7 distinct agents derived from the canonical agents-class projections with no early stop or representative-agent shortcut

### Requirement: Fake settings selection
For every traversed agent, the selected harness adapter MUST invoke a placeholder settings selector that collects BOTH a placeholder model choice and a placeholder effort choice, using `effort` as the shared UI concept. The OpenCode adapter MUST expose the selected effort as the placeholder input for its future `variant` mapping, and the Claude Code adapter MUST expose it as the placeholder input for its future `effort` mapping. Both placeholder values MUST be collected exactly once per agent and MUST be forwarded to the fake local-override operation for that agent. This slice MUST NOT perform model discovery or real settings validation.

#### Scenario: Settings selector runs for an OpenCode agent
- **WHEN** an OpenCode agent is traversed
- **THEN** the adapter MUST collect exactly one placeholder model choice and one placeholder effort choice from the fake selector for that agent, forward both values to the fake local-override operation, and complete without discovering or validating a model

#### Scenario: Settings selector runs for a Claude Code agent
- **WHEN** a Claude Code agent is traversed
- **THEN** the adapter MUST collect exactly one placeholder model choice and one placeholder effort choice from the fake selector for that agent, forward both values to the fake local-override operation, and complete without discovering or validating a model

### Requirement: Non-persistent fake local override
For every traversed agent, the selected harness adapter MUST invoke a placeholder local-copy adapter after fake settings selection, passing the collected placeholder model and effort choices for that agent. The placeholder MUST report or return a non-persistent result and MUST NOT create, modify, delete, or copy any agent file.

#### Scenario: Fake override runs without filesystem changes
- **WHEN** fake local override creation is invoked for any traversed agent with its collected placeholder model and effort choices
- **THEN** the adapter MUST complete without filesystem writes and MUST leave agent bodies and frontmatter unchanged

#### Scenario: End-to-end customization remains explicitly fake
- **WHEN** a complete harness traversal finishes
- **THEN** the flow MUST be observable as a completed control path while making no claim that model selection or local override creation is operational

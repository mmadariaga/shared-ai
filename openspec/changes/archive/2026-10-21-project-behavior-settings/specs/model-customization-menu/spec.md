## MODIFIED Requirements

### Requirement: Post-setup customization menu

The setup flow MUST present a post-setup menu only after all existing setup operations have completed. The menu MUST provide exactly six actions: `Customize models`, `Reset to default models`, `Save preset`, `Load preset`, `Project behavior settings`, and `Exit`. The menu MUST be presented as a navigable single-select list: up/down arrows move the `>` cursor and Enter (or space) confirms the highlighted action. Selecting `Save preset` or `Load preset` MUST route harness selection to the save-preset or load-preset screen with no scope screen. Selecting `Project behavior settings` MUST open the project behavior settings screen with no harness selection, and when that screen returns, whether saved, unchanged, failed, or interrupted, the flow MUST present the post-setup menu again.

#### Scenario: User exits from the post-setup menu

- **WHEN** setup completes its existing work and the user selects `Exit`
- **THEN** the setup flow MUST finish without selecting a harness, scope, or any target

#### Scenario: User enters model customization

- **WHEN** setup completes its existing work and the user selects `Customize models`
- **THEN** the flow MUST continue to exclusive harness selection

#### Scenario: User navigates the post-setup menu with arrow keys

- **WHEN** the user moves the `>` cursor with the arrow keys and confirms with Enter
- **THEN** the flow MUST act on exactly the highlighted action

#### Scenario: User enters save preset from the post-setup menu

- **WHEN** the user selects `Save preset` at the post-setup menu and chooses a harness
- **THEN** the flow MUST route to the save-preset screen without presenting scope or settings screens

#### Scenario: User enters load preset from the post-setup menu

- **WHEN** the user selects `Load preset` at the post-setup menu and chooses a harness
- **THEN** the flow MUST route to the load-preset screen without presenting scope or settings screens

#### Scenario: User opens project settings from the post-setup menu

- **WHEN** the user selects `Project behavior settings`, edits `backlog.provider`, and leaves the screen
- **THEN** the flow MUST save the setting through the project behavior settings screen and present the post-setup menu again

#### Scenario: Interrupted project settings return to the menu

- **WHEN** the user interrupts a prompt inside the project behavior settings screen
- **THEN** the flow MUST present the post-setup menu again and leave `.sai/settings.jsonc` unchanged

# installer-version-marker Specification

## Purpose

TBD - this spec was authored as a change delta and never merged into the main tree, so its requirements were invisible to validate, list, and archive. Summarize the capability here.

## Requirements
### Requirement: installer writes a .version marker per harness

Each installer harness path (`installClaude`, `installOpencode`, `installCopilot` in `bin/install-flow.js`) SHALL write a `.version` file into the harness user-global dir it populates, containing the `version` value from the repo's `package.json`. The marker SHALL be written on every install of that harness so it reflects the version that produced the current install.

#### Scenario: marker written on Claude install
- **WHEN** the installer populates the Claude Code user-global dir
- **THEN** a `.version` file containing the `package.json` `version` is written into that dir

#### Scenario: marker written on opencode install
- **WHEN** the installer populates the opencode user-global dir
- **THEN** a `.version` file containing the `package.json` `version` is written into that dir

#### Scenario: marker written on Copilot install
- **WHEN** the installer populates the Copilot user-global dir
- **THEN** a `.version` file containing the `package.json` `version` is written into that dir

#### Scenario: marker reflects the installing version
- **WHEN** the installer runs from a repo whose `package.json` `version` is a given value
- **THEN** the `.version` marker it writes contains exactly that value

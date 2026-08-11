## ADDED Requirements

### Requirement: SAI files SHALL be installed to a dedicated `Code/User/sai/` directory

The Copilot installer MUST copy SAI commands and instructions to `Code/User/sai/` (platform-appropriate path), not under the VS Code prompts folder.

| OS | SAI folder |
|----|------------|
| Windows | `%APPDATA%\Code\User\sai\` |
| macOS | `~/Library/Application Support/Code/User/sai/` |
| Linux | `~/.config/Code/User/sai/` |

#### Scenario: Automated install via install-flow.js

- **WHEN** `installCopilot()` runs
- **THEN** SAI commands are copied to `<saiPath>/commands/` and SAI instructions to `<saiPath>/instructions/`, where `saiPath` is derived from `getCopilotSaiDir()`

#### Scenario: Fetch resolution for @sai/ references

- **WHEN** the Copilot fetch skill resolves `Fetch @sai/<subpath>`
- **THEN** it checks `.github/sai/<subpath>` first, then falls back to `Code/User/sai/<subpath>` (not `prompts/sai/<subpath>`)

#### Scenario: Manual install documentation

- **WHEN** a user follows the manual install steps in `INSTALL.copilot.md`
- **THEN** they copy SAI files to the SAI folder, not the prompts folder

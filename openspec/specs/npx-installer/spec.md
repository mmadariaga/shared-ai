## ADDED Requirements

### Requirement: package-json-entry-point
The repo root MUST contain a `package.json` with `"name": "shared-ai"`, `"version": "1.0.0"`, `"bin": { "shared-ai": "bin/install.js" }`, `"files": ["bin", "commands", "sai", "skills", "configs", "openspec/schemas"]`, and `"engines": { "node": ">=18" }`.

#### Scenario: npx invocation resolves bin
- **WHEN** a user runs `npx github:mmadariaga/shared-ai`
- **THEN** npm fetches the repo and executes `bin/install.js` without requiring an npm registry publish

---

### Requirement: installer-shebang-and-no-deps
`bin/install.js` MUST start with `#!/usr/bin/env node` and use ONLY Node.js built-in modules (`fs`, `path`, `os`, `readline`). No external npm dependencies are permitted.

#### Scenario: zero-dep execution
- **WHEN** the installer runs in a clean environment with Node.js ≥ 18
- **THEN** it completes without installing any additional packages

---

### Requirement: interactive-tool-selection
On startup the installer MUST display an interactive terminal checklist using `readline` that lists available targets: `Claude Code` and `Opencode`. Only `Opencode` is selected by default. The user navigates with arrow keys and toggles selection with space, confirming with enter.

#### Scenario: opencode selected by default
- **WHEN** the installer starts with no arguments
- **THEN** the checklist shows only `Opencode` pre-selected and `Claude Code` unchecked

#### Scenario: user deselects opencode and selects claude
- **WHEN** the user unchecks `Opencode`, checks `Claude Code`, and confirms
- **THEN** only Claude Code files are copied; no Opencode files are touched

#### Scenario: user deselects all
- **WHEN** the user deselects both targets and confirms
- **THEN** the installer prints "Nothing selected. Exiting." and exits with code 0

---

### Requirement: help-flag
The installer MUST support `--help` flag. When passed, it prints usage instructions and exits without showing the interactive prompt.

#### Scenario: help output
- **WHEN** user runs the installer with `--help`
- **THEN** it prints the available interaction keys and exits with code 0

---

### Requirement: os-aware-destination-resolution
The installer MUST resolve destination base paths using `os.homedir()`. On Windows (`process.platform === 'win32'`) the Claude base is `<home>\.claude\` and Opencode base is `<home>\.config\opencode\`. On Unix the paths are `~/.claude/` and `~/.config/opencode/` respectively.

#### Scenario: windows path resolution
- **WHEN** `process.platform === 'win32'`
- **THEN** all destination paths are constructed under `os.homedir()` using `path.join` with backslash-compatible segments

#### Scenario: unix path resolution
- **WHEN** `process.platform !== 'win32'`
- **THEN** all destination paths are constructed under `os.homedir()` using `path.join`

---

### Requirement: source-path-resolution
All source file paths MUST be resolved relative to `bin/install.js` using `path.join(__dirname, '..', '<source-dir>')` so the script works regardless of cwd.

#### Scenario: nested invocation
- **WHEN** npx runs the script from an arbitrary working directory
- **THEN** source files are correctly located relative to the script itself

---

### Requirement: copy-rule-commands
Vendor command files (`commands/claude/*.md`, `commands/opencode/*.md`) MUST be skipped if the destination file already exists. No error is raised; the installer prints:
    Skipping <destination-path> (already exists)

SAI command files (`sai/commands/*.md`) MUST always be overwritten. Before overwriting, the installer MUST print:
    Overwriting <destination-path>
or, if the file does not exist:
    Creating <destination-path>

#### Scenario: existing vendor command skipped
- **WHEN** a `.md` file already exists at the destination vendor command path
- **THEN** it is not overwritten and the skip message is printed

#### Scenario: sai command always overwritten
- **WHEN** `sai/commands/*.md` is copied
- **THEN** the destination is always written and a log line is printed

---

### Requirement: copy-rule-instructions
Instruction files (`sai/instructions/*.md`) MUST be overwritten at the destination. Before overwriting, the installer MUST print:
    Overwriting <destination-path>

#### Scenario: instructions overwrite with warning
- **WHEN** `sai/instructions/*.md` is copied and the destination file already exists
- **THEN** the warning line is printed before the file is written

---

### Requirement: copy-rule-skills
All skill files (`skills/**/SKILL.md`) MUST always be overwritten at the destination. Before writing, the installer MUST print:
    Overwriting <destination-path>
or, if the file does not exist:
    Creating <destination-path>

#### Scenario: skill already installed
- **WHEN** a `SKILL.md` already exists at the target skill path
- **THEN** the file IS overwritten and the Overwriting message is printed

#### Scenario: skill not yet installed
- **WHEN** no `SKILL.md` exists at the target skill path
- **THEN** the file is copied, parent directories are created if needed, and the Creating message is printed

---

### Requirement: opencode-config-copy
`configs/opencode.jsonc` MUST be copied to `~/.config/opencode/opencode.jsonc` ONLY if neither `opencode.json` nor `opencode.jsonc` already exists in that directory. If either exists, the installer MUST print manual instructions for the `agent` section instead of copying.

#### Scenario: no existing opencode config
- **WHEN** neither `opencode.json` nor `opencode.jsonc` exists in the Opencode config dir
- **THEN** `opencode.jsonc` is copied there

#### Scenario: existing opencode config present
- **WHEN** `opencode.json` or `opencode.jsonc` already exists
- **THEN** the file is not copied; installer prints instructions for manually adding the `agent` section

---

### Requirement: claude-file-map
When Claude Code is selected, the installer MUST copy:

    Source                                             Destination (relative to ~/.claude/)
    commands/claude/*.md                          →    commands/
    sai/commands/*.md                             →    sai/commands/
    sai/instructions/*.md                         →    sai/instructions/
    skills/universal/token-efficient-languages/SKILL.md → skills/token-efficient-languages/SKILL.md
    skills/claude/budget-explorer/SKILL.md        →    skills/budget-explorer/SKILL.md
    skills/claude/budget-executor/SKILL.md        →    skills/budget-executor/SKILL.md
    skills/claude/fetch/SKILL.md                  →    skills/fetch/SKILL.md
    skills/universal/budget/SKILL.md              →    skills/budget/SKILL.md

#### Scenario: claude install copies all mapped files
- **WHEN** Claude Code is selected
- **THEN** all eight source paths (glob-expanded where wildcards used) are copied to the correct destinations under `~/.claude/`

---

### Requirement: opencode-file-map
When Opencode is selected, the installer MUST copy:

    Source                                             Destination (relative to ~/.config/opencode/)
    commands/opencode/*.md                        →    commands/
    sai/commands/*.md                             →    sai/commands/
    sai/instructions/*.md                         →    sai/instructions/
    skills/universal/token-efficient-languages/SKILL.md → skills/token-efficient-languages/SKILL.md
    skills/opencode/budget-explorer/SKILL.md      →    skills/budget-explorer/SKILL.md
    skills/opencode/budget-executor/SKILL.md      →    skills/budget-executor/SKILL.md
    skills/universal/budget/SKILL.md              →    skills/budget/SKILL.md
    skills/opencode/fetch/SKILL.md                →    skills/fetch/SKILL.md
    configs/opencode.jsonc                        →    opencode.jsonc (conditional — see opencode-config-copy)

#### Scenario: opencode install copies all mapped files
- **WHEN** Opencode is selected
- **THEN** all nine source paths are processed per their copy rules under `~/.config/opencode/`

---

### Requirement: post-install-reminder
After all copies complete, the installer MUST print:

    Reminder: run 'openspec init --tools claude' (or --tools opencode) in each project,
    then copy the openspec/schemas folder from this repo into the project root.

#### Scenario: reminder always shown
- **WHEN** the installer finishes copying at least one target
- **THEN** the reminder is printed regardless of which targets were selected

## ADDED Requirements

### Requirement: Claude Code sai-explore is scoped read-only via allowed-tools

The Claude Code wrapper `commands/claude/sai-explore.md` SHALL declare an `allowed-tools` frontmatter list that grants only read-only tools and omits every file-mutating tool. The list MUST exclude `Edit`, `Write`, and a bare unrestricted `Bash`. Shell access, where required, SHALL be granted only through scoped globs — at minimum `Bash(openspec:*)` and `Bash(git:*)` — never as bare `Bash`.

#### Scenario: Write tools are absent from the allowed-tools list

- **WHEN** `commands/claude/sai-explore.md` frontmatter is inspected
- **THEN** an `allowed-tools` key is present
- **AND** it does not list `Edit`, `Write`, or a bare `Bash` entry

#### Scenario: openspec CLI reads keep working under the scoped shell

- **WHEN** `sai-explore` (via the `openspec-explore` skill) runs `openspec list --json`
- **THEN** the call is permitted by the `Bash(openspec:*)` entry in `allowed-tools`
- **AND** the command is not blocked or forced into a permission prompt for lack of shell access

#### Scenario: Required read tools are positively present

- **WHEN** `commands/claude/sai-explore.md` frontmatter is inspected
- **THEN** the `allowed-tools` list contains `Read`, `Glob`, `Grep`, `Bash(openspec:*)`, and `Bash(git:*)`
- **AND** dropping any one of them would fail this scenario

### Requirement: Copilot sai-explore drops the terminal and keeps the language-gate picker

The Copilot wrapper `commands/copilot/sai-explore.prompt.md` SHALL declare a `tools:` frontmatter that omits the terminal tool `execute` and grants the VS Code option-picker `vscode/askQuestions` in place of the broad `vscode` category. The non-writing tools `read`, `search`, `web`, and `todo` SHALL be retained.

#### Scenario: Terminal tool removed, narrow picker granted

- **WHEN** `commands/copilot/sai-explore.prompt.md` frontmatter is inspected
- **THEN** the `tools:` list does not contain `execute`
- **AND** the `tools:` list contains `vscode/askQuestions`
- **AND** it does not retain the broad `vscode` category entry

#### Scenario: VS Code language gates remain operable

- **WHEN** a non-English `sai-explore` turn reaches the artifact-review or crystallization language gate inside VS Code
- **THEN** the gate can present its question through `vscode/askQuestions`
- **AND** `web` and `todo` remain available for non-writing use

### Requirement: Read-only scoping preserves sai-explore's non-writing operations

The tool scoping in both supported harnesses SHALL preserve every read-only operation `sai-explore` relies on — file reads, code search, the openspec CLI reads used by the `openspec-explore` skill, the closed-choice option-picker, skill loading, and research-subagent dispatch. Removing write-capable tools SHALL NOT disable any of these paths.

Note: research subagents run under their own tool configuration and do not inherit the parent command's frontmatter tool list (Claude Code subagents carry their own tool set; Copilot's `tools:` list does not cascade to invoked agents). The parent-command scoping therefore governs the main-session tools only; subagent read-only discipline continues to be enforced by the budget-explorer skill's cheap read-only agent binding, not by this frontmatter.

#### Scenario: Non-writing paths survive the restriction

- **WHEN** `sai-explore` runs under the scoped frontmatter in Claude Code or Copilot
- **THEN** it can still read files, search code, run the code-graph and openspec read checks, present option-pickers, and dispatch read-only research subagents
- **AND** only file-mutating tools are unavailable

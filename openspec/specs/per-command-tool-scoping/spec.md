# per-command-tool-scoping Specification

## Purpose

Scope read-only tool access for command wrappers: which tools each surface may grant.

## Requirements

### Requirement: Routed coordinator read scope is sufficient but non-writing
The seven routed coordinators SHALL keep their read-only scope unchanged; `commands/claude/sai-explore.md` SHALL now declare the trimmed delegation allowlist with per-root Node wildcards and no direct CodeGraph MCP entry.

#### Scenario: All seven routed coordinators receive the restored read tools
- **WHEN** the frontmatter of `commands/claude/sai-1-spec.md`, `commands/claude/sai-2-design.md`, `commands/claude/sai-3-implement.md`, `commands/claude/sai-5-review.md`, `commands/claude/sai-6-security.md`, `commands/claude/sai-7-performance.md`, and `commands/claude/sai-8-accessibility.md` is inspected
- **THEN** each file still declares its read-only base sequence and no coordinator gains a probe or literal duty

#### Scenario: Write-capable tools remain absent
- **WHEN** any routed coordinator allowed-tools list is inspected
- **THEN** it does not contain `Edit`, `Write`, or a bare `Bash` entry

#### Scenario: Existing read-scoped commands do not change
- **WHEN** the change is applied
- **THEN** `commands/claude/sai-explore.md` declares the trimmed delegation allowlist instead of its prior scoped-shell list, `sai-status` retains its existing behavior, and opencode behavior stays without a frontmatter contract

### Requirement: Claude Code sai-explore is scoped read-only via allowed-tools
The Claude Code wrapper `commands/claude/sai-explore.md` SHALL grant only read-only tools with per-root scoped shell entries `Bash(openspec:*)`, `Bash(git:*)`, `Bash(node .claude/sai:*)`, and `Bash(node ~/.claude/sai:*)`; it SHALL exclude `Edit`, `Write`, bare `Bash`, and any `codegraph_*` or `mcp__codegraph__*` entry.

#### Scenario: Write tools are absent from the allowed-tools list
- **WHEN** `commands/claude/sai-explore.md` frontmatter is inspected
- **THEN** an `allowed-tools` key is present and it does not list `Edit`, `Write`, a bare `Bash` entry, or any CodeGraph MCP entry

#### Scenario: openspec CLI reads keep working under the scoped shell
- **WHEN** `sai-explore` (via the `openspec-explore` skill) runs `openspec list --json`
- **THEN** the call is still permitted by the `Bash(openspec:*)` entry without any probe prerequisite

#### Scenario: Required read tools are positively present
- **WHEN** `commands/claude/sai-explore.md` frontmatter is inspected
- **THEN** the `allowed-tools` list contains `Read`, `Glob`, `Grep`, `Bash(openspec:*)`, and `Bash(git:*)` under the trimmed delegation scope

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
The scoping SHALL preserve delegation, file reads for artifacts and instructions, openspec CLI reads, option-pickers, skill loading, and research-subagent dispatch; direct code-graph checks SHALL NOT be performed by the principal and wildcard coverage of no-longer-invoked files SHALL be accepted as harmless dead code.

#### Scenario: Non-writing paths survive the restriction
- **WHEN** `sai-explore` runs under the scoped frontmatter in Claude Code or Copilot
- **THEN** it can still delegate discovery, read files, run openspec reads, present option-pickers, and dispatch read-only research subagents with no principal code-graph check and only file-mutating tools unavailable

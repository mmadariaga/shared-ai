# per-command-tool-scoping Specification

## Purpose

Scope read-only tool access for command wrappers: which tools each surface may grant.

## Requirements

### Requirement: Routed coordinator read scope is sufficient but non-writing

The seven routed planning and audit command wrappers SHALL receive canonical profile-derived read, search, skill, interaction, dispatch, panel, messaging, and scoped execution pre-approvals required by their coordinator contracts, without native write or bare shell pre-approvals. Command access SHALL be checked independently of worker access. Explore SHALL receive its own profile-derived research and scoped execution pre-approvals, including contracted CodeGraph access. Claude allowed-tools SHALL be described as pre-approval rather than an enforced exclusion of unlisted tools. Opencode SHALL retain its active primary agent without a command-local permission field.

#### Scenario: All seven routed coordinators receive the restored read tools
- **WHEN** Claude wrappers for Spec, Design, Implement, Review, Security, Performance, and Accessibility are inspected after projection
- **THEN** each declares its contracted profile-derived read scope and command access check without a separate research-availability probe duty

#### Scenario: Write-capable tools remain absent
- **WHEN** any of these seven wrappers' allowed-tools lists is inspected
- **THEN** it contains neither Edit nor Write nor a bare unrestricted shell pre-approval

#### Scenario: Existing read-scoped commands do not change
- **WHEN** capability projection is applied
- **THEN** Explore and Status preserve their existing command operations with generated pre-approvals and opencode still declares no command permission field

### Requirement: Claude Code sai-explore is scoped read-only via allowed-tools

The Claude Explore wrapper SHALL project canonical pre-approvals covering reading, searching, interaction, skills, web research, CodeGraph, delegation, and scoped shell operations for openspec, git, and Node tools under both installed SAI roots. It SHALL exclude Edit, Write, and bare unrestricted shell pre-approvals. Its non-writing boundary SHALL remain contract-owned: allowed-tools pre-approves selected operations but does not deny all unlisted tools or override inherited native permission restrictions.

#### Scenario: Write tools are absent from the allowed-tools list
- **WHEN** projected Explore frontmatter is inspected
- **THEN** allowed-tools is present without Edit, Write, or bare unrestricted shell entries, while contracted CodeGraph access is included

#### Scenario: openspec CLI reads keep working under the scoped shell
- **WHEN** Explore through its OpenSpec skill runs openspec list --json with effective native access
- **THEN** the projected openspec shell pre-approval covers the call without a research-availability probe prerequisite

#### Scenario: Required read tools are positively present
- **WHEN** projected Explore frontmatter is inspected
- **THEN** its pre-approvals include Read, Glob, Grep, and scoped openspec and git shell access

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

Required access SHALL preserve delegation, artifact and instruction reads, OpenSpec CLI reads, option-pickers, skills, and research-subagent dispatch on Claude Code and opencode. Discovery SHALL remain delegated to the explorer; granting direct CodeGraph access SHALL NOT itself assign principal discovery or availability-probe duties. Profile grant scope SHALL remain distinct from operation authorization, and broader wildcard coverage SHALL NOT authorize off-contract operations. The interactive command SHALL NOT be replaced with a read-only child to obtain apparent enforcement.

#### Scenario: Non-writing paths survive the restriction
- **WHEN** Explore runs with its required effective access on a supported harness
- **THEN** it can delegate discovery, read instructions and artifacts, run OpenSpec reads, and present pickers while retaining its contract-owned non-writing boundary without claiming unlisted tools are unavailable

# copilot-harness-instructions Specification

## Purpose
TBD - created by archiving change copilot-fixes. Update Purpose after archive.
## Requirements
### Requirement: A Copilot harness instruction file SHALL define OpenSpec path-resolution rules

The repository SHALL contain `sai/instructions/harness/copilot.md` instructing agents to treat `/openspec/` as the default workspace-root path: prefer direct paths such as `/openspec/config.yaml` and `/openspec/changes/{change-name}/design.md`, and never search with recursive glob prefixes such as `**/openspec/...` when the repository root is known.

#### Scenario: Agent locates an OpenSpec artifact
- **WHEN** a Copilot agent following the harness instructions needs to verify an OpenSpec artifact
- **THEN** it checks the direct `/openspec/...` path first before any broader search

### Requirement: Every Copilot prompt wrapper SHALL fetch the harness instructions before its command body

Each of the 14 files matching `commands/copilot/sai-*.prompt.md` MUST contain the line `Fetch @sai/instructions/harness/copilot.md and follow those instructions exactly.` after the fetch-skill load line and before the `Fetch @sai/commands/...` directive.

#### Scenario: Copilot command invoked
- **WHEN** a user invokes any `/sai-*` prompt in Copilot (VS Code)
- **THEN** the harness path rules are loaded before the command body is fetched and executed


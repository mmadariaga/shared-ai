# spec-copilot-model Specification

## Purpose
TBD - created by archiving change copilot-fixes. Update Purpose after archive.
## Requirements
### Requirement: The sai-1-spec Copilot wrapper SHALL run on GPT-5.4

`commands/copilot/sai-1-spec.prompt.md` MUST declare `model: GPT-5.4 (copilot)` in its frontmatter, and the README model table row for spec (1) MUST list `GPT-5.4 (copilot)` and `github-copilot/gpt-5.4` in the Copilot columns.

#### Scenario: Spec phase invoked in Copilot
- **WHEN** a user invokes `/sai-1-spec` in Copilot (VS Code)
- **THEN** the prompt runs on the GPT-5.4 (copilot) model

#### Scenario: README consulted for model routing
- **WHEN** a user reads the README model table row for spec (1)
- **THEN** the Copilot (VS Code) column shows `GPT-5.4 (copilot)` and the Copilot (opencode) column shows `github-copilot/gpt-5.4`


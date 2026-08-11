# copilot-command-model-routing Specification

## Purpose
Define model assignments for Copilot SAI command prompts.
## Requirements
### Requirement: Copilot SAI command prompts SHALL declare the updated model assignments

The affected Copilot SAI command prompt frontmatter SHALL use the model assignments implemented by the change: `sai-1-spec`, `sai-3-implement`, `sai-archive`, `sai-commit`, `sai-pr`, and `sai-status` SHALL use `GPT-5.6 Luna (copilot)`; `sai-2-design`, `sai-5-review`, `sai-7-performance`, and `sai-8-accessibility` SHALL use `GPT-5.6 Terra (copilot)`; and `sai-6-security` SHALL use `Claude Opus 5 (copilot)`.

#### Scenario: Updated Copilot prompt metadata is loaded
- **WHEN** an affected Copilot SAI command prompt is read
- **THEN** its YAML frontmatter contains the model assignment listed for that command

#### Scenario: Design command test matches the updated model
- **WHEN** the design coordinator wrapper test inspects the Copilot design prompt
- **THEN** it expects `GPT-5.6 Terra (copilot)`


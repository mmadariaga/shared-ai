# sai-explore-default-model Specification

## Purpose
Pin the opencode `/sai-explore` default model and keep the defaults table in step with it.

## Requirements

### Requirement: Opencode explore wrapper declares DeepSeek Flash with the max variant
The opencode sai-explore wrapper SHALL declare model opencode-go/deepseek-v4.1-flash with variant max in its YAML frontmatter; the Claude wrapper's model is independent of this requirement.
#### Scenario: Wrapper frontmatter routes explore to DeepSeek Flash
- **WHEN** commands/opencode/sai-explore.md frontmatter is read
- **THEN** model is opencode-go/deepseek-v4.1-flash and variant is max

### Requirement: The defaults table documents the same model and variant
The default opencode models table in docs/models.md SHALL show the sai-explore ORCHESTRATOR row with opencode-go/deepseek-v4.1-flash and max, matching the wrapper.
#### Scenario: The defaults table matches the wrapper
- **WHEN** the sai-explore ORCHESTRATOR row of the docs/models.md defaults table is read
- **THEN** it shows opencode-go/deepseek-v4.1-flash (max)

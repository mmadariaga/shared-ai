# sai-explore-default-model Specification

## Purpose
Pin the opencode `/sai-explore` default model and keep the README defaults block in step with it.

## Requirements

### Requirement: Opencode explore wrapper declares the go-provider free model with xhigh variant
The opencode sai-explore wrapper SHALL declare model opencode-go/muse-spark-1.3-contributor-free with variant xhigh in its YAML frontmatter; the Claude wrapper's model is independent of this requirement.
#### Scenario: Wrapper frontmatter routes explore to the go-provider free tier
- **WHEN** commands/opencode/sai-explore.md frontmatter is read
- **THEN** model is opencode-go/muse-spark-1.3-contributor-free and variant is xhigh

### Requirement: README explore row documents the same model and variant
The README's default opencode models block SHALL show the sai-explore ORCHESTRATOR row with opencode-go/muse-spark-1.3-contributor-free and xhigh, matching the wrapper.
#### Scenario: README defaults block matches the wrapper
- **WHEN** the sai-explore ORCHESTRATOR row of the README's default opencode models block is read
- **THEN** it shows opencode-go/muse-spark-1.3-contributor-free (xhigh)

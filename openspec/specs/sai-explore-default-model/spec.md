# sai-explore-default-model Specification

## Purpose
TBD - created by archiving change update-sai-explore-default-model. Update Purpose after archive.

## Requirements

### Requirement: Opencode explore wrapper declares the go-provider free model with xhigh variant
The opencode sai-explore wrapper SHALL declare model opencode-go/muse-spark-1.3-contributor-free with variant xhigh in its YAML frontmatter, preserving description and argument-hint and leaving the Claude wrapper unchanged.
#### Scenario: Wrapper frontmatter routes explore to the go-provider free tier
- **WHEN** commands/opencode/sai-explore.md frontmatter is read after the change
- **THEN** model is opencode-go/muse-spark-1.3-contributor-free and variant is xhigh with no stale value

### Requirement: README explore row documents the same model and variant
The README recommended-models table SHALL document the explore row with opencode-go/muse-spark-1.3-contributor-free and xhigh, matching the wrapper implementation.
#### Scenario: README table matches the wrapper
- **WHEN** the README recommended-models table explore row is read after the change
- **THEN** the Opencode cell shows opencode-go/muse-spark-1.3-contributor-free and Variant shows xhigh

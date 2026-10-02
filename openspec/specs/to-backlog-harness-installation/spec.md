# to-backlog-harness-installation Specification

## Purpose
Expose and install the conversation-preserving backlog workflow and its supporting files consistently for Claude Code and OpenCode.

## Requirements

### Requirement: Conversation-preserving public invocation

Both harnesses SHALL expose `/to-backlog` through minimal invocation wrappers loading the project-local skill first and the user-global skill as fallback. The wrappers SHALL retain the current conversation and SHALL NOT enter the clean-start SAI boot. The OpenCode wrapper SHALL use subtask false.

#### Scenario: Invocation on either harness

- **WHEN** the user invokes `/to-backlog` in Claude Code or OpenCode
- **THEN** its wrapper loads the skill in the current conversation without discarding the context needed for extraction.

### Requirement: Mirrored ancillary installation

The installation manifest SHALL project the to-backlog skill, provider Markdown instructions, JSON registry, invocation wrappers, and Node tools for both harnesses. Provider references SHALL use a managed recursive projection covering Markdown and JSON files; JavaScript tools SHALL use the existing sai-tools projection.

#### Scenario: Both harness projections expand

- **WHEN** installation projections are expanded for Claude Code and OpenCode
- **THEN** each includes the skill, GitHub instructions, registry, wrapper, common resolver, and GitHub adapter.

### Requirement: Simulated regression coverage

Regression tests SHALL cover resolution precedence, ambiguity, unsupported providers, explicit confirmation binding, faithful content, pagination errors, partial and uncertain outcomes, recovery drift, receipt boundaries, and mirrored projections using simulated Git and gh rather than publishing real items.

#### Scenario: CLI publication regression

- **WHEN** the backlog CLI tests exercise resolve, query, and publish
- **THEN** simulated Git and gh provide the destination and publication results without real credentials, network publication, or shell interpretation of content.

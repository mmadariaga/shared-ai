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

The installation manifest SHALL project the to-backlog skill, create.md and update.md branch instructions, provider Markdown instructions including GitHub update mechanics, JSON registry, invocation wrappers, and Node tools for both Claude Code and opencode. Branch and provider references SHALL use a managed recursive projection covering their Markdown and JSON files without duplicating the main skill projection. JavaScript tools, including the reusable from-backlog GitHub reader, SHALL use the existing sai-tools projection. Both invocation descriptions SHALL identify creation and originating-issue update.

#### Scenario: Both harness projections expand

- **WHEN** installation projections are expanded for Claude Code and opencode
- **THEN** each includes the main skill, both branch files, creation and update GitHub instructions, registry, wrapper, common resolver, GitHub publication adapter, and reusable GitHub issue reader.

### Requirement: Simulated regression coverage

Regression tests SHALL retain creation coverage for resolution precedence, ambiguity, unsupported providers, explicit confirmation binding, faithful content, pagination errors, partial and uncertain outcomes, recovery drift, receipt boundaries, and mirrored projections. Update tests SHALL cover concrete full and partial issue references, origin-selection instructions, restricted title-and-description mutation, confirmation binding, stale baselines, inaccessible origins, verified no-op results, uncertain submission reconciliation, repository identity drift, pre-approval concurrency disclosure, both harness projections, and structured CLI dispatch. Tests SHALL use simulated Git and gh rather than publishing real items.

#### Scenario: CLI publication regression

- **WHEN** backlog CLI tests exercise creation resolve, query, and publish
- **THEN** simulated Git and gh provide destination and publication results without real credentials, network publication, or shell interpretation of content.

#### Scenario: Update adapter regression

- **WHEN** tests exercise update approval, stale content, inaccessible origins, no-op content, or lost submission responses
- **THEN** simulated gh responses verify the result and assert that only authorized id, title, and body mutation occurs without creation or Project operations.

#### Scenario: Update CLI regression

- **WHEN** the CLI receives read-update, query-update, update, and recover-update requests containing Markdown or shell-looking content
- **THEN** simulated gh exercises registry dispatch and remote verification without executing the content or publishing a real update.

#### Scenario: Review limitation regression

- **WHEN** instruction tests inspect the update review branch and provider mechanics
- **THEN** they verify that the concurrency limitation note is required before approval and is not imposed on the creation branch.

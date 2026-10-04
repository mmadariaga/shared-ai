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

The installation manifest SHALL project the to-backlog skill, create.md and update.md branch instructions, provider Markdown instructions including GitHub update mechanics, JSON registry, invocation wrappers, and Node tools for both Claude Code and opencode. Branch and provider references SHALL use a managed recursive projection covering their Markdown and JSON files without duplicating the main skill projection. That ancillary projection SHALL also install `prepare-temp.md` and the same skill-owned `scripts/prepare-temp.js` for both harnesses with managed ownership and content drift tracking. JavaScript tools in `sai/tools`, including the reusable from-backlog GitHub reader, SHALL use the existing sai-tools projection; the preparation helper SHALL remain under the installed to-backlog skill rather than sai-tools. Both invocation descriptions SHALL identify creation and originating-issue update.

#### Scenario: Both harness projections expand

- **WHEN** installation projections are expanded for Claude Code and opencode
- **THEN** each includes the main skill, both branch files, creation and update GitHub instructions, registry, wrapper, common resolver, GitHub publication adapter, reusable GitHub issue reader, preparation instructions, and identical skill-owned preparation script.

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

### Requirement: Linux preparation regression coverage

Regression tests SHALL cover distinct and concurrent receipt-directory creation, current-user ownership, mode `0700`, symbolic-link rejection, outside-repository boundaries, creation and verification failures, unsafe root ownership and shared-write permissions, final root rechecks, and missing-root failures without fallback. Tests SHALL verify receipt retention, mirrored helper installation, concrete preparation invocation declarations for both harnesses, unchanged research preparation access, confirmation-before-preparation order, and consistent exploration reminders that preserve the repository-write prohibition and separately confirmed outside-repository capture exception. Existing creation and update regression fixtures SHALL use the helper for approved receipt directories on Linux.

#### Scenario: Filesystem preparation regression

- **WHEN** Linux preparation tests exercise normal creation and injected filesystem failures
- **THEN** they verify private unique directories and reject unsafe or missing locations without changing existing directory permissions or deleting retained receipts.

#### Scenario: Installation and access regression

- **WHEN** tests expand installation and translate to-backlog and explore capabilities for either harness
- **THEN** they verify identical installed helper content and exact installed invocation declarations without adding preparation access to the research profile.

#### Scenario: Exploration reminder regression

- **WHEN** instruction tests inspect the normative exploration rule and common read-only reminder
- **THEN** both preserve the explicitly confirmed outside-repository to-backlog exception without allowing repository edits or treating proposal emission as write authorization.

# from-backlog-harness-installation Specification

## Purpose
Provide equivalent explicit conversation-preserving backlog import invocation and managed installation for Claude Code and opencode.

## Requirements

### Requirement: Mirrored conversation-preserving command entries

Claude Code and opencode SHALL provide `/from-backlog <reference>` through minimal command entries that load the active harness's project-local skill first and fall back to its user-global skill. The entries SHALL forward invocation input and retain the current conversation without invoking SAI boot. The opencode entry SHALL declare `subtask: false`.

#### Scenario: Invoke on either harness

- **WHEN** the user invokes from-backlog in Claude Code or opencode
- **THEN** the corresponding entry loads the appropriate skill in the same conversation and forwards the supplied reference.

### Requirement: Managed mirrored import installation

The manifest-driven installation SHALL project the from-backlog skill, provider registry, GitHub, GitLab, and Azure DevOps provider mechanics references, common import helper, the three provider import adapters, and the appropriate command entry for both supported harnesses. Provider references SHALL be managed, content-tracked recursive projections. GitLab and Azure DevOps additions SHALL use the existing universal skill and sai-tools projections without requiring direct provider-CLI permission grants. The from-backlog command profile SHALL retain read-only access through the common Node helper.

#### Scenario: Expand installation projections

- **WHEN** installation projections are expanded for Claude Code or opencode
- **THEN** the resulting surfaces include the from-backlog skill, registry, GitHub, GitLab, and Azure DevOps mechanics, common helper, all three provider adapters, and corresponding command entry.

#### Scenario: Azure additions retain bounded command access

- **WHEN** the Azure provider is projected for either supported harness
- **THEN** it uses the existing common-helper shell grant without write permission or a direct az grant.

### Requirement: Documented scope and simulated regression coverage

The README SHALL document explicit invocation, supported full and domainless GitHub reference formats, GitHub query and fragment acceptance, GitLab full links including self-hosted destinations, modern and legacy Azure DevOps Services work-item links, and the unambiguous existing organization-context condition for isolated Azure IDs. It SHALL document Node.js and the corresponding authorized gh, glab, or Azure CLI with azure-devops extension prerequisites, explicit partial retrieval, read-only behavior, and exclusions of pull requests, GitHub Enterprise hosts, and Azure DevOps Server. Regression tests SHALL use simulated GitHub responses to cover GitHub issue-type discrimination and SHALL use simulated responses to cover reference validation, provider selection, state and error handling, original-text fidelity, comment pagination, incomplete retrieval, instruction authority boundaries, and mirrored installation. Azure-specific tests SHALL cover organization ambiguity, custom types and states, malformed or repeated pagination data, distinct tool/extension/authentication/access failures, and Windows execution without shell interpretation or automatic extension installation.

#### Scenario: Check import without live GitHub mutations

- **WHEN** the from-backlog regression tests run
- **THEN** simulated responses verify retrieval and installation behavior without requiring publication or executing imported source instructions.

#### Scenario: Check Azure import and provider compatibility

- **WHEN** Azure-specific simulated regression tests run
- **THEN** they verify Services references, organization context, rich project-scoped content, pagination, failure outcomes, Windows safety, both harness projections, and existing GitHub and self-hosted GitLab provider selection without remote mutations.

### Requirement: Mirrored next-item selector installation

Claude Code and opencode SHALL provide `/from-next-backlog-item` through
minimal conversation-preserving command entries that load the active harness's
project-local selector skill first and fall back to its user-global skill.
Entries SHALL forward invocation input for no-argument validation without
invoking SAI boot. The opencode entry SHALL declare `subtask: false`.
Manifest-driven installation SHALL project the selector skill, its GitHub,
GitLab, and Azure DevOps provider references, common Node helper, three provider
adapters, and corresponding command entry for both harnesses. Provider
references SHALL be managed, content-tracked recursive projections.

#### Scenario: Expand selector installation for either harness

- **WHEN** installation projections are expanded for Claude Code or opencode
- **THEN** they include the corresponding selector command, skill, three provider references, common helper, and three provider adapters.

#### Scenario: Load selector in the current conversation

- **WHEN** the user invokes the selector on either supported harness
- **THEN** its entry loads the appropriate local-first skill and preserves the current context and exploration stage without SAI boot.

### Requirement: Documented selector scope and simulated coverage

The README SHALL document the selector's no-argument invocation, supported
manual-order piles, pending unsupported views and filters, empty and failure
outcomes, cancellation, read-only behavior, and conversation-scoped choices.
Regression tests SHALL use simulated responses to cover missing context,
actual choices, manual first positions, complete references accepted by the
existing importer, missing ranks, top ties, partial responses, empty results,
non-importable types, access failures, and cancellation wherever applicable
to each provider. Tests SHALL cover supported GitLab filters and pagination,
Azure custom types, mirrored installation, bounded access declarations, and
rejection of extra CLI arguments without provider mutations.

#### Scenario: Run simulated selection regression tests

- **WHEN** selector regression tests execute
- **THEN** simulated responses check provider selection outcomes, import references, cancellation without I/O, and both harness projections without remote mutations.

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

The manifest-driven installation SHALL project the from-backlog skill, provider registry, provider mechanics reference, both import tools, and the appropriate command entry for both supported harnesses. Provider references SHALL be managed, content-tracked recursive projections.

#### Scenario: Expand installation projections

- **WHEN** installation projections are expanded for Claude Code or opencode
- **THEN** the resulting surfaces include the from-backlog skill, registry, GitHub mechanics, common helper, GitHub adapter, and corresponding command entry.

### Requirement: Documented scope and simulated regression coverage

The README SHALL document explicit invocation, supported full and domainless GitHub reference formats, query and fragment acceptance, required Node.js and readable gh access, and exclusion of pull requests and GitHub Enterprise hosts. Regression tests SHALL use simulated GitHub responses to cover reference validation, issue-type discrimination, state and error handling, original-text fidelity, comment pagination, incomplete retrieval, instruction authority boundaries, and mirrored installation.

#### Scenario: Check import without live GitHub mutations

- **WHEN** the from-backlog regression tests run
- **THEN** simulated responses verify retrieval and installation behavior without requiring publication or executing imported source instructions.

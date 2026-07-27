# Design Coordinator Specification

## Purpose

Define the design coordinator: its lifecycle management, notice emission, feedback iteration, continue-now semantics, and relationship to the implementation coordinator binding.

## Interfaces

### DesignInvocationEnvelope

```yaml
wrapper_echo_value: string
arguments_value: string
```

### ContinueNowEnvelope

```yaml
wrapper_echo_value: "placeholder-value"
arguments_value: "placeholder-change-name"
```

## Requirements

### Requirement: step-1-inactive-infrastructure-boundary

During Step 1, all three design wrappers (Claude, opencode, Copilot) SHALL reference the explicit inline entry `sai/commands/sai-2-design-inline.md` and SHALL NOT reference a routed dispatch path.

### Requirement: coordinator-has-no-file-search-shell-git-web-openspec-access

The design coordinator SHALL NOT have file, search, shell, git, web, or OpenSpec access. All technical I/O SHALL be delegated to the design planning worker.

#### Scenario: coordinator restricted to coordination
- **WHEN** the design coordinator is active
- **THEN** it SHALL NOT perform file reads, globs, grep, shell commands, git operations, web fetches, or OpenSpec commands
- **AND** it SHALL delegate all such operations to the design planning worker

### Requirement: worker-delegates-explore-only

The design planning worker SHALL delegate source discovery only to its permitted budget-explorer/explore binding.

#### Scenario: explore-only delegation
- **WHEN** the worker needs source code discovery
- **THEN** it SHALL delegate to the budget-explorer or explore agent only
- **AND** SHALL NOT delegate to any other agent type

### Requirement: continue-now-clears-design-lifecycle

Continue now SHALL clear the design lifecycle state and dispatch the established implementation binding.

#### Scenario: continue-now clears state
- **WHEN** the user selects "Continue now in this chat"
- **THEN** the coordinator SHALL clear the design lifecycle state
- **AND** SHALL dispatch the implementation binding without design context

### Requirement: continue-now-envelope-contract

The Continue-now envelope SHALL carry `wrapper_echo_value` and `arguments_value`.

#### Scenario: envelope fields present
- **WHEN** continue-now is triggered
- **THEN** the envelope SHALL contain `wrapper_echo_value` set to the empty string
- **AND** `arguments_value` set to the resolved change name

# existing-installation-equivalence Specification

## Purpose
Preserve the current installation and model-customizer outputs while implementation registration adopts a shared worker-role definition for Claude Code and opencode.

## Requirements

### Requirement: Current rendered worker projection equivalence

The current manifest and templates SHALL render nineteen registered workers as thirty-eight ordered agent/binding artifacts per harness, including five implementation planners in ui, frontend, backend, infra, and other order with unique category destinations and the shared implementation-worker contract. Preservation of unaffected agent/binding destination names and complete contents SHALL be checked against the baseline captured at 7112f07be7e9a5f96d8cfe7aaa7daa023a614853 by fixtures/implementation-projections-7112f07.json and test/implementation-worker-role-registration.test.js. Changed implementation roles SHALL not be claimed byte-identical to the retired role: their baseline comparison SHALL normalize worker identity and agent description while retaining checks for defaults, skills, contract Fetch targets, permissions, and native binding behavior.

#### Scenario: Current workers are rendered for both harnesses

- **WHEN** the current worker matrix is rendered separately for Claude Code and opencode
- **THEN** each harness produces thirty-eight agent and binding artifacts with five implementation planners in registration order, while the baseline-byte tests verify unchanged non-implementation destinations/contents and the explicitly normalized equivalence of changed planner projections.

### Requirement: Implementation identity and contract diagnostics

Registration preparation SHALL retain diagnostic rejection of misassigned implementation worker identities and mismatched instruction contracts on worker identity checks and both supported installation surfaces.

#### Scenario: An implementation identity is misassigned

- **WHEN** an implementation entry names `sai-2-design-worker`
- **THEN** identity checks and both harness installation surfaces reject the entry with an implementation worker identity diagnostic.

#### Scenario: An implementation contract is mismatched

- **WHEN** an implementation entry retains its supported worker name but names another phase's instruction contract
- **THEN** identity checks and both harness installation surfaces reject the entry with an implementation worker contract diagnostic.

### Requirement: Binding destination collision rejection

Installation projection SHALL continue to reject an implementation binding destination that collides with another worker binding for either supported harness.

#### Scenario: The implementation binding reuses the design binding stem

- **WHEN** the current implementation entry uses binding stem `design`
- **THEN** installation expansion rejects the binding destination collision for Claude Code and opencode.

### Requirement: Existing implementation model-customizer grouping

The model customizer SHALL derive sai-3 worker grouping from the authoritative implementation registration definition, placing ui, frontend, backend, infra, and other planners in that order behind sai-3-implement. Each planner SHALL remain independently selectable. The neighboring sai-4 command and RED-then-GREEN worker order SHALL remain unchanged.

#### Scenario: Implementation and apply targets are grouped

- **WHEN** the model customizer builds the All checklist for sai-3 and sai-4 commands and their current workers
- **THEN** the order is `command:sai-3-implement`, `worker:sai-3-ui-worker`, `worker:sai-3-frontend-worker`, `worker:sai-3-backend-worker`, `worker:sai-3-infra-worker`, `worker:sai-3-other-worker`, `command:sai-4-apply`, `worker:sai-4-red-worker`, and `worker:sai-4-green-worker`.

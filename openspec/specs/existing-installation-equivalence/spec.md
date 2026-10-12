# existing-installation-equivalence Specification

## Purpose
Preserve the current installation and model-customizer outputs while implementation registration adopts a shared worker-role definition for Claude Code and opencode.

## Requirements

### Requirement: Current rendered worker projection equivalence

For the current manifest and templates, implementation registration preparation SHALL preserve the complete ordered rendered worker projection for Claude Code and opencode, including each artifact's kind, destination name, and text.

#### Scenario: Current workers are rendered for both harnesses

- **WHEN** the current worker matrix is rendered separately for Claude Code and opencode
- **THEN** each harness produces the same thirty agent and binding artifacts with the same ordered kinds, destination names, and byte-for-byte text as before the refactor.

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

The model customizer SHALL derive sai-3 worker grouping from the authoritative implementation registration definition while preserving the current command and worker selection order.

#### Scenario: Implementation and apply targets are grouped

- **WHEN** the model customizer builds the All checklist for sai-3 and sai-4 commands and their current workers
- **THEN** the order remains `command:sai-3-implement`, `worker:sai-3-implementation-worker`, `command:sai-4-apply`, `worker:sai-4-red-worker`, and `worker:sai-4-green-worker`.

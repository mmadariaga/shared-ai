# implementation-role-registration-seam Specification

## Purpose
Separate implementation-phase membership from registered worker-role identity through a closed definition shared by registration validation, projection, and model-customizer grouping.

## Requirements

### Requirement: Authoritative implementation registration definition

The system SHALL define the implementation phase, its sai-3 command identity, and its ordered supported worker identities and instruction contracts in one immutable registration definition. Worker-matrix validation, installer identity validation, implementation worker projection, and model-customizer grouping SHALL consume this definition.

#### Scenario: Current implementation registration is resolved

- **WHEN** the system resolves the implementation registration definition
- **THEN** it identifies phase `implementation`, command `sai-3-implement`, and the sole role `sai-3-implementation-worker` with contract `sai/commands/implement/worker.md`.

### Requirement: Closed implementation role validation

Implementation registration SHALL accept only worker identities declared in the authoritative role list and SHALL require each identity's declared instruction contract. Worker-matrix validation and installation projection validation for Claude Code and opencode SHALL reject unsupported identities and mismatched contracts.

#### Scenario: An undeclared planning role is supplied

- **WHEN** an implementation entry names `sai-3-ui-worker` instead of the declared current role
- **THEN** worker-matrix validation and installation projection validation for both supported harnesses reject the entry.

#### Scenario: A declared role has a different contract

- **WHEN** the current implementation worker is registered with `sai/commands/design/worker.md`
- **THEN** worker-matrix validation and installation projection validation for both supported harnesses reject the mismatched contract.

### Requirement: Role-derived cardinality and ordering

Worker-matrix validation SHALL derive the implementation entry count and ordered implementation phase entries from the authoritative role list. It SHALL retain unique worker names, reject registrations beyond the supported current role set, and enforce the existing phase sequence.

#### Scenario: The current manifest is validated

- **WHEN** the unchanged current manifest is passed to worker-matrix validation
- **THEN** validation accepts fifteen registered workers with exactly one implementation role.

#### Scenario: A worker identity is duplicated

- **WHEN** a second matrix entry duplicates `sai-3-implementation-worker`
- **THEN** worker-matrix validation rejects the duplicate worker name.

#### Scenario: Implementation registration is moved before design

- **WHEN** the design and implementation entries exchange positions in the current manifest
- **THEN** worker-matrix validation rejects the implementation entry as out of phase order.

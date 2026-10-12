# implementation-role-registration-seam Specification

## Purpose
Separate implementation-phase membership from registered worker-role identity through a closed definition shared by registration validation, projection, and model-customizer grouping.

## Requirements

### Requirement: Authoritative implementation registration definition

The immutable implementation registration SHALL identify phase implementation, command sai-3-implement, and ordered roles sai-3-ui-worker, sai-3-frontend-worker, sai-3-backend-worker, sai-3-infra-worker, and sai-3-other-worker. Every role SHALL use sai/commands/implement/worker.md. Registration, matrix validation, installation identity/projection validation, and customizer grouping SHALL consume this shared definition, whose role order derives from the planning tool's shared agent list.

#### Scenario: Current implementation registration is resolved

- **WHEN** implementation registration is resolved
- **THEN** it returns the implementation phase, sai-3 command, and the five ordered category roles sharing the canonical planning-worker contract.

### Requirement: Closed implementation role validation

Matrix and installation validation for both harnesses SHALL accept only the five registered implementation identities with their declared shared contract and SHALL reject unsupported identities or mismatched contracts.

#### Scenario: An undeclared planning role is supplied

- **WHEN** an implementation entry names the retired sai-3-implementation-worker or another undeclared identity
- **THEN** worker-matrix and installation projection validation reject it for both harnesses.

#### Scenario: A declared role has a different contract

- **WHEN** a category planning role is registered with sai/commands/design/worker.md
- **THEN** worker-matrix and installation projection validation reject the mismatched contract for both harnesses.

### Requirement: Role-derived cardinality and ordering

Matrix validation SHALL derive the implementation entry count and order from the five-role definition, preserve unique worker identities, reject unsupported registrations, and retain the phase sequence. The complete current roster SHALL contain nineteen workers with five consecutive implementation roles after design.

#### Scenario: The current manifest is validated

- **WHEN** the current category-planning manifest is validated
- **THEN** nineteen workers are accepted with exactly the five registered implementation roles in their declared order.

#### Scenario: A worker identity is duplicated

- **WHEN** a second matrix entry duplicates a category-worker identity
- **THEN** validation rejects the duplicate name.

#### Scenario: Implementation registration is moved before design

- **WHEN** implementation entries are moved before design
- **THEN** validation rejects the out-of-phase ordering.

### Requirement: Deprecated implementation export is not a routing fallback

The deprecated CLAUDE_IMPLEMENTATION_WORKER_AGENT export SHALL remain compatibility metadata pointing to sai-3-other-worker.md. Live implementation routing SHALL use only the category mapping and SHALL not treat that export as a default destination.

#### Scenario: Compatibility code reads the deprecated export

- **WHEN** a consumer reads CLAUDE_IMPLEMENTATION_WORKER_AGENT
- **THEN** it receives the compatibility agent filename without changing category routing or permitting invalid categories to fall back to other.

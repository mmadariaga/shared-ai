# sai-1-phase-contract Specification

## Purpose
TBD - created by archiving change consolidate-sai-1-spec-flow. Update Purpose after archive.

## Requirements

### Requirement: Canonical sai-1 phase declarations

The routed sai-1 standalone coordinator, spec worker, and Explore-supervised adapter SHALL consume one canonical phase contract for ownership, progress identifiers, pointer routing, write scope, lifecycle results, and validation reports.

#### Scenario: All sai-1 entry paths use one declaration source

- **WHEN** standalone or Explore-supervised sai-1 execution configures its phase adapter
- **THEN** it SHALL consume the canonical phase contract without redefining those declarations inline.

### Requirement: Closed spec write surface

The sai-1 worker SHALL write only `openspec/changes/{change-name}/proposal.md`, `openspec/changes/{change-name}/specs/**`, and permitted terminology updates in the repository-root `GLOSSARY.md`.

#### Scenario: A phase operation requests an artifact write

- **WHEN** the worker, coordinator, or Explore supervisor handles a sai-1 artifact operation
- **THEN** no operation SHALL write design, task, interface, implementation, test, recovery, project-source, or project-configuration files.

### Requirement: Lifecycle and recovery boundaries

The sai-1 phase SHALL preserve the generic closed lifecycle result union, feedback continuations, bounded recovery continuations, and terminal ownership while applying its centralized declarations.

#### Scenario: A worker result reaches the coordinator

- **WHEN** a sai-1 worker returns progress, input, completion, failure, or cancellation
- **THEN** the coordinator SHALL validate and route the result without adding phase state, widening the write surface, or replacing the worker-owned technical responsibility.

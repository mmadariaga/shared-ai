# worker-matrix-collapse Specification

## Purpose

TBD

## Requirements

### Requirement: Harness templates materialize the routed worker matrix

The installer SHALL define one parameterized worker-binding template and one parameterized managed-worker-agent template for each supported harness. The templates SHALL materialize the seven routed phases — spec, design, implementation, review, security, performance, and accessibility — with phase parameters for worker identity, subagent type, model or tuning, worker-contract Fetch target, continuation literal, and any phase-specific options. The separate `idea-list-render` binding and non-worker support agents SHALL remain outside this matrix.

#### Scenario: Every phase receives a deterministic binding and agent

- **WHEN** the manifest is expanded for either supported harness
- **THEN** exactly one materialized binding and one materialized managed worker agent exist for each of the seven routed phases, with the expected destination names and no unresolved template tokens

#### Scenario: Phase-specific behavior is isolated

- **WHEN** a matrix entry is rendered for spec, design, implementation, or an audit phase
- **THEN** it contains only that phase's continuation, helper permissions, reconstruction fields, progress behavior, and exceptional options, and design-only overview or notice options do not appear in other phases

### Requirement: Materialized worker behavior preserves canonical lifecycle contracts

Each materialized worker agent SHALL preserve its harness-specific frontmatter identity and user-tunable fields while its managed body remains a thin Fetch wrapper for the canonical worker contract. Each materialized binding SHALL preserve the shared two-string invocation envelope, same-worker continuation before bounded replacement reconstruction, closed lifecycle payloads, progress-plan rules, and the harness-specific dispatch primitive. No worker template or generated worker payload SHALL expose continuation identifiers, dispatch metadata, or artifact contents.

#### Scenario: Thin agent wrappers resolve the canonical contract

- **WHEN** a managed worker agent is inspected after matrix materialization
- **THEN** it has exactly one harness-valid frontmatter block and its managed body fetches exactly the canonical phase worker contract without duplicating the contract text or leaving a placeholder

#### Scenario: Worker continuation and replacement remain bounded

- **WHEN** a worker result requests continuation or a coordinator reconstructs a replacement worker
- **THEN** the binding uses the phase's exact continuation literal, preserves only the allowed reconstruction fields, and never starts more than the existing bounded worker/replacement lifecycle permits

### Requirement: Projection lifecycle integrity covers matrix replacement and retirements

The manifest and expansion layer SHALL represent the parameterized templates as deterministic managed projections whose materialized bytes remain available to install, doctor, and uninstall. The change SHALL retire every removed per-phase binding and managed-agent source destination with a complete `managedHashes` record in the same manifest revision, while preserving existing retirement records and excluding unrelated `idea-list-render` and support-agent projections from retirement.

#### Scenario: Re-projection removes obsolete managed files safely

- **WHEN** install is run against a prior installation containing a removed per-phase source file
- **THEN** the obsolete file is recognized through its retirement record and removed only when its bytes match a permitted managed hash, while user-modified content is preserved and reported as drift

#### Scenario: Doctor and uninstall agree with installation

- **WHEN** doctor and uninstall are run after matrix projection
- **THEN** both enumerate the same active materialized worker projections and retirement records, report no orphan or phantom worker destinations, preserve user tuning, and complete without treating historical retired files as active projections

### Requirement: Canonical tests enforce cross-harness matrix parity

The test suite SHALL verify every routed phase across both harnesses, including parameter substitution, exact worker-contract Fetch targets, frontmatter and tuning preservation, phase-flag isolation, absence of unresolved placeholders, and install/doctor/uninstall retirement integrity. The tests SHALL retain the established thin-agent Fetch-wrapper behavior precedent rather than accepting duplicated worker contract bodies.

#### Scenario: Matrix regression is detected before installation

- **WHEN** a phase parameter, continuation literal, model, or Fetch target is missing, duplicated, or assigned to the wrong phase
- **THEN** the canonical matrix tests fail with the phase and harness identified

#### Scenario: Historical files remain covered

- **WHEN** a removed binding or managed-agent destination has any previously managed byte variant
- **THEN** the retirement-integrity tests require every known hash to remain registered and reject incomplete retirement or a duplicate active destination

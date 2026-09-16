# docs-drift-fix Specification

## Purpose
TBD - created by archiving change fix-step-pointer-map-docs-drift. Update Purpose after archive.

## Requirements

### Requirement: AGENTS.md Describes Machine-Only Step Routing

The documentation SHALL describe step-gated instruction delivery as machine-only routing with per-phase step_machine identifiers and build rebind through per-segment machine rebinding.

#### Scenario: Reader follows machine routing

- **WHEN** a maintainer reads the step-gated delivery paragraph to determine routing truth
- **THEN** the paragraph names the step_machine cursor and its next.follow pointer and states no static map fallback for spec and design

### Requirement: Spec And Design Declare Machine-Only Routing

Spec and design coordinators, phase contracts, and workers SHALL declare exclusive step_machine routing with no static step_pointer_map table or dual map-plus-machine declaration.

#### Scenario: Coordinator routes via machine

- **WHEN** a spec or design run starts and needs its next step instruction file
- **THEN** the coordinator routes through spec-standalone@1 or design-standalone@1 STAGE_FILES and the worker executes only the coordinator-provided machine pointer

### Requirement: Design Table Removed And Consumers Migrated

The change SHALL remove the DesignStepPointerMap and SpecStepPointerMap static tables and migrate design worker, spec worker, explore supervision, and manifest progress declarations to machine routing.

#### Scenario: Consumer follows migrated reference

- **WHEN** a migrated consumer loads its routing reference for spec or design steps
- **THEN** it resolves the step file through the step machine with no static table lookup

### Requirement: Tests Pin Machine-Only Truth Without Weakening

Test suites SHALL pin machine presence and static-map absence for spec and design routing without weakening any assertion to no-assertion.

#### Scenario: Test suite guards routing truth

- **WHEN** the step-machine wiring and coordinator suites run against the routing contracts
- **THEN** they assert step_machine declarations and machine STAGE_FILES coverage and fail on any retained static map table

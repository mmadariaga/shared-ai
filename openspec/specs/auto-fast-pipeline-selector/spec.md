# auto-fast-pipeline-selector Specification

## Purpose
TBD - created by archiving change worker-owned-autofast-mutations. Update Purpose after archive.

## Requirements

### Requirement: Identify the direct build selector route

The direct code-first selector route SHALL be named Build (unattended) with identity `build-unattended`. It SHALL preserve its existing worker order, per-slice authorization, bounded review behavior, and local commit boundary.

#### Scenario: direct route is selected

- **WHEN** Build (unattended) is selected
- **THEN** the existing direct code-first flow starts under `build-unattended` without changing its execution order.

### Requirement: Existing workers own Auto-fast execution

The Auto-fast selector SHALL route preparation and execution through the existing implementer, backfill, and archive workers rather than a dedicated hands worker.

#### Scenario:

- **WHEN** the user selects Auto-fast implementation
- **THEN** the selector SHALL activate backfill preparation and execution before archive preparation and execution

### Requirement: Coordinator authorization remains explicit

The selector SHALL preserve conversation-scoped execution state and commit authorization while preventing execution before the corresponding coordinator continuation.

#### Scenario:

- **WHEN** a prepared worker awaits execution
- **THEN** the selector SHALL send no execution continuation until validation and authorization have completed

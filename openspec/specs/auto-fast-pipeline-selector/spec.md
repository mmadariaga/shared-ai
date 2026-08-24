# auto-fast-pipeline-selector Specification

## Purpose
TBD - created by archiving change worker-owned-autofast-mutations. Update Purpose after archive.

## Requirements

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

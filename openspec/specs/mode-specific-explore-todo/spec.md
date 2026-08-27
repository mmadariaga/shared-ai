# mode-specific-explore-todo Specification

## Purpose
TBD - created by archiving change mode-specific-explore-todo. Update Purpose after archive.
## Requirements
### Requirement: Use named route projections

The mode-specific idea-list projection SHALL identify Plan (unattended), Build (unattended), and Manual using their stable identities and SHALL preserve each route's existing ordered steps and completion transitions.

#### Scenario: route stages remain ordered

- **WHEN** a selected route is rendered
- **THEN** its fixed existing steps appear in order under the corresponding new route identity.

### Requirement: Selected slices use temporary mode-specific route projections

The explore coordinator SHALL render a temporary route projection for the selected crystallized slice using the existing idea-list panel binding and ownership marker. The projection MUST replace only the selected slice's three baseline evidence entries, preserve the research item and non-selected slices, and MUST NOT create a generic `Implementation` item, alter evidence state, or create milestone stamps.

#### Scenario: Route projection replaces only the active slice

- **WHEN** crystallization resolves one slice and one execution mode
- **THEN** the coordinator renders that mode's route for the selected slice while leaving other slices and the underlying evidence ledger unchanged

### Requirement: Auto exposes planning-only sai-1 and sai-2 progress

The Auto route SHALL contain exactly `sai-1` followed by `sai-2`. A clean spec convergence MUST complete `sai-1` and start `sai-2`, and a clean terminal design result MUST complete `sai-2`. The route MUST NOT claim `sai-3`, `/sai-3-implement`, or code implementation.

#### Scenario: Auto advances from specification to design

- **WHEN** the supervised spec phase converges cleanly and the chained design phase later returns cleanly
- **THEN** the route progresses from `sai-1` to `sai-2` and completes without exposing or claiming implementation work

### Requirement: Auto-fast exposes only high-level stages

The Direct Build - Unattended route SHALL contain exactly `Build/Implement`, `Backfill`, and `Archive` in that order. Internal review, authorization, ADR/DDR, preparation, the CLI archive invocation, staging, and commit SHALL remain substeps and MUST NOT become additional panel items. `Build/Implement` MUST NOT be interpreted as `/sai-build` or `meta-build`.

#### Scenario: Auto-fast advances through high-level stages

- **WHEN** the implementer and functional-fix work, backfill execution, and archive execution each return cleanly
- **THEN** the route completes `Build/Implement`, then `Backfill`, then `Archive`, while the CLI archive invocation remains an internal Archive substep

### Requirement: Manual selections expose a handoff only

A Manual or unmapped selection SHALL expose only `Manual handoff`. The handoff MUST complete when the existing path-specific handoff is emitted, MUST dispatch no worker, MUST authorize no delegated work, and MUST inject no supervised, fast-track, or overview-language marker.

#### Scenario: Manual handoff completes without delegation

- **WHEN** the selector resolves Manual or an unmapped response
- **THEN** it emits the existing handoff, marks only `Manual handoff` completed, and performs no delegated dispatch

### Requirement: Non-clean route outcomes remain retryable and slice-scoped

Failed, cancelled, STOP-bearing, coordinator-disproved, and unrecovered outcomes SHALL leave the active route item pending, preserve earlier completed items, start no later item, and keep the selected slice retryable. Route state MUST remain conversation-only and independent for each slice.

#### Scenario: A failed route does not complete

- **WHEN** a route result is failed, cancelled, STOP-bearing, coordinator-disproved, or unrecovered
- **THEN** the active item remains pending, no later item starts, and retrying the selected slice does not change another slice's route state


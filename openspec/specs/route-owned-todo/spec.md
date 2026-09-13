# route-owned-todo Specification

## Purpose
TBD - created by archiving change explore-deferred-route-todo. Update Purpose after archive.
## Requirements
### Requirement: Route-owned authoritative entries with no baseline

The idea progress list SHALL hold only the chosen route entries with no baseline evidence items. The stage TODO SHALL clear at block emission and the list SHALL first render only at choice resolution, with the panel staying empty from emission until resolution. Old reviewed, research, and slice-crystallization references SHALL mark, clear, or render nothing.

#### Scenario: Panel stays empty until choice resolution

- **WHEN** a crystallization turn emits its block and clears the stage TODO
- **THEN** no list renders until the deferred route choice resolves for that slice

### Requirement: Plan route creates sai-1 sai-2 Implement entries

A Plan choice SHALL create exactly sai-1, sai-2, and Implement with sai-1 in progress and the rest pending, SHALL advance only on clean terminal results, and SHALL complete Implement only on next-slice. It SHALL never expose or claim sai-3 or code implementation.

#### Scenario: Plan choice initializes three-step list

- **WHEN** the deferred choice resolves to Plan - Unattended for a slice
- **THEN** the list shows sai-1 in progress with sai-2 and Implement pending

### Requirement: Direct Build route creates Build Implement Backfill Archive entries

A Direct Build choice SHALL create exactly Build/Implement, Backfill, and Archive in that order with Build/Implement in progress. The display label Build/Implement SHALL be a Build-route label only and SHALL never mean the sai-build composition ran.

#### Scenario: Direct Build choice initializes three-stage list

- **WHEN** the deferred choice resolves to Direct Build - Unattended for a slice
- **THEN** the list shows Build/Implement in progress with Build/Implement in progress with Backfill and Archive pending

### Requirement: Manual route creates only Manual handoff entry

A Manual choice SHALL create exactly Manual handoff, SHALL mark it completed when the path-specific handoff is emitted, SHALL dispatch no worker, and SHALL authorize no delegated work.

#### Scenario: Manual choice completes on handoff emission

- **WHEN** the deferred choice resolves to Manual for a slice
- **THEN** the list holds only Manual handoff and completes it when the handoff emits


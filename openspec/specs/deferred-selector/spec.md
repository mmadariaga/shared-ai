# deferred-selector Specification

## Purpose
TBD - created by archiving change explore-deferred-route-todo. Update Purpose after archive.
## Requirements
### Requirement: Deferred route choice served by idle via next follow
The route choice SHALL first present same-turn at crystallization close with Closure State crystallized, the stage TODO cleared, the recordedList for the emitted set emitted, and the panel empty until resolution, SHALL run before any route dispatch, SHALL be re-presented by explore-slice idle via next follow only while pending slices remain with no machine version bump, and fast-track SHALL never auto-select it.

#### Scenario: Idle with pending presents choice before dispatch
- **WHEN** crystallization concludes with same-turn block emission and at least one pending slice and no active route running
- **THEN** the choice presents same-turn once before any worker dispatch occurs and idle re-presents only while pending slices remain

### Requirement: Deferred choice presentation with fixed titles and identities

The deferred choice SHALL be presented only through the harness-native picker with exactly three options in fixed order carrying the fixed English titles Plan - Unattended, Direct Build - Unattended, and Manual. The stable machine-readable route identities SHALL be exactly plan-unattended, direct-build-unattended, and manual, and a free-text answer mapping to neither option SHALL be treated as Manual.

#### Scenario: Choice presents three fixed routes via picker

- **WHEN** the deferred choice is presented for a crystallized slice
- **THEN** the native picker carries the three fixed titles in order with their stable identities

### Requirement: Deterministic choice over pending set with retryable failure

The deterministic choice SHALL use only the pending set in crystallization order, SHALL dispatch the sole uncompleted entry without a picker, SHALL present an ordered picker plus Cancel for multiple uncompleted entries, SHALL never re-run a completed slice, and SHALL leave a failed, cancelled, or otherwise unrecovered active step pending and retryable. A material idea change before choice SHALL invalidate the crystallized set and restart at Explore change.

#### Scenario: Multi-slice set resolves one slice and preserves the rest

- **WHEN** multiple uncompleted slices remain at choice time
- **THEN** the choice offers those names in emission order plus Cancel and dispatches at most one selected entry


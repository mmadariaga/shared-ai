## ADDED Requirements

### Requirement: Direct Build slice-machine emits

On a Direct Build (unattended) selection, explore SHALL POST `/emit` with `{machineId: "explore-slice@1", eventId, event: {intent: "direct-build"}}`. If the response carries `rejected: ALREADY_RUNNING`, explore SHALL acknowledge already running and dispatch nothing. After each high-level route item converges (`Build/Implement`, then `Backfill`, then `Archive`), explore SHALL POST `/emit` with `{machineId: "explore-slice@1", eventId, event: {intent: "complete"}}`. Completing Archive is the machine's done signal: it marks the slice done and clears `active`. Direct Build SHALL NEVER emit `next-slice`. Fail or cancel SHALL leave the active step pending and SHALL NOT mark the slice done.

#### Scenario: Direct Build selection emits direct-build

- **WHEN** the user selects Direct Build - Unattended and `explore-slice@1` has no active slice
- **THEN** explore emits `{intent: "direct-build"}` to `explore-slice@1` and starts the Build/Implement route item

#### Scenario: Already-running Direct Build dispatches nothing

- **WHEN** Direct Build is selected again while `explore-slice@1` returns `rejected: ALREADY_RUNNING`
- **THEN** explore acknowledges already running and dispatches no worker

## MODIFIED Requirements

### Requirement: Build - Unattended run state and failure handling

Direct Build slice inventory (`set` / `active` / `done`) and TODO (`mode` plus `stage` cursor) SHALL be owned by `explore-slice@1` in sidecar-owned state. Remaining Direct Build run state SHALL remain conversation-only and SHALL preserve the fixed worker order, one-shot execution boundaries, owned-path staging, and pre-authorized local commit. A backfill execution failure SHALL stop before archive preparation. An archive preparation or execution failure SHALL report the exact CLI, staging, or commit state, SHALL never resend the execute order, and SHALL never commit a partial plan. CLI failure or invalid JSON SHALL stop before staging and commit. Manual `/sai-archive` and `/sai-commit` guidance remains applicable after a non-clean archive outcome. Incomplete Archive SHALL NOT mark the slice done.

#### Scenario: Archive failure stops the unattended flow

- **WHEN** the archive worker reports a CLI, staging, message-authoring, or commit failure
- **THEN** the flow preserves the exact partial state, performs no retry or later mutation, and does not mark the slice complete

#### Scenario: Hands-worker failure stops clean

- **WHEN** the backfill or archive worker returns a failure before completing its closed order
- **THEN** the run stops before the next mutation stage and manual `/sai-archive` and `/sai-commit` guidance is reported

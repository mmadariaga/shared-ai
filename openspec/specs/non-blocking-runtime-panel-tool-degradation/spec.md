# non-blocking-runtime-panel-tool-degradation Specification

## Purpose
TBD: Define non-blocking behavior when a declared native panel tool is unavailable at runtime.

## Requirements

### Requirement: Declared panel-tool unavailability degrades presentation only

The Claude Code and opencode panel bindings SHALL treat a rejected panel call caused by a declared tool being unavailable at runtime as a non-blocking presentation degradation for routed plans, the `sai-explore` list, and the `sai-merge` adaptive TODO. The coordinator SHALL record exactly one visible notice, disable further panel calls for the current invocation, preserve logical list state, and continue without panel rendering.

#### Scenario: Routed panel rendering continues after unavailable tooling

- **WHEN** a routed plan, apply Step Projection, `sai-explore` list, or `sai-merge` adaptive TODO attempts to call a declared panel tool that is unavailable at runtime
- **THEN** the coordinator records `> Panel rendering unavailable; continuing without task-panel updates.` once and continues the lifecycle without later panel calls.

### Requirement: Degradation preserves render ordering

The coordinator SHALL complete the panel render attempt or recorded degradation decision before a worker dispatch or surface continuation, including the merge adaptive TODO route, except for routed progress-event continuation. After validating and registering a routed progress event, the coordinator SHALL issue independent panel updates and continuation in one assistant turn and process both results before the next Result Loop iteration. A runtime-unavailable panel SHALL retain exactly one notice and disable later panel calls while preserving logical progress; other panel errors SHALL remain failures without retries. A continuation already issued alongside the rejected panel call SHALL not be issued again. Initial rendering and all non-progress surfaces SHALL retain render-first ordering.

#### Scenario: Dispatch does not bypass the render prerequisite

- **WHEN** the initial or progress render encounters an unavailable panel tool
- **THEN** for initial rendering the coordinator records degradation before dispatching; for progress rendering it processes the rejection from the same-turn calls before its next Result Loop iteration
- **AND** it preserves logical progress, emits the notice once, disables later panel calls, and does not repeat an already issued continuation

#### Scenario: Merge continuation waits for degradation recording

- **WHEN** a merge TODO render fails because the declared panel tool is unavailable
- **THEN** the coordinator records the degradation before launching or continuing the merge worker

#### Scenario: A non-unavailability panel error remains a failure

- **WHEN** the progress panel call returns an error other than tool unavailability
- **THEN** the coordinator treats it as a failure before processing the next worker result without retrying, switching mechanisms, or calling it unavailability

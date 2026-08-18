# non-blocking-runtime-panel-tool-degradation Specification

## Purpose
TBD: Define non-blocking behavior when a declared native panel tool is unavailable at runtime.

## Requirements

### Requirement: Declared panel-tool unavailability degrades presentation only

The Claude Code and opencode panel bindings SHALL treat a rejected panel call caused by a declared tool being unavailable at runtime as a non-blocking presentation degradation. The coordinator SHALL record exactly one visible notice, disable further panel calls for the current invocation or explore chat, preserve logical list state, and continue without panel rendering. It SHALL NOT retry, runtime-probe, dynamically switch mechanisms, or activate the no-native-panel Markdown fallback. Other tool or contract errors remain failures.

#### Scenario: Routed panel rendering continues after unavailable tooling

- **WHEN** a routed plan, apply Step Projection, or `sai-explore` list attempts to call a declared panel tool that is unavailable at runtime
- **THEN** the coordinator records `> Panel rendering unavailable; continuing without task-panel updates.` once and continues the lifecycle without later panel calls.

### Requirement: Degradation preserves render ordering

The coordinator SHALL complete the panel render attempt or the recorded degradation decision before routed worker dispatch or continuation.

#### Scenario: Dispatch does not bypass the render prerequisite

- **WHEN** the initial or progress render encounters an unavailable panel tool
- **THEN** the coordinator records the degradation before dispatching or resuming the worker and does not alter the logical progress-plan state rules.

## MODIFIED Requirements

### Requirement: Declared panel-tool unavailability degrades presentation only

The Claude Code and opencode panel bindings SHALL treat a rejected panel call caused by a declared tool being unavailable at runtime as a non-blocking presentation degradation for routed plans, the `sai-explore` list, and the `sai-merge` adaptive TODO. The coordinator SHALL record exactly one visible notice, disable further panel calls for the current invocation, preserve logical list state, and continue without panel rendering.

#### Scenario: Merge lifecycle continues after unavailable tooling

- **WHEN** the merge adaptive TODO attempts to call an unavailable declared panel tool
- **THEN** the coordinator records `> Panel rendering unavailable; continuing without task-panel updates.` once and continues without later merge panel calls

### Requirement: Degradation preserves render ordering

The coordinator SHALL complete the panel render attempt or recorded degradation decision before a worker dispatch or continuation, including the merge adaptive TODO route.

#### Scenario: Merge continuation waits for degradation recording

- **WHEN** a merge TODO render fails because the declared panel tool is unavailable
- **THEN** the coordinator records the degradation before launching or continuing the merge worker

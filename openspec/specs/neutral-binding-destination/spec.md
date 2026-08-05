# neutral-binding-destination Specification

## Purpose
TBD: define neutral installed destinations while preserving harness-specific worker binding sources.

## Requirements

### Requirement: Routed worker bindings use a neutral installed destination
The manifest SHALL project each Claude Code and opencode routed worker binding to `orchestration/workers/bindings/<worker-filename>.md` relative to that harness's SAI installation root, with no `claude` or `opencode` identity directory in the destination path. `<worker-filename>` SHALL be copied unchanged from one of the seven existing source filenames: `spec-worker.md`, `design-worker.md`, `implementation-worker.md`, `review-worker.md`, `security-worker.md`, `performance-worker.md`, or `accessibility-worker.md`.

#### Scenario: Claude projection uses the neutral destination
- **WHEN** the Claude Code manifest projection is expanded for any routed worker phase
- **THEN** its destination SHALL preserve the source filename under `orchestration/workers/bindings/` and SHALL not contain `bindings/claude/`

#### Scenario: opencode projection uses the neutral destination
- **WHEN** the opencode manifest projection is expanded for any routed worker phase
- **THEN** its destination SHALL preserve the source filename under `orchestration/workers/bindings/` and SHALL not contain `bindings/opencode/`

### Requirement: Harness-specific binding sources remain distinct
The source entries for Claude Code and opencode SHALL continue to resolve from `sai/orchestration/workers/bindings/claude/` and `sai/orchestration/workers/bindings/opencode/` respectively, preserving their distinct dispatch and continuation content.

#### Scenario: Source selection remains harness-specific
- **WHEN** the installer expands a routed binding projection for one harness
- **THEN** it SHALL select that harness's source file while writing the neutral destination, without merging or rewriting the source trees

#### Scenario: Copilot remains without routed projections
- **WHEN** the complete manifest is expanded for Copilot
- **THEN** it SHALL contain no routed worker-binding projection

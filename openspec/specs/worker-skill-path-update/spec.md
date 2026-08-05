# worker-skill-path-update Specification

## Purpose
TBD: define neutral binding references in routed worker forwarding skills.

## Requirements

### Requirement: Worker forwarding skills fetch the neutral binding path
Each Claude Code and opencode routed worker forwarding skill SHALL fetch its phase binding from `sai/orchestration/workers/bindings/<worker-filename>.md` without a harness identity directory, where `<worker-filename>` is the unchanged source filename `spec-worker.md`, `design-worker.md`, `implementation-worker.md`, `review-worker.md`, `security-worker.md`, `performance-worker.md`, or `accessibility-worker.md`.

#### Scenario: Claude worker skill resolves the neutral reference
- **WHEN** a Claude Code routed worker skill loads its binding
- **THEN** its Fetch reference SHALL use `sai/orchestration/workers/bindings/<worker-filename>.md` with the existing source filename unchanged and SHALL not use `bindings/claude/`

#### Scenario: opencode worker skill resolves the neutral reference
- **WHEN** an opencode routed worker skill loads its binding
- **THEN** its Fetch reference SHALL use `sai/orchestration/workers/bindings/<worker-filename>.md` with the existing source filename unchanged and SHALL not use `bindings/opencode/`

### Requirement: Binding content and worker lifecycle behavior remain unchanged
Neutralizing the Fetch reference SHALL not change the phase worker's harness-specific dispatch mechanism, continuation metadata, lifecycle statuses, or coordinator and worker payload contracts.

#### Scenario: Claude binding keeps its dispatch mechanism
- **WHEN** the Claude Code worker skill loads the neutral binding
- **THEN** the binding SHALL retain its Claude Code dispatch and continuation instructions

#### Scenario: opencode binding keeps its dispatch mechanism
- **WHEN** an opencode worker skill loads the neutral binding
- **THEN** the binding SHALL retain its opencode task and task-continuation instructions

# routed-harness-support Specification

## Purpose
Define the supported routed harness roster and the surviving phase entrypoint contracts.

## Requirements

### Requirement: Supported harness roster is routed-only

SAI SHALL support exactly Claude Code and opencode as installation and execution harnesses. GitHub Copilot (VS Code) SHALL not appear in supported-harness constants, interactive install selection, harness detection, doctor routing, or active manifest projections.

#### Scenario: Installer presents the supported roster
- **WHEN** installation resolves the harness selection
- **THEN** the available entries are Claude Code and opencode only
- **AND** no Copilot entry or Copilot installation branch is reachable

#### Scenario: Doctor detects installed harnesses
- **WHEN** doctor inspects supported harness roots
- **THEN** it resolves Claude Code and opencode only
- **AND** it has no Copilot path resolver or Copilot detection result

### Requirement: Surviving phase entrypoints use routed coordination

The supported Claude Code and opencode design, implementation, accessibility, review, security, and performance entrypoints SHALL retain their existing routed coordinator and phase-worker binding paths. No supported entrypoint SHALL fetch or dispatch `sai/orchestration/inline-invocation.md`.

#### Scenario: Routed design and implementation remain unchanged
- **WHEN** Claude Code or opencode starts design or implementation planning
- **THEN** the existing routed coordinator and matching worker binding are used
- **AND** no inline adapter or replacement compatibility layer is introduced

#### Scenario: Routed accessibility remains available
- **WHEN** Claude Code or opencode starts the accessibility phase
- **THEN** the existing routed accessibility coordinator and worker binding are used
- **AND** the phase does not depend on a Copilot inline caller

#### Scenario: Routed audit phases remain available
- **WHEN** Claude Code or opencode starts review, security, or performance analysis
- **THEN** the existing routed phase coordinator and worker binding are used
- **AND** none of those phases depends on a Copilot inline caller

### Requirement: Shared instructions and policies have no Copilot adapter carve-out

Shared SAI instructions and policies SHALL describe the supported Claude Code and opencode behavior without GitHub Copilot-specific inline-vs-routed adapter clauses. Their surviving artifact, picker, feedback, phase-boundary, and routed-worker semantics SHALL remain unchanged.

#### Scenario: Shared policy is inspected
- **WHEN** a maintainer reads `sai/instructions/explore.md`, `sai/instructions/design.md`, `sai/instructions/spec.propose.md`, `sai/policies/remember.md`, `sai/policies/artifact-feedback-gate.md`, or `sai/policies/status-picker.md`
- **THEN** no active clause assigns behavior to a Copilot inline consumer or preserves an inline adapter exception
- **AND** the Claude Code and opencode rules remain explicit and testable

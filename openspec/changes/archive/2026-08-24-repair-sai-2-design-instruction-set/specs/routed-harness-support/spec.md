## MODIFIED Requirements

### Requirement: Surviving phase entrypoints use routed coordination
The supported Claude Code and opencode design, implementation, accessibility, review, security, and performance entrypoints SHALL retain their existing routed coordinator and phase-worker binding paths. The supported design entrypoint inventory SHALL name live routed coordinator, worker-binding, and step surfaces rather than the deleted monolithic design instruction. No supported entrypoint SHALL fetch or dispatch `sai/orchestration/inline-invocation.md`.

#### Scenario: Routed design and implementation remain unchanged
- **WHEN** Claude Code or opencode starts design or implementation planning
- **THEN** the existing routed coordinator and matching worker binding are used
- **AND** no inline adapter, deleted monolithic design instruction, or replacement compatibility layer is introduced

#### Scenario: Routed accessibility remains available
- **WHEN** Claude Code or opencode starts the accessibility phase
- **THEN** the existing routed accessibility coordinator and worker binding are used
- **AND** the phase does not depend on a Copilot inline caller

#### Scenario: Routed audit phases remain available
- **WHEN** Claude Code or opencode starts review, security, or performance analysis
- **THEN** the existing routed phase coordinator and worker binding are used
- **AND** none of those phases depends on a Copilot inline caller

#### Scenario: routed-harness-inventory-is-current
- **WHEN** the supported routed entrypoint inventory is audited
- **THEN** it names only active coordinator, worker, binding, and step surfaces for design.


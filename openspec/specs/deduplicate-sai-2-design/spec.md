# Deduplicate sai-2-design Specification

## Purpose
Deduplicate shared behavior between Claude Code and opencode wrappers by extracting shared instruction content into `sai/commands/`, and reinforce artifact-only scope discipline and correct path references.

## Requirements

### Requirement: design-instruction
The design workflow SHALL be single-sourced through the routed coordinator, routed worker, and harness bindings, with step-local instructions providing the technical phase content for both supported harnesses. Claude Code and opencode wrappers SHALL select the routed coordinator and their harness binding. Both supported paths SHALL consume the same design artifact and interaction contract so approval, generation, feedback, and navigation behavior remain single-sourced rather than independently reimplemented.

#### Scenario: routed design contract is shared
- **WHEN** the routed coordinator, worker, bindings, and step-local design instruction surfaces are read
- **THEN** they SHALL define one workflow that checks specs approval and produces `design.md`, `tasks.md`, and `interfaces.md` without maintaining a separate inline design workflow

#### Scenario: routed coordinator body is thin
- **WHEN** `sai/commands/design/coordinator.md` is read
- **THEN** it SHALL contain only coordinator lifecycle and interaction responsibilities and SHALL delegate technical execution to the design worker binding

#### Scenario: Routed design path preserves the shared workflow
- **WHEN** a Claude Code or opencode design wrapper is read
- **THEN** it selects the routed coordinator and matching worker binding
- **AND** it consumes the shared design artifact and interaction contract

#### Scenario: Supported wrappers select routed entries
- **WHEN** a Claude Code or opencode design wrapper is read
- **THEN** it loads its routed coordinator and harness-specific worker binding
- **AND** it does not load an inline command loader

#### Scenario: routed-design-contract-uses-step-authority
- **WHEN** the active design workflow is inspected
- **THEN** the routed worker and step-local instructions provide the technical phase content without a separate inline design workflow.

### Requirement: opencode-remember-path-fix
The opencode `sai-1-spec` wrapper SHALL load `remember.md` from `~/.config/opencode/sai/policies/remember.md`, not from the `~/.claude/` path.

#### Scenario: opencode sai-1-spec uses opencode path
- **WHEN** `commands/opencode/sai-1-spec.md` is read
- **THEN** the final `Fetch` line references `@~/.config/opencode/sai/policies/remember.md`

#### Scenario: no claude path leak in opencode commands
- **WHEN** any file under `commands/opencode/` is searched
- **THEN** no file contains the string `~/.claude/`

### Requirement: active-infrastructure-boundary

Claude Code and opencode SHALL use the routed coordinator-worker infrastructure and the step-local design instruction surfaces. The active infrastructure SHALL not define or require a compatibility inline path.

#### Scenario: claude design wrapper uses routed entry
- **WHEN** `commands/claude/sai-2-design.md` is read during Step 1
- **THEN** it SHALL reference the routed coordinator, design planning worker, and routed dispatch

#### Scenario: opencode design wrapper uses routed entry
- **WHEN** `commands/opencode/sai-2-design.md` is read during Step 1
- **THEN** it SHALL reference the routed coordinator, agent routing, and worker binding

#### Scenario: Unsupported inline entry is absent
- **WHEN** active design wrappers are inspected
- **THEN** supported wrappers reference only routed coordinator, worker-binding, and step-owned instruction surfaces
- **AND** no active wrapper references an inline adapter or inline command loader

#### Scenario: active-design-boundary-excludes-inline-loader
- **WHEN** active design entrypoints are inspected
- **THEN** they reference only the routed coordinator, worker, binding, and step-owned instruction surfaces.

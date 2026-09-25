# auto-fast-implement-worker Specification

## Purpose
TBD - created by archiving change auto-fast-selector-option. Update Purpose after archive.

## Requirements

### Requirement: Attribute implementation to Direct Build
`sai-direct-build-worker`, whose contract is `sai/commands/explore/direct-build-worker.md`, SHALL be the implementation worker for Direct Build (unattended), and its repository-artifact scope with protected update protocols SHALL remain in force.

#### Scenario: Direct Build dispatches implementation
- **WHEN** Direct Build reaches its implementation step
- **THEN** the existing implement worker receives the same block-driven request under the Direct Build route

### Requirement: Alpha input model

The implementer worker SHALL receive exactly one opaque `arguments_value` whose first line is the marker `--direct-build` and whose remainder is the complete crystallized Ready to Propose block; it SHALL strip the marker line and treat that block as its sole substantive input, with no conversation context forwarded and no requirements inferred from repository discovery beyond what implementing the block requires.

#### Scenario: Block-only input

- **WHEN** the worker is dispatched by explore's Direct Build - Unattended flow
- **THEN** it implements directly from Capabilities in scope, Key constraints, Implementation Details, and Edge Cases, treating Research Leads as non-authoritative starting points only

#### Scenario: Slice-scoped implementation

- **WHEN** the block comes from a sliced crystallization set
- **THEN** the worker implements only the behavior this block's `**Capabilities in scope**` require
- **AND** an `I` item is in scope only when its behavior is required by a capability listed in the block's Capabilities in scope or by an Edge Case attributed to this slice
- **AND** an `I` item serving a capability of a later slice is not implemented, stubbed, or referenced in this run

### Requirement: Write containment
The implementer worker SHALL treat any repository artifact required by the crystallized block as writable, regardless of file format, under the shared protected update protocols and its role restrictions. It SHALL NOT directly modify `openspec/specs/**`, with proposal, specs, design, tasks, and metadata reconstructed later by backfill. It SHALL NOT create planning artifacts, SHALL NOT run a mutating git command, and SHALL NOT dispatch subagents.

#### Scenario: Contained implementation diff
- **WHEN** implementation completes across all rounds
- **THEN** changed_files contains only required repository artifacts with no planning artifact and no direct published-spec writes

#### Scenario: Tests are in scope
- **WHEN** an emitted block requires test coverage for its capabilities
- **THEN** the implementer worker creates or modifies test files as ordinary in-scope writes

#### Scenario: Schema product write is permitted
- **WHEN** implementation requires a schemas product fix
- **THEN** the implementer writes under `openspec/schemas/**`

#### Scenario: Excluded write refused
- **WHEN** satisfying the block would require a direct published-spec write, a planning artifact, a mutating git command, or a subagent dispatch
- **THEN** the implementer performs no such action and reports the violated exclusion

### Requirement: Fix-loop continuation discipline

When explore continues the same worker instance with an ordered finding list, the worker SHALL apply exactly the listed corrections within the block's scope, return a closed lifecycle result again, and add every touched path to its changed_files union; it MUST NOT re-plan, expand scope, or improve beyond the findings.

#### Scenario: Findings applied exactly

- **WHEN** a continuation payload arrives containing an ordered finding list
- **THEN** only the listed corrections are applied and the returned result carries the unioned changed_files including every newly touched path

### Requirement: Failure honesty

The implementer worker SHALL return `failed` with a concrete failure class when the block cannot be implemented as written; it MUST NEVER silently substitute a different feature.

#### Scenario: Unimplementable block

- **WHEN** the block cannot be implemented as written
- **THEN** the worker returns failed with a concrete summary instead of shipping a substituted feature

### Requirement: The implementer window snapshot head is base_sha and guard_base

The Direct Build implementer dispatch SHALL be a no-commit-guard window opened by the Step 1 `snapshot` step, whose returned head SHALL be recorded as both the run's `base_sha` (the diff base for the functional fix loop) and the window's `guard_base`. The window SHALL be verified after the implementer stretch closes — the fix loop converged or the cap was exhausted — and before the Step 3 path-scoped staging, without changing the worker's closed write containment, its mutating-git prohibition prose, or any closed exclusion of its contract.

#### Scenario: one snapshot serves the diff base and the guard baseline

- **WHEN** the Step 1 snapshot runs immediately before the implementer dispatch
- **THEN** its returned head is recorded as both `base_sha` and the window's `guard_base`, and the window is verified after the implementer stretch closes and before Step 3 staging
- **AND** the implementer worker's write containment and git prohibition prose are unchanged

### Requirement: Implementer reads Request Additional Notes as non-authoritative context

When the block carries `**Request Additional Notes**`, the Direct Build implementer SHALL read it as non-authoritative context in the same way as **Research Leads**. The field SHALL add no scope and no requirement to the implementation.

#### Scenario: Notes inform but do not scope the implementation

- **WHEN** the implementer receives a block that carries Request Additional Notes content
- **THEN** it implements only from Capabilities in scope, Key constraints, Implementation Details, and Edge Cases, and treats the notes as context that adds no scope

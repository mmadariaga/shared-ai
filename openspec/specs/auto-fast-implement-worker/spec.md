# auto-fast-implement-worker Specification

## Purpose
TBD - created by archiving change auto-fast-selector-option. Update Purpose after archive.
## Requirements

### Requirement: Attribute implementation to Build

The existing `sai-autofast-implement-worker` SHALL be documented as the implementation worker for Build (unattended). Its worker identity and protocol marker SHALL remain unchanged, and its existing code-only exclusions SHALL remain in force.

#### Scenario: Build dispatches implementation

- **WHEN** Build reaches its implementation step
- **THEN** the existing implement worker receives the same block-driven request under the Build route.
### Requirement: Alpha input model

The implementer worker SHALL receive exactly one opaque `arguments_value` whose first line is the marker `--autofast` and whose remainder is the complete crystallized Ready to Propose block; it SHALL strip the marker line and treat that block as its sole substantive input, with no conversation context forwarded and no requirements inferred from repository discovery beyond what implementing the block requires.

#### Scenario: Block-only input

- **WHEN** the worker is dispatched by explore's Auto (fast implementation) flow
- **THEN** it implements directly from Capabilities in scope, Key constraints, Implementation Details, and Edge Cases, treating Research Leads as non-authoritative starting points only

### Requirement: Write containment

The implementer worker SHALL treat exactly code, tests, and the project configuration the change requires as writable, and SHALL write nothing else under a closed exclusion list: it MUST NOT create or modify anything under `openspec/`, MUST NOT create planning artifacts (`design.md`, `tasks.md`, `implementation.md`), MUST NOT run a mutating git command (no add, commit, push, branch, tag, stash, or reset), and MUST NOT dispatch subagents. Each exclusion names its concrete hazard; permissions are explicit so commodity-model workers resolve the writable surface without interpreting undefined vocabulary such as "production code".

#### Scenario: Contained implementation diff

- **WHEN** implementation completes across all rounds
- **THEN** changed_files contains only code, test, and required configuration paths outside `openspec/`, with no planning artifact

#### Scenario: Tests are in scope

- **WHEN** an emitted block requires test coverage for its capabilities
- **THEN** the implementer worker creates or modifies test files as ordinary in-scope writes

#### Scenario: Excluded write refused

- **WHEN** satisfying the block would require writing under `openspec/`, creating a planning artifact, running a mutating git command, or dispatching a subagent
- **THEN** the implementer worker performs no such action and reports the violated exclusion

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

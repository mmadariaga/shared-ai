# routed-phase-panel-binding Specification

## Purpose
TBD

## Requirements

### Requirement: Routed worker bindings SHALL load matching harness panel-render mechanics

Generated Claude Code and opencode bindings for routed phases with a `progress_plan` MUST fetch their matching harness `panel-render.md` instructions and MUST identify the shared `todo-structure.md` policy as the source of render semantics.

#### Scenario: A routed binding is generated
- **WHEN** the worker matrix generates a binding for spec, design, implementation, review, security, performance, or accessibility
- **THEN** the binding references the matching Claude Code or opencode panel-render instructions and keeps panel tool calls in the coordinator session

#### Scenario: An apply binding is generated
- **WHEN** the worker matrix generates either apply binding
- **THEN** the binding does not include progress panel instructions or a placeholder block

#### Scenario: No adapter plan is declared
- **WHEN** a command has no adapter-declared `progress_plan`
- **THEN** no plan-based task list is rendered

# stage-todo-ownership Specification

## Purpose
TBD - created by archiving change restore-explore-stage-todo-rule. Update Purpose after archive.
## Requirements
### Requirement: Phase A Stage TODO Paint Rule
The explore pre-crystallization stage TODO SHALL render as the single-sourced four-item list defined in steps/common.md while a candidate idea is under active exploration.
#### Scenario: Active idea renders four stage entries
- **WHEN** a candidate idea exists in Closure State active-uncrystallized
- **THEN** the panel holds exactly the four stage entries in order Explore change, Review edge cases, Implementation details, Crystallize with current in_progress, completed completed, and remaining pending

### Requirement: Stage TODO Repaint Timing And States
The stage TODO SHALL render from the first turn with a candidate idea and re-render exactly once per turn that changes stage state, carrying the per-harness stage-ownership marker.
#### Scenario: Stage change triggers single repaint
- **WHEN** the exploration stage advances within a turn
- **THEN** the TODO re-renders once with updated states and each entry carries sai-explore-stage:<stage-id> in the harness-pinned panel field with opencode priority and Claude Code description preserved


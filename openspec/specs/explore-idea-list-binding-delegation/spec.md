# explore-idea-list-binding-delegation Specification

## Purpose
TBD: Define the purpose of the explore idea-list binding delegation capability.

## Requirements

### Requirement: The explore idea-list binding SHALL pin the harness field mapping while delegating policy and mechanics

The explore idea-list binding SHALL pin its harness's label field and machine-readable marker field for the phase-A stage TODO (`sai-explore-stage:<stage-id>`) and the phase-B idea list (`sai-idea-list:<change-name>`, label carrying the slice's change name). It SHALL point to `sai/commands/explore/steps/common.md` and `sai/commands/explore/steps/idea-list.md` for the surface policy — stages, `pending`/`in_progress`/`completed` state policy, render and clear timing, and coordinator ownership — instead of restating it, and SHALL reference the corresponding per-harness panel-render binding for native panel availability and mechanics instead of restating those mechanics.

#### Scenario: Claude Code renders the explore idea list
- **WHEN** `sai-explore` renders its idea list on Claude Code
- **THEN** `sai/adapters/claude/idea-list-render.md` supplies the harness field mapping and points to the explore step files for the surface policy
- **AND** it references `sai/adapters/claude/panel-render.md` for task-panel mechanics
- **AND** the machine-readable carrier remains `description` with the value `sai-idea-list:<change-name>`

#### Scenario: opencode renders the explore idea list
- **WHEN** `sai-explore` renders its idea list on opencode
- **THEN** `sai/adapters/opencode/idea-list-render.md` supplies the harness field mapping and points to the explore step files for the surface policy
- **AND** it references `sai/adapters/opencode/panel-render.md` for todo-panel mechanics
- **AND** the machine-readable carrier remains `priority` with the value `sai-idea-list:<change-name>`

#### Scenario: Existing idea-list behavior remains unchanged
- **WHEN** the idea list is marked, cleared, or has a review item set to or resolved from `in_progress`
- **THEN** the consuming binding preserves the existing labels, statuses, render timing, marker vocabulary, and coordinator-only emission behavior
- **AND** no new render act, progress step, or plan deduplication is introduced

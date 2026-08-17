# harness-panel-render-binding Specification

## Purpose
TBD: Define the purpose of the harness panel-render binding capability.

## Requirements

### Requirement: Each supported harness SHALL expose a surface-neutral panel-render binding

The binding SHALL define only the harness-native panel mechanics needed by consuming surfaces. It SHALL not define a consuming surface's marker-prefix vocabulary, labels, or progress-state policy.

#### Scenario: Claude Code panel mechanics are reusable by a consuming surface
- **WHEN** a Claude Code surface renders a panel-backed list
- **THEN** it uses `TaskList`, `TaskGet`, and `TaskUpdate` mechanics through `sai/adapters/claude/panel-render.md`
- **AND** the binding uses the task `description` field as the machine-readable marker carrier
- **AND** an update preserves existing task identities, creates new entries, and deletes entries absent from the full consuming-surface list

#### Scenario: opencode panel mechanics are reusable by a consuming surface
- **WHEN** an opencode surface renders a panel-backed list
- **THEN** it supplies the complete list through `todowrite`
- **AND** the binding uses the todo entry `priority` field as the machine-readable marker carrier
- **AND** full-array replacement leaves exactly the consuming surface's list and displaces foreign entries

#### Scenario: A consuming surface clears only its own panel entries
- **WHEN** a surface starts and clears prior panel state
- **THEN** its harness binding reads current panel entries, classifies them by that surface's marker, and removes only entries bearing that marker
- **AND** the read does not derive list content

### Requirement: Panel mechanics SHALL remain declared rather than runtime-detected

Each supported harness panel-render binding SHALL declare native task-panel availability and SHALL keep panel emission owned by the coordinator surface rather than a worker subagent.

#### Scenario: A supported harness consumes the binding
- **WHEN** a coordinator surface renders its panel-backed list
- **THEN** the binding supplies the declared native panel mechanics
- **AND** no runtime capability detection or worker-originated panel emission is required

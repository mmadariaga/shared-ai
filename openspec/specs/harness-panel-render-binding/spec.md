# harness-panel-render-binding Specification

## Purpose
TBD: Define the purpose of the harness panel-render binding capability.

## Requirements

### Requirement: Routed progress updates and continuation share an assistant turn

Claude Code and opencode panel bindings SHALL make routed progress-event continuation the sole exception to their render-first ordering. After the shared runner validates and registers the event, opencode SHALL issue `todowrite` and the same-worker `task` continuation as parallel calls in one assistant turn. Claude Code SHALL issue the necessary independent task-panel updates and `SendMessage` in one assistant turn, resolving panel ids required for those updates beforehand. Both calls SHALL use the registered progress result independently; neither SHALL depend on the other's return value. Emission SHALL remain coordinator-owned, with step-level granularity and validator-sourced milestone stamps. Initial dispatch, other continuations, and non-routed surfaces SHALL retain render-first ordering. The existing one-time unavailable-panel degradation SHALL remain unchanged, and all other panel errors SHALL remain failures without retries.

#### Scenario: Opencode progress batching
- **WHEN** a validated progress event marks a new declared step in an opencode routed plan
- **THEN** the coordinator registers progress and issues the full `todowrite` update plus the same-worker `task` continuation in the same assistant turn without waiting for either return value to issue the other

#### Scenario: Claude Code progress batching
- **WHEN** a validated progress event marks a new declared step in a Claude Code routed plan
- **THEN** the coordinator registers progress and issues the necessary independent task updates plus `SendMessage` in the same assistant turn without requiring panel completion first

#### Scenario: Panel calls already disabled
- **WHEN** progress is registered after the invocation's panel tooling has degraded
- **THEN** the coordinator continues the same worker without a panel call while retaining logical step state

### Requirement: Panel access errors remain distinct from runtime absence

Both panel bindings SHALL treat missing permission grants as access errors governed by the shared tool-access policy. Only runtime tool absence SHALL use the existing one-time panel degradation notice and continuation without panel updates. Permission grants SHALL NOT be represented as creating panel tools.

#### Scenario: Runtime panel tool is absent
- **WHEN** a panel call fails because the runtime does not provide the tool
- **THEN** the coordinator emits the existing degradation notice once and continues without further panel calls while preserving logical list state

#### Scenario: Native permission blocks a panel call
- **WHEN** a panel tool exists but its required native grant is missing
- **THEN** the coordinator handles an access error rather than silently treating the panel as unavailable

### Requirement: Each supported harness exposes a surface-neutral panel-render binding

Each supported harness SHALL expose its native panel mechanics through a reusable binding. The binding SHALL preserve the surface-neutral mechanics for its consumers, the routed progress plans and the `sai-explore` stage TODO and idea list, and SHALL declare no `sai-merge` adaptive TODO extension.

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

### Requirement: Panel mechanics remain declared and coordinator-owned

Each supported harness panel-render binding SHALL declare native task-panel availability and SHALL keep panel emission owned by the coordinator surface rather than a worker subagent; the panel bindings supply only the native mechanics.

#### Scenario: A supported harness consumes the binding
- **WHEN** a coordinator surface renders its panel-backed list
- **THEN** the binding supplies the declared native panel mechanics
- **AND** no runtime capability detection or worker-originated panel emission is required

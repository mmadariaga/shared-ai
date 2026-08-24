## MODIFIED Requirements

### Requirement: Each supported harness SHALL expose a surface-neutral panel-render binding

Each supported harness SHALL expose its native panel mechanics through a reusable binding. The binding SHALL preserve the surface-neutral mechanics for ordinary consumers and SHALL define the declared `sai-merge` adaptive TODO extension, including its `sai-merge-todo` marker and exclusive ownership after the first full merge render.

#### Scenario: Merge claims the native panel after branch selection

- **WHEN** the merge coordinator performs its first full TODO render
- **THEN** the active harness binding replaces foreign entries with the canonical merge TODO and preserves the merge marker for lifecycle cleanup

### Requirement: Panel mechanics SHALL remain declared rather than runtime-detected

Each supported harness panel-render binding SHALL declare native task-panel availability and SHALL keep panel emission owned by the coordinator surface rather than a worker subagent. The merge binding SHALL retain exclusive ownership through terminal cleanup and SHALL NOT promise restoration of displaced foreign entries.

#### Scenario: Worker cannot emit the merge TODO

- **WHEN** a merge worker returns a lifecycle result
- **THEN** only the coordinator session may render or update the merge TODO surface

## MODIFIED Requirements

### Requirement: Display the supervised route boundary

The crystallization-close selector SHALL present exactly three options in order: `Auto (sai-1 + sai-2)`, `Auto (fast implementation)`, and `Manual`. The first displayed label SHALL map to internal route `Auto` and SHALL state that only supervised `sai-1` and `sai-2` run.

#### Scenario: Selector identifies the supervised scope

- **WHEN** a crystallization turn reaches the shared close
- **THEN** the final selector presents the three ordered labels and identifies the first route as excluding implementation

### Requirement: Keep route authorization separate

Selecting displayed `Auto (sai-1 + sai-2)` SHALL authorize only the supervised spec-and-design route and SHALL NOT dispatch implementation. Manual SHALL dispatch nothing, and Auto (fast implementation) SHALL retain its independent code-first behavior without resolving gate 9.

#### Scenario: Route selection preserves boundaries

- **WHEN** the user selects any of the three crystallization-close options
- **THEN** only the selected route's existing dispatch behavior occurs and no route implies implementation beyond Auto-fast

### Requirement: Preserve renamed continuation selection

After a clean Auto-fast slice completion with pending slices, the continuation selector SHALL use the same three displayed options and SHALL preserve crystallization order and completed-slice exclusion.

#### Scenario: Pending slices receive the renamed selector

- **WHEN** Auto-fast completes while an uncompleted slice remains
- **THEN** the renamed three-option selector is presented before the next slice dispatch
